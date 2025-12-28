// src/services/api/authApi.ts
import { auth, db } from "@/FirebaseConfig";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, updateDoc } from "firebase/firestore";

export const authApi = {
  signUp: async (
    email: string,
    password: string,
    userData: {
      displayName: string;
      shopName: string;
      phone: string;
    }
  ) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", res.user.uid), {
      uid: res.user.uid,
      userEmail: email,
      displayName: userData.displayName,
      shopName: userData.shopName,
      phone: userData.phone,
      role: "dealer",
      connections: [],
      requestSent: [],
      requestReceived: [],
      onboardingStatus: "submitted",
      createdAt: Date.now(),
    });

    await setDoc(doc(db, "pending-request", res.user.uid), {
      uid: res.user.uid,
      displayName: userData.displayName,
      shopName: userData.shopName,
      phone: userData.phone,
      status: "pending",
      requestDate: Date.now(),
    });
    return res.user;
  },
  
  submitForApproval: async (userId: string) => {
    await updateDoc(doc(db, "users", userId), {
      onboardingStatus: "submitted",
    });
  },

  login: async (email: string, password: string) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res.user;
  },
};
