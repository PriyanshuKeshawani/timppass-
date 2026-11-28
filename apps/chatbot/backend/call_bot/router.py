import re
from typing import List, Dict, Any
from .config import DOMAINS

# Common greetings
GREETINGS = {
    "hi", "hello", "hey", "good morning", "good evening", "good afternoon",
    "namaste", "namaskar", "kya haal hai", "who are you", "what can you do",
    "kon ho aap", "koun ho", "aap kon ho", "hello neerja", "hi neerja"
}

# Explicitly out-of-scope non-college topics
OUT_OF_SCOPE_WORDS = {
    "weather", "cricket score", "prime minister", "president", "narendra modi",
    "donald trump", "capital of", "recipe", "song", "joke", "movie", "bollywood",
    "formula 1", "stock market", "crypto", "bitcoin"
}

def clean_query_text(query: str) -> str:
    """Normalize input query string."""
    q = query.lower().strip()
    q = re.sub(r'[^\w\s\-\.]', '', q)
    return q

def expand_voice_query(query: str) -> str:
    """
    Expands Hinglish and conversational spoken phrases with core domain keywords
    to ensure 100% semantic hit rate in ChromaDB vector space.
    """
    q_lower = query.lower()
    expansions = []
    
    # Placement intent
    if any(w in q_lower for w in ("placement", "package", "salary", "lpa", "naukri", "job", "hiring", "company", "recruit")):
        expansions.append("placement record highest package average salary top recruiters dream offers")
        
    # Fee & Admission intent
    if any(w in q_lower for w in ("fee", "fees", "kharcha", "paisa", "rupees", "cost", "scholarship", "loan", "bihar credit")):
        expansions.append("tuition fee structure total fees per year scholarship bihar student credit card")
        
    if any(w in q_lower for w in ("admission", "apply", "counseling", "dte", "clc", "cutoff", "marks", "dakhila", "seat", "intake")):
        expansions.append("admission eligibility criteria MP DTE counseling CLC round registration process")

    # Hostels & Campus facilities
    if any(w in q_lower for w in ("hostel", "mess", "food", "khana", "room", "stay", "rehna")):
        expansions.append("residential hostel accommodation mess dining food vegetarian facilities boys girls")
        
    if any(w in q_lower for w in ("bus", "transport", "route", "gadi", "buses", "station", "bhopal")):
        expansions.append("bus routes transport facilities across Bhopal Mandideep Sehore pickup points")

    # Academics & Branches
    if any(w in q_lower for w in ("course", "branch", "btech", "b.tech", "cse", "computer science", "ai", "aiml", "aids", "mechanical", "civil", "mba", "pharmacy", "syllabus")):
        expansions.append("engineering branches curriculum syllabus RGPV affiliation computer science departments")

    # Campus & Contact
    if any(w in q_lower for w in ("campus", "location", "address", "phone", "contact", "kahan hai", "kidhar", "reach", "gandhi nagar", "ratibad")):
        expansions.append("campus location address Gandhi Nagar Ratibad helpline contact number phone")

    if expansions:
        return f"{query} {' '.join(expansions)}"
    return query

def route_query(query: str) -> Dict[str, Any]:
    """
    Ultra-resilient voice router. Never prematurely rejects valid inquiries.
    """
    clean_q = clean_query_text(query)
    
    # 1. Greetings
    if clean_q in GREETINGS or any(clean_q.startswith(g + " ") for g in GREETINGS) or len(clean_q) <= 3:
        return {
            "primary_domain": "general",
            "target_domains": ["general"],
            "is_greeting": True,
            "is_college_related": True,
            "confidence": 0.95
        }

    # 2. Obvious Out-of-Scope check
    if any(bad in clean_q for bad in OUT_OF_SCOPE_WORDS):
        return {
            "primary_domain": "out_of_scope",
            "target_domains": [],
            "is_greeting": False,
            "is_college_related": False,
            "confidence": 0.1
        }

    # 3. Score domains with keyword weights
    scores = {d: 0 for d in DOMAINS}
    for d, info in DOMAINS.items():
        for kw in info["keywords"]:
            if kw in clean_q:
                scores[d] += 1

    sorted_domains = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    best_domain, best_score = sorted_domains[0]
    
    # Pick active domains or default to broad search
    active = [d for d, s in sorted_domains if s > 0]
    if not active:
        # Default to searching top campus domains
        active = ["placements", "admissions", "academics", "hostels", "administration"]
        primary = "general_campus"
    else:
        primary = best_domain

    return {
        "primary_domain": primary,
        "target_domains": active[:3],
        "is_greeting": False,
        "is_college_related": True,
        "confidence": 0.85
    }
