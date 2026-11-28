from pathlib import Path
import chromadb
from chromadb.utils import embedding_functions
from .config import CHROMA_PERSIST_DIR, DOMAINS

# Connect to existing persistent ChromaDB
CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)
chroma_client = chromadb.PersistentClient(path=str(CHROMA_PERSIST_DIR))
default_ef = embedding_functions.DefaultEmbeddingFunction()

def get_collection_name(domain_key: str) -> str:
    return f"college_{domain_key}"

def get_or_create_collection(domain_key: str):
    collection_name = get_collection_name(domain_key)
    return chroma_client.get_or_create_collection(
        name=collection_name,
        embedding_function=default_ef,
        metadata={"domain": domain_key, "domain_name": DOMAINS.get(domain_key, {}).get("name", domain_key)}
    )
