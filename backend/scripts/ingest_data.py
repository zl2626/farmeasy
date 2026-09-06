"""
Ingest cleaned JSON data and structured CSV data into the FAISS vector store.

Implements sentence-aware chunking with overlap and metadata tracking.
"""
import os
import sys
import json
import re
import csv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from rag.vector_store import VectorStore

CLEAN_DIR = os.path.join(BASE_DIR, "data", "cleaned")
CSV_DIR = os.path.join(BASE_DIR, "data", "raw", "structured")

# --- Chunking parameters ---
CHUNK_SIZE = 800       # target characters per chunk
CHUNK_OVERLAP = 150    # overlap between consecutive chunks

# --- CSV files to ingest with their row-to-text converters ---
# Only include CSVs that have meaningful textual content for RAG
CSV_CONFIGS = {
    "crop_recommendation.csv": {
        "category": "crop_recommendation",
        "row_to_text": lambda h, r: (
            f"Crop recommendation: For {r[h.index('label')]} crop, "
            f"ideal soil nutrients are N={r[h.index('N')]}, P={r[h.index('P')]}, K={r[h.index('K')]}. "
            f"Best conditions: temperature {float(r[h.index('temperature')]):.1f}°C, "
            f"humidity {float(r[h.index('humidity')]):.1f}%, "
            f"soil pH {float(r[h.index('ph')]):.1f}, "
            f"rainfall {float(r[h.index('rainfall')]):.1f} mm."
        ),
        "group_by": "label",  # Group rows by crop to avoid too many similar chunks
    },
    "fertilizer.csv": {
        "category": "fertilizer_recommendation",
        "row_to_text": lambda h, r: (
            f"Fertilizer recommendation for {r[h.index('Crop')]} on {r[h.index('Soil')]} soil: "
            f"Use {r[h.index('Fertilizer')]}. "
            f"Conditions: temperature {float(r[h.index('Temperature')]):.1f}°C, "
            f"humidity {float(r[h.index('Humidity')]):.1f}%, "
            f"N={r[h.index('Nitrogen')]}, P={r[h.index('Phosphorous')]}, K={r[h.index('Potassium')]}, "
            f"organic carbon {float(r[h.index('Carbon')]):.2f}. "
            f"Remark: {r[h.index('Remark')]}"
        ),
        "group_by": None,
    },
    "adjusted_water_requirements.csv": {
        "category": "water_requirements",
        "row_to_text": lambda h, r: (
            f"Water requirements for {r[0]} crop: "
            f"Low altitude (dry: {r[1]} mm, wet: {r[2]} mm), "
            f"Mid altitude (dry: {r[3]} mm, wet: {r[4]} mm), "
            f"High altitude (dry: {r[5]} mm, wet: {r[6]} mm)."
        ),
        "group_by": None,
    },
    "data_core.csv": {
        "category": "fertilizer_recommendation",
        "row_to_text": lambda h, r: (
            f"Fertilizer recommendation: For {r[h.index('Crop Type')]} on {r[h.index('Soil Type')]} soil "
            f"at temperature {float(r[h.index('Temparature')]):.0f}°C, humidity {float(r[h.index('Humidity')]):.0f}%, "
            f"moisture {float(r[h.index('Moisture')]):.0f}%, "
            f"N={r[h.index('Nitrogen')]}, K={r[h.index('Potassium')]}, P={r[h.index('Phosphorous')]}: "
            f"Use {r[h.index('Fertilizer Name')]}."
        ),
        "group_by": None,
    },
    "soil.csv": {
        "category": "soil_data",
        "row_to_text": lambda h, r: (
            f"Soil nutrient data for {r[h.index('District ')].strip()} district: "
            f"Zinc {r[h.index('Zn %')]}%, Iron {r[h.index('Fe%')]}%, "
            f"Copper {r[h.index('Cu %')]}%, Manganese {r[h.index('Mn %')]}%, "
            f"Boron {r[h.index('B %')]}%, Sulphur {r[h.index('S %')]}%."
        ),
        "group_by": None,
    },
    "state_soil_data.csv": {
        "category": "soil_data",
        "row_to_text": None,  # Will use generic converter
        "group_by": None,
    },
    "crop_yield.csv": {
        "category": "crop_yield",
        "row_to_text": lambda h, r: (
            f"Crop yield data: {r[h.index('crop')]} in {r[h.index('state')]} ({r[h.index('season')].strip()} {r[h.index('year')]}): "
            f"area {r[h.index('area')]} ha, production {r[h.index('production')]}, "
            f"fertilizer used {r[h.index('fertilizer')]}, pesticide {r[h.index('pesticide')]}, "
            f"yield {r[h.index('yield')]}."
        ),
        "group_by": "crop",  # Group by crop to avoid 19K individual chunks
    },
    "irrigation_prediction.csv": {
        "category": "irrigation",
        "row_to_text": lambda h, r: (
            f"Irrigation data: {r[h.index('Crop_Type')]} ({r[h.index('Crop_Growth_Stage')]}) "
            f"on {r[h.index('Soil_Type')]} soil in {r[h.index('Region')]} region, "
            f"{r[h.index('Season')]} season. "
            f"Soil pH {r[h.index('Soil_pH')]}, moisture {r[h.index('Soil_Moisture')]}%, "
            f"temp {r[h.index('Temperature_C')]}°C, rainfall {r[h.index('Rainfall_mm')]} mm, "
            f"humidity {r[h.index('Humidity')]}%. "
            f"Irrigation type: {r[h.index('Irrigation_Type')]}, water source: {r[h.index('Water_Source')]}. "
            f"Mulching: {r[h.index('Mulching_Used')]}. "
            f"Irrigation need: {r[h.index('Irrigation_Need')]}."
        ),
        "group_by": "Crop_Type",  # Group by crop to avoid 10K individual chunks
    },
    "state_weather_data_1997_2020.csv": {
        "category": "weather_data",
        "row_to_text": lambda h, r: (
            f"Weather data for {r[h.index('state')]} ({r[h.index('year')]}): "
            f"average temperature {r[h.index('avg_temp_c')]}°C, "
            f"total rainfall {r[h.index('total_rainfall_mm')]} mm, "
            f"average humidity {r[h.index('avg_humidity_percent')]}%."
        ),
        "group_by": "state",  # Group by state for summary per state
    },
    "Soil data.csv": {
        "category": "soil_data",
        "row_to_text": lambda h, r: (
            f"Soil data for {r[h.index('District')]} district: "
            f"Nitrogen {r[h.index('Nitrogen Value')]}, "
            f"Phosphorous {r[h.index('Phosphorous value')]}, "
            f"Potassium {r[h.index('Potassium value')]}, "
            f"pH {r[h.index('pH')]}."
        ),
        "group_by": "District",  # Group by district
    },
    "dataset1.csv": {
        "category": "soil_data",
        "row_to_text": lambda h, r: (
            f"Soil nutrient analysis: "
            f"N={r[h.index('N')]}, P={r[h.index('P')]}, K={r[h.index('K')]}, "
            f"pH={r[h.index('pH')]}, EC={r[h.index('EC')]}, "
            f"organic carbon={r[h.index('OC')]}, "
            f"S={r[h.index('S')]}, Zn={r[h.index('Zn')]}, Fe={r[h.index('Fe')]}, "
            f"Cu={r[h.index('Cu')]}, Mn={r[h.index('Mn')]}, B={r[h.index('B')]}. "
            f"Soil health output: {r[h.index('Output')]}."
        ),
        "group_by": None,
    },
}

# Maximum rows to read from large CSVs to avoid excessive chunk counts
MAX_CSV_ROWS = 5000


def sentence_split(text):
    """Split text into sentences using common delimiters."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def chunk_text_with_overlap(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """
    Create overlapping chunks that respect sentence boundaries.
    """
    sentences = sentence_split(text)
    if not sentences:
        return [text] if text.strip() else []

    chunks = []
    current_chunk = []
    current_length = 0

    for sentence in sentences:
        sentence_len = len(sentence)

        # If a single sentence exceeds chunk_size, force-split it
        if sentence_len > chunk_size:
            if current_chunk:
                chunks.append(' '.join(current_chunk))
            for i in range(0, sentence_len, chunk_size - overlap):
                chunks.append(sentence[i:i + chunk_size])
            current_chunk = []
            current_length = 0
            continue

        # If adding this sentence would exceed chunk_size, finalise the chunk
        if current_length + sentence_len + 1 > chunk_size and current_chunk:
            chunks.append(' '.join(current_chunk))

            # Build overlap from the tail of the previous chunk
            overlap_chunk = []
            overlap_len = 0
            for s in reversed(current_chunk):
                if overlap_len + len(s) + 1 > overlap:
                    break
                overlap_chunk.insert(0, s)
                overlap_len += len(s) + 1

            current_chunk = overlap_chunk
            current_length = overlap_len

        current_chunk.append(sentence)
        current_length += sentence_len + 1

    if current_chunk:
        chunks.append(' '.join(current_chunk))

    return chunks


def generic_row_to_text(headers, row):
    """Fallback converter: join all columns as 'header: value' pairs."""
    parts = []
    for h, v in zip(headers, row):
        if v and v.strip():
            parts.append(f"{h.strip()}: {v.strip()}")
    return ". ".join(parts) + "."


def load_csv_docs():
    """Load structured CSV files and convert rows to natural language chunks."""
    all_chunks = []
    all_metadata = []

    for csv_file, config in CSV_CONFIGS.items():
        filepath = os.path.join(CSV_DIR, csv_file)
        if not os.path.exists(filepath):
            print(f"  SKIP (not found): {csv_file}")
            continue

        category = config["category"]
        row_to_text = config["row_to_text"] or generic_row_to_text
        group_by = config.get("group_by")

        try:
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                reader = csv.reader(f)
                headers = next(reader)

                if group_by:
                    # Group rows by a key column, then summarise per group
                    group_idx = headers.index(group_by) if group_by in headers else None
                    groups = {}
                    row_count = 0
                    for row in reader:
                        if row_count >= MAX_CSV_ROWS:
                            break
                        row_count += 1
                        if len(row) != len(headers):
                            continue
                        try:
                            text = row_to_text(headers, row)
                        except (ValueError, IndexError):
                            continue
                        key = row[group_idx] if group_idx is not None else "all"
                        groups.setdefault(key, []).append(text)

                    # Create one summary chunk per group
                    for key, texts in groups.items():
                        # Take up to 5 representative rows per group
                        sample = texts[:5]
                        combined = " ".join(sample)
                        chunks = chunk_text_with_overlap(combined)
                        for idx, chunk in enumerate(chunks):
                            all_chunks.append(chunk)
                            all_metadata.append({
                                "source": csv_file,
                                "category": category,
                                "page": 0,
                                "chunk_id": idx,
                            })
                else:
                    # Process each row individually, chunk when they accumulate
                    batch_text = []
                    batch_len = 0
                    row_count = 0

                    for row in reader:
                        if row_count >= MAX_CSV_ROWS:
                            break
                        row_count += 1
                        if len(row) != len(headers):
                            continue
                        try:
                            text = row_to_text(headers, row)
                        except (ValueError, IndexError):
                            continue

                        batch_text.append(text)
                        batch_len += len(text) + 1

                        # When batch is big enough, chunk it
                        if batch_len >= CHUNK_SIZE * 2:
                            combined = " ".join(batch_text)
                            chunks = chunk_text_with_overlap(combined)
                            for idx, chunk in enumerate(chunks):
                                all_chunks.append(chunk)
                                all_metadata.append({
                                    "source": csv_file,
                                    "category": category,
                                    "page": 0,
                                    "chunk_id": idx,
                                })
                            batch_text = []
                            batch_len = 0

                    # Remaining batch
                    if batch_text:
                        combined = " ".join(batch_text)
                        chunks = chunk_text_with_overlap(combined)
                        for idx, chunk in enumerate(chunks):
                            all_chunks.append(chunk)
                            all_metadata.append({
                                "source": csv_file,
                                "category": category,
                                "page": 0,
                                "chunk_id": idx,
                            })

            print(f"  CSV processed: {csv_file} ({row_count} rows)")

        except Exception as e:
            print(f"  ERROR processing {csv_file}: {e}")

    return all_chunks, all_metadata


def load_json_docs():
    """Load all cleaned JSON files and produce (chunk_text, metadata) tuples."""
    all_chunks = []
    all_metadata = []

    for filename in sorted(os.listdir(CLEAN_DIR)):
        if not filename.endswith('.json'):
            continue

        filepath = os.path.join(CLEAN_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                print(f"  SKIP (invalid JSON): {filename}")
                continue

        # Handle both new format (list of dicts with "text") and old format
        if isinstance(data, list):
            for entry in data:
                if isinstance(entry, dict):
                    text = entry.get("text") or entry.get("description", "")
                    source = entry.get("source", filename)
                    category = entry.get("category", "general")
                    page = entry.get("page", 0)
                elif isinstance(entry, str):
                    text = entry
                    source = filename
                    category = "general"
                    page = 0
                else:
                    continue

                if not text or len(text.strip()) < 30:
                    continue

                chunks = chunk_text_with_overlap(text)
                for idx, chunk in enumerate(chunks):
                    all_chunks.append(chunk)
                    all_metadata.append({
                        "source": source,
                        "category": category,
                        "page": page,
                        "chunk_id": idx,
                    })
        elif isinstance(data, str) and len(data.strip()) > 30:
            chunks = chunk_text_with_overlap(data)
            for idx, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                all_metadata.append({
                    "source": filename,
                    "category": "general",
                    "page": 0,
                    "chunk_id": idx,
                })

    return all_chunks, all_metadata


if __name__ == "__main__":
    import time

    start = time.time()

    print("=" * 60)
    print("Loading cleaned JSON documents ...")
    json_docs, json_meta = load_json_docs()
    t1 = time.time()
    print(f"  JSON: {len(json_docs)} chunks in {t1 - start:.1f}s")

    print("\nLoading structured CSV data ...")
    csv_docs, csv_meta = load_csv_docs()
    t2 = time.time()
    print(f"  CSV:  {len(csv_docs)} chunks in {t2 - t1:.1f}s")

    # Combine
    all_docs = json_docs + csv_docs
    all_meta = json_meta + csv_meta
    print(f"\nTotal chunks to index: {len(all_docs)}")

    print("\nBuilding FAISS vector index ...")
    vs = VectorStore()
    vs.build(all_docs, all_meta)
    t3 = time.time()
    print(f"  Index built in {t3 - t2:.1f}s")

    print(f"\n{'=' * 60}")
    print(f"DONE! Total time: {t3 - start:.1f}s")
    print(f"  JSON chunks: {len(json_docs)}")
    print(f"  CSV chunks:  {len(csv_docs)}")
    print(f"  Total:       {len(all_docs)}")