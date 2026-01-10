"use client";

import { useStudioStore } from "@/lib/store";
import { TrainingMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GraduationCap, Gamepad2, Check } from "lucide-react";

export function ModeSelector() {
  const { config, setMode } = useStudioStore();

  return (
    <div className="p-4 border-b border-zinc-800/50">
      <div className="grid grid-cols-2 gap-2">
        <ModeCard
          mode="sft"
          currentMode={config.mode}
          icon={GraduationCap}
          title="Supervised Fine-Tuning"
          shortTitle="SFT"
          description="Learn from labeled examples"
          onClick={() => setMode("sft")}
        />
        <ModeCard
          mode="rl"
          currentMode={config.mode}
          icon={Gamepad2}
          title="Reinforcement Learning"
          shortTitle="GRPO"
          description="Learn from reward signals"
          onClick={() => setMode("rl")}
        />
      </div>
    </div>
  );
}

interface ModeCardProps {
  mode: TrainingMode;
  currentMode: TrainingMode;
  icon: React.ElementType;
  title: string;
  shortTitle: string;
  description: string;
  onClick: () => void;
}

function ModeCard({
  mode,
  currentMode,
  icon: Icon,
  title,
  shortTitle,
  description,
  onClick,
}: ModeCardProps) {
  const isSelected = mode === currentMode;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
        isSelected
          ? "border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/5"
          : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
          <Check className="h-2.5 w-2.5 text-white" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className={cn(
          "h-7 w-7 rounded-md flex items-center justify-center",
          isSelected ? "bg-blue-500/20" : "bg-zinc-800"
        )}>
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              isSelected ? "text-blue-400" : "text-zinc-400"
            )}
          />
        </div>
        <div className="flex flex-col">
          <span className={cn(
            "text-xs font-medium",
            isSelected ? "text-blue-400" : "text-zinc-200"
          )}>
            {shortTitle}
          </span>
        </div>
      </div>
      <span className="text-[11px] text-zinc-500 leading-tight">{description}</span>
    </button>
  );
}
