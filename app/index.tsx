import { useAuth } from "@/src/context/AuthContext";
import { Redirect } from "expo-router";
import DealerHome from "./(dealer)/home";

export default function Index() {
  const { user, userDoc, loading } = useAuth();

  if (loading) return  <DealerHome />;

  if (!user) return <Redirect href="/login" />;

  if (userDoc?.role === "admin") {
    return <Redirect href="/dashboard" />;
  }

  if (userDoc?.role === "dealer") {
    return <Redirect href="/home" />;
  }

  return <DealerHome />;
}
