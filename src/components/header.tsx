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
  MoreHorizontal,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
      <header className="flex h-14 items-center justify-between border-b border-border/60 px-6 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Tinker Studio</span>
          </div>
          <div className="hidden sm:flex items-center">
            <div className="h-4 w-px bg-border/60 mx-2" />
            <span className="text-xs text-muted-foreground/80">
              Visual Post-Training IDE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* API Key Status Indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSettingsOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!hasMounted
                  ? "text-muted-foreground bg-muted/50 hover:bg-muted"
                  : settings.apiKeyValidated
                    ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15"
                    : settings.apiKey
                      ? "text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/15"
                      : "text-muted-foreground bg-muted/50 hover:bg-muted"
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
            <TooltipContent side="bottom" className="text-xs">
              {!hasMounted
                ? "No API key configured"
                : settings.apiKeyValidated
                  ? "Tinker API connected"
                  : settings.apiKey
                    ? "API key not validated - click to validate"
                    : "No API key configured"}
            </TooltipContent>
          </Tooltip>

          <div className="h-6 w-px bg-border/60" />

          {/* Reset Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetConfig}
                disabled={isRunning}
                className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/80"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline text-xs">Reset</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Reset pipeline configuration
            </TooltipContent>
          </Tooltip>

          {/* More Options Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                More options
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Settings
                <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">⌘,</kbd>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setHistoryOpen(true)} className="cursor-pointer">
                <History className="h-4 w-4 mr-2" />
                Training History
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShortcutsOpen(true)} className="cursor-pointer">
                <Keyboard className="h-4 w-4 mr-2" />
                Keyboard Shortcuts
                <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">⌘/</kbd>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-border/60" />

          {/* Run/Stop Button */}
          {isRunning ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStop}
              className="h-9 gap-2 px-4 shadow-sm"
            >
              <Square className="h-3.5 w-3.5" />
              Stop Training
              <kbd className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-normal">
                ⌘↵
              </kbd>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleRun}
              className="h-9 gap-2 px-4 bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Play className="h-3.5 w-3.5" />
              Run Training
              <kbd className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-normal">
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
