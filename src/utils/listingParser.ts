// src/utils/listingParser.ts

const levenshtein = (s: string, t: string) => {
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    const arr: number[][] = [];
    for (let i = 0; i <= t.length; i++) {
        arr[i] = [i];
        for (let j = 1; j <= s.length; j++) {
            arr[i][j] = i === 0
                ? j
                : Math.min(arr[i - 1][j] + 1, arr[i][j - 1] + 1, arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1));
        }
    }
    return arr[t.length][s.length];
};

const getCloseMatch = (word: string, possibilities: string[], cutoff = 0.6) => {
    let bestWord = null, bestRatio = 0;
    for (const option of possibilities) {
        const distance = levenshtein(word, option);
        const maxLen = Math.max(word.length, option.length);
        if (maxLen === 0) continue;
        const ratio = 1 - distance / maxLen;
        if (ratio >= cutoff && ratio > bestRatio) { bestRatio = ratio; bestWord = option; }
    }
    return bestWord;
};

export const commonRam = new Set([3, 4, 6, 8, 12, 16, 18, 24]);
export const commonStorage = new Set([32, 64, 128, 256, 512, 1024]);

export function parseListingText(rawText: string, knowledgeBase: any) {
    if (!knowledgeBase) knowledgeBase = { brands: {}, models: [], corrections: {} };
    if (!knowledgeBase.brands) knowledgeBase.brands = {};
    if (!knowledgeBase.models) knowledgeBase.models = [];
    if (!knowledgeBase.corrections) knowledgeBase.corrections = {};

    const key = rawText.trim().toLowerCase();
    if (knowledgeBase.corrections[key]) return knowledgeBase.corrections[key];

    const clean = rawText.replace(/([\/%])/g, ' $1 ').trim();
    const words = clean.split(/\s+/);
    const upper = clean.toUpperCase();

    // Brand
    let brand = "Unknown";
    if (words.length > 0) {
        const firstUp = words[0].toUpperCase();
        if (knowledgeBase.brands[firstUp]) {
            brand = knowledgeBase.brands[firstUp];
        } else {
            const match = getCloseMatch(firstUp, Object.keys(knowledgeBase.brands), 0.7);
            brand = match ? knowledgeBase.brands[match] : words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
        }
    }

    // Model
    const modelTokens: string[] = [];
    for (let i = 0; i < words.slice(1).length; i++) {
        const w = words[i + 1];
        const wUp = w.toUpperCase();
        if (wUp.includes("GB") || wUp.includes("%") || /\d+\/\d+/.test(w)) break;
        if (/^\d+$/.test(w)) {
            const val = parseInt(w);
            if (val > 50) break;
            if (i + 2 < words.length) {
                const nextW = words[i + 2];
                if (/^\d+$/.test(nextW) && commonStorage.has(parseInt(nextW)) && commonRam.has(val)) break;
                if (["GB", "RAM", "/", "TB"].includes(nextW.toUpperCase())) break;
            }
        }
        modelTokens.push(w);
    }
    let model = modelTokens.join(" ");
    if (knowledgeBase.models?.length > 0) {
        model = model.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        const match = getCloseMatch(model, knowledgeBase.models, 0.6);
        if (match) model = match;
    }

    // RAM / Storage
    let ram: number | null = null, storage: number | null = null;

    // Slash match: 8/128, 8 / 128, 8-128, 8|128, 8+128
    const slashMatch = upper.match(/(\d{1,2})\s*[\/\|\-\+]\s*(\d{2,4})/);
    const gbsMatches = [...upper.matchAll(/(\d+)\s*GB/g)].map(m => parseInt(m[1]));
    const gbs = gbsMatches.sort((a, b) => b - a);

    // looseNums matches lone numbers like "8", "128"
    const looseNums = [...upper.matchAll(/\b(\d+)\b/g)].map(m => parseInt(m[1]));

    if (slashMatch) {
        // e.g. "8/128"
        const v1 = parseInt(slashMatch[1]), v2 = parseInt(slashMatch[2]);
        if (v1 < v2) { ram = v1; storage = v2; } else { ram = v2; storage = v1; }
    } else {
        // Did we find GB suffixes?
        if (gbs.length >= 2) {
            storage = gbs[0];
            ram = gbs[1];
        } else if (gbs.length === 1) {
            const val = gbs[0];
            if (val > 18) {
                storage = val;
                // If storage found, look for RAM in loose numbers
                const possibleRams = looseNums.filter(n => commonRam.has(n));
                if (possibleRams.length > 0) ram = possibleRams[0];
            } else {
                ram = val;
                // If RAM found, look for Storage in loose numbers
                const possibleStorages = looseNums.filter(n => commonStorage.has(n));
                if (possibleStorages.length > 0) storage = possibleStorages[0];
            }
        }

        // No explicit GB suffixes found or slash found, rely on loose numbers
        if (!ram && !storage) {
            // "8 128" or "12 256"
            for (let i = 0; i < looseNums.length - 1; i++) {
                const n1 = looseNums[i], n2 = looseNums[i + 1];
                if (commonRam.has(n1) && commonStorage.has(n2)) { ram = n1; storage = n2; break; }
                if (commonRam.has(n2) && commonStorage.has(n1)) { ram = n2; storage = n1; break; }
            }
        }

        // Ultimate fallback: Just grab any single matching common values from looseNums
        if (!ram) {
            const possibleRams = looseNums.filter(n => commonRam.has(n));
            if (possibleRams.length > 0) ram = possibleRams[0];
        }
        if (!storage) {
            const possibleStorages = looseNums.filter(n => commonStorage.has(n));
            if (possibleStorages.length > 0) storage = possibleStorages[0];
        }
    }

    // Battery / Condition
    let battery: number | null = null, condition: number | null = null;
    const battMatch = upper.match(/(\d{2,3})\s?%\s?(?:BAT|HEALTH|🔋)/);
    if (battMatch) battery = parseInt(battMatch[1]);
    const condMatch = upper.match(/(\d{2,3})\s?%\s?(?:COND|KIT)/);
    if (condMatch) condition = parseInt(condMatch[1]);
    if (!battery && !condition) {
        const percents = [...upper.matchAll(/(\d{2,3})\s?%/g)].map(m => parseInt(m[1]));
        for (const p of percents) {
            if (p === 100 && !condition) condition = 100;
            else if (p < 100 && !battery) battery = p;
        }
    }

    // Price
    let priceText = upper;
    if (ram) priceText = priceText.replace(String(ram), "");
    if (storage) priceText = priceText.replace(String(storage), "");
    const priceNums = [...priceText.matchAll(/\b\d{4,7}\b/g)].map(m => parseInt(m[1]));
    const price = priceNums.length > 0 ? Math.max(...priceNums) : null;

    return { raw_text: rawText, brand, model, ram_gb: ram, storage_gb: storage, battery_percent: battery, condition_percent: condition, price };
}
