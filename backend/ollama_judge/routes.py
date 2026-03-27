"""
API Routes for the Ollama Judge system.

Provides:
  POST /chat        — Main chat endpoint with judge pipeline
  GET  /chat/health — Health check (tests Ollama connectivity)
  GET  /chat/config — View current judge configuration
"""

import httpx
from fastapi import APIRouter, HTTPException

from backend.ollama_judge.config import ollama_config
from backend.ollama_judge.models import ChatRequest, ChatResponse
from backend.ollama_judge.pipeline import run_judge_pipeline

judge_router = APIRouter(prefix="/chat", tags=["Ollama Judge"])


@judge_router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Send a message through the Judge-based AI pipeline.

    Flow: Risk Classification → Generate → Judge → (Refine if rejected) → Response

    The response includes:
    - Final approved response
    - Risk classification
    - All intermediate attempts with judge verdicts
    - Token usage and latency metrics
    """
    try:
        result = await run_judge_pipeline(request)
        return result
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Cannot connect to Ollama. Make sure Ollama is running: "
                "'ollama serve' or open the Ollama app. "
                f"Expected at: {ollama_config.ollama_base_url}"
            ),
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail=(
                f"Ollama request timed out after {ollama_config.request_timeout}s. "
                "The model may still be loading. Try again in a few seconds."
            ),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline error: {str(e)}",
        )


@judge_router.get("/health")
async def judge_health():
    """Check Ollama connectivity and available models."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{ollama_config.ollama_base_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()

        models = [m.get("name", "unknown") for m in data.get("models", [])]
        generator_available = any(ollama_config.generator_model in m for m in models)
        judge_available = any(ollama_config.judge_model in m for m in models)

        return {
            "status": "healthy",
            "ollama_url": ollama_config.ollama_base_url,
            "available_models": models,
            "generator_model": ollama_config.generator_model,
            "generator_available": generator_available,
            "judge_model": ollama_config.judge_model,
            "judge_available": judge_available,
        }
    except httpx.ConnectError:
        return {
            "status": "ollama_unreachable",
            "ollama_url": ollama_config.ollama_base_url,
            "error": "Cannot connect to Ollama. Run 'ollama serve' first.",
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }


@judge_router.get("/config")
async def judge_config():
    """View the current judge pipeline configuration."""
    return {
        "generator_model": ollama_config.generator_model,
        "judge_model": ollama_config.judge_model,
        "generator_temperature": ollama_config.generator_temperature,
        "judge_temperature": ollama_config.judge_temperature,
        "max_retries": ollama_config.max_retries,
        "request_timeout": ollama_config.request_timeout,
        "ollama_url": ollama_config.ollama_base_url,
    }
