"use client";

import { useStudioStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Sparkles } from "lucide-react";

export function CheckpointSamples() {
  const checkpointSamples = useStudioStore((s) => s.execution.checkpointSamples);

  if (checkpointSamples.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
        <Sparkles className="h-8 w-8 mb-2 opacity-50" />
        <p>Checkpoint samples will appear here</p>
        <p className="text-xs mt-1">Samples are generated when checkpoints are saved</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {checkpointSamples.map((sample, idx) => (
          <Card key={idx} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  Step {sample.step}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {new Date(sample.timestamp).toLocaleTimeString()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-3">
              <div className="flex gap-2">
                <MessageSquare className="h-4 w-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Prompt</p>
                  <p className="text-sm text-zinc-300">{sample.prompt}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Bot className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Response</p>
                  <p className="text-sm text-zinc-100 whitespace-pre-wrap">{sample.response}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
