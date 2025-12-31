// src/services/api/authApi.ts
import { supabase } from "@/src/supabaseConfig";

export const authApi = {
  /**
   * Sign Up User & Create Profile
   */
  signUp: async (
    email: string,
    password: string,
    userData: {
      displayName: string;
      shopName: string;
      phone: string;
    }
  ) => {
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: userData.displayName, // Metadata for convenience
        },
      },
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("User creation failed");

    const userId = authData.user.id;

    // 2. Insert into 'profiles' table
    // Matches the schema we created earlier
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email: email,
      display_name: userData.displayName,
      shop_name: userData.shopName,
      phone: userData.phone,
      role: "dealer",
      onboarding_status: "submitted", // Acts as the "pending-request"
      privacy_settings: "Everyone",
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw new Error(profileError.message);
    }

    return authData.user;
  },
  
  submitForApproval: async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_status: "submitted" })
      .eq("id", userId);

    if (error) throw new Error(error.message);
  },

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    return data.user;
  },
};