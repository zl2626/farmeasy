from ddgs import DDGS
import requests
from bs4 import BeautifulSoup
import urllib3
from urllib.parse import urljoin, quote

urllib3.disable_warnings()

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
})


def find_crop_url(crop_name):
    query = f"{crop_name} crop cultivation farming information"

    with DDGS() as ddgs:
        results = list(ddgs.text(query, max_results=10))

        for result in results:
            url = result.get("href", "")
            # Prefer agricultural / educational sites
            if any(domain in url for domain in [
                "agri", "farm", "crop", "krishna", "gov.in",
                "edu", "agropedia", "ikisan", "vikaspedia"
            ]):
                print("[FarmEasy] Found preferred URL:", url)
                return url

        # Fallback: first result
        for result in results:
            url = result.get("href")
            if url:
                print("[FarmEasy] Fallback URL:", url)
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


def get_crop_image_url(crop_name):
    """
    Returns a reliable, crop-specific image URL using the Unsplash Source API.
    No API key required. Always returns a real, relevant photo.
    The URL redirects to a featured Unsplash photo matching the search query.
    """
    encoded = quote(f"{crop_name} crop farm agriculture field")
    return f"https://source.unsplash.com/featured/600x400/?{encoded}"


def scrape_crop_info(crop_name):
    url = find_crop_url(crop_name)

    if not url:
        return None

    try:
        response = session.get(url, verify=False, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print("[FarmEasy] Request failed:", e)
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

    # Use Unsplash for a guaranteed, crop-specific image.
    # Scraping random websites yields icons, logos, or broken URLs —
    # Unsplash always returns a proper high-quality relevant photo.
    image_url = get_crop_image_url(crop_name)

    result = {
        "name": crop_name,
        "scientific_name": extract_section(text_list, "scientific"),
        "soil":            extract_section(text_list, "soil"),
        "climate":         extract_section(text_list, "climate"),
        "season":          extract_section(text_list, "season"),
        "water":           extract_section(text_list, "water"),
        "image":           image_url,
        "source":          url,
        "scraped":         True,
    }

    # Remove None fields so frontend conditionals (crop.soil && ...) work correctly
    result = {k: v for k, v in result.items() if v is not None}
    # Always keep these regardless
    result["name"]   = crop_name
    result["source"] = url
    result["image"]  = image_url
    result["scraped"] = True

    return result
