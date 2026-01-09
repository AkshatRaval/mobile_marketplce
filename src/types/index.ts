export interface Product {
  id: string;
  userId: string;
  dealerId?: string;
  ownerId?: string;
  name: string;
  price: string | number;
  description: string;
  images: string[];
  image?: string;
  dealerName: string;
  dealerPhoto?: string | null;
  dealerAvatar?: string;
  dealerPhone?: string;
  city: string;
  createdAt: number;
  extractedData?: ExtractedData;
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
  [key: string]: any;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  shopName: string;
  photoURL?: string;
  phoneNumber?: string;
  phone?: string;
  mobile?: string;
  city?: string;
  privacy: "everyone" | "connections" | "selected" | "none";
  listings?: ProductListing[];
}

export interface ProductListing {
  id: string;
  name: string;
  price: string;
  image: string;
}