// Training mode types
export type TrainingMode = "sft" | "rl";

// Model type for Tinker API
export interface Model {
  id: string;
  name: string;
  params?: string;
  maxLength?: number;
  description?: string;
  recommended?: boolean;
  // Tokenizer configuration (for code generation)
  tokenizer?: {
    id?: string; // Override tokenizer ID if different from model ID
    trustRemoteCode?: boolean;
    revision?: string;
  };
}

// Dataset presets
export const DATASET_PRESETS = {
  sft: [
    { id: "HuggingFaceH4/no_robots", name: "No Robots", description: "High-quality chat & instruction data" },
    { id: "allenai/tulu-3-sft-mixture", name: "Tulu 3 SFT", description: "Diverse instruction tuning mixture" },
    { id: "custom", name: "Custom Dataset", description: "Provide your own JSONL data" },
  ],
  rl: [
    { id: "openai/gsm8k", name: "GSM8K", description: "Grade school math problems (verifiable rewards)" },
    { id: "lighteval/MATH", name: "MATH", description: "Competition math problems" },
    { id: "custom", name: "Custom Dataset", description: "Provide your own prompts + reward function" },
  ],
} as const;

// Reward function types for RL
export const REWARD_FUNCTIONS = [
  { id: "exact_match", name: "Exact Match", description: "Answer must match exactly" },
  { id: "math_equivalence", name: "Math Equivalence", description: "Numerically equivalent (1/2 = 0.5)" },
  { id: "code_execution", name: "Code Execution", description: "Runs without error + passes tests" },
] as const;

// Pipeline configuration (the IR - Intermediate Representation)
export interface PipelineConfig {
  // Training mode
  mode: TrainingMode;

  // Model configuration
  model: {
    baseModel: string;
    loraRank: number;
    loraAlpha: number;
    maxLength: number;
  };

  // Dataset configuration
  dataset: {
    preset: string;
    customData?: string; // JSONL string for custom datasets
  };

  // Training hyperparameters
  hyperparameters: {
    batchSize: number;
    learningRate: number;
    epochs: number;
    warmupRatio: number;
    gradientAccumulation: number;
  };

  // RL-specific configuration
  rl?: {
    rewardFunction: string;
    groupSize: number; // Number of samples per prompt for GRPO
    klCoefficient: number;
    temperature: number;
  };

  // Checkpointing
  checkpointing: {
    saveEvery: number;
    outputDir: string;
  };
}

// Default configuration - model will be set from Tinker API
export const DEFAULT_CONFIG: PipelineConfig = {
  mode: "sft",
  model: {
    baseModel: "", // Will be populated from Tinker API
    loraRank: 32,
    loraAlpha: 64,
    maxLength: 4096,
  },
  dataset: {
    preset: "HuggingFaceH4/no_robots",
  },
  hyperparameters: {
    batchSize: 128,
    learningRate: 1e-4,
    epochs: 1,
    warmupRatio: 0.1,
    gradientAccumulation: 1,
  },
  checkpointing: {
    saveEvery: 25,
    outputDir: "/tmp/tinker-studio/checkpoints",
  },
};

// Default RL config to merge when switching modes
export const DEFAULT_RL_CONFIG: NonNullable<PipelineConfig["rl"]> = {
  rewardFunction: "math_equivalence",
  groupSize: 16,
  klCoefficient: 0.1,
  temperature: 0.7,
};

// Execution state
export type ExecutionStatus = "idle" | "running" | "completed" | "error";

export interface ExecutionState {
  status: ExecutionStatus;
  currentStep: number;
  totalSteps: number;
  logs: LogEntry[];
  metrics: MetricPoint[];
  checkpointSamples: CheckpointSample[];
  error?: string;
}

export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface MetricPoint {
  step: number;
  loss: number;
  reward?: number;
  learningRate?: number;
  // New real-time metrics
  tokensPerSecond?: number;
  wallClockTimeMs?: number;
  etaSeconds?: number;
  tokenCount?: number;
}

// Checkpoint inference sample
export interface CheckpointSample {
  step: number;
  checkpointPath: string;
  prompt: string;
  response: string;
  timestamp: number;
}

// Validation warnings
export interface ValidationWarning {
  field: string;
  message: string;
  severity: "warning" | "error";
}

// =============================================================================
// Settings & API Configuration
// =============================================================================

export interface Settings {
  apiKey: string;
  apiKeyValidated: boolean;
  theme: "dark" | "light" | "system";
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  apiKeyValidated: false,
  theme: "dark",
};

// =============================================================================
// Inference Types
// =============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  tokenCount?: number;
  latencyMs?: number;
}

export interface InferenceConfig {
  model: string; // Base model or checkpoint path (tinker://...)
  temperature: number;
  topP: number;
  maxTokens: number;
}

export const DEFAULT_INFERENCE_CONFIG: InferenceConfig = {
  model: "", // Will be populated from Tinker API
  temperature: 0.7,
  topP: 0.95,
  maxTokens: 512,
};

export interface InferenceState {
  messages: ChatMessage[];
  config: InferenceConfig;
  isGenerating: boolean;
  error?: string;
}

// =============================================================================
// Checkpoint Types
// =============================================================================

export interface Checkpoint {
  path: string; // tinker://... path
  name: string; // checkpoint_id (e.g., "sampler_weights/final", "weights/checkpoint-50")
  timestamp: number; // Unix timestamp in seconds
  baseModel: string; // From training run info
  loraRank?: number; // From training run info
  checkpointType?: "training" | "sampler"; // Type of checkpoint
  sizeBytes?: number; // Size in bytes
  public?: boolean; // Whether checkpoint is public
  // Legacy fields for backwards compatibility
  step?: number;
  mode?: "sft" | "rl";
  config?: Partial<PipelineConfig>;
}

// =============================================================================
// Training Job Types
// =============================================================================

export interface TrainingJob {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  config: PipelineConfig;
  startedAt?: number;
  completedAt?: number;
  currentStep: number;
  totalSteps: number;
  finalLoss?: number;
  finalReward?: number;
  checkpointPath?: string;
  error?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ServerCapabilities {
  models: Array<{
    id: string;
    name: string;
    maxLength: number;
  }>;
  features: string[];
}
