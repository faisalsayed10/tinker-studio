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
        className="group flex w-full items-center gap-3 py-2 text-left"
      >
        {/* Node indicator on the line */}
        <div className="relative z-10 shrink-0">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
              isExpanded
                ? "bg-primary border-primary"
                : "bg-muted border-border group-hover:border-muted-foreground/50"
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                isExpanded ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
          </div>
        </div>

        {/* Block Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium group-hover:text-foreground transition-colors">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
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
          "grid transition-all duration-200 ease-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-10 pb-2 pt-1">
            <div className="rounded-lg border border-border bg-card p-3">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
