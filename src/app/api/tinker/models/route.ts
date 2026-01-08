import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

/**
 * GET /api/tinker/models
 * Returns available models from Tinker API
 *
 * Models are fetched dynamically from Tinker - no hardcoded fallbacks.
 * If no API key is provided or Tinker is unavailable, returns an error.
 */

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-tinker-api-key");

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "API key is required to fetch models. Please configure your Tinker API key in settings."
        },
        { status: 401 }
      );
    }

    // Fetch models from Tinker API
    const result = await fetchModelsFromTinker(apiKey);

    if (result.success && result.models) {
      return NextResponse.json({
        success: true,
        data: {
          models: result.models,
          source: "tinker",
        },
      });
    }

    // If Tinker API fails, return error
    return NextResponse.json(
      { success: false, error: result.error || "Failed to fetch models from Tinker" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

interface Model {
  id: string;
  name: string;
  params?: string;
  maxLength?: number;
  description?: string;
  recommended?: boolean;
  tokenizer?: {
    id?: string;
    trustRemoteCode?: boolean;
    revision?: string;
  };
}

interface FetchResult {
  success: boolean;
  models?: Model[];
  error?: string;
}

async function fetchModelsFromTinker(apiKey: string): Promise<FetchResult> {
  return new Promise((resolve) => {
    const pythonCode = `
import os
import json
import re

os.environ["TINKER_API_KEY"] = """${apiKey.replace(/"/g, '\\"')}"""

try:
    import tinker
    client = tinker.ServiceClient()
    caps = client.get_server_capabilities()

    # Extract model information from supported_models
    models = []
    if hasattr(caps, 'supported_models') and caps.supported_models:
        for model in caps.supported_models:
            model_name = model.model_name if hasattr(model, 'model_name') else str(model)
            if not model_name:
                continue

            # Parse model name to extract info (e.g., "meta-llama/Llama-3.1-8B")
            display_name = model_name.split('/')[-1] if '/' in model_name else model_name

            # Extract size from model name (e.g., "8B", "70B", "1.5B")
            size_match = re.search(r'(\\d+\\.?\\d*B)', display_name, re.IGNORECASE)
            params = size_match.group(1) if size_match else None

            model_info = {
                "id": model_name,
                "name": display_name.replace('-', ' '),
            }
            if params:
                model_info["params"] = params

            models.append(model_info)

    if not models:
        print(json.dumps({"success": False, "error": "No models available from Tinker API"}))
    else:
        print(json.dumps({"success": True, "models": models}))
except ImportError:
    print(json.dumps({"success": False, "error": "Tinker SDK not installed. Run: pip install tinker"}))
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
        resolve({ success: false, error: stderr || "Failed to fetch models" });
      }
    });

    python.on("error", (err) => {
      resolve({ success: false, error: `Failed to run Python: ${err.message}` });
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      python.kill();
      resolve({ success: false, error: "Request timed out" });
    }, 30000);
  });
}
