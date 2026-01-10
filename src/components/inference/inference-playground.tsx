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
  AlertCircle,
  Sparkles,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { CheckpointBrowser } from "@/components/checkpoints/checkpoint-browser";
import { cn } from "@/lib/utils";

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
  const [showSettings, setShowSettings] = useState(true);
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
        updateLastMessage(data.data.text);
      } else {
        // Handle error
        if (data.code === "PYTHON_NOT_AVAILABLE") {
          setInferenceError(
            "Python runtime not available. Deploy to Railway for full inference support, or run locally with Python."
          );
          updateLastMessage(
            "Python runtime required for inference. The generated training code can be run locally with:\n\npip install tinker transformers\npython tinker_training.py"
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

  const selectedCheckpoint = checkpoints.find(c => c.path === inference.config.model);

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Compact Config Bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-zinc-800/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Select
            value={inference.config.model}
            onValueChange={(value) => setInferenceConfig({ model: value })}
            disabled={checkpoints.length === 0}
          >
            <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 w-48">
              <SelectValue placeholder="Select checkpoint" />
            </SelectTrigger>
            <SelectContent>
              {checkpoints.length === 0 ? (
                <div className="px-2 py-3 text-xs text-zinc-500 text-center">
                  No checkpoints available
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCheckpointBrowserOpen(true)}
            className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "h-8 px-2 text-xs",
              showSettings ? "text-blue-400 bg-blue-500/10" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            disabled={inference.messages.length === 0}
            className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Collapsible Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-zinc-800/50 bg-zinc-900/30 animate-fade-in">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Max Tokens</Label>
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
                className="h-8 text-xs bg-zinc-800/50 border-zinc-800"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Temperature</Label>
                <span className="text-xs text-zinc-400 font-mono">{inference.config.temperature.toFixed(1)}</span>
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
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Top P</Label>
                <span className="text-xs text-zinc-400 font-mono">{inference.config.topP.toFixed(2)}</span>
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
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-6 space-y-4">
          {inference.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-blue-400" />
              </div>
              <p className="text-sm text-zinc-300 font-medium mb-1">
                Test Your Model
              </p>
              <p className="text-xs text-zinc-500 max-w-xs">
                Select a checkpoint and start chatting to test your fine-tuned model
              </p>
            </div>
          ) : (
            inference.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-fade-in",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-zinc-800/80 text-zinc-100 rounded-bl-md"
                  )}
                >
                  {message.content || (
                    <span className="flex items-center gap-2 text-zinc-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating...
                    </span>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center">
                    <User className="h-4 w-4 text-zinc-300" />
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
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <div className="flex items-start gap-2 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{inference.error}</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-zinc-800/50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={inference.config.model ? "Type a message..." : "Select a checkpoint first..."}
            disabled={inference.isGenerating || !inference.config.model}
            className="flex-1 h-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 rounded-lg"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || inference.isGenerating || !inference.config.model}
            className="h-10 w-10 p-0 bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-40"
          >
            {inference.isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Checkpoint Browser */}
      <CheckpointBrowser
        open={checkpointBrowserOpen}
        onOpenChange={setCheckpointBrowserOpen}
      />
    </div>
  );
}
