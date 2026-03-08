// src/hooks/useOnboarding.ts
import { useAuth } from "@/src/context/AuthContext";
import { authApi } from "@/src/services/api/authApi";
import { useState } from "react";
import { Alert, Linking } from "react-native";

const SUPPORT_PHONE = "+919876543210";
const SUPPORT_EMAIL = "support@yourcompany.com";
const WHATSAPP_MSG = "Hello, I am waiting for my account approval. My Shop Name is: ";

export function useOnboarding() {
    const { user, userDoc, refreshProfile } = useAuth();
    const [submitting, setSubmitting] = useState(false);

    const isSubmitted = userDoc?.onboarding_status === "submitted";

    const submitForApproval = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            await authApi.submitForApproval(user.id);
            await refreshProfile();
            Alert.alert("Success", "Request submitted successfully.");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not submit request. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleWhatsApp = () => {
        const shopName = userDoc?.shop_name || "Unknown";
        const url = `whatsapp://send?text=${WHATSAPP_MSG}${shopName}&phone=${SUPPORT_PHONE}`;
        Linking.openURL(url).catch(() => {
            Alert.alert("Error", "WhatsApp is not installed on this device");
        });
    };

    const handleCall = () => {
        Linking.openURL(`tel:${SUPPORT_PHONE}`);
    };

    const handleEmail = () => {
        Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
    };

    return {
        user,
        userDoc,
        isSubmitted,
        submitting,
        submitForApproval,
        refreshProfile,
        handleWhatsApp,
        handleCall,
        handleEmail,
    };
}
