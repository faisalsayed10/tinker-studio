"use client";

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
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  Trash2,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

interface TrainingHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrainingHistory({ open, onOpenChange }: TrainingHistoryProps) {
  const { trainingHistory, loadConfig } = useStudioStore();

  const formatDuration = (startedAt?: number, completedAt?: number) => {
    if (!startedAt) return "-";
    const end = completedAt || Date.now();
    const durationMs = end - startedAt;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-yellow-400" />;
      default:
        return <Clock className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400 border-green-400/30";
      case "failed":
        return "text-red-400 border-red-400/30";
      case "running":
        return "text-blue-400 border-blue-400/30";
      case "cancelled":
        return "text-yellow-400 border-yellow-400/30";
      default:
        return "text-zinc-400 border-zinc-400/30";
    }
  };

  const handleLoadConfig = (job: typeof trainingHistory[0]) => {
    loadConfig(job.config);
    toast.success("Configuration loaded", {
      description: `Loaded config from ${job.id}`,
    });
    onOpenChange(false);
  };

  // Sort by most recent first
  const sortedHistory = [...trainingHistory].sort((a, b) => {
    const aTime = a.startedAt || 0;
    const bTime = b.startedAt || 0;
    return bTime - aTime;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-400" />
            Training History
          </DialogTitle>
          <DialogDescription>
            View past training runs and reload their configurations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline" className="text-zinc-400 border-zinc-700">
              {trainingHistory.length} runs
            </Badge>
            <Badge variant="outline" className="text-green-400 border-green-400/30">
              {trainingHistory.filter((j) => j.status === "completed").length} completed
            </Badge>
          </div>

          {/* History List */}
          {sortedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <History className="h-8 w-8 text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-400">No training history yet</p>
              <p className="text-xs text-zinc-600 mt-1">
                Run a training job to see it here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-72">
              <div className="space-y-2 pr-4">
                {sortedHistory.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <span className="font-mono text-xs text-zinc-400 truncate">
                            {job.id}
                          </span>
                          <Badge
                            variant="outline"
                            className={getStatusColor(job.status)}
                          >
                            {job.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              job.config.mode === "rl"
                                ? "text-purple-400 border-purple-400/30"
                                : "text-green-400 border-green-400/30"
                            }
                          >
                            {job.config.mode.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                          <span>
                            {job.config.model.baseModel.split("/").pop()}
                          </span>
                          <span>{job.config.dataset.preset.split("/").pop()}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(job.startedAt, job.completedAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-xs text-zinc-600">
                          <span>{formatDate(job.startedAt)}</span>
                          {job.finalLoss && (
                            <span>Loss: {job.finalLoss.toFixed(4)}</span>
                          )}
                          {job.currentStep > 0 && job.totalSteps > 0 && (
                            <span>
                              Step {job.currentStep}/{job.totalSteps}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoadConfig(job)}
                          className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Load
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
