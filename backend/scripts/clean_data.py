import os
import re
import json
import pdfplumber

RAW_DIR = "data/raw/pdf_knowledge"
CLEAN_DIR = "data/cleaned"

os.makedirs(CLEAN_DIR, exist_ok=True)

# --- Minimum characters for a page to be considered useful ---
MIN_PAGE_CHARS = 50


def clean_text(text):
    """Clean OCR artifacts and normalise whitespace."""
    text = text.strip()
    # Collapse multiple whitespace (including newlines) to single space
    text = re.sub(r'\s+', ' ', text)
    # Remove stray single characters separated by spaces (OCR noise like "s 4 L T 60")
    text = re.sub(r'(?<!\w)\b[a-zA-Z0-9]\b(?!\w)', '', text)
    # Collapse any whitespace that appeared after removing stray chars
    text = re.sub(r'\s{2,}', ' ', text)
    return text.strip()


def extract_from_pdf(pdf_path, category):
    """Extract full-page text from every page of a PDF with metadata."""
    entries = []
    filename = os.path.basename(pdf_path)

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text()
                if not text or len(text.strip()) < MIN_PAGE_CHARS:
                    continue

                cleaned = clean_text(text)
                if len(cleaned) < MIN_PAGE_CHARS:
                    continue

                entries.append({
                    "text": cleaned,
                    "source": filename,
                    "category": category,
                    "page": page_num,
                })
    except Exception as e:
        print(f"  ERROR processing {filename}: {e}")

    return entries


def process_all_pdfs():
    """Walk all sub-folders inside RAW_DIR and extract text from every PDF."""
    total_entries = 0

    for root, dirs, files in os.walk(RAW_DIR):
        # Derive category from the immediate sub-folder name
        rel = os.path.relpath(root, RAW_DIR)
        category = rel.split(os.sep)[0] if rel != '.' else 'general'

        for filename in sorted(files):
            if not filename.lower().endswith(".pdf"):
                continue

            pdf_path = os.path.join(root, filename)
            print(f"Processing [{category}] {filename} ...")

            entries = extract_from_pdf(pdf_path, category)

            # Save to JSON – one file per PDF
            out_name = filename.rsplit('.', 1)[0] + '.json'
            output_path = os.path.join(CLEAN_DIR, out_name)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(entries, f, ensure_ascii=False, indent=2)

            print(f"  -> {len(entries)} pages saved to {out_name}")
            total_entries += len(entries)

    print(f"\nDone. Total pages extracted: {total_entries}")


if __name__ == "__main__":
    process_all_pdfs()
