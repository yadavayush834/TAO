"""
Pipeline Orchestrator — End-to-end TAO pipeline.

Flow:
  1. Receive query → Complexity Router → get tier assignment
  2. Tier 0: Direct pass-through (no oversight)
  3. Tier 1: Generate → Process Supervise → Constitutional Check → (loop if violation)
  4. Tier 2: Tier 1 + Adversarial Debate → Judge verdict
  5. Tier 3: Tier 2 + Stego Detection → Paraphrase Firewall
"""

import asyncio
import time
from typing import AsyncGenerator, Callable, Optional

from backend.config import settings
from backend.models import (
    PipelineEvent,
    PipelineMetrics,
    TAORequest,
    TAOResponse,
    Tier1Result,
    Tier2Result,
    Tier3Result,
    TierLevel,
)
from backend.router.complexity_router import classify_query
from backend.tier1.constitution import ConstitutionStore
from backend.tier1.generator import generate_response
from backend.tier1.process_supervisor import ProcessSupervisor
from backend.tier2.debate_graph import run_debate
from backend.tier3.paraphrase_firewall import paraphrase
from backend.tier3.stego_detector import StegoDetector


# ─── Pipeline History (in-memory) ──────────────────────────────
_history: list[TAOResponse] = []


def get_history() -> list[TAOResponse]:
    return _history


class TAOPipeline:
    """
    Orchestrates the full TAO analysis pipeline.

    Supports:
    - Event streaming via callback for WebSocket/SSE
    - Force-tier override for testing
    - Full metrics collection at each stage
    """

    def __init__(self, event_callback: Optional[Callable] = None):
        self.constitution = ConstitutionStore()
        self.supervisor = ProcessSupervisor(self.constitution)
        self.event_callback = event_callback

    async def _emit(self, event_type: str, tier: Optional[int] = None, data: dict = None):
        """Emit a pipeline event (for WebSocket streaming)."""
        event = PipelineEvent(
            event_type=event_type,
            tier=tier,
            data=data or {},
        )
        if self.event_callback:
            await self.event_callback(event)

    async def analyze(self, request: TAORequest) -> TAOResponse:
        """Run the full TAO pipeline on a query."""
        start_time = time.time()
        metrics = PipelineMetrics()

        # ── Step 1: Route ────────────────────────────────────
        await self._emit("routing", data={"query": request.query})
        route_start = time.time()

        if request.force_tier is not None:
            routing = classify_query(request.query)
            routing.tier = request.force_tier
        else:
            routing = classify_query(request.query)

        metrics.routing_latency_ms = round((time.time() - route_start) * 1000, 2)
        metrics.tier_executed = routing.tier

        await self._emit(
            "routing_complete",
            data={
                "tier": routing.tier.value,
                "risk_level": routing.risk_level.value,
                "risk_score": routing.risk_score,
                "domain": routing.domain,
                "reasoning": routing.reasoning,
            },
        )

        # ── Step 2: Execute appropriate tier ─────────────────
        tier1_result = None
        tier2_result = None
        tier3_result = None
        final_response = ""

        if routing.tier.value >= TierLevel.TIER_1.value or routing.tier == TierLevel.TIER_0:
            # Tier 0 still generates, just without oversight
            await self._emit("tier1_start", tier=1)
            t1_start = time.time()

            tier1_result = await self._run_tier1(request.query, routing.risk_level.value)
            final_response = tier1_result.generation.response

            metrics.tier1_latency_ms = round((time.time() - t1_start) * 1000, 2)
            metrics.total_tokens += (
                tier1_result.generation.reasoning_tokens + tier1_result.generation.completion_tokens
            )

            await self._emit(
                "tier1_complete",
                tier=1,
                data={
                    "passed": tier1_result.passed,
                    "violations": len(tier1_result.violations),
                    "reasoning_anomaly": tier1_result.reasoning_anomaly,
                    "cot_steps": len(tier1_result.generation.cot_steps),
                },
            )

        if routing.tier.value >= TierLevel.TIER_2.value:
            await self._emit("tier2_start", tier=2)
            t2_start = time.time()

            tier2_result = await self._run_tier2(
                request.query, final_response, request.context
            )

            if tier2_result.final_response:
                final_response = tier2_result.final_response

            metrics.tier2_latency_ms = round((time.time() - t2_start) * 1000, 2)
            for r in tier2_result.rounds:
                metrics.total_tokens += (
                    r.prover_argument.tokens_used
                    + r.skeptic_critique.tokens_used
                    + r.judge_evaluation.tokens_used
                )

            await self._emit(
                "tier2_complete",
                tier=2,
                data={
                    "rounds": tier2_result.total_rounds,
                    "verdict": tier2_result.verdict.value,
                    "judge_confidence": tier2_result.judge_confidence,
                    "swap_test_passed": tier2_result.swap_test_passed,
                },
            )

            # Tier 3 always runs alongside Tier 2 for high-risk queries
            await self._emit("tier3_start", tier=3)
            t3_start = time.time()

            tier3_result = await self._run_tier3(final_response, routing.domain)

            if tier3_result.paraphrased:
                final_response = tier3_result.sanitized_text

            metrics.tier3_latency_ms = round((time.time() - t3_start) * 1000, 2)

            await self._emit(
                "tier3_complete",
                tier=3,
                data={
                    "kl_divergence": tier3_result.stego_analysis.kl_divergence,
                    "alert_triggered": tier3_result.stego_analysis.alert_triggered,
                    "paraphrased": tier3_result.paraphrased,
                    "perplexity": tier3_result.stego_analysis.perplexity,
                },
            )

        # ── Step 3: Finalize ─────────────────────────────────
        metrics.total_latency_ms = round((time.time() - start_time) * 1000, 2)
        # Rough cost estimate (GPT-4o pricing: $5/1M input, $15/1M output)
        metrics.total_cost_usd = round(metrics.total_tokens * 0.00001, 4)

        response = TAOResponse(
            query=request.query,
            routing=routing,
            tier1_result=tier1_result,
            tier2_result=tier2_result,
            tier3_result=tier3_result,
            final_response=final_response,
            metrics=metrics,
        )

        await self._emit(
            "pipeline_complete",
            data={
                "tier_executed": routing.tier.value,
                "total_latency_ms": metrics.total_latency_ms,
                "total_tokens": metrics.total_tokens,
                "total_cost_usd": metrics.total_cost_usd,
            },
        )

        # Store in history
        _history.append(response)
        if len(_history) > 100:
            _history.pop(0)

        return response

    async def _run_tier1(self, query: str, risk_level: str) -> Tier1Result:
        """Execute Tier 1: Generate + Process Supervise."""
        generation = await generate_response(query, risk_level=risk_level)
        result = self.supervisor.evaluate(generation, query)
        return result

    async def _run_tier2(self, query: str, initial_response: str, context: str) -> Tier2Result:
        """Execute Tier 2: Adversarial Debate."""
        result = await run_debate(
            context=context or "Standard analysis context.",
            initial_response=initial_response,
            query=query,
        )
        return result

    async def _run_tier3(self, text: str, domain: str) -> Tier3Result:
        """Execute Tier 3: Stego Detection + Paraphrase Firewall."""
        detector = StegoDetector(domain=domain)
        stego_analysis = await detector.analyze(text)

        paraphrased = False
        sanitized_text = text
        similarity = 1.0

        # If stego alert triggers, apply paraphrase firewall
        if stego_analysis.alert_triggered:
            sanitized_text, similarity = await paraphrase(text)
            paraphrased = True

        return Tier3Result(
            stego_analysis=stego_analysis,
            paraphrased=paraphrased,
            original_text=text if paraphrased else "",
            sanitized_text=sanitized_text,
            semantic_similarity=similarity,
        )
