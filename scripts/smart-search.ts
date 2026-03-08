// @ts-nocheck — This is a Deno Edge Function. Deno globals (Deno.serve, Deno.env) are not known to the Node.js TS compiler.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAGE_SIZE = 20;

Deno.serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // CORS headers for Expo/mobile
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (req.method !== 'POST') {
            return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
        }

        const { query, tab = 'products', page = 0 } = await req.json();

        if (!query || typeof query !== 'string' || !query.trim()) {
            return new Response(JSON.stringify({ error: "query is required" }), { status: 400, headers: corsHeaders });
        }

        const q = query.trim();
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        // ─── PRODUCT SEARCH ──────────────────────────────────
        if (tab === 'products') {
            // Build a multi-column OR ilike filter:
            // name, parsed_brand, parsed_model, description
            const orFilter = [
                `name.ilike.%${q}%`,
                `parsed_brand.ilike.%${q}%`,
                `parsed_model.ilike.%${q}%`,
                `description.ilike.%${q}%`,
            ].join(',');

            const { data, error } = await supabase
                .from('products')
                .select(`
          id, name, price, description, images, user_id, created_at,
          parsed_brand, parsed_model, parsed_ram_gb, parsed_storage_gb,
          profiles (
            id, display_name, shop_name, city, photo_url, phone
          )
        `)
                .or(orFilter)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const products = (data || []).map((doc: any) => {
                const profile = doc.profiles || {};
                return {
                    id: doc.id,
                    userId: doc.user_id,
                    dealerId: profile.id,
                    dealerName: profile.display_name || profile.shop_name || 'Dealer',
                    dealerAvatar: profile.photo_url,
                    dealerPhone: profile.phone,
                    city: profile.city || '',
                    name: doc.name,
                    price: doc.price,
                    description: doc.description,
                    images: doc.images || [],
                    image: doc.images?.[0] || null,
                    createdAt: new Date(doc.created_at).getTime(),
                    extractedData: doc.parsed_brand ? {
                        brand: doc.parsed_brand,
                        model: doc.parsed_model,
                        ramGb: doc.parsed_ram_gb,
                        storageGb: doc.parsed_storage_gb,
                    } : undefined,
                };
            });

            return new Response(JSON.stringify({
                tab: 'products',
                products,
                hasMore: (data || []).length === PAGE_SIZE,
                page,
            }), { headers: corsHeaders });
        }

        // ─── SHOP SEARCH ──────────────────────────────────────
        if (tab === 'shops') {
            const orFilter = [
                `shop_name.ilike.%${q}%`,
                `display_name.ilike.%${q}%`,
                `city.ilike.%${q}%`,
            ].join(',');

            const { data, error } = await supabase
                .from('profiles')
                .select('id, display_name, shop_name, photo_url, city')
                .or(orFilter)
                .order('shop_name', { ascending: true })
                .range(from, to);

            if (error) throw error;

            const shops = (data || []).map((row: any) => ({
                id: row.id,
                shopName: row.shop_name || '',
                displayName: row.display_name || '',
                photoUrl: row.photo_url || null,
                city: row.city || '',
            }));

            return new Response(JSON.stringify({
                tab: 'shops',
                shops,
                hasMore: (data || []).length === PAGE_SIZE,
                page,
            }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ error: 'Invalid tab. Use "products" or "shops"' }), {
            status: 400,
            headers: corsHeaders,
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: corsHeaders,
        });
    }
});
