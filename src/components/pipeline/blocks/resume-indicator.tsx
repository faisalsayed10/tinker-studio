"use client";

import { useStudioStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { PlayCircle, X, RotateCcw } from "lucide-react";

export function ResumeIndicator() {
  const { config, clearResumeFrom } = useStudioStore();

  if (!config.resumeFrom) {
    return null;
  }

  return (
    <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <PlayCircle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-amber-200">
              Resuming Training
            </h4>
            <p className="text-xs text-amber-300/80 mt-1">
              Training will resume from step {config.resumeFrom.fromStep} using checkpoint{" "}
              <span className="font-mono">{config.resumeFrom.checkpointLabel}</span>
            </p>
            {config.resumeFrom.jobId && (
              <p className="text-xs text-amber-400/60 mt-1 font-mono truncate">
                Original job: {config.resumeFrom.jobId}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearResumeFrom}
          className="flex-shrink-0 h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
          title="Clear resume state and start fresh"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>
      <div className="mt-2 pt-2 border-t border-amber-500/20">
        <p className="text-xs text-amber-300/60 flex items-center gap-1">
          <RotateCcw className="h-3 w-3" />
          Click &quot;Clear&quot; to start a fresh training run instead
        </p>
      </div>
    </div>
  );
}
