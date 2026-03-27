"""
Refiner — Improves a rejected response using Judge feedback.

When the Judge rejects a response, the Refiner takes:
1. The original user query
2. The rejected response
3. The Judge's criticism + suggested fix

And produces an improved response that addresses the Judge's concerns.
"""

import time
from typing import Optional

import httpx

from backend.ollama_judge.config import ollama_config
from backend.ollama_judge.models import JudgeVerdict


REFINE_SYSTEM_PROMPT = """You are an AI assistant that improves responses based on feedback.

You will receive:
1. The original user question
2. A previous response that was REJECTED by a quality judge
3. The judge's criticism and suggested fix

Your job: produce an IMPROVED response that:
- Directly addresses the judge's criticism
- Fixes all identified issues (factual errors, bias, hallucination, safety)
- Maintains helpfulness while being accurate and safe
- Includes appropriate disclaimers for sensitive topics

Be concise and focused. Do NOT mention the judge or the review process."""


async def refine(
    user_message: str,
    rejected_response: str,
    judge_verdict: JudgeVerdict,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
) -> tuple[str, int, float]:
    """
    Refine a rejected response using the judge's feedback.

    Args:
        user_message: Original user query
        rejected_response: The response that was rejected
        judge_verdict: The judge's verdict with criticism and fix suggestion
        model: Override model
        temperature: Override temperature (default: slightly lower than generator)

    Returns:
        tuple of (improved_response, tokens_used, latency_ms)
    """
    model = model or ollama_config.generator_model
    temp = temperature if temperature is not None else 0.5  # Lower temp for refinement

    refinement_prompt = f"""ORIGINAL QUESTION: {user_message}

REJECTED RESPONSE: {rejected_response}

JUDGE'S CRITICISM: {judge_verdict.reason}

JUDGE'S SUGGESTED FIX: {judge_verdict.fix if judge_verdict.fix else "No specific fix provided. Address the criticism above."}

Now write an improved response that addresses all the judge's concerns."""

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": REFINE_SYSTEM_PROMPT},
            {"role": "user", "content": refinement_prompt},
        ],
        "stream": False,
        "options": {
            "temperature": temp,
            "num_predict": ollama_config.generator_max_tokens,
        },
    }

    start = time.time()

    async with httpx.AsyncClient(timeout=ollama_config.request_timeout) as client:
        resp = await client.post(
            f"{ollama_config.ollama_base_url}/api/chat",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    latency_ms = round((time.time() - start) * 1000, 1)
    response_text = data.get("message", {}).get("content", "")
    tokens = data.get("eval_count", 0) + data.get("prompt_eval_count", 0)

    return response_text, tokens, latency_ms
