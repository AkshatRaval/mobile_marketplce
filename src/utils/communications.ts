// src/utils/communications.ts

import * as Linking from "expo-linking";
import { Alert, Share } from "react-native";

export const communications = {

  /**
   * Build product URL (your domain)
   */
  getProductUrl: (productId: string) => {
    return `https://godealers.in/p/${productId}`;
  },

  /**
   * SHARE PRODUCT
   * Opens native share sheet
   */
  shareProduct: async (
    productName: string,
    productDetails: string,
    productPrice: string,
    productId: string
  ) => {
    try {

      const productUrl = communications.getProductUrl(productId);

      const message =
        `Hi check out this product on Go Dealers 👀\n\n` +
        `*${productName}*\n` +
        `${productDetails ? productDetails + '\n' : ''}` +
        `💰 ${productPrice}\n\n` +
        `${productUrl}`;

      await Share.share({
        message
      });

    } catch (error: any) {
      Alert.alert("Share Failed", error.message);
    }
  },

  /**
   * ASK DEALER
   * Opens dealer WhatsApp directly
   */
  askDealerForProduct: async (
    dealerPhone: string | undefined | null,
    productName: string,
    productDetails: string,
    productPrice: string,
    productId: string
  ) => {

    if (!dealerPhone) {
      Alert.alert("Error", "Dealer number not available");
      return;
    }

    const cleanPhone = dealerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      Alert.alert("Error", "Invalid phone number");
      return;
    }
    const finalPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone.slice(-10)}`;
    const productUrl = communications.getProductUrl(productId);

    const message =
      `Hi 👋\n\n` +
      `Is this product available?\n\n` +
      `*${productName}*\n` +
      `${productDetails ? productDetails + '\n' : ''}` +
      `💰 ${productPrice}\n\n` +
      `${productUrl}`;

    const whatsappUrl =
      `whatsapp://send?phone=${finalPhone}&text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(whatsappUrl);
    } catch {
      Alert.alert("Error", "WhatsApp not installed");
    }
  },

  /**
   * Open WhatsApp with phone number (No product context)
   */
  openWhatsApp: async (phoneNumber: string | undefined, errorTitle: string = "No Info") => {
    if (!phoneNumber) {
      Alert.alert(errorTitle, "Number not available.");
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const finalPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone.slice(-10)}`;

    try {
      await Linking.openURL(`whatsapp://send?phone=${finalPhone}&text=${encodeURIComponent("Hi, I'm contacting you from Go Dealers.")}`);
    } catch (error) {
      Alert.alert("Error", "WhatsApp not installed");
    }
  }

};