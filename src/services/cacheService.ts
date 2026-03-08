// src/services/cacheService.ts
// Lightweight AsyncStorage caching with TTL support

import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "cache_";

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // TTL in milliseconds
}

export const cacheService = {
    /**
     * Store data in cache with a TTL (time-to-live)
     * @param key - Cache key
     * @param data - Data to cache
     * @param ttlMinutes - Time-to-live in minutes (default: 5)
     */
    set: async <T>(key: string, data: T, ttlMinutes: number = 5): Promise<void> => {
        try {
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                ttl: ttlMinutes * 60 * 1000,
            };
            await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
        } catch (e) {
            // Fail silently — cache is non-critical
        }
    },

    /**
     * Get data from cache (returns null if expired or missing)
     * @param key - Cache key
     */
    get: async <T>(key: string): Promise<T | null> => {
        try {
            const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
            if (!raw) return null;

            const entry: CacheEntry<T> = JSON.parse(raw);
            const age = Date.now() - entry.timestamp;

            // Check if expired
            if (age > entry.ttl) {
                // Expired — clean up and return null
                await AsyncStorage.removeItem(CACHE_PREFIX + key);
                return null;
            }

            return entry.data;
        } catch (e) {
            return null;
        }
    },

    /**
     * Remove a specific cache entry
     */
    remove: async (key: string): Promise<void> => {
        try {
            await AsyncStorage.removeItem(CACHE_PREFIX + key);
        } catch (e) {
            // Fail silently
        }
    },

    /**
     * Clear all cache entries
     */
    clearAll: async (): Promise<void> => {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
            if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
            }
        } catch (e) {
            // Fail silently
        }
    },
};
