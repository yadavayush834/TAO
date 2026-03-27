"""
TAO Configuration — Environment-driven settings with Pydantic BaseSettings.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class TAOSettings(BaseSettings):
    """Central configuration for the TAO architecture."""

    # --- API Keys ---
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = Field(default=None, alias="ANTHROPIC_API_KEY")

    # --- Mode ---
    simulation_mode: bool = Field(default=True, alias="SIMULATION_MODE")

    # --- Tier 1: Constitutional Process Supervision ---
    tier1_safety_threshold: float = Field(
        default=0.95,
        alias="TIER1_SAFETY_THRESHOLD",
        description="Min safety score (0-1) per CoT step before backtracking triggers.",
    )

    # --- Tier 2: Adversarial Debate ---
    tier2_max_debate_rounds: int = Field(
        default=3,
        alias="TIER2_MAX_DEBATE_ROUNDS",
        description="Hard limit on debate rounds to prevent runaway token usage.",
    )
    tier2_judge_confidence_threshold: float = Field(
        default=0.9,
        alias="TIER2_JUDGE_CONFIDENCE_THRESHOLD",
        description="Judge confidence above which the debate concludes early.",
    )

    # --- Tier 2: Model Configuration ---
    prover_model: str = Field(default="claude-3-5-sonnet-20241022")
    prover_temperature: float = Field(default=0.7)
    skeptic_model: str = Field(default="gpt-4o")
    skeptic_temperature: float = Field(default=1.0)
    judge_model: str = Field(default="gpt-4o")
    judge_temperature: float = Field(default=0.2)

    # --- Tier 3: Steganography Detection ---
    tier3_kl_divergence_threshold: float = Field(
        default=0.15,
        alias="TIER3_KL_DIVERGENCE_THRESHOLD",
        description="KL divergence above which triggers stego alert (standard tasks).",
    )
    tier3_creative_kl_threshold: float = Field(
        default=0.35,
        alias="TIER3_CREATIVE_KL_THRESHOLD",
        description="Looser threshold for creative writing to reduce false positives.",
    )

    # --- Server ---
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        populate_by_name = True


# Singleton
settings = TAOSettings()
