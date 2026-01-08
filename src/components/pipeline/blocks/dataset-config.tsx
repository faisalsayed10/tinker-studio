"use client";

import { useState, useRef } from "react";
import { useStudioStore } from "@/lib/store";
import { DATASET_PRESETS } from "@/lib/types";
import { PipelineBlock } from "./pipeline-block";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { Database, Upload, FileText, HelpCircle, AlertCircle, CheckCircle2 } from "lucide-react";

interface DatasetConfigProps {
  isLast?: boolean;
}

interface ParsedDataset {
  count: number;
  format: "messages" | "instruction" | "input_output" | "qa" | "unknown";
  sample?: Record<string, unknown>;
  normalizedContent?: string;
}

function parseJsonl(content: string): ParsedDataset | null {
  try {
    const trimmed = content.trim();
    if (!trimmed) return null;

    let items: Record<string, unknown>[] = [];
    let normalizedContent: string;

    // First, try parsing as JSON array (handles trailing commas)
    try {
      // Remove trailing comma before closing bracket/brace if present
      const cleaned = trimmed.replace(/,\s*([}\]])/g, "$1");
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        items = parsed;
        normalizedContent = items.map(item => JSON.stringify(item)).join("\n");
        // Early return for valid JSON array
        return parseDatasetFormat(items, normalizedContent);
      } else if (typeof parsed === "object" && parsed !== null) {
        // Single JSON object
        items = [parsed];
        normalizedContent = JSON.stringify(parsed);
        return parseDatasetFormat(items, normalizedContent);
      }
    } catch {
      // Not a valid JSON array/object, continue to other formats
    }

    // Try wrapping comma-separated objects in array brackets
    // This handles: {"a": 1}, {"b": 2} or {"a": 1},\n{"b": 2}
    try {
      // Remove trailing commas and wrap in brackets
      const cleaned = trimmed.replace(/,\s*$/, "").trim();
      const wrapped = `[${cleaned}]`;
      const parsed = JSON.parse(wrapped);
      if (Array.isArray(parsed)) {
        items = parsed;
        normalizedContent = items.map(item => JSON.stringify(item)).join("\n");
        return parseDatasetFormat(items, normalizedContent);
      }
    } catch {
      // Not comma-separated objects, continue
    }

    // Try JSONL format (one object per line)
    const lines = trimmed.split("\n").filter((line) => line.trim());
    if (lines.length === 0) return null;

    items = [];
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Remove trailing comma if present
      const cleanedLine = trimmedLine.replace(/,\s*$/, "");
      try {
        const parsed = JSON.parse(cleanedLine);
        if (typeof parsed === "object" && parsed !== null) {
          items.push(parsed);
        }
      } catch {
        // If this line fails, the whole format is invalid
        return null;
      }
    }

    if (items.length === 0) return null;

    normalizedContent = items.map(item => JSON.stringify(item)).join("\n");
    return parseDatasetFormat(items, normalizedContent);
  } catch {
    return null;
  }
}

function parseDatasetFormat(
  items: Record<string, unknown>[],
  normalizedContent: string
): ParsedDataset {
  const sample = items[0];
  let format: ParsedDataset["format"] = "unknown";

  if (sample.messages && Array.isArray(sample.messages)) {
    format = "messages";
  } else if (sample.instruction || sample.prompt) {
    format = "instruction";
  } else if (sample.input && sample.output) {
    format = "input_output";
  } else if (sample.question) {
    format = "qa";
  }

  return {
    count: items.length,
    format,
    sample,
    normalizedContent
  };
}

export function DatasetConfig({ isLast }: DatasetConfigProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedInfo, setParsedInfo] = useState<ParsedDataset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { config, setDataset } = useStudioStore();

  const presets = DATASET_PRESETS[config.mode];
  const selectedPreset = presets.find((d) => d.id === config.dataset.preset);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processCustomData(content);
    };
    reader.onerror = () => {
      setParseError("Failed to read file");
      setParsedInfo(null);
    };
    reader.readAsText(file);
  };

  const processCustomData = (content: string) => {
    const parsed = parseJsonl(content);
    if (parsed) {
      setParseError(null);
      setParsedInfo(parsed);
      // Store normalized JSONL format (one object per line) for code generation
      setDataset({ customData: parsed.normalizedContent || content });
    } else {
      setParseError("Invalid JSON format. Expected JSON array, JSONL (one object per line), or comma-separated JSON objects.");
      setParsedInfo(null);
      setDataset({ customData: undefined });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".jsonl") || file.name.endsWith(".json"))) {
      handleFileUpload(file);
    } else {
      setParseError("Please upload a .jsonl file");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const formatLabel = (format: ParsedDataset["format"]) => {
    switch (format) {
      case "messages":
        return "Chat format (messages array)";
      case "instruction":
        return "Instruction format (instruction/response)";
      case "input_output":
        return "Input/Output format (Tinker docs style)";
      case "qa":
        return "QA format (question/answer)";
      default:
        return "Unknown format";
    }
  };

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
            onValueChange={(value) => {
              setDataset({ preset: value });
              if (value !== "custom") {
                setParseError(null);
                setParsedInfo(null);
              }
            }}
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

        {/* Custom Dataset Upload */}
        {config.dataset.preset === "custom" && (
          <div className="space-y-3">
            {/* Format Help */}
            <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
              <HelpCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-300">
                <p className="font-medium mb-1">Accepted Formats:</p>
                {config.mode === "sft" ? (
                  <code className="block bg-black/30 rounded p-2 mt-1 text-[10px]">
                    <span className="text-muted-foreground">JSON Array:</span>
                    <br />
                    {`[{"input": "...", "output": "..."}, {"input": "...", "output": "..."}]`}
                    <br />
                    <span className="text-muted-foreground mt-2 block">JSONL (one per line):</span>
                    {`{"input": "banana split", "output": "anana-bay plit-say"}`}
                    <br />
                    {`{"input": "...", "output": "..."}`}
                    <br />
                    <span className="text-muted-foreground mt-2 block">Also supports:</span>
                    {`{"messages": [{"role": "user", "content": "..."}]}`}
                    <br />
                    {`{"instruction": "...", "response": "..."}`}
                  </code>
                ) : (
                  <code className="block bg-black/30 rounded p-2 mt-1 text-[10px]">
                    <span className="text-muted-foreground">JSON Array:</span>
                    <br />
                    {`[{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}]`}
                    <br />
                    <span className="text-muted-foreground mt-2 block">JSONL (one per line):</span>
                    {`{"question": "What is 2+2?", "answer": "4"}`}
                    <br />
                    {`{"question": "...", "answer": "..."}`}
                    <br />
                    <span className="text-muted-foreground mt-2 block">Also supports:</span>
                    {`{"input": "problem text", "output": "solution"}`}
                  </code>
                )}
              </div>
            </div>

            {/* File Upload Area */}
            <div
              className={`relative rounded-lg border-2 border-dashed p-4 transition-colors ${dragActive
                ? "border-primary bg-primary/10"
                : parseError
                  ? "border-red-500/50 bg-red-500/5"
                  : parsedInfo
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-muted-foreground/30 hover:border-muted-foreground/50"
                }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jsonl,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              <div className="flex flex-col items-center gap-2 text-center">
                {parsedInfo ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                    <div className="text-xs">
                      <p className="font-medium text-green-400">
                        {parsedInfo.count} examples loaded
                      </p>
                      <p className="text-muted-foreground">
                        {formatLabel(parsedInfo.format)}
                      </p>
                    </div>
                  </>
                ) : parseError ? (
                  <>
                    <AlertCircle className="h-8 w-8 text-red-400" />
                    <p className="text-xs text-red-400">{parseError}</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Drag & drop a .jsonl file or click to browse
                    </p>
                  </>
                )}
              </div>

              <div className="mt-3 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Browse Files
                </Button>
              </div>
            </div>

            {/* Paste Textarea */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Or paste JSONL content:</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[300px]">
                    <p className="text-xs">
                      Paste JSON data in any format: JSON array, JSONL (one object per line), or comma-separated objects. All formats will be normalized automatically.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <textarea
                className="w-full h-24 rounded-md border border-border bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder={
                  config.mode === "sft"
                    ? '{"input": "banana split", "output": "anana-bay plit-say"}\n{"input": "...", "output": "..."}'
                    : '{"question": "What is 2+2?", "answer": "4"}\n{"question": "...", "answer": "..."}'
                }
                value={config.dataset.customData || ""}
                onChange={(e) => {
                  const content = e.target.value;
                  if (content.trim()) {
                    processCustomData(content);
                  } else {
                    setParseError(null);
                    setParsedInfo(null);
                    setDataset({ customData: undefined });
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </PipelineBlock>
  );
}
