// src/hooks/useSignup.ts
import { authApi } from "@/src/services/api/authApi";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

export function useSignup() {
    const router = useRouter();

    const [ownerName, setOwnerName] = useState("");
    const [shopName, setShopName] = useState("");
    const [city, setCity] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const validate = (): string | null => {
        if (!ownerName.trim()) return "Owner name is required.";
        if (!shopName.trim()) return "Shop name is required.";
        if (!city.trim()) return "City is required.";
        if (!/^\d{10}$/.test(phone)) return "Phone number must be exactly 10 digits.";
        if (!email.trim()) return "Email address is required.";
        if (!email.toLowerCase().endsWith("@gmail.com"))
            return "Only Gmail addresses (@gmail.com) are allowed.";
        if (password.length < 6) return "Password must be at least 6 characters.";
        if (password !== confirmPassword) return "Passwords do not match.";
        return null;
    };

    const signup = async () => {
        const error = validate();
        if (error) {
            Alert.alert("Validation Error", error);
            return;
        }
        setLoading(true);
        try {
            await authApi.signUp(email.trim().toLowerCase(), password, {
                displayName: ownerName.trim(),
                shopName: shopName.trim(),
                phone: phone.trim(),
                city: city.trim(),
            });
            router.replace("/onboarding");
        } catch (err: any) {
            let msg = err.message;
            if (msg.includes("User already registered"))
                msg = "This email is already registered. Please login.";
            Alert.alert("Registration Failed", msg);
        } finally {
            setLoading(false);
        }
    };

    return {
        ownerName, setOwnerName,
        shopName, setShopName,
        city, setCity,
        phone, setPhone,
        email, setEmail,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        showPassword, setShowPassword,
        showConfirmPassword, setShowConfirmPassword,
        loading,
        signup,
    };
}
