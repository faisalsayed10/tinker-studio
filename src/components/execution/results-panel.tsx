"use client";

import { useState, useRef, useEffect } from "react";
import { useStudioStore } from "@/lib/store";
import { MetricsChart } from "./metrics-chart";
import { CheckpointSamples } from "./checkpoint-samples";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Copy,
  ArrowDown,
  Check,
  Timer,
  Activity,
  Zap,
  Gauge,
  Terminal,
  LineChart,
  MessageSquare,
  Play,
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
  const [activeTab, setActiveTab] = useState("logs");

  const getStatusConfig = () => {
    switch (execution.status) {
      case "running":
        return { color: "bg-blue-500", text: "Running", dotClass: "status-pulse" };
      case "completed":
        return { color: "bg-emerald-500", text: "Completed", dotClass: "" };
      case "error":
        return { color: "bg-red-500", text: "Error", dotClass: "" };
      default:
        return { color: "bg-zinc-500", text: "Ready", dotClass: "" };
    }
  };

  const statusConfig = getStatusConfig();

  const progress =
    execution.totalSteps > 0
      ? (execution.currentStep / execution.totalSteps) * 100
      : 0;

  // Get latest metrics for stats bar
  const latestMetrics = execution.metrics.length > 0
    ? execution.metrics[execution.metrics.length - 1]
    : null;

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Compact Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className={cn("h-2 w-2 rounded-full", statusConfig.color, statusConfig.dotClass)} />
          <span className="text-sm font-medium">{statusConfig.text}</span>
          {execution.status === "running" && (
            <span className="text-xs text-zinc-500">
              Step {execution.currentStep}/{execution.totalSteps}
            </span>
          )}
        </div>
        {execution.status === "running" && latestMetrics?.etaSeconds !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Timer className="h-3 w-3" />
            <span>ETA {formatETA(latestMetrics.etaSeconds)}</span>
          </div>
        )}
      </div>

      {/* Progress Bar (only when running) */}
      {execution.status === "running" && (
        <div className="h-0.5 w-full bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Stats Bar (only when running and metrics available) */}
      {execution.status === "running" && latestMetrics && (
        <TrainingStats metrics={latestMetrics} />
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-zinc-800/50 px-2">
          <TabsList className="h-10 bg-transparent p-0 gap-1">
            <TabsTrigger
              value="logs"
              className="h-8 px-3 rounded-md text-xs text-zinc-500 data-[state=active]:bg-zinc-800/50 data-[state=active]:text-zinc-200"
            >
              <Terminal className="h-3.5 w-3.5 mr-1.5" />
              Logs
              {execution.logs.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400">
                  {execution.logs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="metrics"
              className="h-8 px-3 rounded-md text-xs text-zinc-500 data-[state=active]:bg-zinc-800/50 data-[state=active]:text-zinc-200"
            >
              <LineChart className="h-3.5 w-3.5 mr-1.5" />
              Metrics
            </TabsTrigger>
            <TabsTrigger
              value="samples"
              className="h-8 px-3 rounded-md text-xs text-zinc-500 data-[state=active]:bg-zinc-800/50 data-[state=active]:text-zinc-200"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Samples
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="logs" className="flex-1 mt-0 overflow-hidden">
          <LogsView />
        </TabsContent>

        <TabsContent value="metrics" className="flex-1 mt-0 overflow-hidden">
          <MetricsChart />
        </TabsContent>

        <TabsContent value="samples" className="flex-1 mt-0 overflow-hidden">
          <CheckpointSamples />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Real-time training stats bar
function TrainingStats({ metrics }: { metrics: NonNullable<ReturnType<typeof useStudioStore.getState>["execution"]["metrics"][0]> }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/30 border-b border-zinc-800/50">
      <div className="flex items-center gap-6">
        <StatItem
          icon={<Activity className="h-3.5 w-3.5 text-blue-400" />}
          label="Loss"
          value={metrics.loss.toFixed(4)}
          highlight
        />
        <StatItem
          icon={<Zap className="h-3.5 w-3.5 text-amber-400" />}
          label="LR"
          value={metrics.learningRate?.toExponential(2) || "--"}
        />
        <StatItem
          icon={<Gauge className="h-3.5 w-3.5 text-emerald-400" />}
          label="Throughput"
          value={`${metrics.tokensPerSecond?.toFixed(0) || 0} tok/s`}
        />
        <StatItem
          icon={<Clock className="h-3.5 w-3.5 text-purple-400" />}
          label="Step Time"
          value={`${((metrics.wallClockTimeMs || 0) / 1000).toFixed(1)}s`}
        />
      </div>
    </div>
  );
}

function StatItem({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="flex flex-col">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className={cn(
          "text-sm font-mono tabular-nums",
          highlight ? "text-white font-medium" : "text-zinc-300"
        )}>{value}</span>
      </div>
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
      <div className="flex h-full flex-col items-center justify-center text-center p-8">
        <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
          <Play className="h-5 w-5 text-zinc-500" />
        </div>
        <p className="text-sm text-zinc-400 mb-1">
          {status === "idle" ? "No training logs yet" : "Waiting for logs..."}
        </p>
        <p className="text-xs text-zinc-600">
          Click &quot;Run Training&quot; to start
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Copy button */}
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={copyLogs}
          className="h-7 px-2 text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-900/80 backdrop-blur-sm"
        >
          {copied ? (
            <Check className="h-3 w-3 mr-1 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3 mr-1" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          size="sm"
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 h-8 gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          New logs
        </Button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto"
      >
        <div className="p-4 font-mono text-xs leading-6">
          {logs.map((log, index) => (
            <div
              key={index}
              className={cn(
                "animate-fade-in",
                log.level === "error" && "text-red-400",
                log.level === "warn" && "text-amber-400",
                log.level === "info" && "text-zinc-400"
              )}
            >
              <span className="text-zinc-600 select-none mr-2">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
