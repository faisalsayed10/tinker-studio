"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudioStore } from "@/lib/store";
import {
  Settings,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export function SettingsDialog() {
  const { settings, settingsOpen, setSettingsOpen, setApiKey, setApiKeyValidated } =
    useStudioStore();

  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState(settings.apiKey);
  const [isValidating, setIsValidating] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const handleValidateKey = async () => {
    if (!keyInput.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch("/api/tinker/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: keyInput }),
      });

      const data = await response.json();

      if (data.success) {
        setApiKey(keyInput);
        setApiKeyValidated(true);
        toast.success("API key validated successfully!");
      } else {
        setApiKeyValidated(false);
        toast.error(data.error || "Invalid API key");
      }
    } catch (error) {
      setApiKeyValidated(false);
      toast.error("Failed to validate API key. Check your connection.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    setApiKey(keyInput);
    if (!keyInput.trim()) {
      setApiKeyValidated(false);
    }
    setSettingsOpen(false);
    toast.success("Settings saved");
  };

  const maskedKey = keyInput
    ? `${keyInput.slice(0, 8)}${"•".repeat(Math.max(0, keyInput.length - 12))}${keyInput.slice(-4)}`
    : "";

  const handleCleanup = async () => {
    if (!settings.apiKey) {
      toast.error("API key required for cleanup");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete ALL checkpoints and training data? This action cannot be undone."
    );

    if (!confirmed) return;

    setIsCleaningUp(true);

    try {
      const response = await fetch("/api/tinker/cleanup", {
        method: "DELETE",
        headers: {
          "x-api-key": settings.apiKey,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Cleanup complete! Deleted ${data.data?.deleted || 0} checkpoints.`);
        if (data.data?.errors?.length > 0) {
          toast.warning(`${data.data.errors.length} items failed to delete`);
        }
      } else {
        toast.error(data.error || "Cleanup failed");
      }
    } catch (error) {
      toast.error("Failed to cleanup. Check your connection.");
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Configure your Tinker API connection and preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* API Key Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="apiKey" className="text-sm font-medium text-zinc-300">
                Tinker API Key
              </Label>
              <a
                href="https://tinker-console.thinkingmachines.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Get API Key <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  id="apiKey"
                  type={showKey ? "text" : "password"}
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value);
                    setApiKeyValidated(false);
                  }}
                  placeholder="Enter your Tinker API key"
                  className="pl-10 pr-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button
                onClick={handleValidateKey}
                disabled={isValidating || !keyInput.trim()}
                variant="outline"
                className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Validate"
                )}
              </Button>
            </div>

            {/* Validation Status */}
            {settings.apiKey && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  settings.apiKeyValidated ? "text-green-400" : "text-zinc-500"
                }`}
              >
                {settings.apiKeyValidated ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    API key validated
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-yellow-500" />
                    API key not validated
                  </>
                )}
              </div>
            )}

            {/* Security Note */}
            <p className="text-xs text-zinc-500">
              Your API key is stored locally in your browser. Never share it publicly.
            </p>
          </div>

          {/* Danger Zone */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <Label className="text-sm font-medium text-red-400">Danger Zone</Label>
            </div>

            <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-300">Delete All Data</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Permanently delete all checkpoints, weights, and training data.
                  </p>
                </div>
                <Button
                  onClick={handleCleanup}
                  disabled={isCleaningUp || !settings.apiKey}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isCleaningUp ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {isCleaningUp ? "Deleting..." : "Delete All"}
                </Button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
          <Button
            variant="outline"
            onClick={() => setSettingsOpen(false)}
            className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
