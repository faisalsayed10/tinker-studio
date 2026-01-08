import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

/**
 * POST /api/tinker/validate
 * Validates a Tinker API key by calling the actual Tinker SDK
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { success: false, error: "API key is required" },
        { status: 400 }
      );
    }

    // Basic format check
    if (apiKey.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: "API key appears to be too short" },
        { status: 400 }
      );
    }

    // Validate by calling Tinker SDK
    const result = await validateWithTinker(apiKey.trim());

    if (result.valid) {
      return NextResponse.json({
        success: true,
        data: {
          validated: true,
          message: "API key verified with Tinker",
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || "Invalid API key" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error validating API key:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate API key" },
      { status: 500 }
    );
  }
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

async function validateWithTinker(apiKey: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const pythonCode = `
import os
import sys
import json

os.environ["TINKER_API_KEY"] = """${apiKey.replace(/"/g, '\\"')}"""

try:
    import tinker
    client = tinker.ServiceClient()
    caps = client.get_server_capabilities()
    print(json.dumps({"valid": True}))
except ImportError as e:
    print(json.dumps({"valid": False, "error": "Tinker SDK not installed. Run: pip install tinker"}))
except Exception as e:
    error_msg = str(e)
    if "unauthorized" in error_msg.lower() or "invalid" in error_msg.lower() or "401" in error_msg:
        print(json.dumps({"valid": False, "error": "Invalid API key"}))
    elif "connection" in error_msg.lower() or "network" in error_msg.lower():
        print(json.dumps({"valid": False, "error": "Could not connect to Tinker API"}))
    else:
        print(json.dumps({"valid": False, "error": f"Validation failed: {error_msg}"}))
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

    python.on("close", (code) => {
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch {
        // If we can't parse the output, check if Python is available
        if (stderr.includes("python3: command not found") || code === 127) {
          resolve({ valid: false, error: "Python 3 is required. Please install Python 3.9+" });
        } else if (stderr.includes("No module named 'tinker'")) {
          resolve({ valid: false, error: "Tinker SDK not installed. Run: pip install tinker" });
        } else {
          resolve({ valid: false, error: stderr || "Validation failed" });
        }
      }
    });

    python.on("error", (err) => {
      if (err.message.includes("ENOENT")) {
        resolve({ valid: false, error: "Python 3 is required. Please install Python 3.9+" });
      } else {
        resolve({ valid: false, error: `Failed to run validation: ${err.message}` });
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      python.kill();
      resolve({ valid: false, error: "Validation timed out" });
    }, 30000);
  });
}
