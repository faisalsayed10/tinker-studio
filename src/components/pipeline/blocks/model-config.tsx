"use client";

import { useState, useEffect } from "react";
import { useStudioStore } from "@/lib/store";
import { PipelineBlock } from "./pipeline-block";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Box, HelpCircle, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ModelConfigProps {
  isLast?: boolean;
}

export function ModelConfig({ isLast }: ModelConfigProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { config, setModel, models, modelsLoading, modelsError, fetchModels } = useStudioStore();

  useEffect(() => {
    // Only fetch if no models, not loading, and no error (to prevent infinite loop on error)
    if (models.length === 0 && !modelsLoading && !modelsError) {
      fetchModels();
    }
  }, [models.length, modelsLoading, modelsError, fetchModels]);

  const selectedModel = models.find(
    (m) => m.id === config.model.baseModel
  );

  return (
    <PipelineBlock
      icon={Box}
      title="Model"
      subtitle={selectedModel?.name ?? "Select a model"}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      isLast={isLast}
    >
      <div className="space-y-4">
        {/* Base Model */}
        <div className="space-y-2">
          <Label className="text-xs">Base Model</Label>
          {modelsError ? (
            <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-400 flex-1">{modelsError}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchModels()}
                className="h-6 px-2 text-xs text-red-400 hover:text-red-300"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          ) : (
            <Select
              value={config.model.baseModel}
              onValueChange={(value) => setModel({ baseModel: value })}
              disabled={modelsLoading || models.length === 0}
            >
              <SelectTrigger>
                {modelsLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading models...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select a model" />
                )}
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <span>{model.name}</span>
                      {model.params && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {model.params}
                        </Badge>
                      )}
                      {model.recommended && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* LoRA Rank */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">LoRA Rank</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">
                    Controls adapter capacity. Higher = more expressive but uses more memory.
                    32 is a good default for most tasks.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              value={config.model.loraRank}
              onChange={(e) => setModel({ loraRank: parseInt(e.target.value) || 32 })}
              min={4}
              max={256}
              className="h-9"
            />
          </div>

        {/* Max Length */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Max Sequence Length</Label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-xs">
                  Maximum tokens per training example. Longer sequences use more memory.
                  4096 is good for most instruction tuning.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            type="number"
            value={config.model.maxLength}
            onChange={(e) => setModel({ maxLength: parseInt(e.target.value) || 4096 })}
            min={256}
            max={32768}
            step={256}
            className="h-9"
          />
        </div>
      </div>
    </PipelineBlock>
  );
}
