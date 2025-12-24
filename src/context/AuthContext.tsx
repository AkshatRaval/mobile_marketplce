import { auth, db } from '@/FirebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';

type AuthState = {
  user: User | null
  userDoc: any | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  userDoc: null,
  loading: true,
})

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null)
  const [userDoc, setUserDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)

      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid))
        setUserDoc(snap.exists() ? snap.data() : null)
      } else {
        setUserDoc(null)
      }

      setLoading(false)
    })

    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ user, userDoc, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
