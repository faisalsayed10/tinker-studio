import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/tinker/sample
 * Run inference using Tinker's OpenAI-compatible API
 *
 * Automatically handles both instruct models (with chat templates) and
 * base models (without chat templates) by trying /chat/completions first
 * and falling back to /completions if needed.
 */

interface SampleRequest {
  apiKey: string;
  model: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

const TINKER_API_BASE = process.env.TINKER_API_BASE || "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1";

export async function POST(request: NextRequest) {
  try {
    const body: SampleRequest = await request.json();

    const {
      apiKey,
      model,
      messages,
      temperature = 0.7,
      topP = 0.95,
      maxTokens = 512,
    } = body;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API key is required" },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        { success: false, error: "Model is required" },
        { status: 400 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Messages are required" },
        { status: 400 }
      );
    }

    // Validate: OpenAI-compatible endpoint requires sampler checkpoints
    if (model.startsWith("tinker://") && model.includes("/weights/") && !model.includes("/sampler_weights/")) {
      return NextResponse.json(
        {
          success: false,
          error: "Inference requires sampler checkpoints (sampler_weights/...), not training checkpoints (weights/...). Please select a sampler checkpoint.",
        },
        { status: 400 }
      );
    }

    const cleanMessages = messages.map(({ role, content }) => ({ role, content }));

    // Try /chat/completions first (for instruct models with chat templates)
    const chatResponse = await fetch(`${TINKER_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: cleanMessages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
      }),
    });

    if (chatResponse.ok) {
      const data = await chatResponse.json();
      const text = data.choices?.[0]?.message?.content;
      const tokenCount = data.usage?.completion_tokens;

      if (text) {
        return NextResponse.json({
          success: true,
          data: { text, tokenCount: tokenCount || 0 },
        });
      }
    }

    // Check if it's a chat template error - if so, fallback to /completions
    const errorText = await chatResponse.text();
    const isChatTemplateError = errorText.includes("chat_template") ||
                                 errorText.includes("chat template") ||
                                 errorText.includes("tokenizer");

    if (!isChatTemplateError) {
      // Some other error - return it
      let errorMessage = `API request failed: ${chatResponse.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData?.error?.message || errorData?.detail || errorMessage;
      } catch {
        if (errorText) errorMessage = errorText;
      }
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: chatResponse.status }
      );
    }

    // Fallback to /completions for base models without chat templates
    const lastUserMessage = cleanMessages.filter(m => m.role === "user").pop();
    const prompt = lastUserMessage?.content || "";

    const completionResponse = await fetch(`${TINKER_API_BASE}/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
      }),
    });

    if (!completionResponse.ok) {
      const completionErrorText = await completionResponse.text();
      let errorMessage = `API request failed: ${completionResponse.status}`;
      try {
        const errorData = JSON.parse(completionErrorText);
        errorMessage = errorData?.error?.message || errorData?.detail || errorMessage;
      } catch {
        if (completionErrorText) errorMessage = completionErrorText;
      }
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: completionResponse.status }
      );
    }

    const data = await completionResponse.json();
    const text = data.choices?.[0]?.text?.trim();
    const tokenCount = data.usage?.completion_tokens;

    if (!text) {
      return NextResponse.json(
        { success: false, error: "No response generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { text, tokenCount: tokenCount || 0 },
    });
  } catch (error) {
    console.error("Error in sample endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to run inference",
      },
      { status: 500 }
    );
  }
}
