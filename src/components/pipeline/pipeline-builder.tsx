"use client";

import { useStudioStore } from "@/lib/store";
import { ModeSelector } from "./blocks/mode-selector";
import { ModelConfig } from "./blocks/model-config";
import { DatasetConfig } from "./blocks/dataset-config";
import { HyperparametersConfig } from "./blocks/hyperparameters-config";
import { RLConfig } from "./blocks/rl-config";
import { CheckpointingConfig } from "./blocks/checkpointing-config";
import { ValidationWarnings } from "./validation-warnings";

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
      <div className="sticky top-0 z-10 border-b border-border bg-black px-4 py-3">
        <h2 className="text-sm font-medium text-muted-foreground">Pipeline Configuration</h2>
      </div>

      {/* Training Mode Selector */}
      <ModeSelector />

      {/* Pipeline Steps with continuous connector line */}
      <div className="relative px-4 pb-4">
        {/* Vertical connector line - centered on icons (16px padding + 14px half-icon = 30px) */}
        <div
          className="absolute left-[30px] top-3 bottom-6 w-0.5 bg-border/60"
          aria-hidden="true"
        />

        {/* Pipeline Blocks */}
        <div className="relative flex flex-col gap-1">
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
