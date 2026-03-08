// src/hooks/useLogin.ts
import { authApi } from "@/src/services/api/authApi";
import { supabase } from "@/src/supabaseConfig";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

export function useLogin() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const login = async () => {
        if (!email || !password) {
            Alert.alert("Missing Fields", "Please enter both email and password.");
            return;
        }

        setLoading(true);

        try {
            console.log("Attempting login for:", email);

            // 1. Perform Login
            const user = await authApi.login(email, password);

            if (!user) throw new Error("Login failed - No user returned");
            console.log("Login successful. User ID:", user.id);

            // 2. Check User Status in 'profiles' table
            const { data: profile, error } = await supabase
                .from("profiles")
                .select("onboarding_status")
                .eq("id", user.id)
                .maybeSingle();

            if (error) {
                console.error("Profile fetch error:", error.message);
                router.replace("/");
                return;
            }

            if (!profile) {
                console.log("No profile found for this user. Routing to Home.");
                router.replace("/");
                return;
            }

            // 3. Route based on Status
            const status = profile.onboarding_status;
            console.log("User Status found:", status);

            if (status === "submitted" || status === "pending") {
                console.log("Redirecting to Onboarding...");
                router.replace("/onboarding");
            } else if (status === "suspended") {
                console.log("Redirecting to Suspended...");
                router.replace("/suspended");
            } else {
                console.log("Redirecting to Home...");
                router.replace("/");
            }
        } catch (error: any) {
            console.error("Login flow error:", error);
            let msg = error.message;

            if (msg.includes("Invalid login credentials")) {
                msg = "Invalid email or password. Please try again.";
            } else if (msg.includes("Email not confirmed")) {
                msg = "Please verify your email address before logging in.";
            }

            Alert.alert("Login Failed", msg);
        } finally {
            setLoading(false);
        }
    };

    return { email, setEmail, password, setPassword, loading, login };
}
