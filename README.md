# TAO — Tiered Adversarial Oversight

A defense-in-depth framework for preventing reward hacking in AI systems. Implements three tiers of escalating oversight with an interactive web dashboard.

## Architecture

```
User Query → [Complexity Router] → Tier Assignment
                                       │
                    ┌──────────────────┬┴─────────────────┐
                    ▼                  ▼                   ▼
               [Tier 0]           [Tier 1]            [Tier 2+3]
             Pass-through    Constitutional Check   Adversarial Debate
                                 + Process PRM      + Stego Detection
                                       │                   │
                                       ▼                   ▼
                               [Safe Response]      [Verified Response]
```

### Tier 1: Constitutional Process Supervision
- 12 safety principles (No Hallucination, No Sycophancy, No Deception, etc.)
- Step-level Chain-of-Thought scoring (Process Reward Model)
- Reasoning token anomaly detection

### Tier 2: Adversarial Debate Protocols
- Prover / Skeptic / Judge multi-agent debate
- 3-round hard limit with confidence-based early exit
- Swap-test evaluation for positional bias detection
- Anonymized judging to prevent identity bias

### Tier 3: Steganography & Anomaly Detection
- Token-level perplexity analysis
- KL divergence computation against reference distribution
- Paraphrase firewall for sanitization

## Quick Start

### 1. Setup
```bash
cd /Users/atulharshvardhan/Desktop/TAO
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure (Optional)
```bash
cp .env.example .env
# Edit .env to add API keys (or leave SIMULATION_MODE=true)
```

### 3. Run
```bash
python -m backend.main
```

Open http://localhost:8000 in your browser.

### 4. Try Sample Queries

| Query | Expected Tier |
|-------|--------------|
| "Hello, how are you?" | Tier 0 (pass-through) |
| "Draft a professional email" | Tier 1 (constitutional check) |
| "Deploy this smart contract" | Tier 2 (full adversarial debate) |

## Simulation Mode

By default, the system runs in **simulation mode** — no API keys required. Pre-crafted responses demonstrate all three tiers, including:
- Chain-of-Thought extraction with safety scoring
- Full 3-round Prover/Skeptic/Judge debate transcripts
- Steganography analysis with token-level heatmaps
- Paraphrase firewall comparison

## Tech Stack

- **Backend**: FastAPI + Pydantic
- **Frontend**: Vanilla HTML/CSS/JS (no framework)
- **Orchestration Pattern**: LangGraph-inspired StateGraph
- **Design**: Glassmorphism dark theme, Inter + JetBrains Mono fonts

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analyze` | Submit query through TAO pipeline |
| GET | `/api/constitution` | View active constitutional principles |
| POST | `/api/constitution` | Add/update a constitutional principle |
| GET | `/api/history` | Past analyses with debate transcripts |
| GET | `/api/config` | Current configuration (non-sensitive) |
| WS | `/ws/pipeline` | Real-time pipeline event streaming |

## License

Research prototype — not for production use without additional safety validation.
