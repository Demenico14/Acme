"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"

interface MerchantConfig {
  merchantPin: string
  notifyUrl: string
  merchantCode: string
  merchantNumber: string
  terminalId: string
  location: string
  superMerchantName: string
  merchantName: string
  email: string
  taxRate: string
}

export function MerchantConfigForm() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<MerchantConfig>({
    merchantPin: "",
    notifyUrl: "",
    merchantCode: "",
    merchantNumber: "",
    terminalId: "",
    location: "",
    superMerchantName: "",
    merchantName: "",
    email: "",
    taxRate: "0",
  })

  useEffect(() => {
    async function loadMerchantConfig() {
      if (!user) return

      try {
        setIsLoading(true)
        const configRef = doc(db, "merchantConfig", "settings")
        const configDoc = await getDoc(configRef)

        if (configDoc.exists()) {
          setFormData(configDoc.data() as MerchantConfig)
        }
      } catch (error) {
        console.error("Error loading merchant config:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMerchantConfig()
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save merchant configuration",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      // Save to Firestore
      const configRef = doc(db, "merchantConfig", "settings")
      await setDoc(configRef, {
        ...formData,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
      })

      toast({
        title: "Success",
        description: "Merchant configuration saved successfully",
      })
    } catch (error) {
      console.error("Error saving merchant config:", error)
      toast({
        title: "Error",
        description: "Failed to save merchant configuration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="merchantName">Merchant Name</Label>
              <Input
                id="merchantName"
                name="merchantName"
                value={formData.merchantName}
                onChange={handleInputChange}
                placeholder="Your merchant name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="superMerchantName">Super Merchant Name</Label>
              <Input
                id="superMerchantName"
                name="superMerchantName"
                value={formData.superMerchantName}
                onChange={handleInputChange}
                placeholder="Super merchant name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchantCode">Merchant Code</Label>
              <Input
                id="merchantCode"
                name="merchantCode"
                value={formData.merchantCode}
                onChange={handleInputChange}
                placeholder="Merchant code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchantNumber">Merchant Number</Label>
              <Input
                id="merchantNumber"
                name="merchantNumber"
                value={formData.merchantNumber}
                onChange={handleInputChange}
                placeholder="Merchant number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchantPin">Merchant PIN</Label>
              <Input
                id="merchantPin"
                name="merchantPin"
                type="password"
                value={formData.merchantPin}
                onChange={handleInputChange}
                placeholder="Merchant PIN"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terminalId">Terminal ID</Label>
              <Input
                id="terminalId"
                name="terminalId"
                value={formData.terminalId}
                onChange={handleInputChange}
                placeholder="Terminal ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Business location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Contact email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notifyUrl">Notification URL</Label>
              <Input
                id="notifyUrl"
                name="notifyUrl"
                value={formData.notifyUrl}
                onChange={handleInputChange}
                placeholder="Callback URL for notifications"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                name="taxRate"
                type="number"
                min="0"
                step="0.01"
                value={formData.taxRate}
                onChange={handleInputChange}
                placeholder="Tax rate percentage"
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isLoading ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

