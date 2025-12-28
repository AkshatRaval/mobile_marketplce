// src/utils/helpers.ts
// General utility functions
// EXTRACTED FROM: profile.tsx lines 34-43

/**
 * Get main image from product
 * EXTRACTED FROM: profile.tsx getMainImage function (lines 37-43)
 * 
 * LINE 38: if (item.images && item.images.length > 0) return item.images[0];
 * LINE 39: if (item.image) return item.image;
 * LINE 40: return null;
 */
export const getMainImage = (item: any): string | null => {
  // LINE 38: Check images array first
  if (item.images && item.images.length > 0) {
    return item.images[0];
  }
  
  // LINE 39: Fallback to single image field
  if (item.image) {
    return item.image;
  }
  
  // LINE 40: No image found
  return null;
};

/**
 * Get word count from text
 * Used in various validation scenarios
 */
export const getWordCount = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Truncate text to specific length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

/**
 * Format price with currency
 */
export const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return `₹${numPrice.toLocaleString("en-IN")}`;
};

/**
 * Check if image URL is valid
 */
export const isValidImageUrl = (url: string): boolean => {
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("file://") ||
    url.startsWith("content://")
  );
};