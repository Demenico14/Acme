"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { type User, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"

import { auth } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setAuthLoading(true)
    setError(null)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/dashboard")
    } catch (error) {
      if (error instanceof Error) {
        const errorCode = (error as any).code
        if (errorCode === "auth/invalid-credential") {
          setError("Invalid email or password. Please try again.")
        } else if (errorCode === "auth/user-not-found") {
          setError("No account found with this email.")
        } else if (errorCode === "auth/wrong-password") {
          setError("Incorrect password.")
        } else if (errorCode === "auth/too-many-requests") {
          setError("Too many failed login attempts. Please try again later.")
        } else {
          setError("Failed to sign in. Please try again.")
        }
        console.error("Login error:", error)
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: loading || authLoading,
        error,
        signIn,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

