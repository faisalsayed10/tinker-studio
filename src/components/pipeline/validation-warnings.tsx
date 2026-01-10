"use client";

import { useStudioStore } from "@/lib/store";
import { AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ValidationWarnings() {
  const getValidationWarnings = useStudioStore((s) => s.getValidationWarnings);
  const warnings = getValidationWarnings();

  if (warnings.length === 0) return null;

  return (
    <div className="sticky top-[61px] z-10 border-b border-border/60 bg-background/95 backdrop-blur-sm px-6 py-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <h3 className="text-xs font-semibold">
          {warnings.length} {warnings.length === 1 ? 'Warning' : 'Warnings'}
        </h3>
      </div>
      <div className="space-y-1.5">
        {warnings.map((warning, index) => (
          <div
            key={`${warning.field}-${index}`}
            className={cn(
              "flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs border transition-colors",
              warning.severity === "error"
                ? "bg-red-500/5 text-red-400 border-red-500/20"
                : "bg-yellow-500/5 text-yellow-400 border-yellow-500/20"
            )}
          >
            <span className="font-medium text-[10px] text-muted-foreground mt-0.5">{warning.field}:</span>
            <span className="flex-1">{warning.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
