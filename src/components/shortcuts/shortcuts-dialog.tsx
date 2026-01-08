"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStudioStore } from "@/lib/store";
import { useEffect } from "react";

const shortcuts = [
  { keys: ["⌘", "Enter"], description: "Run / Stop training" },
  { keys: ["⌘", ","], description: "Open settings" },
  { keys: ["⌘", "/"], description: "Show keyboard shortcuts" },
  { keys: ["Esc"], description: "Close dialogs" },
];

const inferenceShortcuts = [
  { keys: ["Enter"], description: "Send message" },
];

export function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useStudioStore();

  // Handle Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && shortcutsOpen) {
        setShortcutsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcutsOpen, setShortcutsOpen]);

  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Global Shortcuts */}
          <div>
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Global
            </h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.description}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-zinc-300">
                    {shortcut.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, idx) => (
                      <span key={idx}>
                        <kbd className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300">
                          {key}
                        </kbd>
                        {idx < shortcut.keys.length - 1 && (
                          <span className="text-zinc-600 mx-0.5">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inference Shortcuts */}
          <div>
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
              Inference Playground
            </h3>
            <div className="space-y-2">
              {inferenceShortcuts.map((shortcut) => (
                <div
                  key={shortcut.description}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-zinc-300">
                    {shortcut.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, idx) => (
                      <span key={idx}>
                        <kbd className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300">
                          {key}
                        </kbd>
                        {idx < shortcut.keys.length - 1 && (
                          <span className="text-zinc-600 mx-0.5">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="pt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              Press <kbd className="px-1 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 text-[10px]">⌘/</kbd> anytime to show this dialog
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
