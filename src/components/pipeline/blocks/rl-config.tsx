"use client";

import { useState } from "react";
import { useStudioStore } from "@/lib/store";
import { REWARD_FUNCTIONS } from "@/lib/types";
import { PipelineBlock } from "./pipeline-block";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Gamepad2, HelpCircle } from "lucide-react";

interface RLConfigProps {
  isLast?: boolean;
}

export function RLConfig({ isLast }: RLConfigProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { config, setRLConfig } = useStudioStore();

  const rl = config.rl;
  if (!rl) return null;

  const selectedReward = REWARD_FUNCTIONS.find((r) => r.id === rl.rewardFunction);

  return (
    <PipelineBlock
      icon={Gamepad2}
      title="RL Settings (GRPO)"
      subtitle={selectedReward?.name ?? "Configure rewards"}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      isLast={isLast}
    >
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
          <p className="text-xs text-blue-400">
            Using Group Relative Policy Optimization (GRPO). The model generates
            multiple responses per prompt and learns from comparative rewards.
          </p>
        </div>

        {/* Reward Function */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Reward Function</Label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[280px]">
                <p className="text-xs">
                  How to score model outputs. Choose based on your task:
                  <br />• Math tasks → Math Equivalence
                  <br />• Exact answers → Exact Match
                  <br />• Code tasks → Code Execution
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Select
            value={rl.rewardFunction}
            onValueChange={(value) => setRLConfig({ rewardFunction: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REWARD_FUNCTIONS.map((reward) => (
                <SelectItem key={reward.id} value={reward.id}>
                  <div className="flex flex-col items-start">
                    <span>{reward.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {reward.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Group Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Group Size</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">
                    Number of samples per prompt for GRPO.
                    More samples = better reward signal but slower.
                    16 is a good balance.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {rl.groupSize} samples
            </span>
          </div>
          <Slider
            value={[rl.groupSize]}
            onValueChange={([v]) => setRLConfig({ groupSize: v })}
            min={4}
            max={32}
            step={4}
            className="w-full"
          />
        </div>

        {/* Temperature & KL Coefficient */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Temperature</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">
                    Sampling temperature for rollouts.
                    Higher = more diverse samples.
                    0.7-1.0 is typical for RL.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              value={rl.temperature}
              onChange={(e) =>
                setRLConfig({ temperature: parseFloat(e.target.value) || 0.7 })
              }
              min={0.1}
              max={2}
              step={0.1}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">KL Coefficient</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">
                    Penalty for deviating from base model.
                    Higher = more conservative updates.
                    0.1 is a good starting point.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              value={rl.klCoefficient}
              onChange={(e) =>
                setRLConfig({ klCoefficient: parseFloat(e.target.value) || 0.1 })
              }
              min={0}
              max={1}
              step={0.05}
              className="h-9"
            />
          </div>
        </div>
      </div>
    </PipelineBlock>
  );
}
