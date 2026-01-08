import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { generateCode } from "@/lib/codegen";
import { PipelineConfig, Model } from "@/lib/types";
import { activeJobs } from "@/lib/training-store";

/**
 * Validates API key format to prevent injection attacks
 * API keys should only contain alphanumeric characters, hyphens, and underscores
 */
function isValidApiKeyFormat(apiKey: string): boolean {
  // API keys should be reasonable length and contain safe characters
  if (apiKey.length < 20 || apiKey.length > 200) {
    return false;
  }
  // Only allow alphanumeric, hyphens, underscores, and dots
  return /^[a-zA-Z0-9_\-\.]+$/.test(apiKey);
}

/**
 * Sanitizes error messages to prevent information disclosure
 */
function sanitizeErrorMessage(error: string): string {
  return error
    .replace(/\/home\/[^\/\s]+/g, "/home/***")
    .replace(/\/tmp\/[^\/\s]+/g, "/tmp/***")
    .replace(/\/Users\/[^\/\s]+/g, "/Users/***")
    .replace(/C:\\Users\\[^\\\s]+/g, "C:\\Users\\***")
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "***.***.***.***")
    .replace(/:[0-9]{2,5}\b/g, ":****");
}

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

    // Validate API key format to prevent injection
    if (!isValidApiKeyFormat(apiKey)) {
      return NextResponse.json(
        { success: false, error: "Invalid API key format" },
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

    // Generate unique job ID using secure random UUID
    const jobId = `job_${randomUUID()}`;

    // Generate Python script
    const scriptContent = generateCode(config, model);

    // Create temp directory for this job
    const jobDir = join(tmpdir(), "tinker-studio", jobId);
    await mkdir(jobDir, { recursive: true });

    // Write script to temp file (without API key embedded)
    const scriptPath = join(jobDir, "training.py");
    await writeFile(scriptPath, scriptContent);

    // Spawn Python process with API key passed via environment variable
    // Apply resource limits for security using ulimit (Unix/Linux)
    // Memory breakdown:
    // - Python runtime + SDK (~200MB)
    // - Dataset streaming + tokenization (~500MB)
    // - Overhead and buffers (~300MB)
    // Total: ~1.5GB limit
    const memoryLimitKB = Math.floor(1.5 * 1024 * 1024); // 1.5GB in KB

    // Use bash with ulimit to enforce memory limits on Unix systems
    // On non-Unix systems, ulimit will fail gracefully and run without limits
    const pythonProcess = spawn("bash", [
      "-c",
      `ulimit -v ${memoryLimitKB} 2>/dev/null || true; exec python3 -u "${scriptPath}"`
    ], {
      cwd: jobDir,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        TINKER_TELEMETRY: "0",
        TINKER_API_KEY: apiKey,
      },
      detached: false, // Keep process attached for proper cleanup
    });

    // Store job info with API key for authorization
    activeJobs.set(jobId, {
      process: pythonProcess,
      config,
      startedAt: Date.now(),
      logs: [],
      status: "running",
      apiKey: apiKey, // Track ownership for authorization
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
        job.logs.push(`[ERROR] ${sanitizeErrorMessage(error.message)}`);
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(`Failed to start training: ${errorMessage}`) },
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
