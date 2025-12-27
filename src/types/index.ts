export interface Product {
  id: string;
  userId?: string;
  dealerId?: string;
  ownerId?: string;
  postedBy?: string;
  createdBy?: string;
  name: string;
  price: string;
  images: string[];
  extractedData?: ExtractedData;
  image?: string;
  description: string;
  dealerName: string;
  dealerAvatar?: string;
  dealerPhone?: string;
  city: string;
  createdAt: number;
}

export interface MarketRequest {
  id: string;
  title: string;
  budget: string;
  description: string;
  dealerName: string;
  dealerId: string;
  createdAt: number;
  status: "open" | "fulfilled";
}

export interface ExtractedData {
  brand?: string;
  model?: string;
  ramGb?: number;
  storageGb?: number;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

export interface UserProfile {
  uid: string; // ✅ FIXED: Added uid field
  displayName: string;
  email?: string;
  photoURL?: string;
  phoneNumber?: string;
  phone?: string;
  mobile?: string;
  city?: string;
  requestReceived?: string[];
  connections?: string[];
  listings?: ProductListing[];
}

export interface ProductListing {
  id: string;
  name: string;
  price: string;
  image: string;
}