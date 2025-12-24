import { useAuth } from "@/src/context/AuthContext";
import { Redirect } from "expo-router";

export default function Index() {
  const { user, userDoc, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Redirect href="/login" />;

  if (userDoc?.role === "admin") {
    return <Redirect href="/dashboard" />;
  }

  if (userDoc?.role === "dealer") {
    return <Redirect href="/home" />;
  }

  return null;
}
