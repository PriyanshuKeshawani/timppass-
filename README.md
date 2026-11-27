# SISTec Minor Project

Clean monorepo for the SISTec college website and its supporting AI tools.

## Repository layout

| Path | What lives here |
| --- | --- |
| `apps/website/` | Static college website. This is the folder Vercel deploys. |
| `apps/chatbot/` | FastAPI + LangGraph Multi-RAG chatbot (Gemini + ChromaDB). |
| `apps/recommender/` | Course recommender API with a Next.js UI and static build. |
| `apps/email-extension/` | Chrome extension "Mail Copilot" (browser-only, no backend). |
| `docs/frontend-worklog/` | Frontend change notes, backups, and the local full-system launcher. |
| `docs/project-documents/` | Reference documents (including `heatformer.pdf`). |
| `data/sample_data/` | Sample CSV/XLSX data used for local testing. |
| `backend/` | Legacy folder kept only because it contains an ignored `.env` and `.gitignore`. |

## Run locally

### Website

```bat
cd apps/website
python -m http.server 3000
```

Open `http://localhost:3000/index.html`.

### Chatbot backend

```bat
cd apps/chatbot
copy .env.example .env
run_backend.bat
```

Set `GEMINI_API_KEY` in `apps/chatbot/.env` before starting. The chatbot loads `.env` from its own project root (`apps/chatbot/.env`), not from the legacy `backend/` folder. Never commit `.env` files.

### Everything together

Run `docs/frontend-worklog/run_full_system.bat`. It starts the chatbot on port 8000 and the website on port 3000 using paths relative to this repository.

## Deployment

`vercel.json` rewrites point to `/apps/website/...`. In Vercel, set **Root Directory** to the repository root. If it is still set to the old frontend folder, update it there.

## Notes

- `apps/website/` was restored from the last commit (`e2e88c6`). The exact uncommitted website edits that existed before the reorganization could not be recovered — see `docs/RECOVERY_REPORT.md` for details.
- Nothing was committed or pushed during the reorganization. Review `git status` and stage the new layout only when you are ready.
- `docs/frontend-worklog/FRONTEND_CHANGES_EXPLAINED.md` records the earlier AI-chatbot UI experiment and where its backups live.
