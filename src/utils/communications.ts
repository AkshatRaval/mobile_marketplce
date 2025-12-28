// src/utils/communications.ts
// Communication utilities (WhatsApp, Phone, etc.)

import { Alert, Linking } from "react-native";

export const communications = {
  /**
   * Open WhatsApp with phone number
   */
  openWhatsApp: (phoneNumber: string | undefined, errorTitle: string = "No Info") => {
    if (!phoneNumber) {
      Alert.alert(errorTitle, "Number not available.");
      return;
    }

    console.log(`📱 Opening WhatsApp for: ${phoneNumber}`);

    Linking.openURL(`whatsapp://send?phone=${phoneNumber}`).catch(() =>
      Alert.alert("Error", "Could not open WhatsApp")
    );
  },

  /**
   * Open WhatsApp with pre-filled message about a product
   */
  openWhatsAppForProduct: (
    phoneNumber: string | undefined,
    productName: string,
    productPrice: string
  ) => {
    if (!phoneNumber) {
      Alert.alert("No Info", "Number not available.");
      return;
    }

    const text = `Hi, I am interested in the ${productName} listed for ₹${productPrice}`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(text)}`;

    console.log(`📱 Opening WhatsApp for product: ${productName}`);

    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open WhatsApp")
    );
  },

  /**
   * Make a phone call
   */
  makeCall: (phoneNumber: string | undefined) => {
    if (!phoneNumber) {
      Alert.alert("No Info", "Number not available.");
      return;
    }

    console.log(`📞 Making call to: ${phoneNumber}`);

    Linking.openURL(`tel:${phoneNumber}`).catch(() =>
      Alert.alert("Error", "Could not open dialer")
    );
  },
};