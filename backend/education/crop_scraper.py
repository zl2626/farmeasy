from ddgs import DDGS
import requests
from bs4 import BeautifulSoup
import logging

from rag.web_search import _is_allowed_url

logger = logging.getLogger(__name__)

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
})


def find_crop_url(crop_name):
    query = f"{crop_name} 栽培技术 农业农村部 农科院"

    with DDGS() as ddgs:
        results = list(ddgs.text(query, max_results=10))

        for result in results:
            url = result.get("href", "")
            if _is_allowed_url(url):
                return url

    return None


def extract_section(text_list, keyword):
    """
    Find the paragraph/sentence in text_list that contains the keyword
    and return meaningful content. Prefers longer text items that are
    proper sentences, not just headings.
    """
    for i, text in enumerate(text_list):
        if keyword.lower() in text.lower():
            # If the matching text itself is a good sentence (>60 chars), return it
            if len(text) > 60:
                return text
            # Otherwise look at the next few items for actual content
            for j in range(i + 1, min(i + 4, len(text_list))):
                candidate = text_list[j]
                if len(candidate) > 40:
                    return candidate
    return None


def scrape_crop_info(crop_name):
    url = find_crop_url(crop_name)

    if not url:
        return None

    try:
        response = session.get(url, timeout=8)
        response.raise_for_status()
    except Exception:
        logger.exception("Crop source request failed")
        return None

    soup = BeautifulSoup(response.text, "html.parser")

    # Remove nav/footer/script noise before extracting text
    for tag in soup(["nav", "footer", "script", "style", "header"]):
        tag.decompose()

    paragraphs = soup.find_all(["p", "li", "dd"])

    text_list = [
        p.get_text(separator=" ", strip=True)
        for p in paragraphs
        if len(p.get_text(strip=True)) > 40
    ]

    result = {
        "name": crop_name,
        "scientific_name": extract_section(text_list, "scientific"),
        "soil":            extract_section(text_list, "soil"),
        "climate":         extract_section(text_list, "climate"),
        "season":          extract_section(text_list, "season"),
        "water":           extract_section(text_list, "water"),
        "source":          url,
        "source_status":   "WEB_SUPPLEMENTED",
        "image_status":    "unverified",
        "scraped":         True,
    }

    # Remove None fields so frontend conditionals (crop.soil && ...) work correctly
    result = {k: v for k, v in result.items() if v is not None}
    # Always keep these regardless
    result["name"]   = crop_name
    result["source"] = url
    result["image"] = None
    result["image_status"] = "unverified"
    result["scraped"] = True

    return result
