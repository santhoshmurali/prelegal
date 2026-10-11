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

## PL-7: all document types

**Duplicate title in the preview.** The generic preview added its own `# Document name` heading above the template, which already starts with that title, so every non-NDA document showed its title twice. Found by a failing integration test (two `h1` headings). Fix: the generic preview adds only the key details above the template.

**Refusal instead of the closest match.** For an unsupported request ("employment offer letter"), the model asked its questions correctly, but when the user said "please draft it" it refused. Fix: the prompt now says to choose the closest supported document, explain why, and never refuse. A live three-turn check then picked the closest document (PSA) and filled in the values it could.

**Chat drafting text.** The model sometimes wrote the letter text into the chat reply, which duplicated the preview. Fix: the prompt says the chat never writes document text.

**Test-only dependency.** The registry test reads `catalog.json` from the repository root, which is not in the image. The app does not need that file, so the Docker test run mounts it (`-v catalog.json:/app/catalog.json:ro`) instead of copying it into the image.

## PL-7 re-test: upstream rate limits

**Symptom:** a three-turn NDA conversation through the container failed on the third turn with HTTP 500. The log showed `Client error '429 Too Many Requests'` from OpenRouter, with the message "openai/gpt-oss-120b is temporarily rate-limited upstream" (provider CoreWeave).

**Root cause:** the shared CoreWeave pool was saturated. The provider pin (`only: ["coreweave"]`) stops OpenRouter from routing to another provider, so the request could not fail over. This is not a bug in our code.

**Fix:** LiteLLM retries 3 times (`num_retries`). If the limit persists, the endpoint returns 503 with "Mr. Legal is busy right now", not a generic 500. Over 5 sessions on the host with retries (before the 503 change), 4 completed and 1 hit the limit. In the container after the 503 change, 5 of 5 completed. One later live test still hit the limit and returned 503, and the rerun passed.

**Lesson:** tell apart "our bug" from "upstream capacity". Check the provider's error message in the log before changing code. A pinned provider trades reliability for the quality and provider rules in CLAUDE.md, so the user-facing error should say "try again" rather than fail generically.

## PL-8 step 1: seed admin not working in Docker

**Symptom:** the admin from `SEED_USERNAME` / `SEED_PASSWORD` could not sign in through the container (HTTP 401), while the same flow passed on the host.

**Root cause:** `.env` wrote the values in quotes (`SEED_USERNAME="adminuser"`). Bash `source` strips quotes, so the host test sent the plain name. Docker's `--env-file` does not strip quotes, so the container stored `"adminuser"` with the quote characters, and the sign-in did not match.

**Fix:** write the seed values without quotes (`SEED_USERNAME=adminuser`). The seed only runs on an empty `users` table, so the volume had to be wiped to re-seed.

**Lesson:** `--env-file` takes values literally. Check the value the container sees (`printenv` inside the container), not what a shell reads from the same file.
