"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/context/auth-context"

interface AppSettings {
  language: string
  currency: string
  dateFormat: string
  autoLogout: string
}

interface AppSettingsContextType {
  appSettings: AppSettings
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>
  isLoading: boolean
}

const defaultSettings: AppSettings = {
  language: "en",
  currency: "USD",
  dateFormat: "MM/DD/YYYY",
  autoLogout: "30",
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined)

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load settings from localStorage first for immediate UI response
    const storedSettings = localStorage.getItem("appSettings")
    if (storedSettings) {
      try {
        setAppSettings(JSON.parse(storedSettings))
      } catch (error) {
        console.error("Error parsing stored settings:", error)
      }
    }

    // Listen for settings changes from other components
    const handleSettingsChange = (event: CustomEvent<AppSettings>) => {
      setAppSettings(event.detail)
    }

    window.addEventListener("appSettingsChanged", handleSettingsChange as EventListener)

    // Load settings from Firestore if user is authenticated
    async function loadUserSettings() {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        const userRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userRef)

        if (userDoc.exists() && userDoc.data().appSettings) {
          const settings = userDoc.data().appSettings
          setAppSettings(settings)
          localStorage.setItem("appSettings", JSON.stringify(settings))
        }
      } catch (error) {
        console.error("Error loading user settings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserSettings()

    return () => {
      window.removeEventListener("appSettingsChanged", handleSettingsChange as EventListener)
    }
  }, [user])

  const updateAppSettings = async (newSettings: Partial<AppSettings>) => {
    if (!user) return

    try {
      const updatedSettings = { ...appSettings, ...newSettings }
      setAppSettings(updatedSettings)

      // Save to localStorage for immediate access
      localStorage.setItem("appSettings", JSON.stringify(updatedSettings))

      // Save to Firestore for persistence
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        appSettings: updatedSettings,
        updatedAt: new Date().toISOString(),
      })

      // Broadcast event for other components to update
      window.dispatchEvent(
        new CustomEvent("appSettingsChanged", {
          detail: updatedSettings,
        }),
      )
    } catch (error) {
      console.error("Error updating app settings:", error)
      throw error
    }
  }

  return (
    <AppSettingsContext.Provider value={{ appSettings, updateAppSettings, isLoading }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext)
  if (context === undefined) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider")
  }
  return context
}

