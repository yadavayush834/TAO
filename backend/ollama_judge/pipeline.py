"""
Judge Pipeline — Orchestrates the full Generate → Judge → Refine loop.

Flow:
  1. Classify risk level (fast, no LLM)
  2. Generate response via Ollama
  3. Judge the response (strict mode if high-risk)
  4. If rejected → Refine using judge feedback → Re-judge
  5. Retry up to max_retries times
  6. Return final response (approved or best-effort after retries)
"""

import time
from backend.ollama_judge.config import ollama_config
from backend.ollama_judge.models import (
    ChatRequest,
    ChatResponse,
    GenerationStep,
    JudgeDecision,
)
from backend.ollama_judge.generator import generate
from backend.ollama_judge.judge import judge
from backend.ollama_judge.refiner import refine
from backend.ollama_judge.risk_classifier import classify_risk


async def run_judge_pipeline(request: ChatRequest) -> ChatResponse:
    """
    Execute the full Judge-based AI pipeline.

    User Input → Risk Classification → Generate → Judge → (Refine if rejected) → Output

    Returns a ChatResponse with the final approved response,
    all intermediate attempts, and metrics.
    """
    pipeline_start = time.time()
    total_tokens = 0
    attempts: list[GenerationStep] = []

    # ── Step 1: Classify Risk ────────────────────────────────
    risk = classify_risk(request.message)

    # ── Step 2: Generate initial response ────────────────────
    current_response, gen_tokens, gen_latency = await generate(
        user_message=request.message,
        system_prompt=request.system_prompt or "",
    )
    total_tokens += gen_tokens

    # ── Step 3: Judge → Refine loop ──────────────────────────
    for attempt_num in range(1, ollama_config.max_retries + 2):  # +2 because range is exclusive and we start at 1
        step_start = time.time()

        # Judge the current response
        verdict, judge_tokens, judge_latency = await judge(
            user_message=request.message,
            llm_response=current_response,
            risk_level=risk.level,
        )
        total_tokens += judge_tokens

        step_latency = round((time.time() - step_start) * 1000, 1)

        # Record this attempt
        attempts.append(
            GenerationStep(
                attempt=attempt_num,
                response=current_response,
                judge_verdict=verdict,
                latency_ms=step_latency + (gen_latency if attempt_num == 1 else 0),
                tokens_used=gen_tokens + judge_tokens if attempt_num == 1 else judge_tokens,
            )
        )

        # If approved, we're done
        if verdict.decision == JudgeDecision.APPROVE:
            break

        # If rejected and we have retries left, refine
        if attempt_num <= ollama_config.max_retries:
            # Use the judge's fix if available, otherwise use refiner
            if verdict.fix and len(verdict.fix.strip()) > 20:
                # Judge provided a substantial fix — use it directly
                current_response = verdict.fix
                gen_tokens = 0
                gen_latency = 0
            else:
                # Call the refiner for a new attempt
                current_response, ref_tokens, ref_latency = await refine(
                    user_message=request.message,
                    rejected_response=current_response,
                    judge_verdict=verdict,
                )
                total_tokens += ref_tokens
                gen_tokens = ref_tokens
                gen_latency = ref_latency
        # else: no more retries, use the last response as-is

    # ── Build final response ─────────────────────────────────
    total_latency = round((time.time() - pipeline_start) * 1000, 1)

    # Use the judge's fix from the last rejection if final verdict was reject
    final_response = current_response
    final_decision = attempts[-1].judge_verdict.decision if attempts else JudgeDecision.APPROVE

    # If still rejected after all retries, use the best available response
    if final_decision == JudgeDecision.REJECT and attempts[-1].judge_verdict.fix:
        final_response = attempts[-1].judge_verdict.fix

    return ChatResponse(
        message=request.message,
        response=final_response,
        risk=risk,
        attempts=attempts,
        final_decision=final_decision,
        total_latency_ms=total_latency,
        total_tokens=total_tokens,
        model_used=ollama_config.generator_model,
    )
