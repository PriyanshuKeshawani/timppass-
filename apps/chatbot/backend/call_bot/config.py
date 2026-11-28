import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from project root
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

# Gemini & Model Settings
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-flash-lite-latest")

_gemini_client = None
def get_gemini_client():
    global _gemini_client
    if _gemini_client is None and GEMINI_API_KEY:
        from google import genai
        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    return _gemini_client

# Paths
DATA_DIR = BASE_DIR / "data"
CHROMA_PERSIST_DIR = BASE_DIR / "chroma_db"
CACHE_AUDIO_DIR = Path(__file__).resolve().parent / "audio_cache"
CACHE_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Edge-TTS Voice Options
# Indian English voices: en-IN-NeerjaNeural (Female Receptionist), en-IN-PrabhatNeural (Male Executive)
DEFAULT_VOICE = os.getenv("CALL_BOT_VOICE", "en-IN-NeerjaNeural")

# Multi-RAG Domains Definition (100% matched to SISTec Knowledge Base)
DOMAINS = {
    "academics": {
        "name": "Academics & Examination",
        "folder": "academics",
        "description": "Courses, B.Tech/M.Tech/MBA/Pharmacy branches, syllabus, RGPV affiliation, academic calendar, exam rules, attendance guidelines, labs, semester modules, faculty members, professors, HODs, vision, mission, objectives, colleges, SISTec.",
        "keywords": [
            "syllabus", "course", "courses", "btech", "b.tech", "mtech", "m.tech", "mba", "pharmacy",
            "bpharm", "b.pharm", "mpharm", "m.pharm", "dpharm", "d.pharm", "rgpv", "exam", "exams",
            "examination", "attendance", "credits", "branch", "branches", "department", "curriculum",
            "subject", "subjects", "degree", "lab", "labs", "cse", "computer science", "artificial intelligence",
            "aids", "aiml", "cyber security", "mechanical", "civil", "electrical", "electronics", "faculty",
            "professor", "hod", "principal", "director", "manish billore", "jyoti deshmukh", "kuldeep ganju"
        ]
    },
    "admissions": {
        "name": "Admissions & Fees",
        "folder": "admissions",
        "description": "Eligibility criteria, MP DTE counseling, CLC rounds, tuition fee structure, caution money, scholarships, freeships, admission helplines.",
        "keywords": [
            "admission", "admissions", "eligibility", "eligible", "fee", "fees", "tuition", "counseling",
            "dte", "mp dte", "clc", "college level counseling", "scholarship", "scholarships", "freeship",
            "cutoff", "12th marks", "lateral entry", "apply", "seats", "seat matrix", "intake",
            "bihar credit card", "bihar student credit card", "bscc", "education loan", "loan", "loans",
            "documents required", "mmvy", "medhavi", "post matric", "sambal", "tfw", "tuition fee waiver",
            "jee score", "cmat score", "gpat score", "contact number", "helpline", "admission helpline"
        ]
    },
    "hostels": {
        "name": "Hostels & Campus Facilities",
        "folder": "hostels",
        "description": "Hostel accommodation, occupancy types, mess menu & food, curfew timings, bus routes & transport, sports grounds, library, medical aid, student clubs, SAC, fests, hackathons.",
        "keywords": [
            "hostel", "hostels", "mess", "food", "dining", "bus", "buses", "transport", "bus routes",
            "room", "rooms", "curfew", "warden", "library", "sports", "gym", "gymnasium", "medical",
            "campus facility", "facilities", "smart classes", "canteen", "atm", "boys hostel", "girls hostel",
            "hostel capacity", "wifi", "club", "clubs", "sac", "fest", "fiesta", "jalsa", "sagar euphoria"
        ]
    },
    "placements": {
        "name": "Training & Placements (T&P)",
        "folder": "placements",
        "description": "Placement statistics, packages (highest & average), hiring companies, campus recruitment eligibility, training programs, C2C, internships, alumni, T&P cell.",
        "keywords": [
            "placement", "placements", "package", "packages", "salary", "lpa", "recruiter", "recruiters",
            "company", "companies", "recruit", "recruitment", "hire", "hiring", "interview", "internship",
            "internships", "training", "c2c", "jobs", "offers", "highest package", "average package",
            "placed", "t&p", "training and placement", "placement rate", "tcs", "cisco", "amazon"
        ]
    },
    "administration": {
        "name": "Administration & Contacts",
        "folder": "administration",
        "description": "Campus addresses (Gandhi Nagar & Ratibad), contact numbers, email IDs, grievance cell, anti-ragging committee, leadership, founders, student support.",
        "keywords": [
            "address", "contact", "contacts", "phone", "mobile", "number", "email", "helpline", "location",
            "where is", "reach", "campus", "principal", "director", "chairman", "leader", "founder",
            "anti-ragging", "ragging", "grievance", "ratibad", "gandhi nagar", "office", "timings",
            "sagar group", "sudhir kumar agrawal", "helpline number", "reception", "reception number"
        ]
    }
}
