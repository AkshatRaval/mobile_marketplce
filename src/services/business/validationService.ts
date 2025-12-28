// src/services/business/validationService.ts
// Handles ALL form validation logic
// EXTRACTED FROM: upload.tsx lines 97-101 (validation checks)

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validationService = {
  validateProductName: (name: string): ValidationResult => {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: "Product name is required" };
    }

    if (name.trim().length < 3) {
      return { isValid: false, error: "Name must be at least 3 characters" };
    }

    if (name.length > 100) {
      return { isValid: false, error: "Name is too long (max 100 characters)" };
    }

    return { isValid: true };
  },

  /**
   * Validate price
   */
  validatePrice: (price: string): ValidationResult => {
    if (!price || price.trim().length === 0) {
      return { isValid: false, error: "Price is required" };
    }

    const numPrice = parseFloat(price);

    if (isNaN(numPrice)) {
      return { isValid: false, error: "Price must be a valid number" };
    }

    if (numPrice <= 0) {
      return { isValid: false, error: "Price must be greater than 0" };
    }

    if (numPrice > 10000000) {
      return { isValid: false, error: "Price seems unreasonably high" };
    }

    return { isValid: true };
  },

  validateDescription: (description: string): ValidationResult => {
    if (!description || description.trim().length === 0) {
      return { isValid: false, error: "Description is required" };
    }

    if (description.trim().length < 10) {
      return { isValid: false, error: "Description too short (min 10 characters)" };
    }

    if (description.length > 100) {
      return { isValid: false, error: "Description too long (max 100 characters)" };
    }

    return { isValid: true };
  },

  /**
   * Validate images array
   */
  validateImages: (images: string[]): ValidationResult => {
    if (!images || images.length === 0) {
      return { isValid: false, error: "At least one image is required" };
    }

    if (images.length > 4) {
      return { isValid: false, error: "Maximum 4 images allowed" };
    }

    return { isValid: true };
  },

  validateProductForm: (data: {
    name: string;
    price: string;
    description: string;
    images: string[];
  }): ValidationResult => {
    // Check name
    const nameCheck = validationService.validateProductName(data.name);
    if (!nameCheck.isValid) return nameCheck;

    // Check price
    const priceCheck = validationService.validatePrice(data.price);
    if (!priceCheck.isValid) return priceCheck;

    // Check description
    const descCheck = validationService.validateDescription(data.description);
    if (!descCheck.isValid) return descCheck;

    // Check images
    const imagesCheck = validationService.validateImages(data.images);
    if (!imagesCheck.isValid) return imagesCheck;

    return { isValid: true };
  },

  /**
   * Validate request title
   */
  validateRequestTitle: (title: string): ValidationResult => {
    if (!title || title.trim().length === 0) {
      return { isValid: false, error: "Product model is required" };
    }

    if (title.trim().length < 5) {
      return { isValid: false, error: "Please be more specific" };
    }

    return { isValid: true };
  },

  /**
   * Validate budget
   */
  validateBudget: (budget: string): ValidationResult => {
    if (!budget || budget.trim().length === 0) {
      return { isValid: false, error: "Budget is required" };
    }

    const numBudget = parseFloat(budget);

    if (isNaN(numBudget)) {
      return { isValid: false, error: "Budget must be a number" };
    }

    if (numBudget <= 0) {
      return { isValid: false, error: "Budget must be greater than 0" };
    }

    return { isValid: true };
  },

  validateRequestForm: (data: {
    title: string;
    budget: string;
  }): ValidationResult => {
    const titleCheck = validationService.validateRequestTitle(data.title);
    if (!titleCheck.isValid) return titleCheck;

    const budgetCheck = validationService.validateBudget(data.budget);
    if (!budgetCheck.isValid) return budgetCheck;

    return { isValid: true };
  },
};

export const signupValidation = {
  validateEmail: (email: string): { valid: boolean; error?: string } => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return { valid: false, error: "Email is required" };
    if (!trimmed.endsWith("@gmail.com")) {
      return { valid: false, error: "Please use a valid @gmail.com address" };
    }
    return { valid: true };
  },

  validatePhone: (phone: string): { valid: boolean; error?: string; cleaned?: string } => {
    const cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.length !== 10) {
      return { valid: false, error: "Phone number must be exactly 10 digits" };
    }
    return { valid: true, cleaned };
  },

  validateRequired: (fields: Record<string, string>): { valid: boolean; error?: string } => {
    for (const [key, value] of Object.entries(fields)) {
      if (!value || !value.trim()) {
        return { valid: false, error: "Please fill in all the details" };
      }
    }
    return { valid: true };
  },
};
