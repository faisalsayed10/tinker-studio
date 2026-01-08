import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

/**
 * DELETE /api/tinker/cleanup
 * Delete all user checkpoints and training data
 */

interface CleanupResult {
  success: boolean;
  deleted?: number;
  errors?: string[];
  error?: string;
}

export async function DELETE(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "API key is required" },
      { status: 401 }
    );
  }

  const result = await cleanupAllCheckpoints(apiKey);

  if (result.success) {
    return NextResponse.json({
      success: true,
      data: {
        deleted: result.deleted,
        errors: result.errors,
      },
    });
  }

  return NextResponse.json(
    { success: false, error: result.error },
    { status: 500 }
  );
}

async function cleanupAllCheckpoints(apiKey: string): Promise<CleanupResult> {
  return new Promise((resolve) => {
    const pythonCode = `
import os
import sys
import json
import warnings

warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

os.environ["TINKER_API_KEY"] = """${apiKey.replace(/"/g, '\\"')}"""

try:
    import tinker

    service_client = tinker.ServiceClient()
    rest_client = service_client.create_rest_client()

    # List all user checkpoints
    response = rest_client.list_user_checkpoints(limit=1000).result()

    deleted = 0
    errors = []

    for ckpt in response.checkpoints:
        tinker_path = getattr(ckpt, "tinker_path", None)
        if tinker_path:
            try:
                rest_client.delete_checkpoint_from_tinker_path(tinker_path).result()
                deleted += 1
                print(f"Deleted: {tinker_path}", file=sys.stderr)
            except Exception as e:
                errors.append(f"{tinker_path}: {str(e)}")

    print(json.dumps({
        "success": True,
        "deleted": deleted,
        "errors": errors if errors else None
    }))

except ImportError:
    print(json.dumps({"success": False, "error": "Tinker SDK not installed"}))
except Exception as e:
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
        resolve({ success: false, error: stderr || "Cleanup failed" });
      }
    });

    python.on("error", (err) => {
      resolve({ success: false, error: `Failed to run Python: ${err.message}` });
    });

    // Longer timeout for cleanup operations
    setTimeout(() => {
      python.kill();
      resolve({ success: false, error: "Cleanup timed out" });
    }, 120000);
  });
}
