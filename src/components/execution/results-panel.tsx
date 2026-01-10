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
    <div className="flex h-full flex-col bg-background">
      {/* Header with status */}
      <div className="flex items-center justify-between border-b border-border/60 h-12 px-6 bg-card/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full shadow-sm", getStatusColor())} />
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          {execution.status === "running" && (
            <div className="h-4 w-px bg-border/60" />
          )}
          {execution.status === "running" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium">Step {execution.currentStep}</span>
                <span className="text-muted-foreground/60">/ {execution.totalSteps}</span>
              </div>
              {latestMetrics?.etaSeconds !== undefined && (
                <>
                  <div className="h-3 w-px bg-border/40" />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    <span>{formatETA(latestMetrics.etaSeconds)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Progress indicator */}
        {execution.status === "running" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

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
    <div className="flex items-center gap-6 px-6 py-2 bg-card/50 border-b border-border/60 text-xs">
      <StatItem
        icon={<Activity className="h-3.5 w-3.5 text-blue-400" />}
        label="Loss"
        value={metrics.loss.toFixed(4)}
      />
      <div className="h-4 w-px bg-border/40" />
      <StatItem
        icon={<Zap className="h-3.5 w-3.5 text-yellow-400" />}
        label="LR"
        value={metrics.learningRate?.toExponential(2) || "--"}
      />
      <div className="h-4 w-px bg-border/40" />
      <StatItem
        icon={<Gauge className="h-3.5 w-3.5 text-emerald-400" />}
        label="Throughput"
        value={`${metrics.tokensPerSecond?.toFixed(0) || 0} tok/s`}
      />
      <div className="h-4 w-px bg-border/40" />
      <StatItem
        icon={<Clock className="h-3.5 w-3.5 text-purple-400" />}
        label="Step Time"
        value={`${((metrics.wallClockTimeMs || 0) / 1000).toFixed(1)}s`}
      />
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-muted-foreground/60">{label}</span>
      <span className="text-foreground font-mono font-medium">{value}</span>
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
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground/60 bg-card/20">
        {status === "idle" ? (
          <div className="text-center">
            <p className="font-medium mb-1">Ready to train</p>
            <p className="text-xs text-muted-foreground/40">Click &quot;Run Training&quot; to start</p>
          </div>
        ) : (
          <span>Waiting for logs...</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full bg-card/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-card/30">
        <span className="text-xs font-semibold">Training Logs</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyLogs}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <Check className="h-3 w-3 mr-1.5 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3 mr-1.5" />
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
          className="absolute bottom-4 right-4 z-10 h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-0"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          New logs
        </Button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-[calc(100%-36px)] overflow-auto"
      >
        <div className="p-4 font-mono text-xs leading-6">
          {logs.map((log, index) => (
            <div
              key={index}
              className={cn(
                "py-0.5",
                log.level === "error" && "text-red-400",
                log.level === "warn" && "text-yellow-400",
                log.level === "info" && "text-muted-foreground"
              )}
            >
              <span className="text-muted-foreground/30 select-none">
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
