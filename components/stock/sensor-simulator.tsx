"use client"

import { useState } from "react"
import { updateStockFromSensor } from "@/lib/automated-consumption-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import type { StockItem } from "@/types"

interface SensorSimulatorProps {
  stockItems: StockItem[]
  onUpdate: () => void
}

export function SensorSimulator({ stockItems, onUpdate }: SensorSimulatorProps) {
  const [selectedStock, setSelectedStock] = useState<string>("")
  const [newLevel, setNewLevel] = useState<string>("")
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  async function handleSimulateSensor() {
    if (!selectedStock || !newLevel) {
      toast({
        title: "Error",
        description: "Please select a stock item and enter a new level",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    try {
      const result = await updateStockFromSensor(selectedStock, Number.parseFloat(newLevel))

      if (result.success) {
        toast({
          title: "Success",
          description: "Sensor data simulated successfully",
        })
        onUpdate()
      } else {
        toast({
          title: "Error",
          description: "Failed to simulate sensor data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error simulating sensor:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sensor Simulator</CardTitle>
        <CardDescription>Simulate sensor data updates to test automated consumption tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="stock-select">Select Stock Item</Label>
            <select
              id="stock-select"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
            >
              <option value="">Select a stock item</option>
              {stockItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.gasType} (Current: {item.stock.toFixed(2)} kg)
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-level">New Stock Level (kg)</Label>
            <Input
              id="new-level"
              type="number"
              step="0.01"
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
              placeholder="Enter new stock level"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSimulateSensor} disabled={isUpdating}>
          {isUpdating ? "Simulating..." : "Simulate Sensor Update"}
        </Button>
      </CardFooter>
    </Card>
  )
}

