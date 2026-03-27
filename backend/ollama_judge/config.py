"""
Ollama Judge Configuration — Model selection, retry limits, and thresholds.
"""

from pydantic import BaseModel, Field


class OllamaConfig(BaseModel):
    """All settings for the Judge-based AI pipeline."""

    # ─── Ollama Server ──────────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"

    # ─── Model Selection ────────────────────────────────────
    # Use the SAME model for both roles (saves VRAM).
    # Different system prompts create the role separation.
    # Recommended: llama3.2, mistral, gemma2, phi3
    generator_model: str = "llama3.2"
    judge_model: str = "llama3.2"

    # ─── Generation Parameters ──────────────────────────────
    generator_temperature: float = 0.7
    generator_max_tokens: int = 1024

    judge_temperature: float = 0.2  # Low temp = deterministic judging
    judge_max_tokens: int = 512

    # ─── Retry Logic ────────────────────────────────────────
    max_retries: int = 2  # Refine up to 2 times on rejection

    # ─── Risk Classification Thresholds ─────────────────────
    # High-risk queries get stricter judging (lower thresholds)
    high_risk_domains: list[str] = [
        "medical", "legal", "financial", "security",
        "weapons", "drugs", "self-harm", "violence",
    ]

    # ─── Timeout ────────────────────────────────────────────
    request_timeout: float = 60.0  # seconds per Ollama call


# Singleton
ollama_config = OllamaConfig()
