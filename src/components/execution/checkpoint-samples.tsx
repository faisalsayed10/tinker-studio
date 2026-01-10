"use client";

import { useStudioStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Sparkles, MessageCircle } from "lucide-react";

export function CheckpointSamples() {
  const checkpointSamples = useStudioStore((s) => s.execution.checkpointSamples);

  if (checkpointSamples.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-8 bg-black">
        <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
          <MessageCircle className="h-5 w-5 text-zinc-500" />
        </div>
        <p className="text-sm text-zinc-400 mb-1">No samples yet</p>
        <p className="text-xs text-zinc-600">
          Model outputs will appear when checkpoints are saved
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full bg-black">
      <div className="p-4 space-y-3">
        {checkpointSamples.map((sample, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-medium text-zinc-200">Step {sample.step}</span>
              </div>
              <span className="text-[10px] text-zinc-500">
                {new Date(sample.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
              {/* Prompt */}
              <div className="flex gap-2.5">
                <div className="flex-shrink-0 w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center">
                  <User className="h-3 w-3 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Prompt</p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{sample.prompt}</p>
                </div>
              </div>

              {/* Response */}
              <div className="flex gap-2.5">
                <div className="flex-shrink-0 w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                  <Bot className="h-3 w-3 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Response</p>
                  <p className="text-xs text-zinc-100 whitespace-pre-wrap leading-relaxed">{sample.response}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
