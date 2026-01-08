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
  RotateCcw,
  Zap,
  Settings,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  History,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

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
    resetConfig,
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

  return (
    <>
      <header className="flex h-12 items-center justify-between border-b border-border px-4 bg-background">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">Tinker Studio</span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Visual Post-Training IDE
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* API Key Status Indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSettingsOpen(true)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${!hasMounted
                  ? "text-zinc-500 hover:bg-zinc-500/10"
                  : settings.apiKeyValidated
                    ? "text-green-400 hover:bg-green-400/10"
                    : settings.apiKey
                      ? "text-yellow-400 hover:bg-yellow-400/10"
                      : "text-zinc-500 hover:bg-zinc-500/10"
                  }`}
              >
                {hasMounted && settings.apiKeyValidated ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {!hasMounted
                    ? "No API Key"
                    : settings.apiKeyValidated
                      ? "Connected"
                      : settings.apiKey
                        ? "Unvalidated"
                        : "No API Key"}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {!hasMounted
                ? "No API key configured"
                : settings.apiKeyValidated
                  ? "Tinker API connected"
                  : settings.apiKey
                    ? "API key not validated - click to validate"
                    : "No API key configured"}
            </TooltipContent>
          </Tooltip>

          {/* Keyboard Shortcuts Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShortcutsOpen(true)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Keyboard shortcuts
              <kbd className="ml-2 text-[10px] bg-zinc-700 px-1 rounded">⌘/</kbd>
            </TooltipContent>
          </Tooltip>

          {/* Settings Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Settings
              <kbd className="ml-2 text-[10px] bg-zinc-700 px-1 rounded">⌘,</kbd>
            </TooltipContent>
          </Tooltip>

          {/* History Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Training history</TooltipContent>
          </Tooltip>

          {/* Reset Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetConfig}
            disabled={isRunning}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Reset</span>
          </Button>

          {/* Run/Stop Button */}
          {isRunning ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStop}
              className="h-8 gap-1.5"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
              <kbd className="ml-1 rounded bg-white/10 px-1 py-0.5 text-[10px] font-normal">
                ⌘↵
              </kbd>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleRun}
              className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              <Play className="h-3.5 w-3.5" />
              Run
              <kbd className="ml-1 rounded bg-white/10 px-1 py-0.5 text-[10px] font-normal">
                ⌘↵
              </kbd>
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
