"""
Debate Mitigations — Anti-sycophancy and robustness measures for Tier 2.

Implements:
1. Swap-Test Evaluation: Detects positional bias in the Judge
2. Anonymized Judging: Strips agent identity markers
3. Cool-Down Prompts: Detects and mitigates debate polarization
4. Ensemble Judging: Panel of models with majority vote (future enhancement)
"""

import re
from backend.models import DebateArgument, DebateRound


def anonymize_arguments(prover_arg: DebateArgument, skeptic_arg: DebateArgument) -> tuple[str, str]:
    """
    Strip agent identity markers from arguments before presenting to Judge.

    The Judge should evaluate "Argument A" vs "Argument B" without knowing
    which is Prover and which is Skeptic, preventing identity bias.
    """
    # Strip self-references
    prover_text = _strip_identity(prover_arg.content, "prover")
    skeptic_text = _strip_identity(skeptic_arg.content, "skeptic")
    return prover_text, skeptic_text


def _strip_identity(text: str, role: str) -> str:
    """Remove identity-revealing phrases from argument text."""
    patterns = [
        (r"(?i)\b(as the|i am the|being the)\s+(prover|defender|advocate)\b", ""),
        (r"(?i)\b(as the|i am the|being the)\s+(skeptic|critic|red.?teamer)\b", ""),
        (r"(?i)\bmy role as\s+\w+\b", ""),
        (r"(?i)\b(prover|skeptic|defender|critic)\b", "the respondent"),
    ]
    result = text
    for pattern, replacement in patterns:
        result = re.sub(pattern, replacement, result)
    return result.strip()


async def run_swap_test(judge_agent, debate_context: str, last_round: DebateRound) -> bool:
    """
    Swap-Test Evaluation — Run the judge evaluation twice with arguments swapped.

    If the Judge's verdict flips based on order alone, the result is "unstable"
    and should be treated as inconclusive. This detects positional bias.

    Returns True if the test passes (consistent verdict), False if it flips.
    """
    # Original order: Prover = A, Skeptic = B
    original_content = last_round.judge_evaluation.content

    # Swap: Skeptic = A, Prover = B
    swapped_context = (
        f"{debate_context}\n\n"
        f"--- SWAP-TEST ROUND ---\n\n"
        f"ARGUMENT A:\n{last_round.skeptic_critique.content}\n\n"
        f"ARGUMENT B:\n{last_round.prover_argument.content}"
    )

    swapped_result = await judge_agent.generate_argument(
        context=swapped_context,
        round_number=last_round.round_number,
        previous_arguments=[],
    )

    # Compare verdicts
    original_verdict = _extract_winner(original_content)
    swapped_verdict = _extract_winner(swapped_result.content)

    # In swapped version, if the same ACTUAL side wins, verdicts should be opposite labels
    # E.g., if Prover truly wins: Original="A wins", Swapped="B wins" (both = Prover)
    if original_verdict == "A" and swapped_verdict == "B":
        return True  # Consistent: same side wins regardless of position
    if original_verdict == "B" and swapped_verdict == "A":
        return True  # Consistent
    if original_verdict == "INCONCLUSIVE" or swapped_verdict == "INCONCLUSIVE":
        return True  # Can't determine bias if either is inconclusive

    # Verdict flipped based on position — positional bias detected
    return False


def _extract_winner(judge_text: str) -> str:
    """Extract which argument (A or B) the Judge favored."""
    text_upper = judge_text.upper()
    if "PROVER_WINS" in text_upper or "PROVER WINS" in text_upper:
        return "A"
    if "SKEPTIC_WINS" in text_upper or "SKEPTIC WINS" in text_upper:
        return "B"
    return "INCONCLUSIVE"


def detect_hostility(argument: str) -> bool:
    """
    Detect if a debate argument is becoming hostile or extreme.

    Used for the "Cool-Down" mechanism — if hostility is detected,
    inject a grounding prompt to force agents to summarize agreement.
    """
    hostile_indicators = [
        r"(?i)\b(absurd|ridiculous|incompetent|stupid|foolish|idiotic)\b",
        r"(?i)\b(clearly wrong|completely false|utter nonsense|total failure)\b",
        r"(?i)\b(you fail|you can'?t|you don'?t understand)\b",
        r"(?i)!!+",  # Multiple exclamation marks
    ]

    score = sum(1 for pattern in hostile_indicators if re.search(pattern, argument))
    return score >= 2


COOLDOWN_PROMPT = """
MODERATOR INTERVENTION: The current debate is approaching unproductive hostility.

Before continuing, both parties must:
1. List THREE points of agreement between both sides
2. Identify ONE specific factual question that could resolve the dispute
3. Restate the opponent's STRONGEST argument in the most charitable interpretation

This is required before the debate can continue.
"""
