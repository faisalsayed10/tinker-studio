import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { tmpdir } from "os";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { generateCode } from "@/lib/codegen";
import { PipelineConfig, Model } from "@/lib/types";
import { activeJobs } from "@/lib/training-store";

/**
 * POST /api/training/start
 * Start a training job
 *
 * This endpoint:
 * 1. Validates the configuration
 * 2. Generates Python training script
 * 3. Spawns Python subprocess
 * 4. Returns job ID for streaming
 */

interface StartRequest {
  apiKey: string;
  config: PipelineConfig;
  model?: Model; // Selected model with metadata
}

export async function POST(request: NextRequest) {
  try {
    const body: StartRequest = await request.json();
    const { apiKey, config, model } = body;

    // Validation
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API key is required" },
        { status: 400 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { success: false, error: "Training configuration is required" },
        { status: 400 }
      );
    }

    // Check if Python is available
    const pythonAvailable = await checkPythonAvailable();
    if (!pythonAvailable) {
      return NextResponse.json({
        success: false,
        error: "Python runtime not available. To run training:\n\n" +
          "1. Install Python 3.9+\n" +
          "2. Run: pip install tinker datasets transformers\n" +
          "3. Download the generated code and run locally",
        code: "PYTHON_NOT_AVAILABLE",
      }, { status: 503 });
    }

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Generate Python script
    const scriptContent = generateCode(config, model);

    // Add API key to the script (inject at the top after imports)
    const scriptWithKey = scriptContent.replace(
      'import os\nimport sys',
      `import os\nimport sys\n\nos.environ["TINKER_API_KEY"] = "${apiKey}"`
    );

    // Create temp directory for this job
    const jobDir = join(tmpdir(), "tinker-studio", jobId);
    await mkdir(jobDir, { recursive: true });

    // Write script to temp file
    const scriptPath = join(jobDir, "training.py");
    await writeFile(scriptPath, scriptWithKey);

    // Spawn Python process
    // Disable telemetry to avoid infinite retry loops on telemetry validation errors
    const pythonProcess = spawn("python3", ["-u", scriptPath], {
      cwd: jobDir,
      env: { ...process.env, PYTHONUNBUFFERED: "1", TINKER_TELEMETRY: "0" },
    });

    // Store job info
    activeJobs.set(jobId, {
      process: pythonProcess,
      config,
      startedAt: Date.now(),
      logs: [],
      status: "running",
    });

    // Handle process events
    pythonProcess.stdout.on("data", (data) => {
      const job = activeJobs.get(jobId);
      if (job) {
        const lines = data.toString().split("\n").filter(Boolean);
        job.logs.push(...lines);
      }
    });

    pythonProcess.stderr.on("data", (data) => {
      const job = activeJobs.get(jobId);
      if (job) {
        const lines = data.toString().split("\n").filter(Boolean);
        job.logs.push(...lines.map((l: string) => `[ERROR] ${l}`));
      }
    });

    pythonProcess.on("close", (code) => {
      const job = activeJobs.get(jobId);
      if (job) {
        job.status = code === 0 ? "completed" : "failed";
        job.logs.push(code === 0 ? "Training completed successfully!" : `Training failed with exit code ${code}`);
      }
    });

    pythonProcess.on("error", (error) => {
      const job = activeJobs.get(jobId);
      if (job) {
        job.status = "failed";
        job.logs.push(`[ERROR] ${error.message}`);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        message: "Training started. Stream logs at /api/training/{jobId}/stream",
      },
    });
  } catch (error) {
    console.error("Error starting training:", error);
    return NextResponse.json(
      { success: false, error: "Failed to start training" },
      { status: 500 }
    );
  }
}

// Check if Python is available
async function checkPythonAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const python = spawn("python3", ["--version"]);

    python.on("close", (code) => {
      resolve(code === 0);
    });

    python.on("error", () => {
      resolve(false);
    });

    setTimeout(() => {
      python.kill();
      resolve(false);
    }, 5000);
  });
}
