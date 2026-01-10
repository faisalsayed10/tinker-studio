"use client";

import { useStudioStore } from "@/lib/store";
import { ModeSelector } from "./blocks/mode-selector";
import { ModelConfig } from "./blocks/model-config";
import { DatasetConfig } from "./blocks/dataset-config";
import { HyperparametersConfig } from "./blocks/hyperparameters-config";
import { RLConfig } from "./blocks/rl-config";
import { CheckpointingConfig } from "./blocks/checkpointing-config";
import { ValidationWarnings } from "./validation-warnings";
import { ResumeIndicator } from "./blocks/resume-indicator";
import { Layers } from "lucide-react";

export function PipelineBuilder() {
  const config = useStudioStore((s) => s.config);

  const blocks = [
    { id: "model", component: ModelConfig },
    { id: "dataset", component: DatasetConfig },
    { id: "hyperparameters", component: HyperparametersConfig },
    ...(config.mode === "rl" ? [{ id: "rl", component: RLConfig }] : []),
    { id: "checkpointing", component: CheckpointingConfig },
  ];

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Pipeline Header */}
      <div className="sticky top-0 z-10 border-b border-zinc-800/50 bg-black/80 backdrop-blur-sm px-4 h-12 flex items-center">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-medium">Pipeline</h2>
        </div>
      </div>

      {/* Training Mode Selector */}
      <ModeSelector />

      {/* Resume Indicator - shows when resuming from checkpoint */}
      <ResumeIndicator />

      {/* Pipeline Steps with continuous connector line */}
      <div className="relative px-4 pb-4 flex-1">
        {/* Vertical connector line - centered on icons (16px padding + 14px half-icon = 30px) */}
        <div
          className="absolute left-[30px] top-3 bottom-6 w-px bg-gradient-to-b from-zinc-700 via-zinc-800 to-transparent"
          aria-hidden="true"
        />

        {/* Pipeline Blocks */}
        <div className="relative flex flex-col gap-0.5">
          {blocks.map((block, index) => {
            const Component = block.component;
            return (
              <Component
                key={block.id}
                isLast={index === blocks.length - 1}
              />
            );
          })}
        </div>
      </div>

      {/* Validation Warnings */}
      <ValidationWarnings />
    </div>
  );
}
