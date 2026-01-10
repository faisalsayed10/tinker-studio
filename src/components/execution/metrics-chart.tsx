"use client";

import { useState } from "react";
import { useStudioStore } from "@/lib/store";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";
import { Activity, Zap, Gauge, Trophy, TrendingDown } from "lucide-react";

type ChartTab = "loss" | "lr" | "throughput" | "reward";

export function MetricsChart() {
  const metrics = useStudioStore((s) => s.execution.metrics);
  const mode = useStudioStore((s) => s.config.mode);
  const [activeTab, setActiveTab] = useState<ChartTab>("loss");

  if (metrics.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-8">
        <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
          <TrendingDown className="h-5 w-5 text-zinc-500" />
        </div>
        <p className="text-sm text-zinc-400 mb-1">No metrics yet</p>
        <p className="text-xs text-zinc-600">
          Metrics will appear here during training
        </p>
      </div>
    );
  }

  // Calculate smoothed loss (10-step rolling average)
  const smoothedMetrics = metrics.map((m, i) => {
    const windowSize = Math.min(10, i + 1);
    const window = metrics.slice(Math.max(0, i - windowSize + 1), i + 1);
    return {
      ...m,
      smoothedLoss: window.reduce((sum, p) => sum + p.loss, 0) / window.length,
    };
  });

  // Calculate latest values for display
  const latestMetric = metrics[metrics.length - 1];
  const latestSmoothed = smoothedMetrics[smoothedMetrics.length - 1];

  const tabs: { id: ChartTab; label: string; icon: React.ReactNode; color: string; show: boolean; value?: string }[] = [
    {
      id: "loss",
      label: "Loss",
      icon: <Activity className="h-3 w-3" />,
      color: "text-blue-400",
      show: true,
      value: latestSmoothed?.smoothedLoss?.toFixed(4)
    },
    {
      id: "lr",
      label: "LR",
      icon: <Zap className="h-3 w-3" />,
      color: "text-amber-400",
      show: true,
      value: latestMetric?.learningRate?.toExponential(1)
    },
    {
      id: "throughput",
      label: "Speed",
      icon: <Gauge className="h-3 w-3" />,
      color: "text-emerald-400",
      show: true,
      value: latestMetric?.tokensPerSecond ? `${latestMetric.tokensPerSecond.toFixed(0)}` : undefined
    },
    {
      id: "reward",
      label: "Reward",
      icon: <Trophy className="h-3 w-3" />,
      color: "text-purple-400",
      show: mode === "rl",
      value: latestMetric?.reward?.toFixed(3)
    },
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  const renderChart = () => {
    const commonProps = {
      margin: { top: 8, right: 8, left: -20, bottom: 0 }
    };

    switch (activeTab) {
      case "loss":
        return (
          <ComposedChart data={smoothedMetrics} {...commonProps}>
            <defs>
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
            <XAxis dataKey="step" stroke="#404040" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(2)} width={45} />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "11px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
              labelStyle={{ color: "#71717a", marginBottom: "4px" }}
              formatter={(value, name) => [(value as number | undefined)?.toFixed(4) ?? "N/A", name === "smoothedLoss" ? "Smoothed" : "Raw"]}
            />
            <Area type="monotone" dataKey="smoothedLoss" stroke="transparent" fill="url(#lossGradient)" isAnimationActive={false} />
            <Line type="monotone" dataKey="loss" stroke="#3b82f6" strokeWidth={1} dot={false} opacity={0.3} isAnimationActive={false} />
            <Line type="monotone" dataKey="smoothedLoss" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        );

      case "lr":
        return (
          <ComposedChart data={metrics} {...commonProps}>
            <defs>
              <linearGradient id="lrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
            <XAxis dataKey="step" stroke="#404040" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v.toExponential(0)} width={45} />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "11px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
              labelStyle={{ color: "#71717a", marginBottom: "4px" }}
              formatter={(value) => [(value as number | undefined)?.toExponential(2) ?? "N/A", "Learning Rate"]}
            />
            <Area type="monotone" dataKey="learningRate" stroke="transparent" fill="url(#lrGradient)" isAnimationActive={false} />
            <Line type="monotone" dataKey="learningRate" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        );

      case "throughput":
        return (
          <ComposedChart data={metrics} {...commonProps}>
            <defs>
              <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
            <XAxis dataKey="step" stroke="#404040" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}`} width={45} />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "11px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
              labelStyle={{ color: "#71717a", marginBottom: "4px" }}
              formatter={(value) => [`${(value as number | undefined)?.toFixed(1) ?? "N/A"} tok/s`, "Throughput"]}
            />
            <Area type="monotone" dataKey="tokensPerSecond" stroke="transparent" fill="url(#throughputGradient)" isAnimationActive={false} />
            <Line type="monotone" dataKey="tokensPerSecond" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        );

      case "reward":
        return (
          <ComposedChart data={metrics} {...commonProps}>
            <defs>
              <linearGradient id="rewardGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
            <XAxis dataKey="step" stroke="#404040" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#404040" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(2)} width={45} />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "11px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
              labelStyle={{ color: "#71717a", marginBottom: "4px" }}
              formatter={(value) => [(value as number | undefined)?.toFixed(4) ?? "N/A", "Reward"]}
            />
            <ReferenceLine y={0} stroke="#27272a" />
            <Area type="monotone" dataKey="reward" stroke="transparent" fill="url(#rewardGradient)" isAnimationActive={false} />
            <Line type="monotone" dataKey="reward" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header with tabs */}
      <div className="flex items-center justify-between px-3 h-10 border-b border-zinc-800/50">
        <div className="flex items-center gap-0.5">
          {tabs
            .filter((t) => t.show)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-all",
                  activeTab === tab.id
                    ? `bg-zinc-800/80 ${tab.color}`
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
        </div>
        {currentTab?.value && (
          <div className={cn("text-xs font-mono font-medium", currentTab.color)}>
            {currentTab.value}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 p-2">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
