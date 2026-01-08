"use client";

import { useState } from "react";
import { useStudioStore } from "@/lib/store";
import { PipelineBlock } from "./pipeline-block";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings2, HelpCircle } from "lucide-react";

interface HyperparametersConfigProps {
  isLast?: boolean;
}

export function HyperparametersConfig({ isLast }: HyperparametersConfigProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { config, setHyperparameters } = useStudioStore();

  const formatLR = (lr: number) => {
    if (lr >= 0.001) return lr.toFixed(4);
    return lr.toExponential(0);
  };

  return (
    <PipelineBlock
      icon={Settings2}
      title="Hyperparameters"
      subtitle={`LR: ${formatLR(config.hyperparameters.learningRate)}, Batch: ${config.hyperparameters.batchSize}`}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      isLast={isLast}
    >
      <div className="space-y-4">
        {/* Learning Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Learning Rate</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px]">
                  <p className="text-xs">
                    Controls how much weights update per step.
                    <br />• Too high → unstable training
                    <br />• Too low → slow convergence
                    <br />• 1e-4 is standard for LoRA fine-tuning
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {config.hyperparameters.learningRate.toExponential(0)}
            </span>
          </div>
          <Slider
            value={[Math.log10(config.hyperparameters.learningRate)]}
            onValueChange={([v]) => setHyperparameters({ learningRate: Math.pow(10, v) })}
            min={-6}
            max={-2}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1e-6</span>
            <span>1e-4</span>
            <span>1e-2</span>
          </div>
        </div>

        {/* Batch Size & Epochs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Batch Size</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">
                    Number of examples per gradient update.
                    Larger = more stable but slower per step.
                    128 is a good default.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              value={config.hyperparameters.batchSize}
              onChange={(e) =>
                setHyperparameters({ batchSize: parseInt(e.target.value) || 128 })
              }
              min={1}
              max={512}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Epochs</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">
                    Number of passes through the dataset.
                    1-3 epochs is typical for fine-tuning.
                    More can lead to overfitting.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              value={config.hyperparameters.epochs}
              onChange={(e) =>
                setHyperparameters({ epochs: parseInt(e.target.value) || 1 })
              }
              min={1}
              max={10}
              className="h-9"
            />
          </div>
        </div>

        {/* Warmup Ratio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Warmup Ratio</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">
                    Fraction of training spent warming up the learning rate.
                    Helps prevent early instability. 0.1 (10%) is typical.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {(config.hyperparameters.warmupRatio * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[config.hyperparameters.warmupRatio]}
            onValueChange={([v]) => setHyperparameters({ warmupRatio: v })}
            min={0}
            max={0.5}
            step={0.05}
            className="w-full"
          />
        </div>

        {/* Gradient Accumulation */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Gradient Accumulation Steps</Label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-xs">
                  Accumulate gradients over multiple batches before updating.
                  Effective batch = batch_size × accumulation_steps.
                  Useful for simulating larger batches.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            type="number"
            value={config.hyperparameters.gradientAccumulation}
            onChange={(e) =>
              setHyperparameters({
                gradientAccumulation: parseInt(e.target.value) || 1,
              })
            }
            min={1}
            max={64}
            className="h-9"
          />
        </div>
      </div>
    </PipelineBlock>
  );
}
