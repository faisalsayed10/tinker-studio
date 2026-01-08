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
import { Code, BarChart3, Sparkles } from "lucide-react";
import { restoreTrainingSession } from "@/lib/training-client";
import { useStudioStore } from "@/lib/store";

export default function Home() {
  const [activeTab, setActiveTab] = useState("code");
  const checkpoints = useStudioStore((s) => s.checkpoints);
  const hasCheckpoints = checkpoints.length > 0;

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
  return (
    <div className="flex h-screen flex-col bg-black">
      <Header />
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Pipeline Builder */}
        <ResizablePanel defaultSize={50} minSize={20} maxSize={60}>
          <div className="h-full overflow-y-auto">
            <PipelineBuilder />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Tabbed Code/Results/Inference */}
        <ResizablePanel defaultSize={50}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b border-border bg-card px-2">
              <TabsList className="h-10 bg-transparent p-0 gap-1">
                <TabsTrigger
                  value="code"
                  className="h-8 px-3 rounded-md border-none text-muted-foreground data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Code
                </TabsTrigger>
                <TabsTrigger
                  value="results"
                  className="h-8 px-3 rounded-md border-none text-muted-foreground data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Results
                </TabsTrigger>
                <TabsTrigger
                  value="inference"
                  disabled={!hasCheckpoints}
                  className="h-8 px-3 rounded-md border-none text-muted-foreground data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!hasCheckpoints ? "Train a model first to use inference" : undefined}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Inference
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="code" className="flex-1 overflow-hidden mt-0">
              <CodePreview />
            </TabsContent>
            <TabsContent value="results" className="flex-1 overflow-hidden mt-0">
              <ResultsPanel />
            </TabsContent>
            <TabsContent value="inference" className="flex-1 overflow-hidden mt-0">
              <InferencePlayground />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
