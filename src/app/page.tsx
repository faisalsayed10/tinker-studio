"use client";

import { useEffect, useState } from "react";
import { PipelineBuilder } from "@/components/pipeline/pipeline-builder";
import { CodePreview } from "@/components/editor/code-preview";
import { ResultsPanel } from "@/components/execution/results-panel";
import { InferencePlayground } from "@/components/inference/inference-playground";
import { Header } from "@/components/header";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, Activity, Sparkles } from "lucide-react";
import { restoreTrainingSession } from "@/lib/training-client";
import { useStudioStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function Home() {
  const [activeTab, setActiveTab] = useState("code");
  const checkpoints = useStudioStore((s) => s.checkpoints);
  const hasCheckpoints = checkpoints.length > 0;
  const { settings, fetchCheckpoints, execution } = useStudioStore();
  const isRunning = execution.status === "running";

  // Restore training session on mount
  useEffect(() => {
    const restore = async () => {
      const wasRestored = await restoreTrainingSession();
      // If we restored an active training session, switch to results tab
      if (wasRestored) {
        setActiveTab("results");
      }
    };
    restore();
  }, []);

  // Fetch checkpoints on mount if API key exists
  useEffect(() => {
    if (settings.apiKey && settings.apiKeyValidated) {
      fetchCheckpoints();
    }
  }, [settings.apiKey, settings.apiKeyValidated, fetchCheckpoints]);

  return (
    <div className="flex h-screen flex-col bg-black">
      <Header />
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Pipeline Builder */}
        <ResizablePanel defaultSize={42} minSize={25} maxSize={55}>
          <div className="h-full overflow-y-auto">
            <PipelineBuilder />
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-px bg-zinc-800/50 hover:bg-blue-500/50 transition-colors" />

        {/* Right Panel - Tabbed Code/Results/Inference */}
        <ResizablePanel defaultSize={58}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b border-zinc-800/50 bg-black px-1 h-12 flex items-center">
              <TabsList className="h-9 bg-transparent p-0.5 gap-0.5 rounded-lg bg-zinc-900/50">
                <TabsTrigger
                  value="code"
                  className={cn(
                    "h-8 px-3 rounded-md text-xs font-medium transition-all",
                    "text-zinc-500 hover:text-zinc-300",
                    "data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
                  )}
                >
                  <Code2 className="h-3.5 w-3.5 mr-1.5" />
                  Code
                </TabsTrigger>
                <TabsTrigger
                  value="results"
                  className={cn(
                    "h-8 px-3 rounded-md text-xs font-medium transition-all",
                    "text-zinc-500 hover:text-zinc-300",
                    "data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
                  )}
                >
                  <Activity className="h-3.5 w-3.5 mr-1.5" />
                  Results
                  {isRunning && (
                    <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 status-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="inference"
                  disabled={!hasCheckpoints}
                  className={cn(
                    "h-8 px-3 rounded-md text-xs font-medium transition-all",
                    "text-zinc-500 hover:text-zinc-300",
                    "data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm",
                    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-500"
                  )}
                  title={!hasCheckpoints ? "Train a model first to use inference" : undefined}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Inference
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="code" className="flex-1 overflow-hidden mt-0 animate-fade-in">
              <CodePreview />
            </TabsContent>
            <TabsContent value="results" className="flex-1 overflow-hidden mt-0 animate-fade-in">
              <ResultsPanel />
            </TabsContent>
            <TabsContent value="inference" className="flex-1 overflow-hidden mt-0 animate-fade-in">
              <InferencePlayground />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
