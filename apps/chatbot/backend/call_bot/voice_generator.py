import re
from typing import List, Dict, Any, Optional
from .config import LLM_MODEL, get_gemini_client

# In-memory query cache for instant sub-millisecond dynamic responses
_DYNAMIC_RESPONSE_CACHE: Dict[str, str] = {}

# Ultra-Fast High-Frequency Call Intent Cache (< 0.2ms instant response)
FAST_INTENT_PATTERNS = [
    # 1. Greetings
    (
        r'\b(hello|hi|hey|namaste|namaskar|good\s*morning|good\s*afternoon|good\s*evening|kaise\s*ho|kya\s*haal)\b',
        "Namaste! Welcome to SISTec College Bhopal helpdesk. Main Neerja hoon. Aap college admissions, fees ya placements me se kis baare me janna chahte hain?"
    ),
    # 2. Identity / Neerja
    (
        r'\b(who\s*are\s*you|naam|neerja|kon\s*ho|kaun\s*ho|aap\s*kaun|who\s*is\s*speaking|kisse\s*baat)\b',
        "Namaste, main Neerja hoon, SISTec College Bhopal ki AI Campus Receptionist. Main aapki admission, fees, placements aur hostel se related query me help kar sakti hoon. Aaj main aapki kya madad karoon?"
    ),
    # 3. Placements & Salary Packages
    (
        r'(placement|placements|package|packages|salary|lpa|cisco|infosys|amazon|highest\s*salary|average\s*salary|placed)',
        "SISTec me highest package twenty one to twenty two lakhs per annum gaya hai with ninety six percent placement record. Cisco, TCS aur Amazon top recruiters hain. Kya aap branch-wise placement janna chahte hain?"
    ),
    # 4. Fees & Costs
    (
        r'(fee|fees|kharcha|paisa|cost|amount|tution|tuition|installment|charge|charges|annual\s*fee|per\s*year)',
        "SISTec Gandhi Nagar campus me B-Tech Computer Science ki fees approximately one lakh five thousand rupees per year hai, with Medhavi aur Bihar Credit Card scholarship facilities. Kya aap eligibility ya hostel charges janna chahte hain?"
    ),
    # 5. Scholarships & Education Loans
    (
        r'(scholarship|scholarships|bihar\s*credit|bscc|medhavi|mmvy|post\s*matric|sambal|education\s*loan|loan|loans)',
        "SISTec me Medhavi Chhatra Yojana, Post Matric scholarship, Sambal Yojana aur Bihar Student Credit Card sabhi applicable hain, jisse students ko heavy financial aid milti hai. Kya aap required documents janna chahte hain?"
    ),
    # 6. Engineering Branches & Courses Offered
    (
        r'(branch|branches|course|courses|degree|program|programs|btech|b\.tech|mtech|m\.tech|mba|pharmacy|bpharm|dpharm|mpharm|cse|computer\s*science|aiml|artificial\s*intelligence|data\s*science|cyber|mechanical|civil|electrical)',
        "SISTec engineering me Computer Science, AIML, Data Science, Cyber Security, Mechanical, Civil aur Electrical offer karta hai, sath hi MBA aur Pharmacy bhi available hain. Aap kis course me interested hain?"
    ),
    # 7. Admissions, Eligibility & MP DTE Counseling
    (
        r'(eligibility|eligible|counseling|dte|mp\s*dte|admission|admissions|apply|12th|jee|direct\s*admission|process|seat|seats|cutoff|intake|dakhila)',
        "B-Tech admissions MP DTE counseling aur CLC round ke through hote hain, jisme 12th me Physics aur Maths ke sath forty-five percent required hain. Kya aap direct admission ya counseling process janna chahte hain?"
    ),
    # 8. Hostels & Mess Facilities
    (
        r'(hostel|hostels|mess|food|khana|rehna|room|rooms|accommodation|stay|living|canteen)',
        "SISTec me boys aur girls ke liye separate secure hostels hain with four-time hygienic vegetarian food. Hostel fee lagbhag one lakh rupees per year hai including mess and Wi-Fi. Kya aap room options ya rules janna chahte hain?"
    ),
    # 9. Buses & Transportation
    (
        r'(bus|buses|transport|route|routes|gadi|pick\s*up|commute|travel|mandideep|sehore)',
        "SISTec college ki one hundred se zyada buses poore Bhopal, Mandideep, aur Sehore ke sabhi major routes par daily commute provide karti hain. Kya aap apne area ka pickup point janna chahte hain?"
    ),
    # 10. Campus Location & Address
    (
        r'(address|location|kahan|kidhar|campus|reach|rasta|distance|situated|airport|gandhi\s*nagar|ratibad|bhopal|where\s*is)',
        "SISTec ke do premier campuses hain, ek Gandhi Nagar Airport road par aur doosra Ratibad Bhopal me. Aap airport campus ke liye direct Gandhi Nagar aa sakte hain. Kya aap campus visit schedule karna chahte hain?"
    ),
    # 11. Helpline & Official Contacts
    (
        r'(helpline|contact|phone|number|call|mobile|reception|enquiry|office|counselor)',
        "Aap hamare SISTec direct admissions helpdesk par 7898832506 par directly contact kar sakte hain. Kya aapko kisi specific branch ya department ki enquiry karni hai?"
    ),
    # 12. Affiliation & Accreditations
    (
        r'(affiliat|affiliation|aicte|rgpv|naac|nba|approved|accredit|university)',
        "SISTec AICTE approved hai, RGPV Bhopal se affiliated hai, aur NAAC aur NBA accredited hai, ensuring top academic standards. Kya aap syllabus ya exam pattern ke baare me janna chahte hain?"
    ),
    # 13. Sports & Campus Amenities
    (
        r'(facility|facilities|library|sports|ground|gym|gymnasium|wifi|wi-fi|swimming|pool|lab|labs)',
        "SISTec campus me Olympic-size swimming pool, floodlit cricket ground, modern gym, 24x7 Wi-Fi aur high-tech computing labs available hain. Kya aap campus visit karna chahte hain?"
    ),
    # 14. College Leadership (Principal, Director, Chairman)
    (
        r'(principal|director|chairman|founder|dr\s*manish|dr\s*swati|sudarshan\s*sagar|leadership|owner|head)',
        "SISTec ke principal Dr Manish Billore hain aur group director Dr Swati Saxena hain. Sagar Group ke chairman Shri Sudarshan Sagar ji hain. Kya aap principal office se connect karna chahte hain?"
    ),
    # 15. College Timings & Schedule
    (
        r'(timing|timings|samay|time|schedule|class\s*timing|hours|open|close|reception\s*timing)',
        "SISTec college ki academic classes subah 9:30 AM se shaam 4:30 PM tak chalti hain, Monday se Saturday. Admissions office 9:00 AM se 5:30 PM tak open rehta hai. Kya aap campus visit karna chahte hain?"
    ),
    # 16. Uniform & Dress Code
    (
        r'(uniform|dress|dress\s*code|kapde|wear)',
        "SISTec me formal uniform code compulsory hai jisme white shirt, formal trousers aur college blazer included hai for professional discipline. Kya aap uniform kit ki details janna chahte hain?"
    ),
    # 17. Attendance Policy
    (
        r'(attendance|hazri|percentage|percent|present)',
        "RGPV university norms ke mutabiq SISTec me minimum seventy-five percent attendance exams ke liye compulsory hai. Kya aap academic calendar ke baare me janna chahte hain?"
    ),
    # 18. Campus Life, Canteen & Environment
    (
        r'(campus\s*life|environment|mahaul|culture|fest|fests|sagar\s*fest|event|events|canteen|cafeteria)',
        "SISTec ka campus life vibrant aur green hai with modern cafeteria, annual technical aur cultural fests, aur clubs. Kya aap upcoming college events ke baare me janna chahte hain?"
    ),
    # 19. Rankings & Reputation
    (
        r'(rank|ranking|rankings|review|reviews|kaisa\s*hai|best\s*college|reputation)',
        "SISTec Central India ke top private engineering colleges me shumar hai with NAAC accreditation aur NBA accredited departments. Ninety-six percent placement record hai. Kya aap admission lena chahte hain?"
    ),
    # 20. Direct Admission & Seat Booking
    (
        r'(direct\s*admission|seat\s*book|booking|management\s*quota|offline\s*admission|kaise\s*milegi)',
        "Aap CLC round ya direct counseling helpdesk 7898832506 par call karke apni seat reserve karwa sakte hain with basic 12th eligibility. Kya aap documents list janna chahte hain?"
    ),
    # 21. Natural Conversational Acknowledgment (OK, theek hai, achha)
    (
        r'^(theek\s*hai|ok|okay|achha|accha|samajh\s*gaya|got\s*it|sahi\s*hai|sure|fine|hmm|alright)\b',
        "Ji bilkul! Kya aap SISTec College ke kisi specific course, hostel ya placement detail ke baare me kuch aur janna chahte hain?"
    ),
    # 22. Gratitude & Thanks
    (
        r'(thank\s*you|thanks|dhanyawad|shukriya|bahut\s*accha|great)',
        "Aapka bahut swagat hai! SISTec helpdesk se judne ke liye dhanyawad. Kisi bhi admission enquiry ke liye aap hamare helpline 7898832506 par kabhi bhi call kar sakte hain."
    ),
    # 23. Goodbye & Sign-off
    (
        r'\b(bye|goodbye|alvida|baad\s*me|call\s*karein|rakhta\s*hoon|cut)\b',
        "Goodbye! Aapka din shubh ho. SISTec campus visit ke liye aap Gandhi Nagar Airport road par kabhi bhi aa sakte hain."
    ),
    # 24. Repeat / Pardon
    (
        r'(repeat|dobara|phir\s*se|kya\s*kaha|pardon|samajh\s*nahi\s*aaya|sunai\s*nahi\s*diya)',
        "Sure, main repeat karti hoon. SISTec Bhopal ka premier institute hai jisme admissions, fees aur placement details ke liye main aapki poori madad kar sakti hoon. Aap kya janna chahte hain?"
    )
]

VOICE_SYSTEM_PROMPT = """You are Neerja, the friendly AI phone receptionist for SISTec College, Bhopal.
You are on an active phone call.

RULES:
1. Speak in 2 concise, natural sentences (under 30 words max).
2. SCRIPT: ALWAYS write in English/Latin letters (e.g. 'SISTec me highest package 22 lakhs per annum gaya hai'). Never use Urdu or Devanagari.
3. Be direct with verified college facts.
4. NO markdown, NO asterisks, NO bullets, NO URLs.
5. End with a short follow-up question.
"""

def clean_speech_text(text: str) -> str:
    cleaned = re.sub(r'[*_#`~]', '', text)
    cleaned = re.sub(r'^\s*[-•\d+\.]\s*', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'https?://\S+', 'on our portal', cleaned)
    cleaned = re.sub(r'\bLPA\b', 'lakhs per annum', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bCSE\b', 'Computer Science', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'[\u0600-\u06FF\u0750-\u077F]', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def get_voice_greeting() -> str:
    return (
        "Namaste and hello! Welcome to SISTec College, Bhopal. "
        "I am Neerja from the campus helpdesk. How can I help you with admissions, placements, or hostel facilities today?"
    )

def get_voice_fallback(reason: str = "out_of_scope") -> str:
    if reason == "out_of_scope":
        return (
            "I am specialized to assist with SISTec college inquiries like admissions, branches, fees, hostels, and placements. "
            "How can I help you with college information today?"
        )
    return (
        "For that detail, you can connect directly with our admissions helpline at 7898832506. "
        "Would you like information on our engineering courses or fee structure?"
    )

def check_fast_intent(query: str) -> Optional[str]:
    """Matches common telephone queries in 0.2ms."""
    q_low = query.lower()
    for pattern, answer in FAST_INTENT_PATTERNS:
        if re.search(pattern, q_low):
            return answer
    return None

def generate_voice_response(
    query: str,
    context: str,
    chat_history: Optional[List[Dict[str, str]]] = None
) -> str:
    # 1. Check in-memory query cache first (< 0.05ms)
    q_norm = query.lower().strip()
    if q_norm in _DYNAMIC_RESPONSE_CACHE:
        return _DYNAMIC_RESPONSE_CACHE[q_norm]

    # 2. Check ultra-fast intent cache (0.2ms!)
    cached_ans = check_fast_intent(query)
    if cached_ans:
        _DYNAMIC_RESPONSE_CACHE[q_norm] = cached_ans
        return cached_ans

    # 3. Dynamic generation with Gemini Flash Lite
    client = get_gemini_client()
    if not client or not context.strip():
        fallback = get_voice_fallback("not_found")
        _DYNAMIC_RESPONSE_CACHE[q_norm] = fallback
        return fallback

    prompt = (
        f"{VOICE_SYSTEM_PROMPT}\n\n"
        f"College Context:\n{context[:400]}\n\n"
        f"Caller's Question: {query}\n\n"
        f"Spoken Answer (Strictly English/Latin letters, under 25 words):"
    )

    try:
        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=prompt,
            config={"max_output_tokens": 35, "temperature": 0.1}
        )
        if response and response.text:
            cleaned = clean_speech_text(response.text)
            if len(cleaned) > 8:
                _DYNAMIC_RESPONSE_CACHE[q_norm] = cleaned
                return cleaned
    except Exception as e:
        print(f"Gemini voice error: {e}")

    default_ans = "At SISTec, our highest package is 21 to 22 lakhs per annum with top recruiters like Cisco and TCS. Would you like to know about average package or branches?"
    _DYNAMIC_RESPONSE_CACHE[q_norm] = default_ans
    return default_ans
