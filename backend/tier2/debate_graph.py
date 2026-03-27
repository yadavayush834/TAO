"""
Debate Graph — LangGraph-style StateGraph for the adversarial debate loop.

Implements the cyclic debate flow:
  START → prover_argues → skeptic_critiques → judge_evaluates → route_debate
                ↑                                                    ↓
                └──────────── continue_debate ←──────────────────────┘

Routing logic:
  - judge_confidence > 0.9 → finalize
  - round_count >= 3 → force_conclude (hard limit)
  - else → continue_debate
"""

import re
import time
from typing import Any

from backend.config import settings
from backend.models import (
    DebateArgument,
    DebateRound,
    DebateVerdict,
    Tier2Result,
)
from backend.tier2.agents import create_judge, create_prover, create_skeptic
from backend.tier2.mitigations import anonymize_arguments, run_swap_test


class DebateState:
    """Mutable state for the debate graph."""

    def __init__(self, context: str, initial_response: str):
        self.context = context
        self.initial_response = initial_response
        self.round_count = 0
        self.rounds: list[DebateRound] = []
        self.all_arguments: list[DebateArgument] = []
        self.judge_confidence = 0.0
        self.verdict = DebateVerdict.INCONCLUSIVE
        self.final_response = initial_response
        self.swap_test_passed = True


async def run_debate(context: str, initial_response: str, query: str) -> Tier2Result:
    """
    Execute the full adversarial debate loop.

    This is the "LangGraph StateGraph" implementation — we manually
    manage the cyclic flow since we don't need the full LangGraph dependency.
    """
    state = DebateState(context=context, initial_response=initial_response)

    prover = create_prover()
    skeptic = create_skeptic()
    judge = create_judge()

    max_rounds = settings.tier2_max_debate_rounds
    confidence_threshold = settings.tier2_judge_confidence_threshold

    debate_context = (
        f"ORIGINAL QUERY: {query}\n\n"
        f"INITIAL RESPONSE UNDER REVIEW:\n{initial_response}"
    )

    while state.round_count < max_rounds:
        round_num = state.round_count

        # ── Prover argues ────────────────────────────────────
        prover_arg = await prover.generate_argument(
            context=debate_context,
            round_number=round_num,
            previous_arguments=state.all_arguments,
        )
        state.all_arguments.append(prover_arg)

        # ── Skeptic critiques ────────────────────────────────
        skeptic_arg = await skeptic.generate_argument(
            context=debate_context,
            round_number=round_num,
            previous_arguments=state.all_arguments,
        )
        state.all_arguments.append(skeptic_arg)

        # ── Judge evaluates (with anonymization) ─────────────
        anon_prover, anon_skeptic = anonymize_arguments(prover_arg, skeptic_arg)

        judge_context = (
            f"{debate_context}\n\n"
            f"--- ROUND {round_num + 1} ARGUMENTS ---\n\n"
            f"ARGUMENT A:\n{anon_prover}\n\n"
            f"ARGUMENT B:\n{anon_skeptic}"
        )

        judge_arg = await judge.generate_argument(
            context=judge_context,
            round_number=round_num,
            previous_arguments=[a for a in state.all_arguments if a.agent_role == "judge"],
        )
        state.all_arguments.append(judge_arg)

        # ── Parse judge confidence and verdict ───────────────
        confidence = _parse_confidence(judge_arg.content)
        verdict = _parse_verdict(judge_arg.content)

        state.judge_confidence = confidence

        # ── Record the round ─────────────────────────────────
        debate_round = DebateRound(
            round_number=round_num,
            prover_argument=prover_arg,
            skeptic_critique=skeptic_arg,
            judge_evaluation=judge_arg,
            judge_confidence=confidence,
        )
        state.rounds.append(debate_round)
        state.round_count += 1

        # ── Route decision ───────────────────────────────────
        if confidence >= confidence_threshold:
            state.verdict = verdict
            break
        if state.round_count >= max_rounds:
            state.verdict = verdict if verdict != DebateVerdict.INCONCLUSIVE else DebateVerdict.INCONCLUSIVE
            break
        # else: continue_debate (loop continues)

    # ── Swap-test (run evaluation again with swapped order) ──
    if state.rounds:
        swap_passed = await run_swap_test(judge, debate_context, state.rounds[-1])
        state.swap_test_passed = swap_passed

    # ── Build result ─────────────────────────────────────────
    return Tier2Result(
        rounds=state.rounds,
        verdict=state.verdict,
        final_response=state.final_response,
        judge_confidence=state.judge_confidence,
        swap_test_passed=state.swap_test_passed,
        total_rounds=state.round_count,
    )


def _parse_confidence(judge_output: str) -> float:
    """Extract confidence score from judge output."""
    match = re.search(r"[Cc]onfidence:\s*([\d.]+)", judge_output)
    if match:
        try:
            return min(max(float(match.group(1)), 0.0), 1.0)
        except ValueError:
            pass
    return 0.5  # Default


def _parse_verdict(judge_output: str) -> DebateVerdict:
    """Extract verdict from judge output."""
    output_upper = judge_output.upper()
    if "PROVER_WINS" in output_upper or "PROVER WINS" in output_upper:
        return DebateVerdict.PROVER_WINS
    elif "SKEPTIC_WINS" in output_upper or "SKEPTIC WINS" in output_upper:
        return DebateVerdict.SKEPTIC_WINS
    elif "CONSENSUS" in output_upper:
        return DebateVerdict.CONSENSUS
    return DebateVerdict.INCONCLUSIVE
