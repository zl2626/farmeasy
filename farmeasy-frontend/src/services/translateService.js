// Translation cache: key = "from|to|text" → translated string
const cache = new Map();

// In-flight deduplication: key = "from|to|text" → Promise
const pending = new Map();

// Batch queue: collects requests and sends them together
let batchQueue = [];
let batchTimer = null;
const BATCH_DELAY = 50; // ms to wait before flushing

function cacheKey(text, from, to) {
    return `${from}|${to}|${text}`;
}

function flushBatch() {
    const queue = batchQueue;
    batchQueue = [];
    batchTimer = null;

    if (queue.length === 0) return;

    // Group by language pair (should usually be the same pair)
    const groups = {};
    for (const item of queue) {
        const pairKey = `${item.from}|${item.to}`;
        if (!groups[pairKey]) groups[pairKey] = [];
        groups[pairKey].push(item);
    }

    for (const [, items] of Object.entries(groups)) {
        const { from, to } = items[0];
        const texts = items.map((i) => i.text);

        const promise = fetch("http://localhost:8000/api/translate/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: texts.join("\n||||\n"),
                source_lang: from,
                target_lang: to,
            }),
        })
            .then((r) => r.json())
            .then((data) => {
                const results = data.translatedText.split("\n||||\n");
                items.forEach((item, idx) => {
                    const translated = (results[idx] || item.text).trim();
                    const key = cacheKey(item.text, from, to);
                    cache.set(key, translated);
                    pending.delete(key);
                    item.resolve(translated);
                });
            })
            .catch(() => {
                items.forEach((item) => {
                    const key = cacheKey(item.text, item.from, item.to);
                    pending.delete(key);
                    item.resolve(item.text); // fallback to original
                });
            });

        // Store pending promise for deduplication
        items.forEach((item) => {
            pending.set(cacheKey(item.text, from, to), promise);
        });
    }
}

export async function translateText(text, from, to) {
    // Same language — no translation needed
    if (from === to) return text;

    const key = cacheKey(text, from, to);

    // 1. Return from cache instantly
    if (cache.has(key)) return cache.get(key);

    // 2. Reuse in-flight request
    if (pending.has(key)) {
        await pending.get(key);
        return cache.get(key) || text;
    }

    // 3. Add to batch queue
    return new Promise((resolve) => {
        batchQueue.push({ text, from, to, resolve });

        if (!batchTimer) {
            batchTimer = setTimeout(flushBatch, BATCH_DELAY);
        }
    });
}