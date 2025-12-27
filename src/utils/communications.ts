// src/utils/communications.ts
// Handles ALL communication utilities (WhatsApp, calls, SMS)
// INCLUDES: WhatsApp with Firebase phone fetch from home.tsx (lines 119-155)

import { userApi } from "@/src/services/api/userApi";
import { Alert, Linking } from "react-native";

export const communications = {
  /**
   * Open WhatsApp with user's phone from Firebase
   * EXTRACTED FROM: home.tsx openWhatsApp function (lines 119-155)
   * 
   * This version fetches phone number from Firebase first
   */
  openWhatsAppForProduct: async (
    dealerId: string,
    productName: string,
    productPrice: string
  ): Promise<void> => {
    if (!dealerId) {
      Alert.alert("Error", "Dealer information is missing.");
      return;
    }

    try {
      console.log("📞 Fetching dealer phone number...");

      // Fetch phone number from Firebase
      const phone = await userApi.getUserPhoneNumber(dealerId);

      if (!phone) {
        Alert.alert("Unavailable", "Dealer has not listed a phone number.");
        return;
      }

      // Open WhatsApp with message
      const msg = `Hi, I'm interested in ${productName} for ₹${productPrice}`;
      const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`;

      await Linking.openURL(url);
      console.log("✅ WhatsApp opened");

    } catch (error) {
      console.error("WhatsApp error:", error);
      
      if (error instanceof Error && error.message.includes("not installed")) {
        Alert.alert("Error", "WhatsApp is not installed on this device.");
      } else {
        Alert.alert("Error", "Could not fetch contact details.");
      }
    }
  },

  /**
   * Open WhatsApp with direct phone number (no Firebase fetch)
   */
  openWhatsApp: (phoneNumber: string, message: string): void => {
    // Remove any non-digit characters from phone number
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    
    const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${cleanPhone}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert(
            "WhatsApp Not Available",
            "Please install WhatsApp to use this feature"
          );
        }
      })
      .catch((error) => {
        console.error("Error opening WhatsApp:", error);
        Alert.alert("Error", "Could not open WhatsApp");
      });
  },

  /**
   * Make a phone call
   */
  makePhoneCall: (phoneNumber: string): void => {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const url = `tel:${cleanPhone}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert("Error", "Phone calls are not supported on this device");
        }
      })
      .catch((error) => {
        console.error("Error making phone call:", error);
        Alert.alert("Error", "Could not initiate phone call");
      });
  },

  /**
   * Send SMS
   */
  sendSMS: (phoneNumber: string, message?: string): void => {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const url = message 
      ? `sms:${cleanPhone}?body=${encodeURIComponent(message)}`
      : `sms:${cleanPhone}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert("Error", "SMS is not supported on this device");
        }
      })
      .catch((error) => {
        console.error("Error sending SMS:", error);
        Alert.alert("Error", "Could not open SMS");
      });
  },

  /**
   * Open email client
   */
  sendEmail: (
    email: string,
    subject?: string,
    body?: string
  ): void => {
    let url = `mailto:${email}`;
    
    const params: string[] = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);
    
    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert("Error", "Email client not available");
        }
      })
      .catch((error) => {
        console.error("Error opening email client:", error);
        Alert.alert("Error", "Could not open email");
      });
  },

  /**
   * Format phone number for display
   */
  formatPhoneNumber: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    
    // Format as (XXX) XXX-XXXX for 10 digit numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Format as +XX XXXXX XXXXX for international
    if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
    
    return phone;
  },

  /**
   * Generate WhatsApp product inquiry message
   */
  generateProductInquiryMessage: (
    productName: string,
    price: string
  ): string => {
    return `Hi, I'm interested in the ${productName} listed for ₹${price}. Is it still available?`;
  },

  /**
   * Generate request fulfillment message
   */
  generateRequestMessage: (
    requestTitle: string,
    dealerName: string
  ): string => {
    return `Hi ${dealerName}, I have the ${requestTitle} you're looking for. Let's discuss!`;
  },
};