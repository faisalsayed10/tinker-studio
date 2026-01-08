"use client";

import { useState } from "react";
import { useStudioStore } from "@/lib/store";
import { PipelineBlock } from "./pipeline-block";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Save, HelpCircle } from "lucide-react";

interface CheckpointingConfigProps {
  isLast?: boolean;
}

export function CheckpointingConfig({ isLast }: CheckpointingConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { config, setCheckpointing } = useStudioStore();

  return (
    <PipelineBlock
      icon={Save}
      title="Checkpointing"
      subtitle={`Save every ${config.checkpointing.saveEvery} steps`}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      isLast={isLast}
    >
      <div className="space-y-4">
        {/* Save Frequency */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Save Every N Steps</Label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-xs">
                  How often to save model checkpoints.
                  More frequent = more recovery points but more storage.
                  100 steps is typical.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            type="number"
            value={config.checkpointing.saveEvery}
            onChange={(e) =>
              setCheckpointing({ saveEvery: parseInt(e.target.value) || 100 })
            }
            min={10}
            max={1000}
            step={10}
            className="h-9"
          />
        </div>

        {/* Output Directory */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Output Directory</Label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-xs">
                  Where to save checkpoints and the final model.
                  Make sure this path is writable.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            type="text"
            value={config.checkpointing.outputDir}
            onChange={(e) => setCheckpointing({ outputDir: e.target.value })}
            placeholder="/tmp/tinker-studio/checkpoints"
            className="h-9 font-mono text-xs"
          />
        </div>
      </div>
    </PipelineBlock>
  );
}
