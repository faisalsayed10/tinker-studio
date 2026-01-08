import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

/**
 * GET /api/checkpoints/list
 * List available checkpoints from Tinker storage
 */

// Checkpoint response shape from our API (transformed from Tinker API)
interface Checkpoint {
  name: string;           // checkpoint_id from Tinker
  path: string;           // tinker_path from Tinker
  timestamp: number;      // time.timestamp() from Tinker (seconds)
  baseModel: string;      // from TrainingRun info
  loraRank?: number;      // from TrainingRun info
  checkpointType?: "training" | "sampler"; // checkpoint_type from Tinker
  sizeBytes?: number;     // size_bytes from Tinker
  public?: boolean;       // public from Tinker
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "API key required" },
      { status: 401 }
    );
  }

  try {
    // List checkpoints via Python
    const result = await listCheckpointsFromTinker(apiKey);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          checkpoints: result.checkpoints,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error listing checkpoints:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to list checkpoints" },
      { status: 500 }
    );
  }
}

interface ListResult {
  success: boolean;
  checkpoints?: Checkpoint[];
  error?: string;
}

async function listCheckpointsFromTinker(apiKey: string): Promise<ListResult> {
  return new Promise((resolve) => {
    const pythonCode = `
import os
import sys
import json
import warnings

# Suppress pydantic warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

os.environ["TINKER_API_KEY"] = """${apiKey.replace(/"/g, '\\"')}"""

try:
    import tinker

    # Initialize clients
    service_client = tinker.ServiceClient()
    rest_client = service_client.create_rest_client()

    # List all user checkpoints using the correct API
    response = rest_client.list_user_checkpoints(limit=100).result()

    # Cache training run info to avoid repeated API calls
    training_run_cache = {}

    checkpoints = []
    for ckpt in response.checkpoints:
        # Get training run info for base_model and lora_rank
        tinker_path = getattr(ckpt, "tinker_path", "")
        base_model = "unknown"
        lora_rank = None

        # Try to get training run info from cache or API
        training_run_id = getattr(ckpt, "training_run_id", None)
        if training_run_id and training_run_id not in training_run_cache:
            try:
                tr_info = rest_client.get_training_run(training_run_id).result()
                training_run_cache[training_run_id] = {
                    "base_model": getattr(tr_info, "base_model", "unknown"),
                    "lora_rank": getattr(tr_info, "lora_rank", None),
                }
            except:
                training_run_cache[training_run_id] = {"base_model": "unknown", "lora_rank": None}

        if training_run_id and training_run_id in training_run_cache:
            base_model = training_run_cache[training_run_id]["base_model"]
            lora_rank = training_run_cache[training_run_id]["lora_rank"]

        checkpoints.append({
            "name": getattr(ckpt, "checkpoint_id", "unknown"),
            "path": tinker_path,
            "timestamp": int(ckpt.time.timestamp()) if getattr(ckpt, "time", None) else 0,
            "checkpointType": getattr(ckpt, "checkpoint_type", "training"),
            "sizeBytes": getattr(ckpt, "size_bytes", None),
            "public": getattr(ckpt, "public", False),
            "baseModel": base_model,
            "loraRank": lora_rank,
        })

    print(json.dumps({"success": True, "checkpoints": checkpoints}))
except ImportError:
    print(json.dumps({"success": False, "error": "Tinker SDK not installed. Run: pip install tinker"}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
    print(json.dumps({"success": False, "error": str(e)}))
`;

    const python = spawn("python3", ["-c", pythonCode]);
    let stdout = "";
    let stderr = "";

    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("close", () => {
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch {
        if (stderr.includes("python3: command not found")) {
          resolve({ success: false, error: "Python 3 is required. Please install Python 3.9+" });
        } else if (stderr.includes("No module named 'tinker'")) {
          resolve({ success: false, error: "Tinker SDK not installed. Run: pip install tinker" });
        } else {
          resolve({ success: false, error: stderr || "Failed to list checkpoints" });
        }
      }
    });

    python.on("error", (err) => {
      if (err.message.includes("ENOENT")) {
        resolve({ success: false, error: "Python 3 is required. Please install Python 3.9+" });
      } else {
        resolve({ success: false, error: `Failed to run Python: ${err.message}` });
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      python.kill();
      resolve({ success: false, error: "Request timed out" });
    }, 30000);
  });
}
