"use client";

import { cn } from "@/lib/utils";
import { ChevronRight, LucideIcon } from "lucide-react";

interface PipelineBlockProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isLast?: boolean;
}

export function PipelineBlock({
  icon: Icon,
  title,
  subtitle,
  isExpanded,
  onToggle,
  children,
  isLast,
}: PipelineBlockProps) {
  return (
    <div className="relative">
      {/* Block Header */}
      <button
        onClick={onToggle}
        className="group flex w-full items-center gap-3 py-2.5 text-left rounded-lg hover:bg-muted/30 -ml-2 pl-2 pr-1 transition-colors"
      >
        {/* Node indicator on the line */}
        <div className="relative z-10 shrink-0">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-200",
              isExpanded
                ? "bg-blue-600 border-blue-600 shadow-sm"
                : "bg-muted/50 border-border group-hover:border-muted-foreground/40 group-hover:bg-muted"
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                isExpanded ? "text-white" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
          </div>
        </div>

        {/* Block Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium group-hover:text-foreground transition-colors">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground/70 truncate mt-0.5">{subtitle}</div>
          )}
        </div>

        {/* Expand/Collapse */}
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-all duration-200 group-hover:text-foreground",
            isExpanded && "rotate-90"
          )}
        />
      </button>

      {/* Block Content with smooth transition */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-10 pb-3 pt-2">
            <div className="rounded-lg border border-border/60 bg-card/50 p-4 shadow-sm">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
