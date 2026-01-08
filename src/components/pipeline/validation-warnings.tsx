"use client";

import { useStudioStore } from "@/lib/store";
import { AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ValidationWarnings() {
  const getValidationWarnings = useStudioStore((s) => s.getValidationWarnings);
  const warnings = getValidationWarnings();

  if (warnings.length === 0) return null;

  return (
    <div className="border-t border-border p-4">
      <h3 className="text-xs font-medium text-muted-foreground mb-2">
        Validation
      </h3>
      <div className="space-y-2">
        {warnings.map((warning, index) => (
          <div
            key={`${warning.field}-${index}`}
            className={cn(
              "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
              warning.severity === "error"
                ? "bg-red-500/10 text-red-400"
                : "bg-yellow-500/10 text-yellow-400"
            )}
          >
            {warning.severity === "error" ? (
              <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            )}
            <span>{warning.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
