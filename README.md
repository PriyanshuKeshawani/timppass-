# SISTec Minor Project

Clean monorepo for the SISTec college website and its supporting AI tools.

## Repository layout

| Path | What lives here |
| --- | --- |
| `apps/website/` | Static college website with integrated SISTec AI Chatbot widget. |
| `backend/` | Unified FastAPI + LangGraph Multi-RAG chatbot backend (Gemini + ChromaDB). |
| `apps/chatbot/` | Standalone FastAPI + LangGraph Multi-RAG chatbot workspace. |
| `data/` | Multi-domain knowledge base documents (Academics, Admissions, Hostels, Placements, Administration). |
| `chroma_db/` | Pre-indexed ChromaDB vector database (1,300+ vector chunks). |
| `apps/recommender/` | Course recommender API with a Next.js UI and static build. |
| `apps/email-extension/` | Chrome extension "Mail Copilot" (browser-only, no backend). |
| `docs/frontend-worklog/` | Frontend change notes, backups, and the local full-system launcher. |
| `docs/project-documents/` | Reference documents (including `heatformer.pdf`). |

## Run locally

### 1. Launch Multi-RAG Backend (Port 8000)

Double-click `run_backend.bat` in the repository root or run:
```bat
run_backend.bat
```
This starts the FastAPI server at `http://localhost:8000`. It automatically loads the ChromaDB vectors and Gemini LLM.

### 2. Website Frontend

Option A (Direct via Backend):
Since the backend mounts the static website, simply visit:
`http://localhost:8000/index.html`

Option B (Independent Web Server):
```bat
cd apps/website
python -m http.server 3000
```
Open `http://localhost:3000/index.html`. The chatbot widget automatically routes queries to `http://localhost:8000/api/chat`.

### 3. Everything Together

Run `docs/frontend-worklog/run_full_system.bat` to launch both servers simultaneously with a single click.

## Deployment

`vercel.json` rewrites point to `/apps/website/...`. In Vercel, set **Root Directory** to the repository root. If it is still set to the old frontend folder, update it there.

## Notes

- `apps/website/` was restored from the last commit (`e2e88c6`). The exact uncommitted website edits that existed before the reorganization could not be recovered — see `docs/RECOVERY_REPORT.md` for details.
- Nothing was committed or pushed during the reorganization. Review `git status` and stage the new layout only when you are ready.
- `docs/frontend-worklog/FRONTEND_CHANGES_EXPLAINED.md` records the earlier AI-chatbot UI experiment and where its backups live.
