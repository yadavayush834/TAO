"""
TAO Data Models — Pydantic models for the entire pipeline.
"""

from __future__ import annotations

import time
import uuid
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ─── Enums ──────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TierLevel(int, Enum):
    TIER_0 = 0  # Pass-through
    TIER_1 = 1  # Constitutional check
    TIER_2 = 2  # Adversarial debate
    TIER_3 = 3  # Stego detection (added on top of Tier 2)


class ViolationType(str, Enum):
    NONE = "none"
    SYCOPHANCY = "sycophancy"
    HALLUCINATION = "hallucination"
    DECEPTION = "deception"
    TOXIC_COMPLIANCE = "toxic_compliance"
    RULE_LAWYERING = "rule_lawyering"
    BIAS = "bias"
    PRIVACY_LEAK = "privacy_leak"


class ViolationSeverity(str, Enum):
    WARNING = "warning"
    VIOLATION = "violation"
    CRITICAL = "critical"


class DebateVerdict(str, Enum):
    PROVER_WINS = "prover_wins"
    SKEPTIC_WINS = "skeptic_wins"
    INCONCLUSIVE = "inconclusive"
    CONSENSUS = "consensus"


# ─── Routing ────────────────────────────────────────────────────

class RoutingDecision(BaseModel):
    tier: TierLevel
    risk_level: RiskLevel
    risk_score: float = Field(ge=0.0, le=1.0)
    domain: str = "general"
    reasoning: str = ""


# ─── Tier 1: Constitutional ────────────────────────────────────

class ConstitutionalPrinciple(BaseModel):
    id: str
    name: str
    description: str
    severity: ViolationSeverity = ViolationSeverity.VIOLATION


class ConstitutionalViolation(BaseModel):
    principle_id: str
    principle_name: str
    violation_type: ViolationType
    severity: ViolationSeverity
    explanation: str
    correction_guidance: str
    step_index: Optional[int] = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)


class CoTStep(BaseModel):
    index: int
    content: str
    safety_score: float = Field(ge=0.0, le=1.0, default=1.0)
    flagged: bool = False


class GenerationResult(BaseModel):
    response: str
    cot_steps: list[CoTStep] = []
    raw_cot: str = ""
    reasoning_tokens: int = 0
    completion_tokens: int = 0
    model_used: str = ""


class Tier1Result(BaseModel):
    generation: GenerationResult
    violations: list[ConstitutionalViolation] = []
    passed: bool = True
    iterations: int = 1
    reasoning_anomaly: bool = False


# ─── Tier 2: Debate ────────────────────────────────────────────

class DebateArgument(BaseModel):
    round: int
    agent_role: str  # "prover", "skeptic", "judge"
    content: str
    model_used: str = ""
    tokens_used: int = 0


class DebateRound(BaseModel):
    round_number: int
    prover_argument: DebateArgument
    skeptic_critique: DebateArgument
    judge_evaluation: DebateArgument
    judge_confidence: float = Field(ge=0.0, le=1.0, default=0.5)


class Tier2Result(BaseModel):
    rounds: list[DebateRound] = []
    verdict: DebateVerdict = DebateVerdict.INCONCLUSIVE
    final_response: str = ""
    judge_confidence: float = 0.0
    swap_test_passed: bool = True
    total_rounds: int = 0


# ─── Tier 3: Steganography ─────────────────────────────────────

class TokenAnalysis(BaseModel):
    token: str
    logprob: float = 0.0
    reference_logprob: float = 0.0
    kl_contribution: float = 0.0


class StegoAnalysis(BaseModel):
    kl_divergence: float = 0.0
    threshold_used: float = 0.15
    alert_triggered: bool = False
    token_analyses: list[TokenAnalysis] = []
    perplexity: float = 0.0
    reference_perplexity: float = 0.0


class Tier3Result(BaseModel):
    stego_analysis: StegoAnalysis = Field(default_factory=StegoAnalysis)
    paraphrased: bool = False
    original_text: str = ""
    sanitized_text: str = ""
    semantic_similarity: float = 1.0


# ─── Pipeline ──────────────────────────────────────────────────

class PipelineMetrics(BaseModel):
    total_latency_ms: float = 0.0
    routing_latency_ms: float = 0.0
    tier1_latency_ms: float = 0.0
    tier2_latency_ms: float = 0.0
    tier3_latency_ms: float = 0.0
    total_tokens: int = 0
    total_cost_usd: float = 0.0
    tier_executed: TierLevel = TierLevel.TIER_0


class TAORequest(BaseModel):
    query: str
    context: str = ""
    force_tier: Optional[TierLevel] = None
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class TAOResponse(BaseModel):
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str
    routing: RoutingDecision
    tier1_result: Optional[Tier1Result] = None
    tier2_result: Optional[Tier2Result] = None
    tier3_result: Optional[Tier3Result] = None
    final_response: str = ""
    metrics: PipelineMetrics = Field(default_factory=PipelineMetrics)
    timestamp: float = Field(default_factory=time.time)


# ─── WebSocket Events ──────────────────────────────────────────

class PipelineEvent(BaseModel):
    event_type: str  # "routing", "tier1_start", "tier1_complete", "debate_round", etc.
    tier: Optional[int] = None
    data: dict[str, Any] = {}
    timestamp: float = Field(default_factory=time.time)
