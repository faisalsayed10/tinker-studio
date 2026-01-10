"use client";

import { useStudioStore } from "@/lib/store";
import { AlertTriangle, XCircle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function ValidationWarnings() {
  const getValidationWarnings = useStudioStore((s) => s.getValidationWarnings);
  const warnings = getValidationWarnings();

  if (warnings.length === 0) return null;

  const errorCount = warnings.filter(w => w.severity === "error").length;
  const warningCount = warnings.filter(w => w.severity === "warning").length;

  return (
    <div className="border-t border-zinc-800/50 p-4 mt-auto bg-zinc-900/30">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-3.5 w-3.5 text-zinc-500" />
        <h3 className="text-xs font-medium text-zinc-400">
          Validation
        </h3>
        <div className="flex items-center gap-1 ml-auto">
          {errorCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
              {warningCount} warning{warningCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        {warnings.map((warning, index) => (
          <div
            key={`${warning.field}-${index}`}
            className={cn(
              "flex items-start gap-2 rounded-md px-2.5 py-2 text-xs animate-fade-in",
              warning.severity === "error"
                ? "bg-red-500/10 text-red-300 border border-red-500/20"
                : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
            )}
          >
            {warning.severity === "error" ? (
              <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{warning.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
