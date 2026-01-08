import { create } from "zustand";
import { persist } from "zustand/middleware";
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

// Helper to save training history to localStorage
const persistTrainingHistory = (history: TrainingJob[]) => {
  if (typeof window === "undefined") return;
  try {
    // Keep only last 50 jobs
    const trimmed = history.slice(-50);
    localStorage.setItem("tinker-studio-history", JSON.stringify(trimmed));
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
        rl: mode === "rl" ? (state.config.rl ?? DEFAULT_RL_CONFIG) : state.config.rl,
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

  // ==========================================================================
  // Execution Actions
  // ==========================================================================

  startExecution: (jobId) =>
    set({
      currentJobId: jobId,
      execution: {
        status: "running",
        currentStep: 0,
        totalSteps: 0,
        logs: [],
        metrics: [],
        checkpointSamples: [],
      },
    }),

  stopExecution: () =>
    set((state) => ({
      execution: {
        ...state.execution,
        status: "idle",
      },
    })),

  addLog: (log) =>
    set((state) => ({
      execution: {
        ...state.execution,
        logs: [...state.execution.logs, { ...log, timestamp: Date.now() }],
      },
    })),

  addMetric: (metric) =>
    set((state) => ({
      execution: {
        ...state.execution,
        metrics: [...state.execution.metrics, metric],
      },
    })),

  addCheckpointSample: (sample) =>
    set((state) => ({
      execution: {
        ...state.execution,
        checkpointSamples: [
          ...state.execution.checkpointSamples,
          { ...sample, timestamp: Date.now() },
        ],
      },
    })),

  setExecutionStatus: (status) =>
    set((state) => ({
      execution: {
        ...state.execution,
        status,
      },
    })),

  setExecutionProgress: (current, total) =>
    set((state) => ({
      execution: {
        ...state.execution,
        currentStep: current,
        totalSteps: total,
      },
    })),

  setExecutionError: (error) =>
    set((state) => ({
      execution: {
        ...state.execution,
        status: "error",
        error,
      },
    })),

  clearExecution: () =>
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
    }),

  // ==========================================================================
  // Settings Actions
  // ==========================================================================

  setApiKey: (apiKey) =>
    set((state) => {
      const newSettings = { ...state.settings, apiKey, apiKeyValidated: false };
      persistSettings(newSettings);
      return { settings: newSettings };
    }),

  setApiKeyValidated: (apiKeyValidated) =>
    set((state) => {
      const newSettings = { ...state.settings, apiKeyValidated };
      persistSettings(newSettings);
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
}));
