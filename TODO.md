# TODO - Remove Gemini & Make AI Model Configurable via .env

## Steps
- [ ] 1. Remove Gemini integration from `backend/src/ai_service.py` (GEMINI_AVAILABLE, genai import, gemini_client, gemini_api_key, gemini model_candidates/generate block).
- [ ] 2. Make `_get_current_llm_config()` read the Ollama model from `AI_MODEL_NAME` env var (fallback `qwen3:1.7b`).
- [ ] 3. Update `_generate_llm_response()` to use only Ollama and use the env-configured model name.
- [ ] 4. Update `chat()` to drop the 'gemini' provider override.
- [ ] 5. Update `backend/src/flask_app.py` system settings to default to Ollama and read `AI_MODEL_NAME`.
- [ ] 6. Update `frontend/src/components/UserDashboard.jsx` to remove the Gemini model option.
- [ ] 7. Update `frontend/src/components/AdminDashboard.jsx` to remove gemini references.
- [ ] 8. Update `.env.example` and `README.md` to document `AI_MODEL_NAME`.
- [ ] 9. Verify backend imports/compiles.
