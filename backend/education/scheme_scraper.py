"""
scheme_scraper.py
-----------------
Hybrid approach for government / agriculture schemes.

How it works
------------
1. Curated catalog  -> static data for documents, how_to_apply, and
                       a meaningful deadline note (regulatory dates that
                       rarely change, e.g. seasonal cutoffs).
2. Live scraping    -> tries to find a REAL date near "last date /
                       deadline" keywords on the scheme's official URL.
                       If found, it OVERRIDES the catalog deadline.
3. Status           -> detected from scraped text; falls back to
                       "active" for any known central scheme.
"""

import re
import requests
import urllib3
from bs4 import BeautifulSoup
from difflib import get_close_matches

urllib3.disable_warnings()

# ---------------------------------------------------------------------------
# HTTP SESSION
# ---------------------------------------------------------------------------

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
})

# ---------------------------------------------------------------------------
# SCHEME CATALOG
# Covers: documents, how_to_apply, deadline (curated), scrape_url
# ---------------------------------------------------------------------------

SCHEME_CATALOG = {

    # ── PM-KISAN ────────────────────────────────────────────────────────────
    "pm kisan": {
        "full_name": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
        "deadline": (
            "Ongoing scheme - installments released 3 times a year "
            "(Feb, Jun-Jul, Nov). Complete e-KYC at pmkisan.gov.in "
            "to receive the next installment."
        ),
        "documents": [
            "Aadhaar card (mandatory for e-KYC)",
            "Land ownership documents (Khata / Patta / Khasra)",
            "Bank account passbook linked with Aadhaar",
            "Mobile number linked to Aadhaar",
            "Residential / domicile proof",
        ],
        "how_to_apply": [
            "Visit the official portal: pmkisan.gov.in",
            "Click 'Farmers Corner' -> 'New Farmer Registration'",
            "Select Rural or Urban farmer and enter your Aadhaar number",
            "Complete e-KYC via OTP or biometric at Common Service Centre (CSC)",
            "Fill in land and bank details and submit",
            "Alternatively, visit the nearest CSC or Patwari office",
        ],
        "scrape_url": "https://pmkisan.gov.in/",
    },

    # ── PMFBY ───────────────────────────────────────────────────────────────
    "pmfby": {
        "full_name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "deadline": (
            "Kharif season: Last date to apply is 31 July. "
            "Rabi season: Last date to apply is 31 December. "
            "Visit pmfby.gov.in or nearest bank / CSC before the cutoff."
        ),
        "documents": [
            "Aadhaar card",
            "Land records / RoR (Khasra / Khatauni)",
            "Bank account passbook",
            "Sowing / crop certificate from Patwari",
            "Cancelled cheque",
            "Mobile number",
        ],
        "how_to_apply": [
            "Visit pmfby.gov.in or the nearest bank / CSC",
            "Log in and click 'Apply for Crop Insurance'",
            "Select state, district, crop season, and crop name",
            "Upload required documents",
            "Pay the farmer-share premium (1.5% for Kharif, 2% for Rabi, 5% for horticulture)",
            "Download the policy receipt as proof of enrollment",
        ],
        "scrape_url": "https://pmfby.gov.in/",
    },

    # ── Fasal Bima (alias) ───────────────────────────────────────────────────
    "fasal bima": {
        "full_name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "deadline": (
            "Kharif: Last date 31 July | Rabi: Last date 31 December"
        ),
        "documents": [
            "Aadhaar card",
            "Land records / RoR",
            "Bank account passbook",
            "Sowing certificate from Patwari",
            "Cancelled cheque",
        ],
        "how_to_apply": [
            "Visit pmfby.gov.in or nearest bank / CSC",
            "Select season (Kharif / Rabi) and crop",
            "Upload documents and pay premium",
            "Collect policy receipt",
        ],
        "scrape_url": "https://pmfby.gov.in/",
    },

    # ── Kisan Credit Card ────────────────────────────────────────────────────
    "kisan credit card": {
        "full_name": "Kisan Credit Card (KCC)",
        "deadline": (
            "Ongoing scheme - no fixed deadline. Apply at any time "
            "through your nearest bank branch or online."
        ),
        "documents": [
            "Aadhaar card / Voter ID / Passport (identity proof)",
            "Land ownership or tenancy documents",
            "Recent passport-size photograph",
            "Bank account passbook",
            "Crop cultivation details",
        ],
        "how_to_apply": [
            "Visit the nearest bank (SBI, PNB, cooperative bank, etc.)",
            "Collect and fill the KCC application form",
            "Attach land records and identity proof",
            "Bank verifies documents and determines credit limit",
            "KCC issued within 2-3 weeks of approval",
            "Can also apply online via SBI YONO or respective bank portal",
        ],
        "scrape_url": "https://www.nabard.org/",
    },

    # ── KCC (alias) ──────────────────────────────────────────────────────────
    "kcc": {
        "full_name": "Kisan Credit Card (KCC)",
        "deadline": "Ongoing scheme - no fixed application deadline.",
        "documents": [
            "Aadhaar card / Voter ID",
            "Land ownership or tenancy document",
            "Passport-size photograph",
            "Bank account passbook",
        ],
        "how_to_apply": [
            "Visit nearest bank branch",
            "Fill KCC application form with crop details",
            "Submit land and identity documents",
            "Card issued after bank verification",
        ],
        "scrape_url": "https://www.nabard.org/",
    },

    # ── Soil Health Card ────────────────────────────────────────────────────
    "soil health card": {
        "full_name": "Soil Health Card Scheme",
        "deadline": (
            "Ongoing scheme - Soil Health Cards issued on a rolling basis "
            "every 2 years. Contact your local Agriculture Department."
        ),
        "documents": [
            "Land ownership / tenancy document",
            "Aadhaar card",
            "Mobile number for SMS notification",
        ],
        "how_to_apply": [
            "Contact the local Agriculture Department or Krishi Vigyan Kendra (KVK)",
            "A soil sample will be collected from your field by the department",
            "Sample is tested at the designated soil testing laboratory",
            "Soil Health Card issued within 4-8 weeks",
            "Download the card from soilhealth.dac.gov.in using your mobile number",
        ],
        "scrape_url": "https://soilhealth.dac.gov.in/",
    },

    # ── PM Kisan Maan-Dhan ──────────────────────────────────────────────────
    "pm kisan maan dhan": {
        "full_name": "PM Kisan Maan-Dhan Yojana (Farmer Pension Scheme)",
        "deadline": (
            "Ongoing scheme - enroll anytime at the nearest Common Service "
            "Centre (CSC). Monthly pension of Rs. 3,000 after age 60."
        ),
        "documents": [
            "Aadhaar card",
            "Bank account passbook (savings account)",
            "Mobile number",
            "Age proof (if date of birth not on Aadhaar)",
            "Land records",
        ],
        "how_to_apply": [
            "Visit the nearest Common Service Centre (CSC)",
            "Provide Aadhaar and bank details to the Village Level Entrepreneur (VLE)",
            "Select monthly contribution amount as per your age slab",
            "Auto-debit from bank account will be set up",
            "Farmer Pension Account Number (FPAN) is generated as acknowledgment",
        ],
        "scrape_url": "https://pmkmy.gov.in/",
    },

    # ── Mandhan (alias) ─────────────────────────────────────────────────────
    "mandhan": {
        "full_name": "PM Kisan Maan-Dhan Yojana",
        "deadline": "Ongoing - enroll anytime at nearest CSC.",
        "documents": [
            "Aadhaar card",
            "Bank account passbook",
            "Mobile number",
        ],
        "how_to_apply": [
            "Visit nearest CSC with Aadhaar and bank details",
            "Enrol via VLE; set up auto-debit monthly contribution",
            "Receive Farmer Pension Account Number (FPAN)",
        ],
        "scrape_url": "https://pmkmy.gov.in/",
    },

    # ── PMKSY ───────────────────────────────────────────────────────────────
    "pmksy": {
        "full_name": "Pradhan Mantri Krishi Sinchai Yojana (PMKSY)",
        "deadline": (
            "Ongoing scheme - applications accepted continuously through "
            "State Agriculture / Irrigation Departments."
        ),
        "documents": [
            "Aadhaar card",
            "Land records",
            "Bank passbook",
            "Project / scheme application form",
        ],
        "how_to_apply": [
            "Contact the State Agriculture Department or Irrigation Department",
            "Apply online at pmksy.gov.in or through the district collector office",
            "Submit land and water-source details",
            "Approval and subsidy released based on state guidelines",
        ],
        "scrape_url": "https://pmksy.gov.in/",
    },

    # ── Sinchai (alias) ─────────────────────────────────────────────────────
    "sinchai": {
        "full_name": "Pradhan Mantri Krishi Sinchai Yojana (PMKSY)",
        "deadline": "Ongoing - apply through State Agriculture / Irrigation Department.",
        "documents": ["Aadhaar card", "Land records", "Bank passbook"],
        "how_to_apply": [
            "Apply at State Agriculture or Irrigation Department",
            "Submit land and irrigation plan",
            "Subsidy credited after approval",
        ],
        "scrape_url": "https://pmksy.gov.in/",
    },

    # ── e-NAM ───────────────────────────────────────────────────────────────
    "national agriculture market": {
        "full_name": "National Agriculture Market (e-NAM)",
        "deadline": (
            "Ongoing - farmers can register at any time at their local "
            "APMC mandi or online at enam.gov.in."
        ),
        "documents": [
            "Aadhaar card",
            "Bank account passbook",
            "Registered trader / commission agent licence number",
            "Mobile number",
        ],
        "how_to_apply": [
            "Visit the local mandi registered on e-NAM (enam.gov.in)",
            "Register as a farmer at the mandi office or online",
            "Link Aadhaar and bank account",
            "List your produce and participate in online auctions",
        ],
        "scrape_url": "https://enam.gov.in/web/",
    },

    # ── e-NAM alias ─────────────────────────────────────────────────────────
    "enam": {
        "full_name": "National Agriculture Market (e-NAM)",
        "deadline": "Ongoing - register at enam.gov.in or nearest APMC mandi anytime.",
        "documents": ["Aadhaar card", "Bank account passbook", "Trader / mandi licence"],
        "how_to_apply": [
            "Register at enam.gov.in or nearest APMC mandi",
            "Link Aadhaar and bank details",
            "List produce for online auction",
        ],
        "scrape_url": "https://enam.gov.in/web/",
    },

    # ── PKVY ────────────────────────────────────────────────────────────────
    "paramparagat krishi": {
        "full_name": "Paramparagat Krishi Vikas Yojana (PKVY)",
        "deadline": (
            "Applications accepted through district Agriculture Departments "
            "typically between April and June each year."
        ),
        "documents": [
            "Aadhaar card",
            "Land records",
            "Farmer group / cluster formation certificate",
            "Bank account passbook",
        ],
        "how_to_apply": [
            "Form a cluster of minimum 50 farmers covering at least 50 acres",
            "Contact the State / District Agriculture Department for registration",
            "Submit group and land details",
            "Training provided; subsidy of Rs. 50,000 per hectare over 3 years",
        ],
        "scrape_url": "https://pgsindia-ncof.gov.in/",
    },

    # ── PKVY alias ──────────────────────────────────────────────────────────
    "pkvy": {
        "full_name": "Paramparagat Krishi Vikas Yojana (PKVY)",
        "deadline": "Apply Apr-Jun through State Agriculture Department.",
        "documents": ["Aadhaar card", "Land records", "Farmer cluster certificate", "Bank passbook"],
        "how_to_apply": [
            "Form cluster of 50 farmers covering 50+ acres",
            "Register with State Agriculture Department",
            "Receive subsidy over 3 years",
        ],
        "scrape_url": "https://pgsindia-ncof.gov.in/",
    },

    # ── AIF ─────────────────────────────────────────────────────────────────
    "agriculture infrastructure fund": {
        "full_name": "Agriculture Infrastructure Fund (AIF)",
        "deadline": (
            "Ongoing scheme (2020-2032). Applications accepted on a "
            "rolling basis at agriinfra.dac.gov.in."
        ),
        "documents": [
            "Aadhaar card",
            "Land / business ownership documents",
            "Detailed project / business plan report",
            "Bank account passbook",
            "GST registration (if applicable)",
        ],
        "how_to_apply": [
            "Register at agriinfra.dac.gov.in as a beneficiary",
            "Upload project report and required documents",
            "Apply for a loan through a participating bank",
            "Receive 3% interest subvention on loans up to Rs. 2 crore",
        ],
        "scrape_url": "https://agriinfra.dac.gov.in/",
    },

    # ── AIF alias ────────────────────────────────────────────────────────────
    "aif": {
        "full_name": "Agriculture Infrastructure Fund (AIF)",
        "deadline": "Rolling applications till 2032 at agriinfra.dac.gov.in.",
        "documents": ["Aadhaar card", "Land / business documents", "Project report", "Bank passbook"],
        "how_to_apply": [
            "Register at agriinfra.dac.gov.in",
            "Apply through a participating bank for loan with 3% interest subvention",
        ],
        "scrape_url": "https://agriinfra.dac.gov.in/",
    },

    # ── NFSM ────────────────────────────────────────────────────────────────
    "nfsm": {
        "full_name": "National Food Security Mission (NFSM)",
        "deadline": (
            "Ongoing - seed and input subsidies distributed through the "
            "District Agriculture Department before the sowing season each year."
        ),
        "documents": [
            "Aadhaar card",
            "Land records",
            "Bank account passbook",
        ],
        "how_to_apply": [
            "Contact the District Agriculture Department",
            "Apply for seed and input subsidies under NFSM targets",
            "Demonstrations and training organized at village level",
        ],
        "scrape_url": "https://www.nfsm.gov.in/",
    },

    # ── RKVY ────────────────────────────────────────────────────────────────
    "rkvy": {
        "full_name": "Rashtriya Krishi Vikas Yojana (RKVY)",
        "deadline": (
            "Project proposals for RKVY-RAFTAAR accepted on a rolling basis. "
            "Agri-startup applications: visit rkvy.nic.in for current call dates."
        ),
        "documents": [
            "Aadhaar card",
            "Land records",
            "Bank passbook",
            "Project proposal (for startups / FPOs)",
        ],
        "how_to_apply": [
            "Contact the State Agriculture Department for district-level projects",
            "Startups / agri-entrepreneurs apply at rkvy.nic.in",
            "Submit project proposal for incubation support",
        ],
        "scrape_url": "https://rkvy.nic.in/",
    },

    # ── MIDH ────────────────────────────────────────────────────────────────
    "mid horticulture": {
        "full_name": "Mission for Integrated Development of Horticulture (MIDH)",
        "deadline": (
            "Applications accepted through State Horticulture Departments "
            "generally from April to September each financial year."
        ),
        "documents": [
            "Aadhaar card",
            "Land records",
            "Bank passbook",
            "State Horticulture Department application form",
        ],
        "how_to_apply": [
            "Contact the State Horticulture Department",
            "Submit crop and land details with project plan",
            "Receive subsidy for nursery, plantation, and post-harvest infrastructure",
        ],
        "scrape_url": "https://midh.gov.in/",
    },
}

# ---------------------------------------------------------------------------
# STATUS KEYWORDS
# ---------------------------------------------------------------------------

CLOSED_KEYWORDS = [
    "scheme closed", "last date over", "expired", "discontinued",
    "not available", "deadline passed", "application closed",
    "closed for", "no longer accepting", "scheme is closed",
    "has been closed", "has ended", "registration closed",
    "applications are closed",
]

ACTIVE_KEYWORDS = [
    "apply now", "last date", "last day", "apply before",
    "deadline", "accepting applications", "open for applications",
    "apply online", "registration open", "applications are open",
    "ongoing", "continuous", "rolling basis",
]

# ---------------------------------------------------------------------------
# CATALOG LOOKUP (fuzzy name matching)
# ---------------------------------------------------------------------------

def _catalog_lookup(scheme_name: str):
    """Return the catalog entry best matching scheme_name, or None."""
    name_lower = scheme_name.lower()

    # 1. Direct substring check
    for key, entry in SCHEME_CATALOG.items():
        if key in name_lower or name_lower in key:
            return entry

    # 2. Word-overlap: count how many catalog-key words appear in the name
    best_entry, best_score = None, 0
    for key, entry in SCHEME_CATALOG.items():
        key_words = set(key.split())
        name_words = set(name_lower.split())
        overlap = len(key_words & name_words)
        if overlap > best_score:
            best_score, best_entry = overlap, entry

    if best_score >= 1:
        return best_entry

    # 3. difflib fuzzy match
    matches = get_close_matches(name_lower, list(SCHEME_CATALOG.keys()), n=1, cutoff=0.45)
    if matches:
        return SCHEME_CATALOG[matches[0]]

    return None

# ---------------------------------------------------------------------------
# HTML FETCH + PARSE
# ---------------------------------------------------------------------------

def _fetch_soup(url: str):
    """Fetch URL and return BeautifulSoup, or None on failure."""
    try:
        resp = SESSION.get(url, verify=False, timeout=18)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
            tag.decompose()
        return soup
    except Exception as exc:
        print(f"[SchemeScr] fetch failed ({url}): {exc}")
        return None


def _detect_status(text: str) -> str:
    lower = text.lower()
    for kw in CLOSED_KEYWORDS:
        if kw in lower:
            return "closed"
    for kw in ACTIVE_KEYWORDS:
        if kw in lower:
            return "active"
    return "unknown"


def _extract_deadline(text: str):
    """
    Pull a real date near deadline / last-date keywords.
    Returns a date string or None.
    """
    patterns = [
        r"last\s+date[^\d]{0,25}(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"deadline[^\d]{0,25}(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"apply\s+before[^\d]{0,25}(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"last\s+date[^\d]{0,40}(\d{1,2}\s+\w+\s+\d{4})",
        r"deadline[^\d]{0,40}(\d{1,2}\s+\w+\s+\d{4})",
        r"closing\s+date[^\d]{0,25}(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"due\s+date[^\d]{0,25}(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"before\s+(\d{1,2}\s+\w+\s+20\d{2})",
        # installment release date pattern (for PM-KISAN)
        r"(\d{1,2}(?:st|nd|rd|th)?\s+installment[^\d]{0,40}"
        r"(?:released?|credited?|transfer)[^\d]{0,30}(\d{1,2}\s+\w+\s+\d{4}))",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            # Return the last group (the actual date portion)
            return m.group(m.lastindex).strip()
    return None

# ---------------------------------------------------------------------------
# LIVE STATUS + DEADLINE SCRAPE
# ---------------------------------------------------------------------------

def _scrape_status_and_deadline(official_link: str, catalog_entry: dict):
    """
    Try to scrape a live status + a specific date from:
      1. official_link (from DB field)
      2. catalog's scrape_url (known govt page)
    Returns (status_str, deadline_str_or_None).
    """
    urls_to_try = []
    if official_link:
        urls_to_try.append(official_link)
    if catalog_entry and catalog_entry.get("scrape_url"):
        su = catalog_entry["scrape_url"]
        if su not in urls_to_try:
            urls_to_try.append(su)

    for url in urls_to_try:
        soup = _fetch_soup(url)
        if not soup:
            continue
        text = soup.get_text(separator=" ", strip=True)
        if not text or len(text) < 150:          # JS-rendered = empty body
            print(f"[SchemeScr] JS-rendered or empty: {url}")
            continue

        status = _detect_status(text)
        deadline = _extract_deadline(text)

        print(f"[SchemeScr] Scraped from {url}: status={status}, deadline={deadline}")
        if status != "unknown" or deadline:
            return status, deadline

    return "unknown", None

# ---------------------------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------------------------

def scrape_scheme_info(scheme_name: str, official_link: str = None) -> dict:
    """
    Returns:
      status        - 'active' | 'closed' | 'unknown'
      deadline      - human-readable string or None
      documents     - list[str] or None
      how_to_apply  - list[str] or None
      source_url    - URL that provided live data, or catalog's scrape_url
    """
    print(f"[SchemeScr] Looking up: '{scheme_name}'")

    # 1. Catalog lookup -------------------------------------------------------
    catalog = _catalog_lookup(scheme_name)
    documents    = catalog.get("documents")    if catalog else None
    how_to_apply = catalog.get("how_to_apply") if catalog else None
    # Curated deadline note from catalog (used as fallback)
    catalog_deadline = catalog.get("deadline") if catalog else None

    if catalog:
        print(f"[SchemeScr] Catalog match -> {catalog.get('full_name', scheme_name)}")
    else:
        print(f"[SchemeScr] No catalog match for '{scheme_name}'")

    # 2. Live scrape: status + specific date ----------------------------------
    scraped_status, scraped_date = _scrape_status_and_deadline(official_link, catalog)

    # 3. Resolve status -------------------------------------------------------
    if scraped_status != "unknown":
        status = scraped_status
    elif catalog:
        # Known central scheme => treat as active unless proven closed
        status = "active"
        print(f"[SchemeScr] Defaulting to 'active' for known scheme")
    else:
        status = "unknown"

    # 4. Resolve deadline -----------------------------------------------------
    # Prefer a live specific date; fall back to the curated note
    deadline = scraped_date if scraped_date else catalog_deadline

    # 5. Source URL -----------------------------------------------------------
    source_url = official_link
    if not source_url and catalog and catalog.get("scrape_url"):
        source_url = catalog["scrape_url"]

    return {
        "status":       status,
        "deadline":     deadline,
        "documents":    documents,
        "how_to_apply": how_to_apply,
        "source_url":   source_url,
    }
