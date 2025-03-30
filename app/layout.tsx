import type React from "react"
import { AuthProvider } from "@/context/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { AppSettingsProvider } from "@/context/app-settings-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Acme.</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Acme Inc. - Innovating the future of business solutions" />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="ui-theme">
          <AuthProvider>
            <AppSettingsProvider>
              {children}
              <Toaster />
            </AppSettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
