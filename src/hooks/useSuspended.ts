// src/hooks/useSuspended.ts
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/supabaseConfig";
import { useRouter } from "expo-router";
import { Linking } from "react-native";

const SUPPORT_PHONE = "+919876543210";
const SUPPORT_EMAIL = "support@yourcompany.com";

export function useSuspended() {
    const { user, userDoc } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    };

    const handleWhatsApp = () => {
        const msg = `Hello, my account has been suspended. Support ID: ${user?.id.slice(0, 8)}`;
        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}&phone=${SUPPORT_PHONE}`);
    };

    const handleCall = () => {
        Linking.openURL(`tel:${SUPPORT_PHONE}`);
    };

    const handleEmail = () => {
        const subject = "Account Suspended - Support Request";
        const body = `Support ID: ${user?.id.slice(0, 8)}\n\nMy account has been suspended. Please help.`;
        Linking.openURL(
            `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        );
    };

    return {
        user,
        userDoc,
        handleLogout,
        handleWhatsApp,
        handleCall,
        handleEmail,
    };
}
