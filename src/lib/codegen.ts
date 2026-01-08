import { PipelineConfig, DATASET_PRESETS, Model } from "./types";

/**
 * Code Generator
 * Converts the pipeline IR (PipelineConfig) into executable Python code
 * Based on the tinker-cookbook patterns for correct API usage
 */

export function generateCode(config: PipelineConfig, model?: Model): string {
  if (config.mode === "sft") {
    return generateSFTCode(config, model);
  } else {
    return generateRLCode(config, model);
  }
}

/**
 * Generate Python code for tokenizer initialization based on model metadata
 */
function generateTokenizerCode(model?: Model): string {
  const hasTokenizerOverride = model?.tokenizer?.id;
  const hasTrustRemoteCode = model?.tokenizer?.trustRemoteCode;
  const hasRevision = model?.tokenizer?.revision;

  // Always generate the full tokenizer function with gated model handling
  // Following tinker-cookbook pattern from tokenizer_utils.py
  let code = `@cache
def get_tokenizer(model_name: str):
    """Get tokenizer for the model, handling gated repos."""
    tokenizer_name = model_name
    kwargs: dict[str, Any] = {}

    # Avoid gating of Llama 3 models - use public tokenizer
    if model_name.startswith("meta-llama/Llama-3"):
        tokenizer_name = "thinkingmachineslabinc/meta-llama-3-instruct-tokenizer"

    # Handle Kimi-K2-Thinking model
    if model_name == "moonshotai/Kimi-K2-Thinking":
        kwargs["trust_remote_code"] = True
        kwargs["revision"] = "612681931a8c906ddb349f8ad0f582cb552189cd"
`;

  if (hasTokenizerOverride) {
    code += `
    # Use configured tokenizer override
    if model_name == "${model!.id}":
        tokenizer_name = "${model!.tokenizer!.id}"
`;
  }

  if (hasTrustRemoteCode) {
    code += `
    # Model requires trust_remote_code
    if model_name == "${model!.id}":
        kwargs["trust_remote_code"] = True
`;
  }

  if (hasRevision) {
    code += `
    # Use specific revision
    if model_name == "${model!.id}":
        kwargs["revision"] = "${model!.tokenizer!.revision}"
`;
  }

  code += `
    return AutoTokenizer.from_pretrained(tokenizer_name, use_fast=True, **kwargs)`;

  return code;
}

function generateDatasetLoadingCode(config: PipelineConfig): string {
  if (config.dataset.preset === "custom" && config.dataset.customData) {
    // Custom dataset - embed inline and load from JSON
    const escapedData = config.dataset.customData
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => line.replace(/\\/g, "\\\\").replace(/"/g, '\\"'))
      .join("\\n");

    return `# Custom dataset (embedded inline)
CUSTOM_DATA = """${escapedData}"""

def load_custom_dataset():
    """Load custom dataset from embedded JSONL."""
    import json
    examples = []
    for line in CUSTOM_DATA.strip().split("\\n"):
        if line.strip():
            examples.append(json.loads(line))
    return examples

# Load dataset
logger.info("Loading custom dataset...")
raw_data = load_custom_dataset()
train_dataset = datasets.Dataset.from_list(raw_data)
logger.info(f"Dataset size: {len(train_dataset)} examples")`;
  } else {
    // HuggingFace dataset
    return `# Load dataset from HuggingFace
logger.info(f"Loading dataset: {DATASET}...")
dataset = datasets.load_dataset(DATASET)
train_dataset = dataset["train"]
logger.info(f"Dataset size: {len(train_dataset)} examples")`;
  }
}

function generateRLDatasetLoadingCode(config: PipelineConfig): string {
  if (config.dataset.preset === "custom" && config.dataset.customData) {
    // Custom dataset for RL - embed inline
    const escapedData = config.dataset.customData
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => line.replace(/\\/g, "\\\\").replace(/"/g, '\\"'))
      .join("\\n");

    return `# Custom RL dataset (embedded inline)
CUSTOM_DATA = """${escapedData}"""

def load_custom_dataset():
    """Load custom RL dataset from embedded JSONL."""
    import json
    examples = []
    for line in CUSTOM_DATA.strip().split("\\n"):
        if line.strip():
            examples.append(json.loads(line))
    return examples

# Load dataset
logger.info("Loading custom dataset...")
raw_data = load_custom_dataset()
train_dataset = datasets.Dataset.from_list(raw_data)
logger.info(f"Dataset size: {len(train_dataset)} examples")`;
  } else {
    // HuggingFace dataset - RL datasets typically use "main" split
    return `# Load dataset from HuggingFace
logger.info(f"Loading dataset: {DATASET}...")
dataset = datasets.load_dataset(DATASET, "main")
train_dataset = dataset["train"]
logger.info(f"Dataset size: {len(train_dataset)} examples")`;
  }
}

function generateSFTCode(config: PipelineConfig, model?: Model): string {
  const datasetInfo = DATASET_PRESETS.sft.find((d) => d.id === config.dataset.preset);
  const datasetName = config.dataset.preset === "custom" ? "Custom Dataset" : (datasetInfo?.name ?? config.dataset.preset);

  return `#!/usr/bin/env python3
"""
Supervised Fine-Tuning with Tinker API
======================================
Dataset: ${datasetName}
Model: ${config.model.baseModel}
LoRA Rank: ${config.model.loraRank}

Generated by Tinker Studio

Requirements:
  pip install tinker datasets transformers torch

Usage:
  export TINKER_API_KEY="your-api-key"
  python tinker_sft_training.py
"""

import os
import sys
import json
import logging
import time
from functools import cache
from typing import Any

import datasets
import tinker
import torch
from transformers import AutoTokenizer

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s", stream=sys.stdout)

# =============================================================================
# Configuration
# =============================================================================

MODEL = "${config.model.baseModel}"
LORA_RANK = ${config.model.loraRank}
MAX_LENGTH = ${config.model.maxLength}

DATASET = "${config.dataset.preset}"

BATCH_SIZE = ${config.hyperparameters.batchSize}
LEARNING_RATE = ${config.hyperparameters.learningRate}
EPOCHS = ${config.hyperparameters.epochs}
WARMUP_RATIO = ${config.hyperparameters.warmupRatio}
GRADIENT_ACCUMULATION_STEPS = ${config.hyperparameters.gradientAccumulation}

SAVE_EVERY = ${config.checkpointing.saveEvery}
OUTPUT_DIR = "${config.checkpointing.outputDir}"

# =============================================================================
# Tokenizer Utils
# =============================================================================

${generateTokenizerCode(model)}

# =============================================================================
# Datum Creation
# =============================================================================

def create_datum(
    input_tokens: list[int],
    weights: list[float],
    max_length: int | None = None,
) -> tinker.Datum:
    """
    Create a training Datum for the Tinker API.

    Args:
        input_tokens: Full token sequence
        weights: Loss weights per token (1.0 for tokens to train on, 0.0 for others)
        max_length: Optional truncation length
    """
    # Truncate if needed
    if max_length and len(input_tokens) > max_length:
        input_tokens = input_tokens[:max_length]
        weights = weights[:max_length]

    if len(input_tokens) < 2:
        raise ValueError("Need at least 2 tokens for input/target split")

    # Create input (all but last token) and target (all but first token)
    input_seq = input_tokens[:-1]
    target_seq = input_tokens[1:]
    loss_weights = weights[1:]  # Weights align with targets

    return tinker.Datum(
        model_input=tinker.ModelInput(
            chunks=[tinker.types.EncodedTextChunk(tokens=input_seq)]
        ),
        loss_fn_inputs={
            "weights": tinker.TensorData(
                data=loss_weights,
                dtype="float32",
                shape=[len(loss_weights)],
            ),
            "target_tokens": tinker.TensorData(
                data=target_seq,
                dtype="int64",
                shape=[len(target_seq)],
            ),
        },
    )


def format_conversation(messages: list[dict], tokenizer) -> tuple[list[int], list[float]]:
    """
    Format a conversation into tokens and loss weights.

    Returns:
        Tuple of (tokens, weights) where weights=1.0 for assistant tokens
    """
    # Apply chat template to get full text
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)

    # Tokenize full conversation
    tokens = tokenizer.encode(text, add_special_tokens=False)

    # For simplicity, train on entire sequence
    # In production, you'd mask user/system tokens with 0.0 weights
    weights = [1.0] * len(tokens)

    return tokens, weights


def compute_mean_nll(
    logprobs_list: list[tinker.TensorData],
    weights_list: list[tinker.TensorData],
) -> float:
    """Compute weighted mean negative log likelihood from forward/backward outputs."""
    total_weighted_logprobs = 0.0
    total_weights = 0.0

    for logprobs, weights in zip(logprobs_list, weights_list, strict=True):
        logprobs_torch = logprobs.to_torch()
        weights_torch = weights.to_torch()
        total_weighted_logprobs += logprobs_torch.dot(weights_torch)
        total_weights += weights_torch.sum()

    if total_weights == 0:
        return float("nan")

    return float(-total_weighted_logprobs / total_weights)


# =============================================================================
# Training
# =============================================================================

def main():
    """Main training loop."""
    print(f"{'='*60}")
    print(f"Tinker Studio - Supervised Fine-Tuning")
    print(f"{'='*60}")
    print(f"Model: {MODEL}")
    print(f"Dataset: {DATASET}")
    print(f"LoRA Rank: {LORA_RANK}")
    print(f"Batch Size: {BATCH_SIZE}")
    print(f"Learning Rate: {LEARNING_RATE}")
    print(f"Epochs: {EPOCHS}")
    print(f"{'='*60}\\n")

    # Check for API key
    if not os.environ.get("TINKER_API_KEY"):
        print("Error: TINKER_API_KEY environment variable not set")
        print("Get your API key from: https://tinker-console.thinkingmachines.ai")
        sys.exit(1)

    # Setup
    logger.info("Loading tokenizer...")
    tokenizer = get_tokenizer(MODEL)

    ${generateDatasetLoadingCode(config)}

    # Initialize Tinker client
    logger.info("Initializing Tinker client...")
    service_client = tinker.ServiceClient()

    # Note: Tinker API handles LoRA alpha scaling internally.
    # The effective scaling is applied automatically based on the rank.
    training_client = service_client.create_lora_training_client(
        base_model=MODEL,
        rank=LORA_RANK,
    )
    logger.info("Training client ready")

    # Effective batch size with gradient accumulation
    effective_batch_size = BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS
    logger.info(f"Effective batch size: {effective_batch_size} (batch_size={BATCH_SIZE} × accumulation_steps={GRADIENT_ACCUMULATION_STEPS})")

    # Calculate training steps (accounting for gradient accumulation)
    n_train_batches = len(train_dataset) // BATCH_SIZE
    n_optimizer_steps_per_epoch = n_train_batches // GRADIENT_ACCUMULATION_STEPS
    total_steps = n_optimizer_steps_per_epoch * EPOCHS
    warmup_steps = int(total_steps * WARMUP_RATIO)

    logger.info(f"Training for {total_steps} optimizer steps ({warmup_steps} warmup)")
    logger.info(f"  {n_train_batches} batches/epoch, {GRADIENT_ACCUMULATION_STEPS} accumulation steps")
    print(f"{'='*60}\\n")

    # Training loop
    global_step = 0
    total_elapsed_time = 0.0

    # Sample prompt for checkpoint inference
    SAMPLE_PROMPT = "Explain what machine learning is in simple terms."

    for epoch in range(EPOCHS):
        logger.info(f"Epoch {epoch + 1}/{EPOCHS}")

        # Shuffle dataset each epoch
        shuffled = train_dataset.shuffle(seed=42 + epoch)

        # Process batches with gradient accumulation
        batch_idx = 0
        while batch_idx < n_train_batches:
            start_time = time.time()

            # Accumulate gradients over multiple mini-batches
            accumulated_losses = []
            accumulated_tokens = 0
            fwd_bwd_results = []
            accumulated_batches = []

            for accum_step in range(GRADIENT_ACCUMULATION_STEPS):
                if batch_idx + accum_step >= n_train_batches:
                    break

                # Get mini-batch data
                mini_batch_start = (batch_idx + accum_step) * BATCH_SIZE
                mini_batch_end = min((batch_idx + accum_step + 1) * BATCH_SIZE, len(shuffled))
                batch_rows = shuffled.select(range(mini_batch_start, mini_batch_end))

                # Convert to Datums
                batch: list[tinker.Datum] = []
                for row in batch_rows:
                    messages = row.get("messages", [])
                    if not messages:
                        # Handle instruction/response format
                        instruction = row.get("instruction", row.get("prompt", ""))
                        response = row.get("response", row.get("completion", ""))
                        messages = [
                            {"role": "user", "content": instruction},
                            {"role": "assistant", "content": response},
                        ]

                    try:
                        tokens, weights = format_conversation(messages, tokenizer)
                        datum = create_datum(tokens, weights, MAX_LENGTH)
                        batch.append(datum)
                    except Exception as e:
                        logger.warning(f"Skipping example: {e}")
                        continue

                if not batch:
                    continue

                accumulated_batches.append(batch)
                accumulated_tokens += sum(d.model_input.length for d in batch)

                # Forward-backward pass (accumulates gradients)
                fwd_bwd_future = training_client.forward_backward(batch, loss_fn="cross_entropy")
                fwd_bwd_results.append((fwd_bwd_future, batch))

            # Skip if no valid batches in this accumulation window
            if not fwd_bwd_results:
                batch_idx += GRADIENT_ACCUMULATION_STEPS
                continue

            # Calculate learning rate with linear warmup and decay
            if global_step < warmup_steps:
                lr_mult = global_step / warmup_steps
            else:
                lr_mult = max(0.0, 1.0 - (global_step - warmup_steps) / (total_steps - warmup_steps))

            current_lr = LEARNING_RATE * lr_mult

            adam_params = tinker.AdamParams(
                learning_rate=current_lr,
                beta1=0.9,
                beta2=0.95,
                eps=1e-8,
            )

            # Optimizer step (applies accumulated gradients)
            optim_step_future = training_client.optim_step(adam_params)

            # Collect all forward-backward results and compute average loss
            all_logprobs = []
            all_weights = []
            for fwd_bwd_future, batch in fwd_bwd_results:
                fwd_bwd_result = fwd_bwd_future.result()
                all_logprobs.extend([x["logprobs"] for x in fwd_bwd_result.loss_fn_outputs])
                all_weights.extend([d.loss_fn_inputs["weights"] for d in batch])

            _optim_result = optim_step_future.result()

            # Compute metrics
            elapsed = time.time() - start_time
            total_elapsed_time += elapsed

            # Compute average loss across accumulated batches
            train_loss = compute_mean_nll(all_logprobs, all_weights)

            # Calculate derived metrics
            tokens_per_second = accumulated_tokens / elapsed if elapsed > 0 else 0
            avg_step_time = total_elapsed_time / (global_step + 1)
            remaining_steps = total_steps - global_step - 1
            eta_seconds = avg_step_time * remaining_steps if remaining_steps > 0 else 0

            # Output structured metrics (every optimizer step)
            print(f"METRIC::{json.dumps({
                'step': global_step,
                'total_steps': total_steps,
                'loss': round(float(train_loss), 6),
                'lr': current_lr,
                'tokens': accumulated_tokens,
                'tokens_per_second': round(tokens_per_second, 2),
                'wall_clock_time_ms': round(elapsed * 1000, 2),
                'eta_seconds': round(eta_seconds, 2)
            })}")
            sys.stdout.flush()

            # Checkpointing
            if SAVE_EVERY > 0 and global_step > 0 and global_step % SAVE_EVERY == 0:
                checkpoint_label = f"checkpoint-{global_step}"
                logger.info(f"Saving checkpoint: {checkpoint_label}")

                # Save training state (for resuming training)
                training_client.save_state(checkpoint_label).result()

                # Save sampler weights (for inference via OpenAI-compatible endpoint)
                sampler_path = training_client.save_weights_for_sampler(
                    name=checkpoint_label
                ).result().path
                logger.info(f"Sampler weights saved: {sampler_path}")

                # Quick inference sample to show progress
                try:
                    sampling_client = service_client.create_sampling_client(model_path=sampler_path)

                    prompt_tokens = tokenizer.encode(SAMPLE_PROMPT, add_special_tokens=True)

                    sample_result = sampling_client.sample(
                        prompt=tinker.ModelInput(chunks=[tinker.types.EncodedTextChunk(tokens=prompt_tokens)]),
                        num_samples=1,
                        sampling_params=tinker.types.SamplingParams(max_tokens=128, temperature=0.7),
                    ).result()

                    sample_text = tokenizer.decode(list(sample_result.sequences[0].tokens), skip_special_tokens=True)

                    print(f"CHECKPOINT_SAMPLE::{json.dumps({
                        'step': global_step,
                        'checkpoint_label': checkpoint_label,
                        'sampler_path': sampler_path,
                        'prompt': SAMPLE_PROMPT,
                        'response': sample_text
                    })}")
                    sys.stdout.flush()
                except Exception as e:
                    logger.warning(f"Checkpoint sampling failed: {e}")

            global_step += 1
            batch_idx += GRADIENT_ACCUMULATION_STEPS

    # Save final model
    print(f"\\n{'='*60}")
    print("Training complete!")
    print(f"{'='*60}")

    final_label = "final"
    logger.info(f"Saving final model: {final_label}")
    training_client.save_state(final_label).result()

    # Create sampling client for inference
    logger.info("Creating sampling client for inference...")
    weights_path = training_client.save_weights_for_sampler(name="final").result().path
    sampling_client = service_client.create_sampling_client(model_path=weights_path)

    logger.info("Model ready for inference!")
    logger.info(f"Use sampling_client.sample() to generate text")

    return sampling_client


if __name__ == "__main__":
    main()
`;
}

function generateRLCode(config: PipelineConfig, model?: Model): string {
  const datasetInfo = DATASET_PRESETS.rl.find((d) => d.id === config.dataset.preset);
  const datasetName = config.dataset.preset === "custom" ? "Custom Dataset" : (datasetInfo?.name ?? config.dataset.preset);
  const rl = config.rl!;

  return `#!/usr/bin/env python3
"""
Reinforcement Learning (GRPO) with Tinker API
==============================================
Dataset: ${datasetName}
Model: ${config.model.baseModel}
Reward: ${rl.rewardFunction}
LoRA Rank: ${config.model.loraRank}

Generated by Tinker Studio

This implements Group Relative Policy Optimization (GRPO):
1. Generate multiple responses per prompt
2. Compute rewards for each response
3. Calculate advantages (reward - mean_reward per group)
4. Train on weighted log-probs with importance sampling

Requirements:
  pip install tinker datasets transformers torch

Usage:
  export TINKER_API_KEY="your-api-key"
  python tinker_rl_training.py
"""

import os
import sys
import re
import json
import logging
import time
from functools import cache
from typing import Any

import datasets
import tinker
from tinker import types
import torch
from transformers import AutoTokenizer

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s", stream=sys.stdout)

# =============================================================================
# Configuration
# =============================================================================

MODEL = "${config.model.baseModel}"
LORA_RANK = ${config.model.loraRank}
MAX_LENGTH = ${config.model.maxLength}

DATASET = "${config.dataset.preset}"

BATCH_SIZE = ${config.hyperparameters.batchSize}
LEARNING_RATE = ${config.hyperparameters.learningRate}
EPOCHS = ${config.hyperparameters.epochs}
WARMUP_RATIO = ${config.hyperparameters.warmupRatio}
GRADIENT_ACCUMULATION_STEPS = ${config.hyperparameters.gradientAccumulation}

GROUP_SIZE = ${rl.groupSize}
KL_COEFFICIENT = ${rl.klCoefficient}
TEMPERATURE = ${rl.temperature}
MAX_TOKENS = 512

SAVE_EVERY = ${config.checkpointing.saveEvery}
OUTPUT_DIR = "${config.checkpointing.outputDir}"

# =============================================================================
# Tokenizer Utils
# =============================================================================

${generateTokenizerCode(model)}

# =============================================================================
# Reward Functions
# =============================================================================

${generateRewardFunction(rl.rewardFunction)}


def compute_advantages(rewards: list[float]) -> list[float]:
    """Compute GRPO advantages: reward - mean(rewards)"""
    if not rewards:
        return []
    mean_reward = sum(rewards) / len(rewards)
    return [r - mean_reward for r in rewards]

# =============================================================================
# Training
# =============================================================================

def main():
    """Main GRPO training loop."""
    print(f"{'='*60}")
    print(f"Tinker Studio - GRPO Reinforcement Learning")
    print(f"{'='*60}")
    print(f"Model: {MODEL}")
    print(f"Dataset: {DATASET}")
    print(f"Reward Function: ${rl.rewardFunction}")
    print(f"LoRA Rank: {LORA_RANK}")
    print(f"Group Size: {GROUP_SIZE} samples/prompt")
    print(f"KL Coefficient: {KL_COEFFICIENT}")
    print(f"Temperature: {TEMPERATURE}")
    print(f"{'='*60}\\n")

    if not os.environ.get("TINKER_API_KEY"):
        print("Error: TINKER_API_KEY environment variable not set")
        sys.exit(1)

    # Setup
    tokenizer = get_tokenizer(MODEL)

    ${generateRLDatasetLoadingCode(config)}

    # Initialize clients
    logger.info("Initializing Tinker clients...")
    service_client = tinker.ServiceClient()

    # Note: Tinker API handles LoRA alpha scaling internally.
    # The effective scaling is applied automatically based on the rank.
    training_client = service_client.create_lora_training_client(
        base_model=MODEL,
        rank=LORA_RANK,
    )
    logger.info("Clients ready")

    # Effective batch size with gradient accumulation
    effective_batch_size = BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS
    logger.info(f"Effective batch size: {effective_batch_size} (batch_size={BATCH_SIZE} × accumulation_steps={GRADIENT_ACCUMULATION_STEPS})")

    # Calculate steps (accounting for gradient accumulation)
    n_train_batches = len(train_dataset) // BATCH_SIZE
    n_optimizer_steps_per_epoch = n_train_batches // GRADIENT_ACCUMULATION_STEPS
    total_steps = n_optimizer_steps_per_epoch * EPOCHS
    warmup_steps = int(total_steps * WARMUP_RATIO)

    logger.info(f"Training for {total_steps} optimizer steps ({warmup_steps} warmup)")
    logger.info(f"  {n_train_batches} batches/epoch, {GRADIENT_ACCUMULATION_STEPS} accumulation steps")
    print(f"{'='*60}\\n")

    # Training loop
    global_step = 0
    total_elapsed_time = 0.0
    total_reward = 0.0
    reward_count = 0

    # Sample prompt for checkpoint inference
    SAMPLE_PROMPT = "What is 15 + 27?"

    for epoch in range(EPOCHS):
        logger.info(f"Epoch {epoch + 1}/{EPOCHS}")
        shuffled = train_dataset.shuffle(seed=42 + epoch)

        # Process batches with gradient accumulation
        batch_idx = 0
        while batch_idx < n_train_batches:
            start_time = time.time()

            # Save weights and create sampling client (once per optimizer step)
            weights_path = training_client.save_weights_for_sampler(
                name=f"{global_step:06d}"
            ).result().path
            sampling_client = service_client.create_sampling_client(model_path=weights_path)

            # Accumulate datums and forward-backward calls
            accumulated_datums: list[types.Datum] = []
            accumulated_rewards: list[float] = []
            fwd_bwd_futures = []

            for accum_step in range(GRADIENT_ACCUMULATION_STEPS):
                if batch_idx + accum_step >= n_train_batches:
                    break

                # Get mini-batch
                mini_batch_start = (batch_idx + accum_step) * BATCH_SIZE
                mini_batch_end = min((batch_idx + accum_step + 1) * BATCH_SIZE, len(shuffled))
                batch_rows = shuffled.select(range(mini_batch_start, mini_batch_end))

                datums: list[types.Datum] = []
                rewards_all: list[float] = []

                # Process each question
                for row in batch_rows:
                    question = row["question"]
                    ground_truth = str(row.get("answer", row.get("solution", "")))

                    # Format prompt
                    prompt_text = f"Solve this problem step by step:\\n\\n{question}\\n\\nAnswer:"
                    prompt_tokens = tokenizer.encode(prompt_text, add_special_tokens=True)
                    prompt_input = types.ModelInput(
                        chunks=[types.EncodedTextChunk(tokens=prompt_tokens)]
                    )
                    prompt_len = len(prompt_tokens)

                    # Generate GROUP_SIZE completions
                    sampling_params = types.SamplingParams(
                        max_tokens=MAX_TOKENS,
                        temperature=TEMPERATURE,
                        top_p=0.95,
                    )

                    sample_result = sampling_client.sample(
                        prompt=prompt_input,
                        num_samples=GROUP_SIZE,
                        sampling_params=sampling_params,
                    ).result()

                    # Compute rewards
                    group_rewards: list[float] = []
                    group_data: list[tuple] = []  # (tokens, logprobs, reward)

                    for sequence in sample_result.sequences:
                        sampled_tokens = list(sequence.tokens)
                        # logprobs should always be returned for sampled tokens
                        if sequence.logprobs is None:
                            logger.warning("No logprobs returned for sampled sequence, skipping")
                            continue
                        sampled_logprobs = list(sequence.logprobs)
                        response_text = tokenizer.decode(sampled_tokens, skip_special_tokens=True)
                        reward = compute_reward(response_text, ground_truth)
                        group_rewards.append(reward)
                        group_data.append((sampled_tokens, sampled_logprobs, reward))

                    # Skip if no valid samples in group
                    if not group_rewards:
                        continue

                    # Compute advantages
                    advantages = compute_advantages(group_rewards)

                    # Skip if no learning signal (all same reward)
                    if all(a == 0 for a in advantages):
                        continue

                    # Create training data
                    for (sampled_tokens, logprobs, reward), advantage in zip(group_data, advantages):
                        # Full sequence: prompt + completion (minus last token for input)
                        full_tokens = prompt_tokens + sampled_tokens
                        input_tokens = full_tokens[:-1]
                        target_tokens = full_tokens[1:]

                        # Pad logprobs for prompt tokens
                        padded_logprobs = [0.0] * (prompt_len - 1) + logprobs
                        padded_advantages = [0.0] * (prompt_len - 1) + [advantage] * len(sampled_tokens)

                        datum = types.Datum(
                            model_input=types.ModelInput(
                                chunks=[types.EncodedTextChunk(tokens=input_tokens)]
                            ),
                            loss_fn_inputs={
                                "target_tokens": tinker.TensorData(
                                    data=target_tokens,
                                    dtype="int64",
                                    shape=[len(target_tokens)],
                                ),
                                "logprobs": tinker.TensorData(
                                    data=padded_logprobs,
                                    dtype="float32",
                                    shape=[len(padded_logprobs)],
                                ),
                                "advantages": tinker.TensorData(
                                    data=padded_advantages,
                                    dtype="float32",
                                    shape=[len(padded_advantages)],
                                ),
                            },
                        )
                        datums.append(datum)
                        rewards_all.append(reward)

                if datums:
                    # Forward-backward pass (accumulates gradients)
                    fwd_bwd_future = training_client.forward_backward(
                        datums,
                        loss_fn="importance_sampling"
                    )
                    fwd_bwd_futures.append(fwd_bwd_future)
                    accumulated_datums.extend(datums)
                    accumulated_rewards.extend(rewards_all)

            # Skip if no valid datums in this accumulation window
            if not fwd_bwd_futures:
                batch_idx += GRADIENT_ACCUMULATION_STEPS
                continue

            # Track rewards
            total_reward += sum(accumulated_rewards)
            reward_count += len(accumulated_rewards)

            # Learning rate
            if global_step < warmup_steps:
                lr_mult = global_step / warmup_steps
            else:
                lr_mult = max(0.0, 1.0 - (global_step - warmup_steps) / (total_steps - warmup_steps))

            current_lr = LEARNING_RATE * lr_mult

            adam_params = tinker.AdamParams(
                learning_rate=current_lr,
                beta1=0.9,
                beta2=0.95,
                eps=1e-8,
            )

            # Optimizer step (applies accumulated gradients)
            optim_step_future = training_client.optim_step(adam_params)

            # Wait for all forward-backward results
            for fwd_bwd_future in fwd_bwd_futures:
                _fwd_bwd_result = fwd_bwd_future.result()
            _optim_result = optim_step_future.result()

            # Compute metrics
            elapsed = time.time() - start_time
            total_elapsed_time += elapsed
            avg_reward = total_reward / reward_count if reward_count > 0 else 0

            # Calculate derived metrics
            avg_step_time = total_elapsed_time / (global_step + 1)
            remaining_steps = total_steps - global_step - 1
            eta_seconds = avg_step_time * remaining_steps if remaining_steps > 0 else 0

            # Output structured metrics (every optimizer step)
            print(f"METRIC::{json.dumps({
                'step': global_step,
                'total_steps': total_steps,
                'loss': 0.0,
                'reward': round(avg_reward, 4),
                'lr': current_lr,
                'tokens': len(accumulated_datums),
                'tokens_per_second': round(len(accumulated_datums) / elapsed, 2) if elapsed > 0 else 0,
                'wall_clock_time_ms': round(elapsed * 1000, 2),
                'eta_seconds': round(eta_seconds, 2)
            })}")
            sys.stdout.flush()

            # Reset reward tracking periodically
            if global_step % 10 == 0:
                total_reward = 0.0
                reward_count = 0

            # Checkpointing
            if SAVE_EVERY > 0 and global_step > 0 and global_step % SAVE_EVERY == 0:
                checkpoint_label = f"checkpoint-{global_step}"
                logger.info(f"Saving checkpoint: {checkpoint_label}")

                # Save training state (for resuming training)
                training_client.save_state(checkpoint_label).result()

                # Save sampler weights (for inference via OpenAI-compatible endpoint)
                sampler_path = training_client.save_weights_for_sampler(
                    name=checkpoint_label
                ).result().path
                logger.info(f"Sampler weights saved: {sampler_path}")

                # Quick inference sample to show progress
                try:
                    checkpoint_sampling_client = service_client.create_sampling_client(model_path=sampler_path)

                    prompt_text = f"Solve this problem step by step:\\n\\n{SAMPLE_PROMPT}\\n\\nAnswer:"
                    prompt_tokens = tokenizer.encode(prompt_text, add_special_tokens=True)
                    prompt_input = types.ModelInput(
                        chunks=[types.EncodedTextChunk(tokens=prompt_tokens)]
                    )

                    sample_result = checkpoint_sampling_client.sample(
                        prompt=prompt_input,
                        num_samples=1,
                        sampling_params=types.SamplingParams(max_tokens=128, temperature=0.7),
                    ).result()

                    sample_text = tokenizer.decode(list(sample_result.sequences[0].tokens), skip_special_tokens=True)

                    print(f"CHECKPOINT_SAMPLE::{json.dumps({
                        'step': global_step,
                        'checkpoint_label': checkpoint_label,
                        'sampler_path': sampler_path,
                        'prompt': SAMPLE_PROMPT,
                        'response': sample_text
                    })}")
                    sys.stdout.flush()
                except Exception as e:
                    logger.warning(f"Checkpoint sampling failed: {e}")

            global_step += 1
            batch_idx += GRADIENT_ACCUMULATION_STEPS

    # Save final model
    print(f"\\n{'='*60}")
    print("Training complete!")
    print(f"{'='*60}")

    final_label = "final"
    logger.info(f"Saving final model: {final_label}")
    training_client.save_state(final_label).result()

    logger.info("Model ready for inference!")


if __name__ == "__main__":
    main()
`;
}

function generateRewardFunction(rewardType: string): string {
  switch (rewardType) {
    case "exact_match":
      return `def extract_answer(response: str) -> str:
    """Extract the final answer from a response."""
    # Look for \\boxed{} format (common in math)
    boxed_match = re.search(r"\\\\boxed\\{([^}]+)\\}", response)
    if boxed_match:
        return boxed_match.group(1).strip()

    # Look for "answer is X" pattern
    answer_match = re.search(r"(?:answer|result)\\s*(?:is|=|:)\\s*([^\\n.]+)", response, re.IGNORECASE)
    if answer_match:
        return answer_match.group(1).strip()

    # Fall back to last line
    lines = [l.strip() for l in response.strip().split("\\n") if l.strip()]
    return lines[-1] if lines else ""


def compute_reward(response: str, ground_truth: str) -> float:
    """Exact match reward: 1.0 if match, 0.0 otherwise."""
    answer = extract_answer(response)
    answer_normalized = answer.lower().strip()
    truth_normalized = ground_truth.lower().strip()

    for char in ".,;:!?\\"'":
        answer_normalized = answer_normalized.replace(char, "")
        truth_normalized = truth_normalized.replace(char, "")

    return 1.0 if answer_normalized == truth_normalized else 0.0`;

    case "math_equivalence":
      return `def extract_number(text: str) -> float | None:
    """Extract a numeric value from text."""
    boxed_match = re.search(r"\\\\boxed\\{([^}]+)\\}", text)
    if boxed_match:
        text = boxed_match.group(1)

    numbers = re.findall(r"-?\\d+(?:,\\d{3})*(?:\\.\\d+)?", text.replace(",", ""))
    if numbers:
        try:
            return float(numbers[-1].replace(",", ""))
        except ValueError:
            pass
    return None


def compute_reward(response: str, ground_truth: str) -> float:
    """Math equivalence reward: 1.0 if numerically equivalent."""
    pred_val = extract_number(response)
    true_val = extract_number(ground_truth)

    if pred_val is None or true_val is None:
        return 0.0

    if true_val == 0:
        return 1.0 if abs(pred_val) < 1e-6 else 0.0

    relative_error = abs(pred_val - true_val) / abs(true_val)
    return 1.0 if relative_error < 1e-6 else 0.0`;

    case "code_execution":
      return `def extract_code(response: str) -> str | None:
    """Extract Python code from a response."""
    code_match = re.search(r"\`\`\`(?:python)?\\n([\\s\\S]*?)\`\`\`", response)
    if code_match:
        return code_match.group(1).strip()

    lines = response.split("\\n")
    code_lines = [l for l in lines if l.startswith("    ") or l.startswith("\\t")]
    if code_lines:
        return "\\n".join(l.lstrip() for l in code_lines)
    return None


def compute_reward(response: str, ground_truth: str) -> float:
    """Code execution reward: 1.0 if correct output, 0.5 if runs, 0.0 otherwise."""
    import subprocess
    import tempfile

    code = extract_code(response)
    if not code:
        return 0.0

    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            f.flush()
            result = subprocess.run(
                ['python', f.name],
                capture_output=True, text=True, timeout=10,
            )
            if result.returncode != 0:
                return 0.0
            return 1.0 if result.stdout.strip() == ground_truth.strip() else 0.5
    except:
        return 0.0`;

    case "custom":
    default:
      return `def compute_reward(response: str, ground_truth: str) -> float:
    """
    Custom reward function - implement your own logic.

    Args:
        response: The model's generated response
        ground_truth: The expected answer from the dataset

    Returns:
        A float reward value (typically 0.0 to 1.0)
    """
    # TODO: Implement your reward function
    raise NotImplementedError("Please implement your custom reward function")`;
  }
}

/**
 * Generate a summary of the pipeline config for display
 */
export function generateConfigSummary(config: PipelineConfig): string {
  const mode = config.mode.toUpperCase();
  const modelName = config.model.baseModel.split("/").pop();
  const datasetName = config.dataset.preset.split("/").pop();

  let summary = `${mode} Training\n`;
  summary += `Model: ${modelName} (LoRA r=${config.model.loraRank})\n`;
  summary += `Dataset: ${datasetName}\n`;
  summary += `LR: ${config.hyperparameters.learningRate}, Batch: ${config.hyperparameters.batchSize}\n`;

  if (config.mode === "rl" && config.rl) {
    summary += `GRPO: ${config.rl.groupSize} samples, KL=${config.rl.klCoefficient}`;
  }

  return summary;
}

/**
 * Validate that the config would produce runnable code
 */
export function validateConfigForExecution(config: PipelineConfig): string[] {
  const errors: string[] = [];

  if (!config.model.baseModel) {
    errors.push("Base model is required");
  }

  if (config.model.loraRank < 1) {
    errors.push("LoRA rank must be at least 1");
  }

  if (config.hyperparameters.batchSize < 1) {
    errors.push("Batch size must be at least 1");
  }

  if (config.hyperparameters.learningRate <= 0) {
    errors.push("Learning rate must be positive");
  }

  if (config.mode === "rl" && !config.rl) {
    errors.push("RL config is required for RL mode");
  }

  if (config.mode === "rl" && config.rl && config.rl.groupSize < 2) {
    errors.push("Group size must be at least 2 for GRPO");
  }

  return errors;
}
