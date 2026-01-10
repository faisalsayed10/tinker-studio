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
    <div className="flex flex-col h-full">
      {/* Pipeline Header */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-sm px-6 py-4">
        <h2 className="text-sm font-semibold tracking-tight">Pipeline Configuration</h2>
        <p className="text-xs text-muted-foreground/80 mt-0.5">Configure your training pipeline</p>
      </div>

      {/* Validation Warnings - Sticky at top when present */}
      <ValidationWarnings />

      {/* Training Mode Selector */}
      <ModeSelector />

      {/* Resume Indicator - shows when resuming from checkpoint */}
      <ResumeIndicator />

      {/* Pipeline Steps with continuous connector line */}
      <div className="relative px-6 pb-6">
        {/* Vertical connector line - centered on icons */}
        <div
          className="absolute left-[38px] top-3 bottom-6 w-0.5 bg-gradient-to-b from-border/60 to-border/20"
          aria-hidden="true"
        />

        {/* Pipeline Blocks */}
        <div className="relative flex flex-col gap-2">
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
    </div>
  );
}
