"use client";

import { useState, useEffect } from "react";
import { useStudioStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FolderOpen,
  RefreshCw,
  Loader2,
  Clock,
  GitBranch,
  Database,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { Checkpoint } from "@/lib/types";
import { toast } from "sonner";

interface CheckpointBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (checkpoint: Checkpoint) => void;
}

export function CheckpointBrowser({
  open,
  onOpenChange,
  onSelect,
}: CheckpointBrowserProps) {
  const { settings, checkpoints, setCheckpoints, setInferenceConfig } = useStudioStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Fetch checkpoints when dialog opens
  useEffect(() => {
    if (open && settings.apiKey) {
      fetchCheckpoints();
    }
  }, [open, settings.apiKey]);

  const fetchCheckpoints = async () => {
    if (!settings.apiKey) {
      setError("Please configure your API key first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkpoints/list", {
        headers: {
          "x-api-key": settings.apiKey,
        },
      });

      const data = await response.json();

      if (data.success) {
        setCheckpoints(data.data.checkpoints);
        if (data.data.source === "mock") {
          toast.info("Showing demo checkpoints", {
            description: "Connect to Tinker API for real checkpoints",
          });
        }
      } else {
        setError(data.error || "Failed to fetch checkpoints");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (checkpoint: Checkpoint) => {
    if (onSelect) {
      onSelect(checkpoint);
    } else {
      // Default: use for inference
      setInferenceConfig({ model: checkpoint.path });
      toast.success(`Selected ${checkpoint.name} for inference`);
    }
    onOpenChange(false);
  };

  const copyPath = async (path: string) => {
    await navigator.clipboard.writeText(path);
    setCopiedPath(path);
    toast.success("Path copied to clipboard");
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const formatTimestamp = (timestamp: number) => {
    // API returns timestamp in seconds, convert to milliseconds
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Extract step number from checkpoint name
  const getStepFromName = (name: string): number | string => {
    // Handle names like "checkpoint-50", "checkpoint-25"
    const match = name.match(/checkpoint-(\d+)/i);
    if (match) return parseInt(match[1], 10);
    // Handle "final" checkpoints
    if (name.toLowerCase().includes("final")) return "Final";
    return 0;
  };

  // Map checkpointType to display mode
  const getDisplayMode = (checkpoint: Checkpoint) => {
    if (checkpoint.mode) return checkpoint.mode.toUpperCase();
    if (checkpoint.checkpointType === "sampler") return "SAMPLER";
    if (checkpoint.checkpointType === "training") return "SFT";
    return "SFT";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-400" />
            Checkpoint Browser
          </DialogTitle>
          <DialogDescription>
            Browse and select checkpoints from your Tinker storage
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                <Database className="h-3 w-3 mr-1" />
                {checkpoints.length} checkpoints
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCheckpoints}
              disabled={loading}
              className="h-8 text-zinc-400 hover:text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-800/50">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* No API Key */}
          {!settings.apiKey && (
            <div className="flex items-center justify-center h-48 text-center">
              <div>
                <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">API key required</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Configure your API key in settings to browse checkpoints
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && settings.apiKey && (
            <div className="flex items-center justify-center h-48">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <span className="text-sm text-zinc-400">
                  Fetching checkpoints...
                </span>
              </div>
            </div>
          )}

          {/* Checkpoint List */}
          {!loading && settings.apiKey && checkpoints.length > 0 && (
            <ScrollArea className="h-72">
              <div className="space-y-2 pr-4">
                {checkpoints.map((checkpoint) => (
                  <div
                    key={checkpoint.path}
                    className="group p-3 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-zinc-200 truncate">
                            {checkpoint.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              getDisplayMode(checkpoint) === "RL"
                                ? "text-purple-400 border-purple-400/30"
                                : getDisplayMode(checkpoint) === "SAMPLER"
                                ? "text-blue-400 border-blue-400/30"
                                : "text-green-400 border-green-400/30"
                            }
                          >
                            {getDisplayMode(checkpoint)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                          {checkpoint.baseModel && checkpoint.baseModel !== "unknown" && (
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              {checkpoint.baseModel.split("/").pop()}
                            </span>
                          )}
                          {checkpoint.loraRank && (
                            <span className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              LoRA r={checkpoint.loraRank}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(checkpoint.timestamp)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded font-mono truncate max-w-xs">
                            {checkpoint.path}
                          </code>
                          <button
                            onClick={() => copyPath(checkpoint.path)}
                            className="text-zinc-600 hover:text-zinc-400 transition-colors"
                          >
                            {copiedPath === checkpoint.path ? (
                              <Check className="h-3 w-3 text-green-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="secondary" className="text-xs">
                          {typeof getStepFromName(checkpoint.name) === "string"
                            ? getStepFromName(checkpoint.name)
                            : `Step ${(getStepFromName(checkpoint.name) as number).toLocaleString()}`}
                        </Badge>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSelect(checkpoint)}
                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Select
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Empty State */}
          {!loading && settings.apiKey && checkpoints.length === 0 && !error && (
            <div className="flex items-center justify-center h-48 text-center">
              <div>
                <FolderOpen className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">No checkpoints found</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Train a model to create your first checkpoint
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
