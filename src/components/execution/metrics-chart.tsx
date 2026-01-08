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
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

type ChartTab = "loss" | "lr" | "throughput" | "reward";

export function MetricsChart() {
  const metrics = useStudioStore((s) => s.execution.metrics);
  const mode = useStudioStore((s) => s.config.mode);
  const [activeTab, setActiveTab] = useState<ChartTab>("loss");

  if (metrics.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Metrics will appear here during training
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

  const tabs: { id: ChartTab; label: string; show: boolean }[] = [
    { id: "loss", label: "Loss", show: true },
    { id: "lr", label: "Learning Rate", show: true },
    { id: "throughput", label: "Throughput", show: true },
    { id: "reward", label: "Reward", show: mode === "rl" },
  ];

  const renderChart = () => {
    switch (activeTab) {
      case "loss":
        return (
          <LineChart data={smoothedMetrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="step" stroke="#666" fontSize={11} tickLine={false} axisLine={{ stroke: "#262626" }} />
            <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={{ stroke: "#262626" }} tickFormatter={(v) => v.toFixed(2)} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #262626", borderRadius: "8px", fontSize: "12px" }}
              labelStyle={{ color: "#a1a1a1" }}
              formatter={(value, name) => [(value as number | undefined)?.toFixed(4) ?? "N/A", name ?? ""]}
            />
            <Legend />
            <Line type="monotone" dataKey="loss" stroke="#3b82f6" strokeWidth={1} dot={false} name="Loss" opacity={0.4} isAnimationActive={false} />
            <Line type="monotone" dataKey="smoothedLoss" stroke="#3b82f6" strokeWidth={2} dot={false} name="Smoothed Loss" isAnimationActive={false} />
          </LineChart>
        );

      case "lr":
        return (
          <LineChart data={metrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="step" stroke="#666" fontSize={11} tickLine={false} axisLine={{ stroke: "#262626" }} />
            <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={{ stroke: "#262626" }} tickFormatter={(v) => v.toExponential(1)} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #262626", borderRadius: "8px", fontSize: "12px" }}
              labelStyle={{ color: "#a1a1a1" }}
              formatter={(value) => [(value as number | undefined)?.toExponential(2) ?? "N/A", "Learning Rate"]}
            />
            <Line type="monotone" dataKey="learningRate" stroke="#f59e0b" strokeWidth={2} dot={false} name="Learning Rate" isAnimationActive={false} />
          </LineChart>
        );

      case "throughput":
        return (
          <LineChart data={metrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="step" stroke="#666" fontSize={11} tickLine={false} axisLine={{ stroke: "#262626" }} />
            <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={{ stroke: "#262626" }} tickFormatter={(v) => `${v.toFixed(0)}`} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #262626", borderRadius: "8px", fontSize: "12px" }}
              labelStyle={{ color: "#a1a1a1" }}
              formatter={(value) => [`${(value as number | undefined)?.toFixed(1) ?? "N/A"} tok/s`, "Throughput"]}
            />
            <Line type="monotone" dataKey="tokensPerSecond" stroke="#22c55e" strokeWidth={2} dot={false} name="Tokens/sec" isAnimationActive={false} />
          </LineChart>
        );

      case "reward":
        return (
          <LineChart data={metrics} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="step" stroke="#666" fontSize={11} tickLine={false} axisLine={{ stroke: "#262626" }} />
            <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={{ stroke: "#262626" }} tickFormatter={(v) => v.toFixed(2)} />
            <Tooltip
              contentStyle={{ backgroundColor: "#0a0a0a", border: "1px solid #262626", borderRadius: "8px", fontSize: "12px" }}
              labelStyle={{ color: "#a1a1a1" }}
              formatter={(value) => [(value as number | undefined)?.toFixed(4) ?? "N/A", "Reward"]}
            />
            <Line type="monotone" dataKey="reward" stroke="#22c55e" strokeWidth={2} dot={false} name="Reward" isAnimationActive={false} />
          </LineChart>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-zinc-800">
        {tabs
          .filter((t) => t.show)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeTab === tab.id
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              )}
            >
              {tab.label}
            </button>
          ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[200px] p-4">
        <ResponsiveContainer width="100%" height="100%" minHeight={180}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
