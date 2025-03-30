"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"

import { AdminSignupForm } from "@/components/admin-signup-form"
import { useAuth } from "@/context/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { Spinner } from "@/components/ui/spinner"
import { auth, db } from "@/lib/firebase"

export default function AdminSignupPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [adminCodeValid, setAdminCodeValid] = useState(false)
  const [adminCode, setAdminCode] = useState("")
  
  // Retrieve from env variables
  const ADMIN_SECRET_CODE = process.env.NEXT_PUBLIC_ADMIN_SECRET_CODE

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  const handleAdminCodeSubmit = (code: string) => {
    if (code === ADMIN_SECRET_CODE) {
      setAdminCodeValid(true)
      setAdminCode(code)
    } else {
      setAdminCodeValid(false)
    }
  }

  const handleAdminSignup = async (email: string, password: string, name: string) => {
    if (!adminCodeValid) {
      return {
        success: false,
        error: "Invalid admin code.",
      }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        role: "admin",
        adminCode,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        status: "active",
      })

      router.push("/dashboard")
      return { success: true }
    } catch (error) {
      console.error("Admin signup error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create admin account.",
      }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <AdminSignupForm
            adminCodeValid={adminCodeValid}
            onAdminCodeSubmit={handleAdminCodeSubmit}
            onAdminSignup={handleAdminSignup}
          />
        </div>
      </div>
    )
  }

  return null
}
