"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useStudioStore } from "@/lib/store";
import { generateCode } from "@/lib/codegen";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const lineCount = code.split('\n').length;

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-200">tinker_{config.mode}_training.py</span>
          </div>
          <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-900">
            {lineCount} lines
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className={cn(
              "h-7 px-2.5 text-xs gap-1.5",
              copied ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-200"
            )}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-7 px-2.5 text-xs gap-1.5 text-zinc-500 hover:text-zinc-200"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="python"
          theme="vs-dark"
          value={code}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
            lineHeight: 1.6,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            renderLineHighlight: "none",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            lineNumbers: "on",
            lineNumbersMinChars: 4,
            glyphMargin: false,
            folding: true,
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>
    </div>
  );
}
