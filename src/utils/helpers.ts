// src/utils/helpers.ts
// General utility functions - Backend Agnostic
// EXTRACTED FROM: profile.tsx lines 34-43

/**
 * Get main image from product
 */
export const getMainImage = (item: any): string | null => {
  // Check images array first
  if (item.images && item.images.length > 0) {
    return item.images[0];
  }
  
  // Fallback to single image field
  if (item.image) {
    return item.image;
  }
  
  // No image found
  return null;
};

/**
 * Get word count from text
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
 * Format price with currency (Indian Rupee)
 */
export const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  // Handle NaN if price is invalid
  if (isNaN(numPrice)) return "₹0";
  return `₹${numPrice.toLocaleString("en-IN")}`;
};

/**
 * Check if image URL is valid
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("file://") ||
    url.startsWith("content://")
  );
};