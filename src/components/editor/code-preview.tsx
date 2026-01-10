"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useStudioStore } from "@/lib/store";
import { generateCode } from "@/lib/codegen";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, FileCode } from "lucide-react";

// Dynamic import Monaco to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function CodePreview() {
  const config = useStudioStore((s) => s.config);
  const models = useStudioStore((s) => s.models);
  const [copied, setCopied] = useState(false);

  const selectedModel = models.find((m) => m.id === config.model.baseModel);
  const code = useMemo(() => generateCode(config, selectedModel), [config, selectedModel]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tinker_${config.mode}_training.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 h-12 px-6 bg-card/30">
        <div className="flex items-center gap-3">
          <FileCode className="h-4 w-4 text-muted-foreground" />
          <div>
            <span className="text-sm font-semibold">Generated Training Code</span>
            <span className="text-xs text-muted-foreground/60 font-mono ml-2">
              tinker_{config.mode}_training.py
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                <span>Copy</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            <span>Download</span>
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 bg-[#0a0a0a]">
        <Editor
          height="100%"
          language="python"
          theme="vs-dark"
          value={code}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "var(--font-geist-mono), monospace",
            lineHeight: 1.6,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            renderLineHighlight: "none",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
}
