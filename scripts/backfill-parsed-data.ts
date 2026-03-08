// @ts-nocheck — This is a Deno Edge Function. Deno globals (Deno.serve, Deno.env) are not known to the Node.js TS compiler.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ==========================================
// BACKFILL EDGE FUNCTION
// Deploy as: "backfill-parsed-data"
// 
// POST /backfill-parsed-data
// Fetches all products that don't have parsed_brand yet,
// runs them through the listing-parser/extract logic,
// and saves the results back to the product rows.
// ==========================================

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

const commonRam = new Set([4, 6, 8, 12, 16, 18, 24]);
const commonStorage = new Set([32, 64, 128, 256, 512, 1024]);

function parseListingText(rawText: string, knowledgeBase: any) {
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
    const slashMatch = upper.match(/(\d{1,2})\s?[\/]\s?(\d{2,4})/);
    const gbsMatches = [...upper.matchAll(/(\d+)\s?GB/g)].map(m => parseInt(m[1]));
    const gbs = gbsMatches.sort((a, b) => b - a);
    const looseNums = [...upper.matchAll(/\b(\d+)\b/g)].map(m => parseInt(m[1]));
    if (slashMatch) {
        const v1 = parseInt(slashMatch[1]), v2 = parseInt(slashMatch[2]);
        if (v1 < v2) { ram = v1; storage = v2; } else { ram = v2; storage = v1; }
    } else if (gbs.length > 0) {
        storage = gbs[0]; if (gbs.length > 1) ram = gbs[1];
    } else {
        for (let i = 0; i < looseNums.length - 1; i++) {
            const n1 = looseNums[i], n2 = looseNums[i + 1];
            if (commonRam.has(n1) && commonStorage.has(n2)) { ram = n1; storage = n2; break; }
            if (commonRam.has(n2) && commonStorage.has(n1)) { ram = n2; storage = n1; break; }
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

Deno.serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
        if (req.method !== 'POST') {
            return new Response("Method not allowed", { status: 405 });
        }

        // Parse body for optional batch_size param
        let batchSize = 100;
        try {
            const body = await req.json();
            if (body?.batch_size) batchSize = Number(body.batch_size);
        } catch (_) { /* no body is fine */ }

        // Load knowledge base
        const { data: dbData } = await supabase.from('extractor_knowledge').select('*');
        const knowledgeBase: any = { brands: {}, models: [], corrections: {} };
        if (dbData) {
            dbData.forEach((row: any) => {
                if (row.category === 'brand') knowledgeBase.brands[row.key_text] = row.value_data;
                if (row.category === 'model') knowledgeBase.models.push(row.value_data);
                if (row.category === 'correction') knowledgeBase.corrections[row.key_text] = row.value_data;
            });
        }

        // Fetch products without parsed data (parsed_brand is null)
        const { data: products, error: fetchError } = await supabase
            .from('products')
            .select('id, name')
            .is('parsed_brand', null)
            .limit(batchSize);

        if (fetchError) throw fetchError;
        if (!products || products.length === 0) {
            return new Response(JSON.stringify({ status: "done", processed: 0, message: "All products already parsed" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        let processed = 0, failed = 0;

        for (const product of products) {
            try {
                const parsed = parseListingText(product.name, knowledgeBase);
                const updates: Record<string, any> = {};
                // Always write something so product won't be re-processed on next run
                updates.parsed_brand = (parsed.brand && parsed.brand !== "Unknown") ? parsed.brand : product.name.split(' ')[0];
                if (parsed.model) updates.parsed_model = parsed.model;
                if (parsed.ram_gb != null) updates.parsed_ram_gb = parsed.ram_gb;
                if (parsed.storage_gb != null) updates.parsed_storage_gb = parsed.storage_gb;
                if (parsed.battery_percent != null) updates.parsed_battery_percent = parsed.battery_percent;
                if (parsed.condition_percent != null) updates.parsed_condition_percent = parsed.condition_percent;
                if (parsed.price != null) updates.parsed_price = parsed.price;

                const { error: updateError } = await supabase
                    .from('products')
                    .update(updates)
                    .eq('id', product.id);

                if (updateError) { failed++; } else { processed++; }
            } catch (_) { failed++; }
        }

        return new Response(JSON.stringify({
            status: "done",
            processed,
            failed,
            total_fetched: products.length,
            message: `Processed ${processed}/${products.length} products. Run again if more remain.`
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
