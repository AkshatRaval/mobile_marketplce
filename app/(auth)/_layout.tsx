import { useAuth } from "@/src/context/AuthContext";
import { Redirect, Stack } from "expo-router";
import '../global.css';

export default function AuthLayout() {
  const { user, userDoc, loading } = useAuth();

  if (loading) return null;

  // Approved users should never see auth screens
  if (user && userDoc?.onboardingStatus === "approved") {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{
    headerShown: false
  }}/>;
}
