# Tinker Studio

**A Visual Post-Training IDE for LLMs**

Tinker Studio is a self-contained UI tool that lets you visually compose model training pipelines, compile them into real Python code, and execute them via the [Tinker API](https://tinker-docs.thinkingmachines.ai/). Not a demo—a real tool people can use for actual work.

---

## What I Built

**Tinker Studio** enables the complete post-training workflow:

1. **Configure** training pipelines through an intuitive visual interface
2. **Generate** production-ready Python code that matches the real Tinker API
3. **Execute** training with live monitoring and metrics visualization
4. **Test** models via the inference playground

### Core Features

| Feature | Description |
|---------|-------------|
| **Dual Training Modes** | Supervised Fine-Tuning (SFT) and Reinforcement Learning (GRPO) |
| **Real Code Generation** | Python code uses actual Tinker API signatures (`forward_backward`, `optim_step`, `AdamParams`) |
| **Inference Playground** | Multi-turn chat to test base models or fine-tuned checkpoints |
| **Live Metrics** | Real-time loss curves, reward tracking, and progress visualization |
| **API Key Management** | Secure settings dialog with validation |
| **ML-Aware Validation** | Warnings for learning rate, batch size, LoRA rank, context length, and more |
| **Training History** | Persistent storage of past runs for reproducibility |

---

## Architecture

### The Key Insight

Tinker is a **cloud training API**—the heavy compute (GPU, model weights, gradients) happens on Tinker's infrastructure. Your server just orchestrates.

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│  Your Server ($5/mo Railway)    │     │  Tinker Cloud (their GPUs)      │
│                                 │     │                                 │
│  • Load dataset                 │────▶│  • Store model weights          │
│  • Tokenize text (CPU)          │     │  • Run forward pass             │
│  • Send batches to API          │◀────│  • Compute gradients            │
│  • Receive loss values          │     │  • Apply optimizer              │
│  • Stream logs to UI            │     │  • Save checkpoints             │
│                                 │     │                                 │
│  RAM: 512MB-1GB                 │     │  GPUs: Handled by Tinker        │
│  GPU: None needed               │     │  Storage: Model weights there   │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer (React)                        │
│   Pipeline Builder │ Code Preview │ Logs │ Metrics │ Inference  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    State Management (Zustand)                   │
│   PipelineConfig (IR) + ExecutionState + Settings + Inference   │
└─────────────────────────────────────────────────────────────────┘
                                │
               ┌────────────────┼────────────────┐
               ▼                ▼                ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Code Generator  │  │  Config Validator│  │  Training Client │
│  IR → Python     │  │  ML Warnings     │  │  SSE Streaming   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                          │
│  /api/tinker/* │ /api/training/start │ /api/training/[id]/*    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│               Python Subprocess + Tinker SDK                    │
│                    (on Railway/Render)                          │
└─────────────────────────────────────────────────────────────────┘
```

### The IR (Intermediate Representation)

**PipelineConfig** is the central abstraction:

```typescript
interface PipelineConfig {
  mode: "sft" | "rl";
  model: { baseModel, loraRank, maxLength };
  dataset: { preset, customData? };
  hyperparameters: { batchSize, learningRate, epochs, warmupRatio, gradientAccumulation };
  rl?: { rewardFunction, groupSize, klCoefficient, temperature };
  checkpointing: { saveEvery, outputDir };
}
```

This IR:
- **Drives the UI** - Form fields map directly to IR fields
- **Generates code** - Codegen transforms IR → runnable Python
- **Validates** - ML-aware rules check configuration sanity
- **Persists** - Training history stores configs for reproducibility

---

## Quick Start

### Local Development

```bash
# Clone and install
git clone https://github.com/your-username/tinker-studio.git
cd tinker-studio
npm install

# Start development server
npm run dev
# Open http://localhost:3000
```

### Configure API Key

1. Get your key from [tinker-console.thinkingmachines.ai](https://tinker-console.thinkingmachines.ai)
2. Click ⚙️ Settings in the header
3. Enter and validate your API key

### Run Training

1. Configure your pipeline in the left panel
2. Review generated code in the right panel
3. Click **Run** (or `⌘+Enter`)
4. Monitor in Logs and Metrics tabs

### Test with Inference

1. Go to the **Inference** tab
2. Select a model
3. Start chatting

---

## Deployment

### Railway (Recommended)

Railway provides Python runtime for full training execution.

```bash
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
```

Environment variables:
- `TINKER_API_KEY` (optional—users can provide their own)

### Vercel

Works for UI and code generation. Training runs via downloaded code.

```bash
npm run build
vercel deploy
```

### Docker

```dockerfile
FROM node:18-alpine
RUN apk add --no-cache python3 py3-pip
RUN pip install tinker datasets transformers

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

---

## API Reference

### Training API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/training/start` | POST | Start training job, returns `jobId` |
| `/api/training/{id}/stream` | GET | SSE stream of logs and metrics |
| `/api/training/{id}/stop` | POST | Graceful shutdown |

### Tinker Integration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tinker/validate` | POST | Validate API key |
| `/api/tinker/models` | GET | List available models |
| `/api/tinker/sample` | POST | Run inference |

---

## Product Features Proposal

### Features to Build (Prioritized)

| # | Feature | Rationale |
|---|---------|-----------|
| 1 | **Inference Playground** | Proves API works. Instant demo value. ✅ Implemented |
| 2 | **ML-Aware Validation** | Shows domain expertise. Catches mistakes early. ✅ Implemented |
| 3 | **Live Metrics Dashboard** | Training monitoring is critical. ✅ Implemented |
| 4 | **Code Export** | Core value prop. The artifact that matters. ✅ Implemented |
| 5 | **Training History** | Reproducibility. Learn from past experiments. ✅ Implemented |

### Tempting But Wrong to Prioritize First

| Feature | Why Not |
|---------|---------|
| **Custom Dataset Upload** | High complexity (validation, preview, storage, formats). Preset datasets demonstrate the concept. Add after core flow works. |
| **Node-Based Visual Programming** | Looks impressive but obscures structure. Training loops are fundamentally sequential. Form-based config is more honest. |
| **Full RLHF Pipeline** | Complete preference learning adds massive complexity. Should nail SFT and GRPO first. |
| **Real-Time Token Streaming** | Nice-to-have for inference. Batch responses work. Adds WebSocket complexity. |

---

## Technical Decisions

### Why Zustand over Redux?

- Simpler API, less boilerplate
- Better TypeScript inference
- No provider required
- Easy localStorage persistence

### Why SSE over WebSocket?

- Simpler server implementation
- Automatic reconnection
- Works with serverless (shorter requests)
- One-directional flow fits the use case

### Why Generate Code vs. Direct API?

- **Transparency** - Users see exactly what runs
- **Portability** - Code runs anywhere
- **Debugging** - Users can inspect and modify
- **Education** - Teaches the Tinker API

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ + Enter` | Run/Stop training |
| `⌘ + ,` | Open settings |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── tinker/          # validate, models, sample
│   │   └── training/        # start, [id]/stream, [id]/stop
│   ├── page.tsx
│   └── layout.tsx
├── components/
│   ├── ui/                  # shadcn/ui
│   ├── pipeline/            # Configuration UI
│   │   └── blocks/          # Mode, Model, Dataset, etc.
│   ├── editor/              # Monaco code preview
│   ├── execution/           # Logs, Metrics tabs
│   ├── inference/           # Chat playground
│   └── settings/            # API key dialog
└── lib/
    ├── store.ts             # Zustand state
    ├── types.ts             # TypeScript types
    ├── codegen.ts           # IR → Python
    ├── training-client.ts   # Training API client
    └── execution-simulator.ts
```

---

## What This Demonstrates

- **Strong systems thinking** - Clean separation of UI, state, codegen, and execution
- **Clear abstractions** - PipelineConfig IR decouples concerns
- **Post-training expertise** - Correct Tinker API usage, ML-aware validation
- **Developer tool taste** - Monaco editor, keyboard shortcuts, progressive disclosure

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| State | Zustand |
| Styling | Tailwind + shadcn/ui |
| Code Editor | Monaco |
| Charts | Recharts |
| Icons | Lucide |

---

## License

MIT
