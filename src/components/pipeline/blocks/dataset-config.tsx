"use client";

import { useState } from "react";
import { useStudioStore } from "@/lib/store";
import { DATASET_PRESETS } from "@/lib/types";
import { PipelineBlock } from "./pipeline-block";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database } from "lucide-react";

interface DatasetConfigProps {
  isLast?: boolean;
}

export function DatasetConfig({ isLast }: DatasetConfigProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { config, setDataset } = useStudioStore();

  const presets = DATASET_PRESETS[config.mode];
  const selectedPreset = presets.find((d) => d.id === config.dataset.preset);

  return (
    <PipelineBlock
      icon={Database}
      title="Dataset"
      subtitle={selectedPreset?.name ?? "Select a dataset"}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      isLast={isLast}
    >
      <div className="space-y-4">
        {/* Dataset Preset */}
        <div className="space-y-2">
          <Label className="text-xs">Dataset</Label>
          <Select
            value={config.dataset.preset}
            onValueChange={(value) => setDataset({ preset: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a dataset" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((dataset) => (
                <SelectItem key={dataset.id} value={dataset.id}>
                  <div className="flex flex-col items-start">
                    <span>{dataset.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {dataset.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dataset Info */}
        {selectedPreset && selectedPreset.id !== "custom" && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">
              {config.mode === "sft" ? (
                <p>
                  This dataset contains instruction-response pairs for supervised fine-tuning.
                  The model will learn to generate responses that match the training examples.
                </p>
              ) : (
                <p>
                  This dataset contains problems with verifiable answers.
                  The model will learn through trial and error using the reward signal.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Custom Dataset Notice */}
        {config.dataset.preset === "custom" && (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3">
            <p className="text-xs text-muted-foreground">
              Custom dataset support coming soon. For now, use one of the preset datasets
              or modify the generated code to load your own data.
            </p>
          </div>
        )}
      </div>
    </PipelineBlock>
  );
}
