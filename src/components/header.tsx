"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";
import { useStudioStore } from "@/lib/store";
import { startTraining, stopTraining } from "@/lib/training-client";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { ShortcutsDialog } from "@/components/shortcuts/shortcuts-dialog";
import { TrainingHistory } from "@/components/history/training-history";
import {
  Play,
  Square,
  Zap,
  Settings,
  Circle,
  History,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Hook to detect client-side hydration - returns false on server, true on client
const emptySubscribe = () => () => { };
function useHasMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,  // Client: always true
    () => false  // Server: always false
  );
}

export function Header() {
  const hasMounted = useHasMounted();
  const {
    config,
    execution,
    settings,
    currentJobId,
    models,
    stopExecution,
    setSettingsOpen,
    setShortcutsOpen,
    setHistoryOpen,
    historyOpen,
    hasApiKey,
  } = useStudioStore();
  const isRunning = execution.status === "running";
  const selectedModel = models.find((m) => m.id === config.model.baseModel);

  const handleRun = useCallback(async () => {
    if (!isRunning) {
      // Check for API key
      if (!hasApiKey()) {
        toast.error("Please configure your Tinker API key first", {
          action: {
            label: "Settings",
            onClick: () => setSettingsOpen(true),
          },
        });
        return;
      }

      // Start real training
      toast.info("Starting training...");
      const jobId = await startTraining(config, settings.apiKey, selectedModel);
      if (jobId) {
        toast.success("Training started");
      }
    }
  }, [config, settings.apiKey, selectedModel, isRunning, hasApiKey, setSettingsOpen]);

  const handleStop = useCallback(async () => {
    if (currentJobId) {
      await stopTraining(currentJobId);
    }
    stopExecution();
  }, [currentJobId, stopExecution]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to run
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (isRunning) {
          handleStop();
        } else {
          handleRun();
        }
      }

      // Cmd/Ctrl + , to open settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }

      // Cmd/Ctrl + / to open keyboard shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, handleRun, handleStop, setSettingsOpen, setShortcutsOpen]);

  // API status
  const apiStatus = !hasMounted
    ? { color: "bg-zinc-500", label: "..." }
    : settings.apiKeyValidated
      ? { color: "bg-emerald-500", label: "Connected" }
      : settings.apiKey
        ? { color: "bg-amber-500", label: "Unvalidated" }
        : { color: "bg-zinc-500", label: "No API Key" };

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-zinc-800/50 px-4 bg-black/50 backdrop-blur-sm">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">Tinker Studio</span>
              <span className="text-[10px] text-zinc-500 hidden sm:block">Visual Post-Training IDE</span>
            </div>
          </div>
        </div>

        {/* Center - Status Indicator (only when running) */}
        {isRunning && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
            <span className="text-xs text-blue-400 font-medium">
              Training Step {execution.currentStep}/{execution.totalSteps}
            </span>
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-1">
          {/* API Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
              >
                <Circle className={cn("h-2 w-2 fill-current", apiStatus.color.replace("bg-", "text-"))} />
                <span className="hidden sm:inline">{apiStatus.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {settings.apiKeyValidated ? "Tinker API connected" : "Click to configure API key"}
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-5 bg-zinc-800 mx-1" />

          {/* History Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
              >
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Training history</TooltipContent>
          </Tooltip>

          {/* Settings Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Settings
              <kbd className="ml-2 text-[10px] bg-zinc-700 px-1 rounded">⌘,</kbd>
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-5 bg-zinc-800 mx-1" />

          {/* Run/Stop Button */}
          {isRunning ? (
            <Button
              size="sm"
              onClick={handleStop}
              className="h-8 px-4 gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleRun}
              className="h-8 px-4 gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 border-0"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Run Training
            </Button>
          )}
        </div>
      </header>

      {/* Settings Dialog */}
      <SettingsDialog />

      {/* Shortcuts Dialog */}
      <ShortcutsDialog />

      {/* Training History Dialog */}
      <TrainingHistory open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  );
}
