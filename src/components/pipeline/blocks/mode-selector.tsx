"use client";

import { useStudioStore } from "@/lib/store";
import { TrainingMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GraduationCap, Gamepad2 } from "lucide-react";

export function ModeSelector() {
  const { config, setMode } = useStudioStore();

  return (
    <div className="p-4 border-b border-border">
      <div className="mb-3">
        <h3 className="text-sm font-medium">Training Mode</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose your training paradigm
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ModeCard
          mode="sft"
          currentMode={config.mode}
          icon={GraduationCap}
          title="Supervised"
          description="Learn from labeled examples"
          onClick={() => setMode("sft")}
        />
        <ModeCard
          mode="rl"
          currentMode={config.mode}
          icon={Gamepad2}
          title="RL (GRPO)"
          description="Learn from rewards"
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
  description: string;
  onClick: () => void;
}

function ModeCard({
  mode,
  currentMode,
  icon: Icon,
  title,
  description,
  onClick,
}: ModeCardProps) {
  const isSelected = mode === currentMode;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-md border p-2.5 text-left transition-all",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            isSelected ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span className={cn("text-sm font-medium", isSelected && "text-primary")}>
          {title}
        </span>
      </div>
      <span className="text-[11px] text-muted-foreground pl-[22px]">{description}</span>
    </button>
  );
}
