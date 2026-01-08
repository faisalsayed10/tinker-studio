"use client";

import { useState, useRef, useEffect } from "react";
import { useStudioStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Loader2,
  Trash2,
  Bot,
  User,
  Settings2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { CheckpointBrowser } from "@/components/checkpoints/checkpoint-browser";

export function InferencePlayground() {
  const {
    settings,
    inference,
    checkpoints,
    checkpointBrowserOpen,
    addMessage,
    updateLastMessage,
    clearMessages,
    setInferenceConfig,
    setIsGenerating,
    setInferenceError,
    setSettingsOpen,
    setCheckpointBrowserOpen,
  } = useStudioStore();

  const [inputValue, setInputValue] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [inference.messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);


  const handleSend = async () => {
    if (!inputValue.trim() || inference.isGenerating) return;

    // Check for checkpoint selected
    if (!inference.config.model) {
      toast.error("Please select a checkpoint first");
      return;
    }

    // Check for API key
    if (!settings.apiKey) {
      toast.error("Please configure your Tinker API key first", {
        action: {
          label: "Settings",
          onClick: () => setSettingsOpen(true),
        },
      });
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue("");

    // Add user message
    addMessage({ role: "user", content: userMessage });

    // Add placeholder assistant message
    addMessage({ role: "assistant", content: "" });

    setIsGenerating(true);
    setInferenceError(undefined);

    const startTime = Date.now();

    try {
      // Build messages array for API
      const apiMessages = [
        ...inference.messages.filter((m) => m.content), // Filter out empty messages
        { role: "user" as const, content: userMessage },
      ];

      const response = await fetch("/api/tinker/sample", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          model: inference.config.model,
          messages: apiMessages,
          temperature: inference.config.temperature,
          topP: inference.config.topP,
          maxTokens: inference.config.maxTokens,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const latencyMs = Date.now() - startTime;
        updateLastMessage(data.data.text);
        // Update with metadata (would need to extend the store for this)
      } else {
        // Handle error
        if (data.code === "PYTHON_NOT_AVAILABLE") {
          setInferenceError(
            "Python runtime not available. Deploy to Railway for full inference support, or run locally with Python."
          );
          updateLastMessage(
            "⚠️ Python runtime required for inference. The generated training code can be run locally with:\n\n```bash\npip install tinker transformers\npython tinker_training.py\n```"
          );
        } else {
          setInferenceError(data.error || "Failed to generate response");
          updateLastMessage(`Error: ${data.error || "Failed to generate response"}`);
        }
      }
    } catch (error) {
      setInferenceError("Network error. Please check your connection.");
      updateLastMessage("Error: Network error. Please check your connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">Inference Playground</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
          >
            <Settings2 className="h-3.5 w-3.5 mr-1" />
            Settings
            {showSettings ? (
              <ChevronUp className="h-3 w-3 ml-1" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-1" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            disabled={inference.messages.length === 0}
            className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Model Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-400">Model</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCheckpointBrowserOpen(true)}
                  className="h-5 px-1.5 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                >
                  <FolderOpen className="h-3 w-3 mr-1" />
                  Browse
                </Button>
              </div>
              <Select
                value={inference.config.model}
                onValueChange={(value) => setInferenceConfig({ model: value })}
                disabled={checkpoints.length === 0}
              >
                <SelectTrigger className="h-8 text-xs bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select a checkpoint" />
                </SelectTrigger>
                <SelectContent>
                  {checkpoints.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-zinc-500 text-center">
                      No checkpoints available.
                      <br />
                      Train a model first or browse for checkpoints.
                    </div>
                  ) : (
                    checkpoints.map((checkpoint) => (
                      <SelectItem
                        key={checkpoint.path}
                        value={checkpoint.path}
                        className="text-xs"
                      >
                        {checkpoint.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Max Tokens */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Max Tokens</Label>
              <Input
                type="number"
                value={inference.config.maxTokens}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value)) return;
                  setInferenceConfig({ maxTokens: Math.min(4096, Math.max(1, value)) });
                }}
                min={1}
                max={4096}
                className="h-8 text-xs bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Temperature */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-400">Temperature</Label>
                <span className="text-xs text-zinc-500">
                  {inference.config.temperature.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[inference.config.temperature]}
                onValueChange={([value]) => setInferenceConfig({ temperature: value })}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Top P */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-400">Top P</Label>
                <span className="text-xs text-zinc-500">
                  {inference.config.topP.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[inference.config.topP]}
                onValueChange={([value]) => setInferenceConfig({ topP: value })}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 px-4">
        <div className="py-4 space-y-4">
          {inference.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Bot className="h-12 w-12 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">
                Test your trained model with inference
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Select a checkpoint or browse for trained models
              </p>
            </div>
          ) : (
            inference.messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-100"
                  }`}
                >
                  {message.content || (
                    <span className="flex items-center gap-2 text-zinc-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating...
                    </span>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Error Banner */}
      {inference.error && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-800/50">
          <div className="flex items-start gap-2 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{inference.error}</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={inference.isGenerating}
            className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || inference.isGenerating || !inference.config.model}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {inference.isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          Press Enter to send{inference.config.model && ` • ${checkpoints.find(c => c.path === inference.config.model)?.name || inference.config.model.split("/").pop()}`}
        </p>
      </div>

      {/* Checkpoint Browser */}
      <CheckpointBrowser
        open={checkpointBrowserOpen}
        onOpenChange={setCheckpointBrowserOpen}
      />
    </div>
  );
}
