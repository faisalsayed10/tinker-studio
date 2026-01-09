# CLAUDE.md - AI Assistant Guide for Tinker Studio

**Last Updated:** 2026-01-08
**Version:** 1.0.0

---

## Project Overview

**Tinker Studio** is a Visual Post-Training IDE for Large Language Models that enables users to:

- Compose training pipelines visually
- Generate production-ready Python code
- Execute training with live monitoring via the Tinker API
- Test models via an inference playground

### Tech Stack

- **Framework:** Next.js 16.1.1 (App Router)
- **Frontend:** React 19.2.3 + TypeScript 5
- **State:** Zustand 5.0.9
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Code Editor:** Monaco Editor
- **Charts:** Recharts 3.6.0

### Core Principles

1. **Transparency:** Users see real Python code, not abstractions
2. **Cloud-Native:** Heavy compute offloaded to Tinker infrastructure
3. **Simple Over Complex:** Form-based config, not node-based programming
4. **Production-Ready:** Generated code uses actual Tinker API

---

## Codebase Architecture

### Architectural Flow

```
┌─ UI Layer (React Components) ────────────────────────┐
│  Pipeline Builder │ Code Editor │ Results │ Inference │
└───────────────────────────────────────────────────────┘
                    ↓
┌─ State Management (Zustand Store) ────────────────────┐
│  PipelineConfig (IR) │ ExecutionState │ Settings      │
└───────────────────────────────────────────────────────┘
                    ↓
       ┌────────────┼────────────┐
       ↓            ↓            ↓
  Codegen      Validator   Training Client
  (IR→Py)    (ML checks)   (SSE stream)
       ↓            ↓            ↓
       └────────────┼────────────┘
                    ↓
┌─ Next.js API Routes ──────────────────────────────────┐
│  /api/tinker/* │ /api/training/* │ /api/checkpoints/* │
└───────────────────────────────────────────────────────┘
                    ↓
┌─ Python Subprocess + Tinker SDK ──────────────────────┐
│           (Runs on Railway/Render)                     │
└───────────────────────────────────────────────────────┘
```

### The Intermediate Representation (IR)

**`PipelineConfig`** is the central abstraction that:

- **Drives the UI** - Form fields map to IR fields
- **Generates code** - Codegen transforms IR → Python
- **Validates** - ML-aware rules check configuration
- **Persists** - Training history stores configs

```typescript
interface PipelineConfig {
  mode: "sft" | "rl";
  model: { baseModel; loraRank; loraAlpha; maxLength };
  dataset: { preset; customData? };
  hyperparameters: { batchSize; learningRate; epochs; warmupRatio; gradientAccumulation };
  rl?: { rewardFunction; groupSize; klCoefficient; temperature };
  checkpointing: { saveEvery; outputDir };
}
```

---

## Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # Backend API routes
│   │   ├── tinker/               # Tinker API integration
│   │   │   ├── models/           # GET: Fetch available models
│   │   │   ├── sample/           # POST: Run inference
│   │   │   ├── validate/         # POST: Validate API key
│   │   │   └── cleanup/          # POST: Clean up artifacts
│   │   ├── training/             # Training job management
│   │   │   ├── start/            # POST: Start training job
│   │   │   └── [id]/
│   │   │       ├── stream/       # GET: SSE stream logs/metrics
│   │   │       └── stop/         # POST: Stop training job
│   │   └── checkpoints/          # Checkpoint management
│   │       └── list/             # GET: List saved checkpoints
│   ├── layout.tsx                # Root layout with fonts
│   ├── page.tsx                  # Main 3-panel resizable layout
│   └── globals.css               # Tailwind + CSS variables
│
├── components/                   # React UI components
│   ├── ui/                       # shadcn/ui primitives (14 files)
│   │   └── [button, input, label, select, dialog, tabs, etc.]
│   ├── pipeline/                 # Pipeline configuration UI
│   │   ├── pipeline-builder.tsx # Main container
│   │   ├── validation-warnings.tsx # ML validation display
│   │   └── blocks/               # Individual config sections
│   │       ├── mode-selector.tsx
│   │       ├── model-config.tsx
│   │       ├── dataset-config.tsx
│   │       ├── hyperparameters-config.tsx
│   │       ├── rl-config.tsx
│   │       ├── checkpointing-config.tsx
│   │       └── pipeline-block.tsx
│   ├── editor/
│   │   └── code-preview.tsx      # Monaco editor wrapper
│   ├── execution/
│   │   ├── results-panel.tsx     # Main results view
│   │   ├── metrics-chart.tsx     # Recharts loss curves
│   │   └── checkpoint-samples.tsx # Sample outputs
│   ├── inference/
│   │   └── inference-playground.tsx # Chat interface
│   ├── settings/
│   │   └── settings-dialog.tsx   # API key dialog
│   ├── history/
│   │   └── training-history.tsx  # Past runs
│   ├── checkpoints/
│   │   └── checkpoint-browser.tsx # Browse checkpoints
│   ├── shortcuts/
│   │   └── shortcuts-dialog.tsx  # Keyboard shortcuts
│   └── header.tsx                # Top bar with controls
│
└── lib/                          # Business logic & utilities
    ├── types.ts                  # TypeScript interfaces (269 lines)
    ├── store.ts                  # Zustand store (666 lines)
    ├── codegen.ts                # IR → Python generation
    ├── training-client.ts        # Training API client + SSE
    ├── training-store.ts         # Server-side job tracking
    └── utils.ts                  # Utility functions (cn)
```

---

## Key Files Reference

### Core Type System (`/src/lib/types.ts`)

**MUST READ FIRST** - Defines all TypeScript interfaces:

- **`PipelineConfig`** - Central IR for training configuration
- **`ExecutionState`** - Training status, logs, metrics
- **`Settings`** - API key, validation state, theme
- **`InferenceState`** - Chat messages, model selection
- **`Model`** - Available models from Tinker API
- **`TrainingJob`** - Job tracking metadata
- **`ValidationWarning`** - ML-aware validation results

**When to modify:**

- Adding new configuration options
- Changing training modes or parameters
- Adding new validation rules

### State Management (`/src/lib/store.ts`)

**Zustand Store** - Single source of truth for entire app state.

**Key sections:**

```typescript
interface StudioStore {
  // Pipeline configuration
  config: PipelineConfig;
  setMode: (mode) => void;
  setModel: (config) => void;
  setDataset: (config) => void;
  setHyperparameters: (params) => void;

  // Execution tracking
  execution: ExecutionState;
  startExecution: () => void;
  addLog: (log) => void;
  addMetric: (metric) => void;

  // Settings & API
  settings: Settings;
  setApiKey: (key) => void;
  validateApiKey: () => Promise<boolean>;

  // Models
  models: Model[];
  fetchModels: () => Promise<void>;

  // Training history
  trainingHistory: TrainingJob[];
  addToHistory: (job) => void;

  // Validation
  getValidationWarnings: () => ValidationWarning[];
}
```

**Important methods:**

- **`getValidationWarnings()`** - Computes ML-aware validation warnings (LR, batch size, LoRA rank, etc.)
- **`resetConfig()`** - Resets pipeline to defaults
- **`loadConfigFromHistory(jobId)`** - Loads past config

**When to modify:**

- Adding new state fields
- Adding new actions
- Changing validation logic
- Adding persistence for new features

### Code Generation (`/src/lib/codegen.ts`)

Transforms `PipelineConfig` → production Python code.

**Key functions:**

- **`generateTrainingCode(config, model, apiKey)`** - Main entry point
- **`generateSFTCode(config, model, apiKey)`** - SFT training loop
- **`generateRLCode(config, model, apiKey)`** - GRPO training loop
- **`generateTokenizerSetup(model)`** - Tokenizer initialization
- **`generateDatasetLoading(config)`** - Dataset loading code

**Code generation patterns:**

```python
# Generated code uses actual Tinker API:
from tinker import Client, AdamParams
client.forward_backward(...)
client.optim_step(...)
```

**When to modify:**

- Supporting new Tinker API features
- Adding new training modes
- Changing code output format
- Adding new dataset formats

### Training Client (`/src/lib/training-client.ts`)

Handles training job lifecycle and SSE streaming.

**Key functions:**

- **`startTraining(config, apiKey, modelData)`** - POST to `/api/training/start`
- **`connectToStream(jobId, callbacks)`** - Opens EventSource for SSE
- **`stopTraining(jobId)`** - POST to `/api/training/{id}/stop`

**Callback structure:**

```typescript
{
  onLog: (log: string) => void,
  onMetric: (metric: MetricData) => void,
  onStatus: (status: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
}
```

**When to modify:**

- Changing training API protocol
- Adding new event types
- Modifying SSE parsing logic

### Main Page (`/src/app/page.tsx`)

Three-panel resizable layout using `react-resizable-panels`:

```tsx
<ResizablePanelGroup direction="horizontal">
  {/* Left: Pipeline Builder (50% default) */}
  <ResizablePanel defaultSize={50}>
    <PipelineBuilder />
  </ResizablePanel>

  <ResizableHandle />

  {/* Right: Tabs (50% default) */}
  <ResizablePanel defaultSize={50}>
    <Tabs>
      <TabsList>Code | Results | Inference</TabsList>
      <TabsContent value="code">
        <CodePreview />
      </TabsContent>
      <TabsContent value="results">
        <ResultsPanel />
      </TabsContent>
      <TabsContent value="inference">
        <InferencePlayground />
      </TabsContent>
    </Tabs>
  </ResizablePanel>
</ResizablePanelGroup>
```

**When to modify:**

- Adding new panels or tabs
- Changing default layout proportions
- Adding keyboard shortcuts

---

## Development Conventions

### TypeScript Standards

1. **Strict Mode Enabled** - All TypeScript strict flags are on
2. **No `any` Types** - Use proper types or `unknown`
3. **Interface Over Type** - Prefer `interface` for object shapes
4. **Path Aliases** - Use `@/` for imports from `src/`

```typescript
// ✅ Good
import { PipelineConfig } from "@/lib/types";
const config: PipelineConfig = { ... };

// ❌ Bad
import { PipelineConfig } from "../../lib/types";
const config: any = { ... };
```

### Component Conventions

1. **Functional Components Only** - No class components
2. **Named Exports** - Avoid default exports except for pages
3. **Props Interface** - Always define props interface
4. **Zustand Hooks** - Use selective subscriptions

```tsx
// ✅ Good
interface ModelConfigProps {
  onValidate?: () => void;
}

export function ModelConfig({ onValidate }: ModelConfigProps) {
  const { config, setModel, models } = useStudioStore();
  // Only re-renders when config, setModel, or models change
}

// ❌ Bad
export default function ModelConfig(props: any) {
  const store = useStudioStore(); // Re-renders on ANY state change
}
```

### Styling Conventions

1. **Tailwind Classes** - Use utility classes, not custom CSS
2. **CSS Variables** - Use theme variables for colors
3. **cn() Utility** - Use for conditional classes
4. **Dark Theme Default** - Assume dark theme

```tsx
// ✅ Good
<div className={cn(
  "flex items-center gap-2 px-4 py-2",
  "bg-card border border-border rounded-lg",
  isActive && "ring-2 ring-primary"
)}>

// ❌ Bad
<div style={{ backgroundColor: '#1a1a1a', padding: '8px 16px' }}>
```

### File Naming

- **Components:** `kebab-case.tsx` (e.g., `pipeline-builder.tsx`)
- **Types/Utils:** `kebab-case.ts` (e.g., `training-client.ts`)
- **API Routes:** `route.ts` (Next.js convention)
- **Page Files:** `page.tsx`, `layout.tsx` (Next.js convention)

---

## State Management Patterns

### Reading State

```typescript
// ✅ Selective subscription (optimal)
const { config, setModel } = useStudioStore();

// ✅ Single field subscription
const apiKey = useStudioStore((state) => state.settings.apiKey);

// ❌ Full store subscription (re-renders on ANY change)
const store = useStudioStore();
```

### Updating State

```typescript
// ✅ Use provided actions
setModel({ baseModel: "meta-llama/Llama-3.3-70B-Instruct" });
setHyperparameters({ learningRate: 5e-5 });

// ✅ Batch updates in a single action
useStudioStore.setState((state) => ({
  config: {
    ...state.config,
    model: { ...state.config.model, loraRank: 32 },
    hyperparameters: { ...state.config.hyperparameters, learningRate: 5e-5 },
  },
}));

// ❌ Direct state mutation (won't trigger re-renders)
config.model.loraRank = 32;
```

### Computed Values

```typescript
// ✅ Use getters for computed values
const warnings = useStudioStore.getState().getValidationWarnings();

// ❌ Don't store computed values in state
// (They'll get out of sync)
```

### Persistence

```typescript
// Settings and training history are auto-persisted to localStorage
// via middleware in store.ts

// To add persistence to new state:
persist(
  (set, get) => ({
    newFeature: defaultValue,
    setNewFeature: (value) => set({ newFeature: value }),
  }),
  {
    name: "tinker-studio-storage",
    partialize: (state) => ({
      settings: state.settings,
      trainingHistory: state.trainingHistory,
      newFeature: state.newFeature, // Add here
    }),
  }
);
```

---

## Component Patterns

### Pipeline Configuration Blocks

All pipeline config components follow this pattern:

```tsx
import { useStudioStore } from "@/lib/store";
import { PipelineBlock } from "./pipeline-block";

export function ModelConfig() {
  const { config, setModel, models, fetchModels } = useStudioStore();

  useEffect(() => {
    fetchModels(); // Load models on mount
  }, [fetchModels]);

  return (
    <PipelineBlock
      title="Model Configuration"
      icon={<Cpu className="h-4 w-4" />}
      defaultOpen
    >
      <div className="space-y-4">
        {/* Form fields map directly to config.model */}
        <Select value={config.model.baseModel} onChange={...}>
          {models.map(model => ...)}
        </Select>

        <Input
          type="number"
          value={config.model.loraRank}
          onChange={(e) => setModel({ loraRank: Number(e.target.value) })}
        />
      </div>
    </PipelineBlock>
  );
}
```

**Pattern requirements:**

1. Wrap in `<PipelineBlock>` for consistent styling
2. Use selective Zustand subscription
3. Map form inputs directly to IR fields
4. Update state via provided actions
5. Handle loading states for async data

### Results/Execution Components

```tsx
export function ResultsPanel() {
  const { execution } = useStudioStore();
  const [activeTab, setActiveTab] = useState<"logs" | "metrics" | "samples">("logs");

  return (
    <div className="flex h-full flex-col">
      {/* Status indicator */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Badge variant={execution.status === "running" ? "default" : "secondary"}>
          {execution.status}
        </Badge>
        {execution.progress && (
          <div className="flex-1">
            <Progress value={execution.progress * 100} />
          </div>
        )}
      </div>

      {/* Tabbed content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <ScrollArea className="h-full">
            {execution.logs.map((log, i) => (
              <div key={i} className="font-mono text-sm">
                {log}
              </div>
            ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="metrics">
          <MetricsChart data={execution.metrics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### API Integration Pattern

```tsx
export function InferencePlayground() {
  const { settings, inference, addInferenceMessage } = useStudioStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    if (!settings.apiKey) {
      toast.error("Please set your API key in settings");
      return;
    }

    setIsLoading(true);
    addInferenceMessage({ role: "user", content: message });

    try {
      const response = await fetch("/api/tinker/sample", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tinker-api-key": settings.apiKey
        },
        body: JSON.stringify({
          model: inference.selectedModel,
          messages: [...inference.messages, { role: "user", content: message }],
          temperature: inference.config.temperature
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      addInferenceMessage({ role: "assistant", content: data.content });
    } catch (error) {
      toast.error(`Inference failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // UI implementation
  );
}
```

**API integration requirements:**

1. Check for API key before requests
2. Show loading states
3. Handle errors with toast notifications
4. Update Zustand state with results
5. Pass API key via `x-tinker-api-key` header

---

## API Routes & Backend

### Route Structure

All API routes follow Next.js 14+ App Router conventions:

```
app/api/
├── tinker/
│   ├── models/route.ts       # GET handler
│   ├── sample/route.ts       # POST handler
│   ├── validate/route.ts     # POST handler
│   └── cleanup/route.ts      # POST handler
└── training/
    ├── start/route.ts        # POST handler
    └── [id]/
        ├── stream/route.ts   # GET handler (SSE)
        └── stop/route.ts     # POST handler
```

### Route Handler Pattern

```typescript
// route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Extract and validate inputs
    const apiKey = request.headers.get("x-tinker-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    const body = await request.json();
    // Validate body fields...

    // 2. Business logic
    const result = await someOperation(body, apiKey);

    // 3. Return response
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Operation failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### SSE Stream Pattern

```typescript
// app/api/training/[id]/stream/route.ts
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const jobId = params.id;
  const job = activeJobs.get(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const interval = setInterval(() => {
        // Poll for new logs/metrics
        const newLogs = getNewLogs(job);

        newLogs.forEach((log) => {
          const message = `data: ${JSON.stringify({ type: "log", content: log })}\n\n`;
          controller.enqueue(encoder.encode(message));
        });

        // Check if job is done
        if (job.status === "completed" || job.status === "error") {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          clearInterval(interval);
          controller.close();
        }
      }, 100); // Poll every 100ms

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### API Key Handling

**Always require API key for Tinker operations:**

```typescript
const apiKey = request.headers.get("x-tinker-api-key");
if (!apiKey) {
  return NextResponse.json({ error: "Missing API key" }, { status: 401 });
}

// Use apiKey in Tinker SDK calls
const client = new TinkerClient(apiKey);
```

---

## Code Generation System

### Generation Flow

```
PipelineConfig (IR)
  ↓
generateTrainingCode()
  ↓
├─ mode === "sft" → generateSFTCode()
└─ mode === "rl"  → generateRLCode()
  ↓
[Python Code String]
  ↓
Monaco Editor Display
```

### Adding New Code Templates

To add support for a new training mode or feature:

1. **Update types** (`lib/types.ts`):

```typescript
export type TrainingMode = "sft" | "rl" | "dpo"; // Add "dpo"

export interface PipelineConfig {
  mode: TrainingMode;
  // ... other fields ...
  dpo?: {
    beta: number;
    referenceModel: string;
  };
}
```

2. **Update store** (`lib/store.ts`):

```typescript
setDPOConfig: (config: Partial<PipelineConfig["dpo"]>) =>
  set((state) => ({
    config: {
      ...state.config,
      dpo: { ...state.config.dpo, ...config },
    },
  }));
```

3. **Add code generator** (`lib/codegen.ts`):

```typescript
function generateDPOCode(config: PipelineConfig, model: Model, apiKey: string): string {
  return `
import tinker
from transformers import AutoTokenizer

# DPO Training Setup
client = tinker.Client(api_key="${apiKey}")
tokenizer = AutoTokenizer.from_pretrained("${model.id}")

# Load preference dataset
dataset = load_dataset("${config.dataset.preset}")

# DPO training loop
for batch in dataset:
    chosen_ids = tokenizer(batch["chosen"])
    rejected_ids = tokenizer(batch["rejected"])

    # Compute DPO loss
    loss = client.dpo_step(
        chosen_ids=chosen_ids,
        rejected_ids=rejected_ids,
        beta=${config.dpo?.beta || 0.1}
    )

    print(f"Loss: {loss:.4f}")

# Save checkpoint
client.save_checkpoint("${config.checkpointing.outputDir}/final")
`.trim();
}
```

4. **Update main generator**:

```typescript
export function generateTrainingCode(config: PipelineConfig, model: Model, apiKey: string): string {
  switch (config.mode) {
    case "sft":
      return generateSFTCode(config, model, apiKey);
    case "rl":
      return generateRLCode(config, model, apiKey);
    case "dpo":
      return generateDPOCode(config, model, apiKey);
    default:
      throw new Error(`Unknown mode: ${config.mode}`);
  }
}
```

5. **Add UI component** (`components/pipeline/blocks/dpo-config.tsx`):

```tsx
export function DPOConfig() {
  const { config, setDPOConfig } = useStudioStore();

  if (config.mode !== "dpo") return null;

  return (
    <PipelineBlock title="DPO Configuration" icon={<Scale />}>
      <div className="space-y-4">
        <div>
          <Label>Beta (DPO Temperature)</Label>
          <Input
            type="number"
            step="0.01"
            value={config.dpo?.beta || 0.1}
            onChange={(e) => setDPOConfig({ beta: Number(e.target.value) })}
          />
        </div>
      </div>
    </PipelineBlock>
  );
}
```

6. **Add to pipeline builder**:

```tsx
// components/pipeline/pipeline-builder.tsx
<ModelConfig />
<DatasetConfig />
<HyperparametersConfig />
<RLConfig />
<DPOConfig /> {/* Add here */}
<CheckpointingConfig />
```

---

## Common Development Tasks

### Task 1: Adding a New Configuration Option

**Example: Add `gradientClipping` to hyperparameters**

1. Update types:

```typescript
// lib/types.ts
export interface Hyperparameters {
  // ... existing fields ...
  gradientClipping?: number;
}
```

2. Update store default:

```typescript
// lib/store.ts
const defaultConfig: PipelineConfig = {
  // ...
  hyperparameters: {
    // ...
    gradientClipping: 1.0,
  },
};
```

3. Add setter (optional, or use existing `setHyperparameters`):

```typescript
setGradientClipping: (value: number) =>
  set((state) => ({
    config: {
      ...state.config,
      hyperparameters: {
        ...state.config.hyperparameters,
        gradientClipping: value,
      },
    },
  }));
```

4. Add validation (if needed):

```typescript
// lib/store.ts - getValidationWarnings()
if (config.hyperparameters.gradientClipping && config.hyperparameters.gradientClipping > 10) {
  warnings.push({
    severity: "warning",
    field: "Gradient Clipping",
    message: "Very high gradient clipping may slow convergence",
  });
}
```

5. Add UI control:

```tsx
// components/pipeline/blocks/hyperparameters-config.tsx
<div>
  <Label>Gradient Clipping</Label>
  <Input
    type="number"
    step="0.1"
    value={config.hyperparameters.gradientClipping || 1.0}
    onChange={(e) => setHyperparameters({ gradientClipping: Number(e.target.value) })}
  />
  <p className="text-sm text-muted-foreground mt-1">Maximum gradient norm (0 = disabled)</p>
</div>
```

6. Update code generation:

```typescript
// lib/codegen.ts
function generateSFTCode(...) {
  return `
# Gradient clipping
${config.hyperparameters.gradientClipping ?
  `torch.nn.utils.clip_grad_norm_(model.parameters(), ${config.hyperparameters.gradientClipping})`
  : ''}
  `.trim();
}
```

### Task 2: Adding a New Validation Rule

```typescript
// lib/store.ts - inside getValidationWarnings()

// Check for unsafe learning rate + batch size combination
const effectiveLR = config.hyperparameters.learningRate * config.hyperparameters.batchSize;
if (effectiveLR > 0.001) {
  warnings.push({
    severity: "warning",
    field: "Learning Rate × Batch Size",
    message: `Effective LR (${effectiveLR.toExponential(
      2
    )}) is high. Consider reducing learning rate.`,
  });
}

// Check for LoRA rank vs model size mismatch
const modelSizeB = getModelSizeInBillions(config.model.baseModel);
if (modelSizeB > 70 && config.model.loraRank < 16) {
  warnings.push({
    severity: "warning",
    field: "LoRA Rank",
    message: `Small LoRA rank (${config.model.loraRank}) for large model (${modelSizeB}B parameters). Consider rank ≥ 16.`,
  });
}
```

### Task 3: Adding a New Tab to Results Panel

1. Update component:

```tsx
// components/execution/results-panel.tsx
const [activeTab, setActiveTab] = useState<"logs" | "metrics" | "samples" | "profiler">("logs");

<TabsList>
  <TabsTrigger value="logs">Logs</TabsTrigger>
  <TabsTrigger value="metrics">Metrics</TabsTrigger>
  <TabsTrigger value="samples">Samples</TabsTrigger>
  <TabsTrigger value="profiler">Profiler</TabsTrigger> {/* New */}
</TabsList>

<TabsContent value="profiler">
  <ProfilerPanel />
</TabsContent>
```

2. Create component:

```tsx
// components/execution/profiler-panel.tsx
export function ProfilerPanel() {
  const { execution } = useStudioStore();

  // Extract profiling data from execution.metrics
  const profilingData = execution.metrics.filter((m) => m.type === "profile").map((m) => m.data);

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">Performance Profile</h3>
      {/* Render profiling visualization */}
    </div>
  );
}
```

### Task 4: Adding a New API Endpoint

1. Create route file:

```typescript
// app/api/tinker/datasets/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-tinker-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 });
    }

    // Fetch datasets from Tinker API
    const response = await fetch("https://api.tinker.ai/v1/datasets", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const datasets = await response.json();
    return NextResponse.json(datasets);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

2. Add client function:

```typescript
// lib/training-client.ts
export async function fetchDatasets(apiKey: string): Promise<Dataset[]> {
  const response = await fetch("/api/tinker/datasets", {
    headers: { "x-tinker-api-key": apiKey },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch datasets");
  }

  return response.json();
}
```

3. Add to store:

```typescript
// lib/store.ts
interface StudioStore {
  // ...
  datasets: Dataset[];
  datasetsLoading: boolean;
  fetchDatasets: () => Promise<void>;
}

// Implementation
fetchDatasets: async () => {
  const { settings } = get();
  if (!settings.apiKey) return;

  set({ datasetsLoading: true });
  try {
    const datasets = await fetchDatasets(settings.apiKey);
    set({ datasets, datasetsLoading: false });
  } catch (error) {
    console.error("Failed to fetch datasets:", error);
    set({ datasetsLoading: false });
  }
};
```

---

## Testing & Validation

### Before Committing

1. **Type Check**

```bash
npm run build
# Should complete without TypeScript errors
```

2. **Lint Check**

```bash
npm run lint
# Fix any ESLint warnings
```

3. **Manual Testing Checklist**

- [ ] Pipeline configuration updates UI correctly
- [ ] Generated code matches expected format
- [ ] Validation warnings appear/disappear correctly
- [ ] Training can start without errors
- [ ] SSE stream updates UI in real-time
- [ ] Inference playground works
- [ ] Settings dialog saves API key
- [ ] Training history persists

### Validation Testing

Test validation logic by entering extreme values:

```typescript
// In browser console
const store = (window.__TINKER_STORE__ = useStudioStore.getState());

// Test learning rate validation
store.setHyperparameters({ learningRate: 1.0 });
console.log(store.getValidationWarnings());
// Should show: "Learning rate 1.0 is very high..."

// Test LoRA rank validation
store.setModel({ loraRank: 256 });
console.log(store.getValidationWarnings());
// Should show: "LoRA rank 256 is unusually high..."
```

### Code Generation Testing

```typescript
// In browser console
const { generateTrainingCode } = require("@/lib/codegen");
const store = useStudioStore.getState();

const code = generateTrainingCode(store.config, store.models[0], "test-api-key");

console.log(code);
// Verify:
// - Correct mode (SFT/RL)
// - All config values appear
// - Valid Python syntax
// - Proper Tinker API usage
```

### API Route Testing

```bash
# Test model fetching
curl -H "x-tinker-api-key: YOUR_KEY" http://localhost:3000/api/tinker/models

# Test validation
curl -X POST -H "x-tinker-api-key: YOUR_KEY" http://localhost:3000/api/tinker/validate

# Test training start
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-tinker-api-key: YOUR_KEY" \
  -d '{"config": {...}, "model": {...}}' \
  http://localhost:3000/api/training/start
```

---

## Git Workflow

### Branch Strategy

- **Main Branch:** `main` - production-ready code
- **Feature Branches:** `claude/feature-name-{sessionId}` - new features
- **Fix Branches:** `claude/fix-description-{sessionId}` - bug fixes

**Current working branch:** `claude/add-claude-documentation-M1yKo`

### Commit Messages

Follow conventional commits:

```
feat: add DPO training mode support
fix: correct learning rate validation logic
docs: update CLAUDE.md with new patterns
refactor: simplify code generation logic
style: format components with prettier
test: add validation tests
chore: update dependencies
```

**Good commit examples:**

```
feat: add gradient clipping to hyperparameters
fix: resolve SSE connection timeout issue
docs: document code generation system
refactor: extract validation logic to separate file
```

**Bad commit examples:**

```
update stuff
fix bug
changes
WIP
```

### Committing Changes

```bash
# Stage specific files
git add src/lib/types.ts src/lib/store.ts src/components/pipeline/blocks/dpo-config.tsx

# Commit with descriptive message
git commit -m "feat: add DPO training mode configuration

- Add DPO types to PipelineConfig
- Implement DPO code generation
- Create DPO configuration UI component
- Add validation for DPO beta parameter"

# Push to feature branch
git push -u origin claude/add-claude-documentation-M1yKo
```

### Before Pushing

1. **Build succeeds:** `npm run build`
2. **No lint errors:** `npm run lint`
3. **Changes are tested** manually
4. **Commit message is clear** and follows conventions
5. **Only relevant files** are included

---

## Troubleshooting

### Common Issues

#### Issue: "Module not found" errors

**Symptom:** Import errors after adding new files

**Solution:**

```bash
# Restart Next.js dev server
# Press Ctrl+C to stop, then:
npm run dev
```

#### Issue: Zustand state not updating UI

**Symptom:** State changes don't trigger re-renders

**Solution:**

```typescript
// ❌ Wrong: Mutating state directly
config.model.loraRank = 32;

// ✅ Correct: Use setter
setModel({ loraRank: 32 });

// ✅ Or setState
useStudioStore.setState((state) => ({
  config: {
    ...state.config,
    model: { ...state.config.model, loraRank: 32 },
  },
}));
```

#### Issue: SSE connection drops immediately

**Symptom:** Training stream closes after first message

**Solution:**

- Check that job exists in `activeJobs` map
- Verify SSE headers are set correctly:
  ```typescript
  "Content-Type": "text/event-stream"
  "Cache-Control": "no-cache"
  "Connection": "keep-alive"
  ```
- Ensure interval is cleared on disconnect
- Check for errors in server logs

#### Issue: Generated code has syntax errors

**Symptom:** Python code won't run

**Solution:**

- Check template string formatting in `codegen.ts`
- Verify all variables are properly interpolated
- Test with minimal config first
- Check for missing line breaks or indentation

#### Issue: Validation warnings not showing

**Symptom:** `getValidationWarnings()` returns empty array

**Solution:**

- Check that validation logic accesses correct config fields
- Verify conditional logic (e.g., `config.rl` exists for RL mode)
- Test validation function directly:
  ```typescript
  const warnings = useStudioStore.getState().getValidationWarnings();
  console.log(warnings);
  ```

#### Issue: localStorage persistence not working

**Symptom:** Settings/history lost on refresh

**Solution:**

- Check browser dev tools → Application → Local Storage
- Verify `partialize` includes the state slice:
  ```typescript
  partialize: (state) => ({
    settings: state.settings,
    trainingHistory: state.trainingHistory,
  });
  ```
- Clear localStorage if corrupted:
  ```javascript
  localStorage.removeItem("tinker-studio-storage");
  ```

### Debugging Tips

1. **Zustand DevTools:**

```typescript
// Add to store.ts temporarily
import { devtools } from 'zustand/middleware';

export const useStudioStore = create(
  devtools(
    persist(
      (set, get) => ({ ... }),
      { name: "tinker-studio-storage" }
    )
  )
);
```

2. **Expose Store Globally (Development):**

```typescript
// In browser console
window.__TINKER_STORE__ = useStudioStore.getState();

// Then inspect:
__TINKER_STORE__.config;
__TINKER_STORE__.getValidationWarnings();
```

3. **Log SSE Events:**

```typescript
// In training-client.ts
eventSource.addEventListener("message", (event) => {
  console.log("[SSE]", event.data); // Add this
  const data = JSON.parse(event.data);
  // ... rest of handler
});
```

4. **Test Code Generation:**

```typescript
// In CodePreview component
useEffect(() => {
  console.log("Generated code:", generatedCode);
}, [generatedCode]);
```

---

## Performance Considerations

### State Optimization

1. **Selective Subscriptions:**

```typescript
// ✅ Only re-renders when logs change
const logs = useStudioStore((state) => state.execution.logs);

// ❌ Re-renders on ANY state change
const store = useStudioStore();
const logs = store.execution.logs;
```

2. **Memoized Selectors:**

```typescript
const validationWarnings = useStudioStore(
  useCallback((state) => state.getValidationWarnings(), [])
);
```

3. **Batch Updates:**

```typescript
// ✅ Single re-render
useStudioStore.setState({
  execution: {
    ...execution,
    logs: [...logs, newLog],
    metrics: [...metrics, newMetric],
    progress: newProgress,
  },
});

// ❌ Three re-renders
addLog(newLog);
addMetric(newMetric);
setProgress(newProgress);
```

### Component Optimization

1. **React.memo for Expensive Components:**

```typescript
export const MetricsChart = React.memo(function MetricsChart({ data }: Props) {
  // Expensive Recharts rendering
});
```

2. **Virtual Scrolling for Long Lists:**

```typescript
// For logs with 1000+ lines, consider react-window
import { FixedSizeList } from "react-window";
```

3. **Lazy Load Heavy Components:**

```typescript
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  loading: () => <div>Loading editor...</div>,
  ssr: false,
});
```

---

## Key URLs and Resources

### Documentation

- **Tinker API Docs:** https://tinker-docs.thinkingmachines.ai/
- **Next.js 14 Docs:** https://nextjs.org/docs
- **Zustand Docs:** https://docs.pmnd.rs/zustand
- **shadcn/ui:** https://ui.shadcn.com/
- **Tailwind CSS:** https://tailwindcss.com/docs

### API Endpoints (Production)

- **Tinker Console:** https://tinker-console.thinkingmachines.ai
- **Tinker API Base:** https://api.tinker.ai/v1

### Development

- **Local Dev Server:** http://localhost:3000
- **API Routes:** http://localhost:3000/api/\*

---

## Quick Reference

### Most Important Files

1. **`src/lib/types.ts`** - All TypeScript interfaces (READ FIRST)
2. **`src/lib/store.ts`** - Zustand store (state management)
3. **`src/lib/codegen.ts`** - Code generation logic
4. **`src/app/page.tsx`** - Main layout structure
5. **`src/components/header.tsx`** - Controls and settings

### Most Common Tasks

| Task                   | Primary Files to Modify                              |
| ---------------------- | ---------------------------------------------------- |
| Add config option      | `types.ts`, `store.ts`, `*-config.tsx`, `codegen.ts` |
| Add validation rule    | `store.ts` (getValidationWarnings)                   |
| Change UI layout       | `page.tsx`, component files                          |
| Add API endpoint       | `app/api/*/route.ts`, `training-client.ts`           |
| Modify code generation | `codegen.ts`                                         |
| Add new training mode  | All of the above                                     |

### Key Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production + type check
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Keyboard Shortcuts (In App)

- **Cmd/Ctrl + Enter:** Run/Stop training
- **Cmd/Ctrl + ,:** Open settings
- **Cmd/Ctrl + /:** Show shortcuts

---

**Document Version:** 1.0.0 | **Last Updated:** 2026-01-08
