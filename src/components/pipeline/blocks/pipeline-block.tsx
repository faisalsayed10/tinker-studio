"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, LucideIcon } from "lucide-react";

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
        className="group flex w-full items-center gap-3 py-2.5 text-left"
      >
        {/* Node indicator on the line */}
        <div className="relative z-10 shrink-0">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200",
              isExpanded
                ? "bg-blue-500/20 ring-1 ring-blue-500/30"
                : "bg-zinc-800/80 group-hover:bg-zinc-800"
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                isExpanded ? "text-blue-400" : "text-zinc-400 group-hover:text-zinc-300"
              )}
            />
          </div>
        </div>

        {/* Block Info */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "text-sm font-medium transition-colors",
            isExpanded ? "text-zinc-100" : "text-zinc-300 group-hover:text-zinc-100"
          )}>{title}</div>
          {subtitle && (
            <div className="text-[11px] text-zinc-500 truncate mt-0.5">{subtitle}</div>
          )}
        </div>

        {/* Expand/Collapse */}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-zinc-600 transition-all duration-200 group-hover:text-zinc-400",
            isExpanded && "rotate-180 text-zinc-400"
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
          <div className="ml-10 pb-3 pt-1">
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-3 space-y-3">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
