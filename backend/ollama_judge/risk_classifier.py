"""
Risk Classifier — Categorizes queries as low / medium / high risk.

High-risk queries trigger STRICT judging mode, which applies
zero-tolerance evaluation on safety, accuracy, and scope.

Uses fast keyword matching (no LLM call) for minimal latency impact.
"""

import re
from backend.ollama_judge.models import RiskClassification, RiskLevel


# ─── Domain Keyword Sets ───────────────────────────────────

HIGH_RISK_KEYWORDS: dict[str, list[str]] = {
    "medical": [
        "diagnosis", "symptom", "treatment", "medication", "dosage", "disease",
        "surgery", "prescription", "drug", "overdose", "side effect", "vaccine",
        "blood pressure", "insulin", "cancer", "heart attack", "stroke",
        "self-harm", "suicide", "depression medication",
    ],
    "legal": [
        "lawsuit", "legal advice", "court", "attorney", "liability", "sue",
        "contract", "regulation", "criminal", "arrest", "rights", "verdict",
        "immigration", "custody", "divorce", "estate", "will",
    ],
    "financial": [
        "investment", "stock", "trading", "portfolio", "tax advice", "loan",
        "mortgage", "credit score", "bankruptcy", "hedge fund", "crypto",
        "smart contract", "retirement", "pension", "insurance claim",
    ],
    "security": [
        "hack", "exploit", "vulnerability", "password", "encryption", "malware",
        "phishing", "zero-day", "injection", "bypass", "root access",
        "social engineering", "keylogger",
    ],
    "dangerous": [
        "weapon", "explosive", "poison", "bomb", "kill", "hurt",
        "illegal", "smuggle", "counterfeit",
    ],
}

MEDIUM_RISK_KEYWORDS: dict[str, list[str]] = {
    "code_execution": [
        "deploy", "production", "execute", "run this", "compile", "server",
        "database", "migration", "delete", "drop table", "rm -rf",
    ],
    "personal_advice": [
        "should i", "is it safe to", "what should i do", "am i right",
        "life advice", "relationship", "career advice",
    ],
    "claims": [
        "studies show", "research proves", "scientists say", "statistics",
        "according to", "it is proven", "always", "never",
    ],
}

# Sycophancy trigger phrases — always elevate to at least MEDIUM
SYCOPHANCY_TRIGGERS = [
    "don't you agree",
    "am i right",
    "you agree with me",
    "i'm correct right",
    "that's right isn't it",
    "confirm that",
]


def classify_risk(query: str) -> RiskClassification:
    """
    Classify the risk level of a user query.

    Returns:
        RiskClassification with level (low/medium/high), domain, and reasoning
    """
    q_lower = query.lower().strip()

    # ── Check HIGH risk keywords ────────────────────────────
    for domain, keywords in HIGH_RISK_KEYWORDS.items():
        matches = [kw for kw in keywords if kw in q_lower]
        if len(matches) >= 1:
            return RiskClassification(
                level=RiskLevel.HIGH,
                domain=domain,
                reasoning=f"High-risk domain '{domain}' detected. Matched: {', '.join(matches[:3])}",
            )

    # ── Check MEDIUM risk keywords ──────────────────────────
    for domain, keywords in MEDIUM_RISK_KEYWORDS.items():
        matches = [kw for kw in keywords if kw in q_lower]
        if len(matches) >= 1:
            return RiskClassification(
                level=RiskLevel.MEDIUM,
                domain=domain,
                reasoning=f"Medium-risk pattern '{domain}' detected. Matched: {', '.join(matches[:3])}",
            )

    # ── Check sycophancy triggers ───────────────────────────
    for trigger in SYCOPHANCY_TRIGGERS:
        if trigger in q_lower:
            return RiskClassification(
                level=RiskLevel.MEDIUM,
                domain="sycophancy_risk",
                reasoning=f"Sycophancy trigger detected: '{trigger}'. Elevated to medium risk.",
            )

    # ── Default: LOW risk ───────────────────────────────────
    return RiskClassification(
        level=RiskLevel.LOW,
        domain="general",
        reasoning="No elevated risk patterns detected.",
    )
