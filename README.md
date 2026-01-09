# Tinker Studio

A Visual Post-Training IDE for Large Language Models. Compose training pipelines visually, generate production-ready Python code, and execute via the Tinker API with live monitoring.

**Live Demo:** [tinker-studio-production.up.railway.app](https://tinker-studio-production.up.railway.app/)

![Tinker Studio Screenshot](./screenshot.png)

---

## Table of Contents

1. [Technical Implementation](#technical-implementation)
2. [Scope & Design Decisions](#scope--design-decisions)
3. [What's Intentionally Left Out](#whats-intentionally-left-out)
4. [Product Features Proposal](#product-features-proposal)
5. [Running Locally](#running-locally)

---

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Pipeline   │  │    Code     │  │  Results /  │             │
│  │  Builder    │  │   Preview   │  │  Inference  │             │
│  └──────┬──────┘  └──────▲──────┘  └──────▲──────┘             │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                │                │
┌─────────────────────────────────────────────────────────────────┐
│                  State Layer (Zustand Store)                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              PipelineConfig (IR)                         │   │
│  │  { mode, model, dataset, hyperparameters, rl?, ... }    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────┬────────────────┬────────────────┬─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────┐   ┌──────────────┐   ┌──────────────┐
│   Codegen   │   │  Validator   │   │   Training   │
│   (IR→Py)   │   │ (ML checks)  │   │    Client    │
└──────┬──────┘   └──────────────┘   └──────┬───────┘
       │                                     │
       ▼                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  API Layer (Next.js Routes)                     │
│  /api/training/start  │  /api/training/[id]/stream  │  ...     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Python Subprocess + Tinker SDK                     │
│        (Spawned with generated code, streams via SSE)           │
└─────────────────────────────────────────────────────────────────┘
```

### The Intermediate Representation (IR)

The core abstraction is `PipelineConfig`—a TypeScript interface that serves as the single source of truth:

```typescript
interface PipelineConfig {
  mode: "sft" | "rl";
  model: { baseModel; loraRank; loraAlpha; maxLength };
  dataset: { preset; customData? };
  hyperparameters: { batchSize; learningRate; epochs; warmupRatio; gradientAccumulation };
  rl?: { rewardFunction; groupSize; klCoefficient; temperature };
  checkpointing: { saveEvery; outputDir };
  resumeFrom?: { checkpointPath; checkpointLabel; fromStep; jobId };
}
```

**Why this design:**

- **Drives the UI** - Form fields map 1:1 to IR fields
- **Drives code generation** - IR transforms deterministically to Python
- **Drives validation** - ML-aware rules operate on IR
- **Enables persistence** - Training history stores complete configs

### Code Generation

The codegen system (`src/lib/codegen.ts`) transforms IR to production Python:

- `escapePythonString()` - Prevents string injection
- `validateSafeIdentifier()` - Whitelist validation for identifiers
- No hardcoded secrets - API keys passed via environment variables
- Proper tokenizer handling (gated repos, trust_remote_code)
- Gradient accumulation with correct batching
- Learning rate scheduling (linear warmup + cosine decay)
- Structured metrics output for live monitoring
- Checkpoint sampling with inference

### Training Modes

| Mode    | Description                               | Key Features                                                     |
| ------- | ----------------------------------------- | ---------------------------------------------------------------- |
| **SFT** | Supervised Fine-Tuning                    | Three dataset formats (input/output, chat, instruction/response) |
| **RL**  | GRPO (Group Relative Policy Optimization) | Multiple reward functions, importance sampling                   |

### Live Monitoring

Training execution uses Server-Sent Events (SSE) for real-time updates:

```
Client                    Server
   │                         │
   │──GET /stream?apiKey=...→│
   │                         │
   │←─event: log─────────────│
   │←─event: metric──────────│
   │←─event: checkpoint──────│
   │←─event: done────────────│
```

Metrics include: step, loss, learning rate, tokens/sec, ETA, checkpoint samples.

### State Management

Zustand store with selective subscriptions:

```typescript
// Components subscribe only to what they need
const { config, setModel } = useStudioStore();
const logs = useStudioStore((state) => state.execution.logs);
```

Persistence via localStorage: settings, training history, execution state restoration.

---

## Scope & Design Decisions

### What I Built (and Why)

| Feature                         | Rationale                                                             |
| ------------------------------- | --------------------------------------------------------------------- |
| **Form-based pipeline builder** | Lower barrier than node graphs; maps directly to code                 |
| **Real-time code preview**      | Transparency—users see exactly what runs                              |
| **ML-aware validation**         | Catch common mistakes (LR too high, batch too small) before execution |
| **Live training monitoring**    | Essential for understanding training dynamics                         |
| **Inference playground**        | Complete the loop: train → test → iterate                             |
| **Training resumption**         | Critical for real workflows; training often needs multiple sessions   |
| **Checkpoint management**       | Browse, test, and clean up training artifacts                         |

### UI/Execution Boundary

The boundary is explicit and clean:

```
UI (React)
    │
    ▼
State (Zustand) ←── Pure TypeScript, no side effects
    │
    ▼
Codegen ←────────── Pure function: IR → string (Python)
    │
    ▼
API Routes ←─────── Side effects isolated here
    │
    ▼
Python Subprocess ← Actual training execution (sandboxed)
```

---

## What's Intentionally Left Out

### Deferred for Scope

| Feature                                           | Why Not Now                                        |
| ------------------------------------------------- | -------------------------------------------------- |
| **Node-based visual programming**                 | Adds complexity without proportional value for MVP |
| **Multi-stage pipelines**                         | Single-stage covers 80% of use cases               |
| **Custom reward function editor**                 | Preset functions sufficient for demo               |
| **Dataset explorer with HuggingFace integration** | Too large of a scope for the MVP                   |
| **Dataset preview/exploration**                   | Focus on training, not data wrangling              |

### Architectural Shortcuts (Acceptable for Demo)

| Shortcut                   | Production Alternative               |
| -------------------------- | ------------------------------------ |
| In-memory job tracking     | Redis or database                    |
| localStorage persistence   | Database + user accounts             |
| Python subprocess spawning | Job queue (Celery, Bull)             |
| Single-server SSE          | Redis pub/sub for horizontal scaling |

---

## Product Features Proposal

#### 1. **Evals Integration**

**What:** Add a fourth tab "Eval" that runs trained checkpoints against standard benchmarks (MMLU, HellaSwag, GSM8K).

**Why:** Training without evaluation is flying blind. Users need quantitative feedback on whether fine-tuning improved the model. This completes the build-measure-learn loop.

**Implementation:** Integrate with InspectAI or lm-evaluation-harness; show pass rates, compare against base model.

#### 2. **Hyperparameter Presets**

**What:** One-click presets like "Conservative (low LR, high warmup)" or "Aggressive (high LR, short training)".

**Why:** Most users don't know optimal hyperparameters for their model size. Presets encode expert knowledge and reduce time-to-first-success.

**Implementation:** Preset objects that override multiple fields; validation ensures internal consistency.

#### 3. **Training Cost Estimator**

**What:** Show estimated cost/time before training starts based on model size, dataset, and epochs.

**Why:** Users need to budget compute. Surprises after hours of training are frustrating and expensive.

**Implementation:** Query Tinker API for pricing; estimate tokens from dataset size; display prominently before "Run".

#### 4. **Diff View for Config Changes**

**What:** When loading a config from history, show a diff of what changed vs. current config.

**Why:** "What did I change last time that made it work?" is a common question. Diffs make iteration systematic.

**Implementation:** JSON diff library; highlight changed fields in sidebar.

#### 5. **Export to Notebook**

**What:** Export generated code as a Jupyter notebook with markdown cells explaining each section.

**Why:** Users want to take their work elsewhere, run locally, or share with colleagues. Notebooks are the lingua franca of ML.

**Implementation:** Generate .ipynb JSON; add markdown cells for sections; include setup instructions.

---

### Features That Would Be Tempting But Wrong to Prioritize

#### 1. **Node-Based Visual Programming**

**Why it's tempting:** Looks impressive; mimics tools like ComfyUI or LangGraph; feels more "visual".

**Why it's wrong:**

- **Mismatch with problem domain** - Training pipelines are fundamentally linear (load → train → checkpoint). Node graphs add complexity for branching that rarely exists.
- **Worse code transparency** - Nodes abstract away the code, defeating the core value proposition.
- **Higher cognitive load** - Users must learn a new paradigm instead of seeing familiar Python.
- **Implementation cost** - Significant engineering effort for marginal benefit.

**Better alternative:** Keep the form-based approach; add "stages" later if multi-stage pipelines become common (e.g., SFT → DPO).

#### 2. **LLM Agent for Automatic Post-Training**

**Why it's tempting:** Let users describe their desired outcome in natural language and have an AI agent automatically configure and run post-training jobs. "Make my model better at coding" → agent picks SFT with code dataset, tunes hyperparameters, runs training.

**Why it's wrong:**

- **Overkill for the demo** - This is a showcase of the Tinker API, not an AI product in itself.

---

## Running Locally

### Prerequisites

- Node.js 18+
- Python 3.10+ (for training execution)
- Tinker API key ([sign up here](https://auth.thinkingmachines.ai/sign-up))

### Setup

```bash
# Clone the repository
pip install tinker datasets transformers
git clone https://github.com/faisalsayed10/tinker-studio.git
cd tinker-studio

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter your Tinker API key in Settings (Cmd/Ctrl + ,).

### Tech Stack

| Layer     | Technology                 |
| --------- | -------------------------- |
| Framework | Next.js 16.1 (App Router)  |
| Frontend  | React 19 + TypeScript 5    |
| State     | Zustand 5                  |
| Styling   | Tailwind CSS 4 + shadcn/ui |
| Editor    | Monaco Editor              |
| Charts    | Recharts                   |

### Project Structure

```
src/
├── app/                    # Next.js pages and API routes
│   ├── api/                # Backend endpoints
│   │   ├── training/       # Job lifecycle (start, stream, stop)
│   │   ├── tinker/         # Tinker API integration
│   │   └── checkpoints/    # Checkpoint management
│   └── page.tsx            # Main three-panel layout
├── components/             # React UI components
│   ├── pipeline/           # Configuration blocks
│   ├── editor/             # Code preview (Monaco)
│   ├── execution/          # Results and metrics
│   └── inference/          # Chat playground
└── lib/                    # Business logic
    ├── types.ts            # TypeScript interfaces (IR definition)
    ├── store.ts            # Zustand state management
    ├── codegen.ts          # IR → Python generation
    └── training-client.ts  # Training API client
```
