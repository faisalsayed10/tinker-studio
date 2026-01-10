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
    <div className="flex h-full bg-background">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 h-12 px-6 bg-card/30">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold">Inference Playground</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            disabled={inference.messages.length === 0}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 px-6 bg-card/20">
          <div className="py-6 space-y-4 max-w-3xl mx-auto">
            {inference.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-4">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Test your trained model
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Select a checkpoint from the sidebar and start chatting
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
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                      message.role === "user"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-card border border-border/60 text-foreground"
                    }`}
                  >
                    {message.content || (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Generating...
                      </span>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-foreground" />
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
          <div className="px-6 py-2.5 bg-red-500/5 border-t border-red-500/20">
            <div className="flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{inference.error}</span>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-6 border-t border-border/60 bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={inference.isGenerating}
                className="flex-1 h-10 bg-muted/50 border-border/60"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || inference.isGenerating || !inference.config.model}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700"
              >
                {inference.isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2">
              Press Enter to send{inference.config.model && ` • Using ${checkpoints.find(c => c.path === inference.config.model)?.name || inference.config.model.split("/").pop()}`}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sidebar */}
      <div className="w-80 border-l border-border/60 bg-card/30 flex flex-col">
        <div className="px-4 py-3 border-b border-border/60">
          <h3 className="text-sm font-semibold">Configuration</h3>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Inference settings</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Model Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Checkpoint</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCheckpointBrowserOpen(true)}
                  className="h-6 px-2 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
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
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select checkpoint" />
                </SelectTrigger>
                <SelectContent>
                  {checkpoints.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                      No checkpoints available.
                      <br />
                      Train a model first.
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

            <div className="h-px bg-border/60" />

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Max Tokens</Label>
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
                className="h-9 text-xs"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Temperature</Label>
                <span className="text-xs text-muted-foreground font-mono">
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
              <p className="text-[10px] text-muted-foreground/60">
                Higher values make output more random
              </p>
            </div>

            {/* Top P */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Top P</Label>
                <span className="text-xs text-muted-foreground font-mono">
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
              <p className="text-[10px] text-muted-foreground/60">
                Nucleus sampling threshold
              </p>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Checkpoint Browser */}
      <CheckpointBrowser
        open={checkpointBrowserOpen}
        onOpenChange={setCheckpointBrowserOpen}
      />
    </div>
  );
}
