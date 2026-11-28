import os
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from backend.config import DOMAINS, DATA_DIR, GEMINI_API_KEY
from backend.graph import langgraph_app
from backend.ingestion import (
    index_all_domains,
    index_file,
    get_indexed_documents,
    get_or_create_collection
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for info in DOMAINS.values():
        (DATA_DIR / info["folder"]).mkdir(parents=True, exist_ok=True)
    try:
        total_existing = sum(get_or_create_collection(d).count() for d in DOMAINS)
        print(f"INFO: ChromaDB initialized with {total_existing} chunks across {len(DOMAINS)} domains.")
    except Exception as e:
        print(f"WARNING: ChromaDB check encountered: {e}")
    # Yield immediately so Uvicorn opens port within < 1 second and Render healthcheck passes
    yield

app = FastAPI(
    title="SISTec Multi-RAG College Chatbot API",
    description="Multi-domain RAG system for Sagar Institute of Science and Technology, Bhopal",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    chat_history: Optional[List[Dict[str, Any]]] = None
    forced_domain: Optional[str] = None

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "langgraph_workflow_active": True,
        "gemini_api_configured": bool(GEMINI_API_KEY),
        "total_domains": len(DOMAINS)
    }

@app.get("/api/domains")
def get_domains():
    """Return all configured domains with chunk counts."""
    result = []
    for domain_key, info in DOMAINS.items():
        coll = get_or_create_collection(domain_key)
        result.append({
            "key": domain_key,
            "name": info["name"],
            "description": info["description"],
            "total_chunks": coll.count()
        })
    return result

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    """
    Main Multi-RAG chat endpoint powered by LangGraph StateGraph:
    1. route_node -> classifies domain intent
    2. conditional edge -> greeting / retrieve / fallback
    3. retrieve_node -> fetches domain vector chunks from ChromaDB
    4. grade_documents_node -> validates document relevance
    5. generate_node -> synthesizes grounded answer with citations
    """
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    history_dicts = []
    if req.chat_history:
        for m in req.chat_history:
            if isinstance(m, dict):
                history_dicts.append({
                    "role": str(m.get("role", "user")),
                    "content": str(m.get("content", ""))
                })

    # Execute LangGraph Workflow
    final_state = langgraph_app.invoke({
        "query": query,
        "chat_history": history_dicts,
        "forced_domain": req.forced_domain,
        "routing": {},
        "context": "",
        "citations": [],
        "documents_valid": False,
        "answer": ""
    })

    return {
        "answer": final_state.get("answer", ""),
        "routing": final_state.get("routing", {}),
        "citations": final_state.get("citations", []),
        "workflow": "LangGraph StateGraph"
    }

@app.get("/api/documents")
def list_documents():
    """Get list of all documents stored across all domains."""
    return get_indexed_documents()

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    domain: str = Form(...)
):
    """Upload a new PDF or TXT document into a specified domain index."""
    if domain not in DOMAINS:
        raise HTTPException(status_code=400, detail=f"Invalid domain '{domain}'. Must be one of {list(DOMAINS.keys())}")

    filename = Path(file.filename).name
    ext = Path(filename).suffix.lower()
    if ext not in [".txt", ".md", ".pdf"]:
        raise HTTPException(status_code=400, detail="Only .pdf, .txt, and .md files are supported.")

    target_dir = DATA_DIR / DOMAINS[domain]["folder"]
    target_dir.mkdir(parents=True, exist_ok=True)
    target_file = target_dir / filename

    with open(target_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Index newly saved file into ChromaDB
    chunks_count = index_file(target_file, domain)

    return {
        "status": "success",
        "file_name": filename,
        "domain": domain,
        "domain_name": DOMAINS[domain]["name"],
        "indexed_chunks": chunks_count,
        "message": f"Successfully indexed '{filename}' with {chunks_count} chunks into {DOMAINS[domain]['name']}."
    }

@app.delete("/api/documents/{domain}/{filename}")
def delete_document(domain: str, filename: str):
    """Delete a document and remove its chunks from ChromaDB."""
    if domain not in DOMAINS:
        raise HTTPException(status_code=400, detail="Invalid domain.")

    target_file = DATA_DIR / DOMAINS[domain]["folder"] / filename
    if not target_file.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    # Remove from disk
    os.remove(target_file)

    # Remove from Chroma
    coll = get_or_create_collection(domain)
    try:
        coll.delete(where={"source_file": filename})
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"File '{filename}' deleted from {domain}."
    }

@app.post("/api/reindex")
def reindex_all():
    """Trigger full reindexing of all domain documents."""
    summary = index_all_domains()
    return {"status": "success", "summary": summary}

# =====================================================================
# Voice Call Bot Endpoints (Neerja SISTec)
# =====================================================================
from backend.call_bot.voice_generator import (
    generate_voice_response,
    get_voice_greeting,
    get_voice_fallback,
    check_fast_intent
)
from backend.call_bot.router import route_query as route_voice_query
from backend.call_bot.retriever import multi_domain_retrieve as voice_retrieve
from backend.call_bot.tts_engine import text_to_speech_base64
from backend.call_bot.config import DEFAULT_VOICE

class VoiceChatRequest(BaseModel):
    query: str
    voice: Optional[str] = None
    use_edge_tts: Optional[bool] = False

class VoiceChatResponse(BaseModel):
    text: str
    audio_base64: Optional[str] = None
    domain: str
    confidence: float
    citations: List[Dict[str, Any]]

@app.get("/api/voice/health")
def voice_health_check():
    return {
        "status": "online",
        "service": "Neerja SISTec AI Voice Call Bot",
        "gemini_configured": bool(GEMINI_API_KEY)
    }

@app.get("/api/voice/greeting")
async def get_call_greeting(use_edge_tts: bool = False):
    greeting_text = get_voice_greeting()
    audio_b64 = None
    if use_edge_tts:
        audio_b64 = await text_to_speech_base64(greeting_text, DEFAULT_VOICE)
    return {
        "text": greeting_text,
        "audio_base64": audio_b64,
        "domain": "greeting"
    }

@app.post("/api/voice/chat")
async def voice_chat_endpoint(req: VoiceChatRequest):
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # 1. Instant Fast-Intent Cache (< 0.2ms latency!)
    fast_ans = check_fast_intent(query)
    if fast_ans:
        audio_b64 = await text_to_speech_base64(fast_ans, DEFAULT_VOICE) if req.use_edge_tts else None
        return VoiceChatResponse(
            text=fast_ans,
            audio_base64=audio_b64,
            domain="fast_intent",
            confidence=0.99,
            citations=[]
        )

    # 2. Fast Intent Routing (< 1ms)
    routing = route_voice_query(query)

    # 3. Greeting
    if routing.get("is_greeting"):
        greeting_text = get_voice_greeting()
        audio_b64 = await text_to_speech_base64(greeting_text, DEFAULT_VOICE) if req.use_edge_tts else None
        return VoiceChatResponse(
            text=greeting_text,
            audio_base64=audio_b64,
            domain="greeting",
            confidence=0.95,
            citations=[]
        )

    # 4. Out of Scope
    if not routing.get("is_college_related"):
        fallback_text = get_voice_fallback("out_of_scope")
        audio_b64 = await text_to_speech_base64(fallback_text, DEFAULT_VOICE) if req.use_edge_tts else None
        return VoiceChatResponse(
            text=fallback_text,
            audio_base64=audio_b64,
            domain="out_of_scope",
            confidence=0.2,
            citations=[]
        )

    # 5. Fast Targeted Multi-Domain Context Retrieval (~200ms)
    target_domains = routing.get("target_domains", ["placements"])
    context, citations = voice_retrieve(query, target_domains, top_per_domain=2)

    # 6. Fast Gemini Voice Synthesis (~600ms)
    if context.strip():
        answer_text = generate_voice_response(query, context)
    else:
        answer_text = get_voice_fallback("not_found")

    # 7. Optional Edge-TTS Audio
    audio_b64 = None
    if req.use_edge_tts:
        audio_b64 = await text_to_speech_base64(answer_text, req.voice or DEFAULT_VOICE)

    return VoiceChatResponse(
        text=answer_text,
        audio_base64=audio_b64,
        domain=routing.get("primary_domain", "general"),
        confidence=routing.get("confidence", 0.9),
        citations=citations
    )

# =====================================================================
# Serve Built Frontend / Website
# =====================================================================
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
WEBSITE_DIR = BASE_DIR / "apps" / "website"
if not WEBSITE_DIR.exists() and (BASE_DIR.parent / "apps" / "website").exists():
    WEBSITE_DIR = BASE_DIR.parent / "apps" / "website"

if FRONTEND_DIST.exists():
    # Mount frontend dist if exists
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
elif WEBSITE_DIR.exists():
    # Mount college website at root path
    app.mount("/", StaticFiles(directory=str(WEBSITE_DIR), html=True), name="website")

@app.exception_handler(404)
async def custom_404_handler(request, exc):
    """Fallback handler to support SPA routing while preserving 404s for API."""
    if request.url.path.startswith("/api"):
        return JSONResponse(status_code=404, content={"detail": f"API endpoint '{request.url.path}' not found."})
    
    if FRONTEND_DIST.exists():
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
    elif WEBSITE_DIR.exists():
        index_file = WEBSITE_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
    
    return JSONResponse(status_code=404, content={"detail": "Page not found."})

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)


