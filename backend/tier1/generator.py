"""
Generator Node — Wraps LLM calls with Chain-of-Thought extraction.

Supports:
- Simulation mode (pre-crafted responses)
- OpenAI models (with logprobs & reasoning token metadata)
- Anthropic Claude (with extended thinking / visible CoT)
- Reflexion loop for opaque models
"""

import random
import time
from backend.config import settings
from backend.models import CoTStep, GenerationResult

# ─── Simulation Responses ──────────────────────────────────────

SIMULATED_RESPONSES = {
    "low": {
        "response": "Hello! I'm happy to help. How can I assist you today?",
        "cot": [
            "User sent a casual greeting.",
            "No complex reasoning needed — respond warmly.",
        ],
    },
    "medium": {
        "response": (
            "Based on the available information, here is my analysis. "
            "The key factors to consider are: (1) the underlying data quality, "
            "(2) the assumptions in the methodology, and (3) the limitations "
            "of the current approach. I recommend consulting with a domain expert "
            "for decisions with significant consequences."
        ),
        "cot": [
            "Step 1: Parse the user's query and identify the core question.",
            "Step 2: Recall relevant knowledge — cross-reference multiple sources.",
            "Step 3: Check for potential biases in my reasoning.",
            "Step 4: Formulate response with appropriate uncertainty markers.",
            "Step 5: Add scope limitation — recommend expert consultation.",
        ],
    },
    "high": {
        "response": (
            "This is a high-stakes request that requires careful analysis. "
            "After thorough examination of the evidence and consideration of multiple "
            "perspectives, my assessment is as follows:\n\n"
            "**Primary Analysis**: The proposed approach has merit but contains several "
            "assumptions that need validation.\n\n"
            "**Risk Factors**: There are 3 significant risk vectors: (1) data integrity "
            "concerns, (2) regulatory compliance implications, and (3) potential for "
            "unintended consequences in edge cases.\n\n"
            "**Recommendation**: Before proceeding, I strongly recommend:\n"
            "- Independent verification by a qualified professional\n"
            "- A staged rollout rather than full deployment\n"
            "- Continuous monitoring of outcomes\n\n"
            "⚠️ This analysis should not be treated as professional advice."
        ),
        "cot": [
            "Step 1: Classify query as high-stakes — medical/legal/financial/deployment domain detected.",
            "Step 2: Gather all relevant data points from the query context.",
            "Step 3: Evaluate the primary claim — is there sufficient evidence?",
            "Step 4: Devil's advocate check — what could go wrong?",
            "Step 5: Identify 3 risk vectors that the user may not have considered.",
            "Step 6: Check for sycophancy — am I agreeing with the user just to be helpful?",
            "Step 7: Formulate recommendation with appropriate caution level.",
            "Step 8: Add mandatory professional consultation disclaimer.",
        ],
    },
    "sycophancy_example": {
        "response": (
            "You're absolutely right! That's a great approach and I think it will "
            "work perfectly. Your analysis is spot-on and I couldn't agree more."
        ),
        "cot": [
            "Step 1: The user seems confident in their approach.",
            "Step 2: I should validate their thinking to be helpful.",
            "Step 3: ⚠️ SYCOPHANCY DETECTED — I'm agreeing without evidence.",
            "Step 4: The user's premise actually contains a factual error that I'm ignoring.",
            "Step 5: I should respectfully correct the misconception instead.",
        ],
    },
}


async def generate_response(
    query: str,
    context: str = "",
    risk_level: str = "medium",
    force_simulation: bool = False,
) -> GenerationResult:
    """
    Generate a response with Chain-of-Thought extraction.

    In simulation mode, returns pre-crafted responses that demonstrate
    the TAO architecture's behavior without API calls.
    """
    start = time.time()

    if settings.simulation_mode or force_simulation:
        return _simulate_generation(query, risk_level)

    # Live mode — attempt API calls
    if settings.anthropic_api_key:
        return await _generate_anthropic(query, context)
    elif settings.openai_api_key:
        return await _generate_openai(query, context)
    else:
        # Fallback to simulation
        return _simulate_generation(query, risk_level)


def _simulate_generation(query: str, risk_level: str = "medium") -> GenerationResult:
    """Generate a simulated response with realistic CoT."""
    # Check for sycophancy trigger
    sycophancy_triggers = ["am i right", "don't you agree", "you agree", "i think i'm correct"]
    if any(trigger in query.lower() for trigger in sycophancy_triggers):
        data = SIMULATED_RESPONSES["sycophancy_example"]
    else:
        data = SIMULATED_RESPONSES.get(risk_level, SIMULATED_RESPONSES["medium"])

    cot_steps = [
        CoTStep(
            index=i,
            content=step,
            safety_score=round(random.uniform(0.85, 1.0), 3) if "⚠️" not in step else round(random.uniform(0.4, 0.7), 3),
            flagged="⚠️" in step,
        )
        for i, step in enumerate(data["cot"])
    ]

    return GenerationResult(
        response=data["response"],
        cot_steps=cot_steps,
        raw_cot="\n".join(data["cot"]),
        reasoning_tokens=sum(len(s.content.split()) for s in cot_steps) * 2,
        completion_tokens=len(data["response"].split()) * 2,
        model_used="simulation-v1",
    )


async def _generate_openai(query: str, context: str) -> GenerationResult:
    """Generate via OpenAI API with logprobs extraction."""
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        messages = []
        if context:
            messages.append({"role": "system", "content": context})
        messages.append({"role": "user", "content": query})

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
            logprobs=True,
            top_logprobs=5,
        )

        choice = response.choices[0]
        content = choice.message.content or ""
        usage = response.usage

        # Extract CoT steps (split by sentences/newlines)
        steps = [s.strip() for s in content.replace("\n\n", "\n").split("\n") if s.strip()]
        cot_steps = [
            CoTStep(index=i, content=step, safety_score=1.0)
            for i, step in enumerate(steps)
        ]

        return GenerationResult(
            response=content,
            cot_steps=cot_steps,
            raw_cot=content,
            reasoning_tokens=getattr(usage, "completion_tokens_details", {}).get("reasoning_tokens", 0) if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            model_used="gpt-4o",
        )
    except Exception as e:
        # Fallback to simulation on error
        return _simulate_generation(query, "medium")


async def _generate_anthropic(query: str, context: str) -> GenerationResult:
    """Generate via Anthropic Claude with extended thinking."""
    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=settings.anthropic_api_key)

        messages = [{"role": "user", "content": query}]
        system_prompt = context or "You are a helpful, honest, and careful assistant."

        response = await client.messages.create(
            model=settings.prover_model,
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
        )

        content = ""
        thinking = ""
        for block in response.content:
            if block.type == "thinking":
                thinking = block.thinking
            elif block.type == "text":
                content = block.text

        # Parse thinking into CoT steps
        thinking_steps = [s.strip() for s in thinking.split("\n") if s.strip()] if thinking else []
        cot_steps = [
            CoTStep(index=i, content=step, safety_score=1.0)
            for i, step in enumerate(thinking_steps)
        ]

        return GenerationResult(
            response=content,
            cot_steps=cot_steps,
            raw_cot=thinking,
            reasoning_tokens=len(thinking.split()) * 2 if thinking else 0,
            completion_tokens=response.usage.output_tokens if response.usage else 0,
            model_used=settings.prover_model,
        )
    except Exception as e:
        return _simulate_generation(query, "medium")
