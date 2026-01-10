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
  const { settings, fetchCheckpoints } = useStudioStore();

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
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Pipeline Builder */}
        <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
          <div className="h-full overflow-y-auto border-r border-border/60">
            <PipelineBuilder />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="w-1 bg-border/40 hover:bg-border/60 transition-colors" />

        {/* Right Panel - Tabbed Code/Results/Inference */}
        <ResizablePanel defaultSize={50}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b border-border/60 bg-card/30 px-4">
              <TabsList className="h-11 bg-transparent p-0 gap-2">
                <TabsTrigger
                  value="code"
                  className="h-9 px-4 rounded-lg border-none text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                >
                  <Code className="h-3.5 w-3.5 mr-2" />
                  Code
                </TabsTrigger>
                <TabsTrigger
                  value="results"
                  className="h-9 px-4 rounded-lg border-none text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-2" />
                  Results
                </TabsTrigger>
                <TabsTrigger
                  value="inference"
                  disabled={!hasCheckpoints}
                  className="h-9 px-4 rounded-lg border-none text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title={!hasCheckpoints ? "Train a model first to use inference" : undefined}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2" />
                  Inference
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="code" className="flex-1 overflow-hidden mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:duration-200">
              <CodePreview />
            </TabsContent>
            <TabsContent value="results" className="flex-1 overflow-hidden mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:duration-200">
              <ResultsPanel />
            </TabsContent>
            <TabsContent value="inference" className="flex-1 overflow-hidden mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:duration-200">
              <InferencePlayground />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
