"""
Web search fallback for image analysis.

When the local vector store has low relevance for an image analysis query,
this module scrapes agricultural websites for supplementary context.
Uses Google search to find relevant pages, then extracts clean text.
"""
import requests
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

# Trusted agricultural domains to prioritize
AGRI_DOMAINS = [
    "en.wikipedia.org",
    "simple.wikipedia.org",
    "plantvillage.psu.edu",
    "extension.org",
    "icar.org.in",
    "agrifarming.in",
    "krishisewa.com",
    "farmer.gov.in",
    "vikaspedia.in",
    "agriculture.com",
    "gardeningknowhow.com",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}

# Maximum characters of web context to return
MAX_CONTEXT_CHARS = 3000
# Request timeout in seconds
TIMEOUT = 8


def _extract_text(html):
    """Extract clean readable text from HTML, ignoring nav/footer/script."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove non-content elements
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form", "iframe"]):
        tag.decompose()

    # Get text content
    text = soup.get_text(separator="\n", strip=True)

    # Clean up excessive whitespace
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)


def _google_search_urls(query, num_results=3):
    """
    Search Google and return top result URLs.
    Appends 'agriculture plant disease treatment' to bias results.
    """
    search_query = f"{query} agriculture farming"
    params = {
        "q": search_query,
        "num": num_results,
        "hl": "en",
    }

    try:
        resp = requests.get(
            "https://www.google.com/search",
            params=params,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.warning(f"Google search failed: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    urls = []

    # Extract result URLs from Google's HTML
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        if href.startswith("/url?q="):
            url = href.split("/url?q=")[1].split("&")[0]
            # Skip Google's own pages and non-http URLs
            if url.startswith("http") and "google.com" not in url:
                urls.append(url)
                if len(urls) >= num_results:
                    break

    return urls


def _scrape_page(url):
    """Scrape a single page and return extracted text (truncated)."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        text = _extract_text(resp.text)
        # Return a reasonable chunk
        return text[:3000] if text else ""
    except Exception as e:
        logger.warning(f"Failed to scrape {url}: {e}")
        return ""


def web_search(query):
    """
    Search the web for agricultural information and return clean text context.

    Args:
        query: Search query (e.g. "tulip botrytis blight cure")

    Returns:
        str: Cleaned text from top search results (max ~2000 chars),
             or empty string on failure.
    """
    if not query or not query.strip():
        return ""

    try:
        urls = _google_search_urls(query, num_results=3)
        if not urls:
            return ""

        combined_text = []
        total_chars = 0

        for url in urls:
            page_text = _scrape_page(url)
            if not page_text:
                continue

            # Add source attribution
            snippet = f"[Source: {url}]\n{page_text}"
            combined_text.append(snippet)
            total_chars += len(snippet)

            if total_chars >= MAX_CONTEXT_CHARS:
                break

        result = "\n\n---\n\n".join(combined_text)
        return result[:MAX_CONTEXT_CHARS] if result else ""

    except Exception as e:
        logger.warning(f"Web search failed for query '{query}': {e}")
        return ""
