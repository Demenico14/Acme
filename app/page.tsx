"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/context/auth-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { Spinner } from "@/components/ui/spinner"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      // User is already signed in, redirect to dashboard
      router.push("/dashboard")
    }
  }, [user, loading, router])

  // Don't render the login form until we've checked auth state
  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Only render the login form if the user is not authenticated
  if (!user) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    )
  }

  return null
}

