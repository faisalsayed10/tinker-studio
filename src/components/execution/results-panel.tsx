"use client";

import { useState, useRef, useEffect } from "react";
import { useStudioStore } from "@/lib/store";
import { MetricsChart } from "./metrics-chart";
import { CheckpointSamples } from "./checkpoint-samples";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Clock,
  Copy,
  ArrowDown,
  Check,
  Timer,
  Activity,
  Zap,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";

// Format ETA seconds into human-readable string
function formatETA(seconds?: number): string {
  if (!seconds || seconds <= 0) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export function ResultsPanel() {
  const execution = useStudioStore((s) => s.execution);

  const getStatusColor = () => {
    switch (execution.status) {
      case "running":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-muted-foreground/50";
    }
  };

  const getStatusText = () => {
    switch (execution.status) {
      case "running":
        return "Running";
      case "completed":
        return "Completed";
      case "error":
        return "Error";
      default:
        return "Ready";
    }
  };

  const progress =
    execution.totalSteps > 0
      ? (execution.currentStep / execution.totalSteps) * 100
      : 0;

  // Get latest metrics for stats bar
  const latestMetrics = execution.metrics.length > 0
    ? execution.metrics[execution.metrics.length - 1]
    : null;

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header with status */}
      <div className="flex items-center justify-between border-b border-border h-10 px-4">
        <span className="text-sm font-medium text-foreground">Results</span>
        <div className="flex items-center gap-3">
          {execution.status === "running" && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Step {execution.currentStep}/{execution.totalSteps}
                </span>
              </div>
              {latestMetrics?.etaSeconds !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Timer className="h-3 w-3" />
                  <span>ETA: {formatETA(latestMetrics.etaSeconds)}</span>
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-1.5">
            <div className={cn("h-2 w-2 rounded-full", getStatusColor())} />
            <span className="text-xs text-muted-foreground">{getStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar (only when running) */}
      {execution.status === "running" && (
        <div className="h-0.5 w-full bg-muted">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Stats Bar (only when running and metrics available) */}
      {execution.status === "running" && latestMetrics && (
        <TrainingStats metrics={latestMetrics} />
      )}

      {/* Content - Split Layout */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Upper half - Logs */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <LogsView />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Lower half - Metrics and Samples */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <ResizablePanelGroup direction="horizontal">
            {/* Left - Metrics */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <MetricsChart />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right - Samples */}
            <ResizablePanel defaultSize={50} minSize={20}>
              <CheckpointSamples />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// Real-time training stats bar
function TrainingStats({ metrics }: { metrics: NonNullable<ReturnType<typeof useStudioStore.getState>["execution"]["metrics"][0]> }) {
  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-zinc-900/50 border-b border-zinc-800 text-xs">
      <StatItem
        icon={<Activity className="h-3 w-3 text-blue-400" />}
        label="Loss"
        value={metrics.loss.toFixed(4)}
      />
      <StatItem
        icon={<Zap className="h-3 w-3 text-yellow-400" />}
        label="LR"
        value={metrics.learningRate?.toExponential(2) || "--"}
      />
      <StatItem
        icon={<Gauge className="h-3 w-3 text-green-400" />}
        label="Throughput"
        value={`${metrics.tokensPerSecond?.toFixed(0) || 0} tok/s`}
      />
      <StatItem
        icon={<Clock className="h-3 w-3 text-purple-400" />}
        label="Step Time"
        value={`${((metrics.wallClockTimeMs || 0) / 1000).toFixed(1)}s`}
      />
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-zinc-500">{label}:</span>
      <span className="text-zinc-200 font-mono">{value}</span>
    </div>
  );
}

function LogsView() {
  const logs = useStudioStore((s) => s.execution.logs);
  const status = useStudioStore((s) => s.execution.status);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle scroll to detect if user has scrolled up
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isNearBottom);
    setShowScrollButton(!isNearBottom && logs.length > 10);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setAutoScroll(true);
      setShowScrollButton(false);
    }
  };

  // Copy logs to clipboard
  const copyLogs = async () => {
    const text = logs
      .map((log) => `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Logs copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (logs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground border-b border-border">
        {status === "idle" ? (
          <span>Click &quot;Run&quot; to start training</span>
        ) : (
          <span>Waiting for logs...</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full border-b border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/30">
        <span className="text-xs font-medium text-zinc-400">Logs</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyLogs}
          className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-300"
        >
          {copied ? (
            <Check className="h-3 w-3 mr-1 text-green-400" />
          ) : (
            <Copy className="h-3 w-3 mr-1" />
          )}
          Copy
        </Button>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          variant="secondary"
          size="sm"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 z-10 h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          New logs
        </Button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-[calc(100%-32px)] overflow-auto"
      >
        <div className="p-3 font-mono text-xs leading-5">
          {logs.map((log, index) => (
            <div
              key={index}
              className={cn(
                log.level === "error" && "text-red-400",
                log.level === "warn" && "text-yellow-400",
                log.level === "info" && "text-muted-foreground"
              )}
            >
              <span className="text-muted-foreground/40 select-none">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>{" "}
              {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
