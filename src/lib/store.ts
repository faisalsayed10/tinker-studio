import { create } from "zustand";
import {
  PipelineConfig,
  DEFAULT_CONFIG,
  DEFAULT_RL_CONFIG,
  ExecutionState,
  TrainingMode,
  LogEntry,
  MetricPoint,
  CheckpointSample,
  ValidationWarning,
  Settings,
  DEFAULT_SETTINGS,
  InferenceState,
  DEFAULT_INFERENCE_CONFIG,
  ChatMessage,
  InferenceConfig,
  Checkpoint,
  TrainingJob,
  Model,
} from "./types";

// =============================================================================
// Store Interface
// =============================================================================

interface StudioStore {
  // Pipeline configuration (the IR)
  config: PipelineConfig;

  // Execution state
  execution: ExecutionState;

  // Settings (persisted)
  settings: Settings;

  // Inference state
  inference: InferenceState;

  // Checkpoints
  checkpoints: Checkpoint[];
  checkpointsLoading: boolean;

  // Training history
  trainingHistory: TrainingJob[];

  // Current training job ID
  currentJobId: string | null;

  // Models from Tinker API
  models: Model[];
  modelsLoading: boolean;
  modelsError: string | undefined;

  // UI state
  activePanel: "config" | "code" | "logs";
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  checkpointBrowserOpen: boolean;
  historyOpen: boolean;

  // Actions - Config
  setMode: (mode: TrainingMode) => void;
  setModel: (model: Partial<PipelineConfig["model"]>) => void;
  setDataset: (dataset: Partial<PipelineConfig["dataset"]>) => void;
  setHyperparameters: (params: Partial<PipelineConfig["hyperparameters"]>) => void;
  setRLConfig: (rl: Partial<NonNullable<PipelineConfig["rl"]>>) => void;
  setCheckpointing: (checkpoint: Partial<PipelineConfig["checkpointing"]>) => void;
  resetConfig: () => void;
  loadConfig: (config: PipelineConfig) => void;
  setResumeFrom: (resumeFrom: PipelineConfig["resumeFrom"]) => void;
  clearResumeFrom: () => void;

  // Actions - Execution
  startExecution: (jobId: string) => void;
  stopExecution: () => void;
  addLog: (log: Omit<LogEntry, "timestamp">) => void;
  addMetric: (metric: MetricPoint) => void;
  addCheckpointSample: (sample: Omit<CheckpointSample, "timestamp">) => void;
  setExecutionStatus: (status: ExecutionState["status"]) => void;
  setExecutionProgress: (current: number, total: number) => void;
  setExecutionError: (error: string) => void;
  clearExecution: () => void;

  // Actions - Settings
  setApiKey: (key: string) => void;
  setApiKeyValidated: (validated: boolean) => void;
  setTheme: (theme: Settings["theme"]) => void;
  setSettingsOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setCheckpointBrowserOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;

  // Actions - Inference
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  updateLastMessage: (content: string) => void;
  clearMessages: () => void;
  setInferenceConfig: (config: Partial<InferenceConfig>) => void;
  setIsGenerating: (generating: boolean) => void;
  setInferenceError: (error: string | undefined) => void;

  // Actions - Checkpoints
  fetchCheckpoints: () => Promise<void>;
  setCheckpoints: (checkpoints: Checkpoint[]) => void;
  addCheckpoint: (checkpoint: Checkpoint) => void;

  // Actions - Training History
  addTrainingJob: (job: TrainingJob) => void;
  updateTrainingJob: (id: string, updates: Partial<TrainingJob>) => void;

  // Actions - Models
  fetchModels: () => Promise<void>;
  setModels: (models: Model[]) => void;

  // Actions - UI
  setActivePanel: (panel: "config" | "code" | "logs") => void;

  // Computed - Validation
  getValidationWarnings: () => ValidationWarning[];

  // Helpers
  hasApiKey: () => boolean;

  // Execution persistence
  restoreExecutionState: () => Promise<{ jobId: string | null; shouldReconnect: boolean }>;
  getPersistedExecutionState: () => { jobId: string | null; execution: ExecutionState } | null;
}

// =============================================================================
// Store Implementation
// =============================================================================

// Helper to load settings from localStorage
const loadPersistedSettings = (): Settings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem("tinker-studio-settings");
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS;
};

// Helper to save settings to localStorage
const persistSettings = (settings: Settings) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("tinker-studio-settings", JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
};

// Helper to load training history from localStorage
const loadTrainingHistory = (): TrainingJob[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("tinker-studio-history");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
};

// Helper to check if a job is worth keeping in history
// Jobs that failed/cancelled without any checkpoints are not useful
const isJobWorthKeeping = (job: TrainingJob): boolean => {
  // Always keep completed jobs
  if (job.status === "completed") return true;
  // Keep running jobs (they're in progress)
  if (job.status === "running") return true;
  // Keep pending jobs
  if (job.status === "pending") return true;
  // For failed/cancelled jobs, only keep if they have a checkpoint
  if (job.status === "failed" || job.status === "cancelled") {
    return (job.lastCheckpointStep ?? 0) > 0;
  }
  return true;
};

// Helper to save training history to localStorage
const persistTrainingHistory = (history: TrainingJob[]) => {
  if (typeof window === "undefined") return;
  try {
    // Filter out jobs that aren't worth keeping (failed without checkpoints)
    const worthKeeping = history.filter(isJobWorthKeeping);
    // Keep only last 50 jobs
    const trimmed = worthKeeping.slice(-50);
    localStorage.setItem("tinker-studio-history", JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
};

// Helper to persist execution state for resume capability
interface PersistedExecutionState {
  jobId: string | null;
  execution: ExecutionState;
  timestamp: number;
}

const persistExecutionState = (jobId: string | null, execution: ExecutionState) => {
  if (typeof window === "undefined") return;
  try {
    const state: PersistedExecutionState = {
      jobId,
      execution,
      timestamp: Date.now(),
    };
    localStorage.setItem("tinker-studio-execution", JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
};

const loadPersistedExecution = (): PersistedExecutionState | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("tinker-studio-execution");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

const clearPersistedExecution = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("tinker-studio-execution");
  } catch {
    // Ignore storage errors
  }
};

export const useStudioStore = create<StudioStore>((set, get) => ({
  // Initial state
  config: DEFAULT_CONFIG,

  execution: {
    status: "idle",
    currentStep: 0,
    totalSteps: 0,
    logs: [],
    metrics: [],
    checkpointSamples: [],
  },

  settings: loadPersistedSettings(),

  inference: {
    messages: [],
    config: DEFAULT_INFERENCE_CONFIG,
    isGenerating: false,
  },

  checkpoints: [],
  checkpointsLoading: false,

  trainingHistory: loadTrainingHistory(),

  currentJobId: null,

  models: [],
  modelsLoading: false,
  modelsError: undefined,

  activePanel: "config",
  settingsOpen: false,
  shortcutsOpen: false,
  checkpointBrowserOpen: false,
  historyOpen: false,

  // ==========================================================================
  // Config Actions
  // ==========================================================================

  setMode: (mode) =>
    set((state) => ({
      config: {
        ...state.config,
        mode,
        rl: mode === "rl" ? state.config.rl ?? DEFAULT_RL_CONFIG : state.config.rl,
        dataset: {
          ...state.config.dataset,
          preset: mode === "rl" ? "openai/gsm8k" : "HuggingFaceH4/no_robots",
        },
      },
    })),

  setModel: (model) =>
    set((state) => ({
      config: {
        ...state.config,
        model: { ...state.config.model, ...model },
      },
    })),

  setDataset: (dataset) =>
    set((state) => ({
      config: {
        ...state.config,
        dataset: { ...state.config.dataset, ...dataset },
      },
    })),

  setHyperparameters: (params) =>
    set((state) => ({
      config: {
        ...state.config,
        hyperparameters: { ...state.config.hyperparameters, ...params },
      },
    })),

  setRLConfig: (rl) =>
    set((state) => {
      const currentRL = state.config.rl ?? { ...DEFAULT_RL_CONFIG };
      return {
        config: {
          ...state.config,
          rl: {
            rewardFunction: rl.rewardFunction ?? currentRL.rewardFunction,
            groupSize: rl.groupSize ?? currentRL.groupSize,
            klCoefficient: rl.klCoefficient ?? currentRL.klCoefficient,
            temperature: rl.temperature ?? currentRL.temperature,
          },
        },
      };
    }),

  setCheckpointing: (checkpoint) =>
    set((state) => ({
      config: {
        ...state.config,
        checkpointing: { ...state.config.checkpointing, ...checkpoint },
      },
    })),

  resetConfig: () => set({ config: DEFAULT_CONFIG }),

  loadConfig: (config) => set({ config }),

  setResumeFrom: (resumeFrom) =>
    set((state) => ({
      config: {
        ...state.config,
        resumeFrom,
      },
    })),

  clearResumeFrom: () =>
    set((state) => ({
      config: {
        ...state.config,
        resumeFrom: undefined,
      },
    })),

  // ==========================================================================
  // Execution Actions
  // ==========================================================================

  startExecution: (jobId) => {
    const newExecution: ExecutionState = {
      status: "running",
      currentStep: 0,
      totalSteps: 0,
      logs: [],
      metrics: [],
      checkpointSamples: [],
    };
    persistExecutionState(jobId, newExecution);
    set({
      currentJobId: jobId,
      execution: newExecution,
    });
  },

  stopExecution: () =>
    set((state) => {
      const newExecution = {
        ...state.execution,
        status: "idle" as const,
      };
      persistExecutionState(state.currentJobId, newExecution);
      return { execution: newExecution };
    }),

  addLog: (log) =>
    set((state) => {
      const newExecution = {
        ...state.execution,
        logs: [...state.execution.logs, { ...log, timestamp: Date.now() }],
      };
      // Only persist every 10 logs to avoid excessive writes
      if (newExecution.logs.length % 10 === 0) {
        persistExecutionState(state.currentJobId, newExecution);
      }
      return { execution: newExecution };
    }),

  addMetric: (metric) =>
    set((state) => {
      const newExecution = {
        ...state.execution,
        metrics: [...state.execution.metrics, metric],
      };
      // Persist on every metric update (less frequent than logs)
      persistExecutionState(state.currentJobId, newExecution);
      return { execution: newExecution };
    }),

  addCheckpointSample: (sample) =>
    set((state) => {
      const newExecution = {
        ...state.execution,
        checkpointSamples: [
          ...state.execution.checkpointSamples,
          { ...sample, timestamp: Date.now() },
        ],
      };
      persistExecutionState(state.currentJobId, newExecution);
      return { execution: newExecution };
    }),

  setExecutionStatus: (status) =>
    set((state) => {
      const newExecution = {
        ...state.execution,
        status,
      };
      persistExecutionState(state.currentJobId, newExecution);
      // Clear persisted state when job completes or errors
      if (status === "completed" || status === "error" || status === "idle") {
        clearPersistedExecution();
      }
      return { execution: newExecution };
    }),

  setExecutionProgress: (current, total) =>
    set((state) => {
      const newExecution = {
        ...state.execution,
        currentStep: current,
        totalSteps: total,
      };
      // Persist progress updates
      persistExecutionState(state.currentJobId, newExecution);
      return { execution: newExecution };
    }),

  setExecutionError: (error) =>
    set((state) => {
      const newExecution = {
        ...state.execution,
        status: "error" as const,
        error,
      };
      clearPersistedExecution();
      return { execution: newExecution };
    }),

  clearExecution: () => {
    clearPersistedExecution();
    set({
      currentJobId: null,
      execution: {
        status: "idle",
        currentStep: 0,
        totalSteps: 0,
        logs: [],
        metrics: [],
        checkpointSamples: [],
      },
    });
  },

  // ==========================================================================
  // Settings Actions
  // ==========================================================================

  setApiKey: (apiKey) =>
    set((state) => {
      const newSettings = { ...state.settings, apiKey, apiKeyValidated: false };
      persistSettings(newSettings);
      // Fetch checkpoints if API key is set and was previously validated
      if (apiKey && state.settings.apiKeyValidated) {
        setTimeout(() => {
          get().fetchCheckpoints();
        }, 0);
      }
      return { settings: newSettings };
    }),

  setApiKeyValidated: (apiKeyValidated) =>
    set((state) => {
      const newSettings = { ...state.settings, apiKeyValidated };
      persistSettings(newSettings);
      // Fetch checkpoints when API key is validated
      if (apiKeyValidated && newSettings.apiKey) {
        // Use setTimeout to avoid calling async function in setter
        setTimeout(() => {
          get().fetchCheckpoints();
        }, 0);
      }
      return { settings: newSettings };
    }),

  setTheme: (theme) =>
    set((state) => {
      const newSettings = { ...state.settings, theme };
      persistSettings(newSettings);
      return { settings: newSettings };
    }),

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),

  setCheckpointBrowserOpen: (checkpointBrowserOpen) => set({ checkpointBrowserOpen }),

  setHistoryOpen: (historyOpen) => set({ historyOpen }),

  // ==========================================================================
  // Inference Actions
  // ==========================================================================

  addMessage: (message) =>
    set((state) => ({
      inference: {
        ...state.inference,
        messages: [
          ...state.inference.messages,
          {
            ...message,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          },
        ],
      },
    })),

  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.inference.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        };
      }
      return {
        inference: {
          ...state.inference,
          messages,
        },
      };
    }),

  clearMessages: () =>
    set((state) => ({
      inference: {
        ...state.inference,
        messages: [],
        error: undefined,
      },
    })),

  setInferenceConfig: (config) =>
    set((state) => ({
      inference: {
        ...state.inference,
        config: { ...state.inference.config, ...config },
      },
    })),

  setIsGenerating: (isGenerating) =>
    set((state) => ({
      inference: {
        ...state.inference,
        isGenerating,
      },
    })),

  setInferenceError: (error) =>
    set((state) => ({
      inference: {
        ...state.inference,
        error,
        isGenerating: false,
      },
    })),

  // ==========================================================================
  // Checkpoint Actions
  // ==========================================================================

  fetchCheckpoints: async () => {
    const { settings } = get();
    if (!settings.apiKey) {
      return;
    }

    set({ checkpointsLoading: true });

    try {
      const response = await fetch("/api/checkpoints/list", {
        headers: {
          "x-api-key": settings.apiKey,
        },
      });

      const data = await response.json();

      if (data.success) {
        set({ checkpoints: data.data.checkpoints, checkpointsLoading: false });
      } else {
        set({ checkpointsLoading: false });
        // Silently fail - checkpoints might not exist yet
        console.warn("Failed to fetch checkpoints:", data.error);
      }
    } catch (error) {
      set({ checkpointsLoading: false });
      // Silently fail - network errors shouldn't block the app
      console.warn("Error fetching checkpoints:", error);
    }
  },

  setCheckpoints: (checkpoints) => set({ checkpoints }),

  addCheckpoint: (checkpoint) =>
    set((state) => ({
      checkpoints: [...state.checkpoints, checkpoint],
    })),

  // ==========================================================================
  // Training History Actions
  // ==========================================================================

  addTrainingJob: (job) =>
    set((state) => {
      const newHistory = [...state.trainingHistory, job];
      persistTrainingHistory(newHistory);
      return { trainingHistory: newHistory };
    }),

  updateTrainingJob: (id, updates) =>
    set((state) => {
      const newHistory = state.trainingHistory.map((job) =>
        job.id === id ? { ...job, ...updates } : job
      );
      persistTrainingHistory(newHistory);
      return { trainingHistory: newHistory };
    }),

  // ==========================================================================
  // Models Actions
  // ==========================================================================

  fetchModels: async () => {
    const { settings, config } = get();
    set({ modelsLoading: true, modelsError: undefined });

    try {
      const headers: HeadersInit = {};
      if (settings.apiKey) {
        headers["x-tinker-api-key"] = settings.apiKey;
      }

      const response = await fetch("/api/tinker/models", { headers });
      const result = await response.json();

      if (result.success && result.data?.models) {
        const models = result.data.models;
        const updates: Partial<ReturnType<typeof get>> = {
          models,
          modelsLoading: false,
        };

        // Auto-select first model for training config if no model is selected
        if (models.length > 0 && !config.model.baseModel) {
          const firstModel = models[0];
          const recommendedModel = models.find((m: Model) => m.recommended) || firstModel;
          updates.config = {
            ...config,
            model: {
              ...config.model,
              baseModel: recommendedModel.id,
            },
          };
        }

        set(updates as Parameters<typeof set>[0]);
      } else {
        set({
          modelsError: result.error || "Failed to fetch models",
          modelsLoading: false,
        });
      }
    } catch (error) {
      set({
        modelsError: error instanceof Error ? error.message : "Failed to fetch models",
        modelsLoading: false,
      });
    }
  },

  setModels: (models) => set({ models }),

  // ==========================================================================
  // UI Actions
  // ==========================================================================

  setActivePanel: (panel) => set({ activePanel: panel }),

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  getValidationWarnings: () => {
    const { config } = get();
    const warnings: ValidationWarning[] = [];

    // Learning rate warnings
    if (config.hyperparameters.learningRate > 1e-3) {
      warnings.push({
        field: "learningRate",
        message: "Learning rate > 1e-3 may cause training instability",
        severity: "warning",
      });
    }
    if (config.hyperparameters.learningRate < 1e-6) {
      warnings.push({
        field: "learningRate",
        message: "Learning rate < 1e-6 may lead to very slow convergence",
        severity: "warning",
      });
    }

    // Batch size warnings
    if (config.hyperparameters.batchSize < 16) {
      warnings.push({
        field: "batchSize",
        message: "Batch size < 16 often leads to noisy gradients",
        severity: "warning",
      });
    }

    // LoRA rank warnings
    if (config.model.loraRank < 8) {
      warnings.push({
        field: "loraRank",
        message: "LoRA rank < 8 may limit model capacity",
        severity: "warning",
      });
    }
    if (config.model.loraRank > 128) {
      warnings.push({
        field: "loraRank",
        message: "LoRA rank > 128 increases memory usage with diminishing returns",
        severity: "warning",
      });
    }

    // Context length vs model
    const { models } = get();
    const selectedModel = models.find((m) => m.id === config.model.baseModel);
    const maxAllowed = selectedModel?.maxLength ?? 128000;
    if (config.model.maxLength > maxAllowed) {
      warnings.push({
        field: "maxLength",
        message: `Max length exceeds model's context window (${maxAllowed} tokens)`,
        severity: "error",
      });
    }

    // RL-specific warnings
    if (config.mode === "rl" && config.rl) {
      if (config.rl.groupSize < 4) {
        warnings.push({
          field: "groupSize",
          message: "Group size < 4 may not provide enough signal for GRPO",
          severity: "warning",
        });
      }
      if (config.rl.klCoefficient > 0.5) {
        warnings.push({
          field: "klCoefficient",
          message: "KL coefficient > 0.5 may overly constrain policy updates",
          severity: "warning",
        });
      }
    }

    // Warmup ratio
    if (config.hyperparameters.warmupRatio > 0.3) {
      warnings.push({
        field: "warmupRatio",
        message: "Warmup ratio > 0.3 means less time at full learning rate",
        severity: "warning",
      });
    }

    return warnings;
  },

  // ==========================================================================
  // Helpers
  // ==========================================================================

  hasApiKey: () => {
    const { settings } = get();
    return settings.apiKey.length > 0;
  },

  // ==========================================================================
  // Execution Persistence
  // ==========================================================================

  getPersistedExecutionState: () => {
    const persisted = loadPersistedExecution();
    if (!persisted) return null;
    return {
      jobId: persisted.jobId,
      execution: persisted.execution,
    };
  },

  restoreExecutionState: async () => {
    const persisted = loadPersistedExecution();
    if (!persisted || !persisted.jobId) {
      return { jobId: null, shouldReconnect: false };
    }

    // Check if the job is still active on the server
    try {
      const response = await fetch(`/api/training/${persisted.jobId}/status`);
      const result = await response.json();

      if (result.success && result.data.exists && result.data.status === "running") {
        // Job is still running - restore state and signal to reconnect
        set({
          currentJobId: persisted.jobId,
          execution: persisted.execution,
        });
        return { jobId: persisted.jobId, shouldReconnect: true };
      } else if (result.success && result.data.exists) {
        // Job exists but is not running anymore - restore state but don't reconnect
        // Update status based on server state
        const newStatus =
          result.data.status === "completed"
            ? "completed"
            : result.data.status === "failed"
            ? "error"
            : result.data.status === "cancelled"
            ? "error"
            : "idle";
        set({
          currentJobId: persisted.jobId,
          execution: {
            ...persisted.execution,
            status: newStatus,
          },
        });
        clearPersistedExecution();
        return { jobId: persisted.jobId, shouldReconnect: false };
      } else {
        // Job doesn't exist on server anymore - but keep the persisted state as completed
        // This could happen if the server was restarted
        set({
          currentJobId: persisted.jobId,
          execution: {
            ...persisted.execution,
            status: persisted.execution.status === "running" ? "error" : persisted.execution.status,
            error:
              persisted.execution.status === "running"
                ? "Training session was interrupted (server may have restarted)"
                : persisted.execution.error,
          },
        });
        clearPersistedExecution();
        return { jobId: null, shouldReconnect: false };
      }
    } catch {
      // Network error - still restore persisted state
      set({
        currentJobId: persisted.jobId,
        execution: persisted.execution,
      });
      return { jobId: persisted.jobId, shouldReconnect: persisted.execution.status === "running" };
    }
  },
}));
