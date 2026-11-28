import re
from typing import List, Dict, Any, Tuple
from .config import DOMAINS
from .ingestion import get_or_create_collection
from .router import expand_voice_query

# In-memory query cache
_RETRIEVAL_CACHE = {}

def retrieve_domain_context(query: str, domain_key: str, n_results: int = 2) -> List[Dict[str, Any]]:
    if domain_key not in DOMAINS:
        return []

    collection = get_or_create_collection(domain_key)
    count = collection.count()
    if count == 0:
        return []

    fetch_k = min(n_results, count)
    results = collection.query(
        query_texts=[query],
        n_results=fetch_k
    )

    chunks = []
    if results and "documents" in results and results["documents"]:
        docs = results["documents"][0]
        metadatas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)

        for doc, meta in zip(docs, metadatas):
            if not doc:
                continue
            meta = meta or {}
            heading = meta.get("heading", "General") or "General"
            chunks.append({
                "text": doc,
                "domain": domain_key,
                "domain_name": meta.get("domain_name", DOMAINS[domain_key]["name"]),
                "heading": heading
            })

    return chunks

def multi_domain_retrieve(query: str, target_domains: List[str], top_per_domain: int = 2) -> Tuple[str, List[Dict[str, Any]]]:
    cache_key = f"{query.lower().strip()}_{','.join(target_domains or [])}"
    if cache_key in _RETRIEVAL_CACHE:
        return _RETRIEVAL_CACHE[cache_key]

    if not target_domains:
        target_domains = ["placements", "admissions"]
    else:
        target_domains = target_domains[:2]

    expanded_q = expand_voice_query(query)

    all_chunks = []
    for d in target_domains:
        all_chunks.extend(retrieve_domain_context(expanded_q, d, n_results=top_per_domain))

    context_parts = []
    citations = []
    for c in all_chunks[:2]:
        snippet = c['text'][:500].strip()
        context_parts.append(f"[{c['domain_name']} - {c['heading']}]:\n{snippet}")
        citations.append({
            "domain": c["domain"],
            "domain_name": c["domain_name"],
            "heading": c["heading"]
        })

    result = ("\n\n".join(context_parts), citations)
    _RETRIEVAL_CACHE[cache_key] = result
    return result
