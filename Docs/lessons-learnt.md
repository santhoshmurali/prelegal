# Lessons learnt

## Mr. Legal (PL-6): unreliable field extraction from gpt-oss-120b

**Symptoms**
- Governing law came back garbled, e.g. `Delphi?`, `Delphi ??`, `]......]`.
- Purpose came back as runs of non-breaking spaces and `Evaluating whether ...`.
- Term length was often missing, even when the user said "expire after 2 years".

**What we measured** (live model, 10 to 25 samples per setting)

| Change | Garbled or wrong |
|---|---|
| `coreweave/fp4` provider pin (skill default) | 7 of 25 garbled |
| `coreweave` provider only | 1 of 15 garbled |
| Pydantic Structured Outputs vs plain JSON mode | Both produced garbage; the schema is not the cause |
| `reasoning_effort` medium vs low | No improvement |
| `temperature=0` | No improvement |
| Guards: drop values with invisible or non-space separator characters, non-numeric terms, non-ISO dates | Garbage no longer reaches the form |
| Prompt: ask all missing questions in one list | 8 numbered questions per reply, every time |
| Prompt: set `mndaTermType` with the term length | Term fully set in 7 of 10 runs; in the other 3, the model returned no update for these fields |

**Root cause**
- The `fp4` quantization pin was the main cause of garbled output.
- The remaining garbling and missed updates come from the model itself at low reasoning effort. Changing the output format, the schema, or the sampling settings did not remove them.

**What we did**
- Route to CoreWeave without the `fp4` pin (`backend/src/prelegal_backend/chat.py`).
- Drop malformed values server-side (`clean_text`, `valid_years`, `valid_date`).
- Ask all missing questions in one batch, so the user answers in one reply.
- Keep the form state in each request, so Mr. Legal re-asks anything still missing.

**Open risk**
- Field extraction is not reliable on every turn. The guards stop bad values, but the model can still skip a field. Users review the form, and missing fields come back on the next turn.

**How to re-measure**
- Run `RUN_LIVE_TESTS=1 uv run pytest tests/test_chat_live.py` from `backend/`, with `OPENROUTER_API_KEY` set.

**Lesson**
- Measure before changing settings. Each change above was tested against the live model with a fixed prompt and a counted failure rate. Several plausible fixes (temperature, reasoning effort, JSON mode) made no difference.

## Mr. Legal (PL-6): tests passed on the host but failed in Docker

**Symptom:** `POST /api/chat/mutual-nda` returned HTTP 500 inside the container. The log showed `openrouter does not support parameters: ['reasoning_effort']`.

**Root cause:** The host tests set `LITELLM_LOCAL_MODEL_COST_MAP=True`, so LiteLLM used an older bundled model map that allowed `reasoning_effort`. The container fetched the live map, which marks that parameter unsupported for `openai/gpt-oss-120b` on OpenRouter. Proof: `get_supported_openai_params` returned `False` in the container and `True` on the host.

**Fix:** Send reasoning effort in OpenRouter's request body (`"reasoning": {"effort": "low"}`) instead of the LiteLLM argument. Verified in the container, then rebuilt and re-tested in Docker.

**Lesson:** Test in the same environment that ships. A test run that differs from production (here, the local model map) can pass while the real path fails.
