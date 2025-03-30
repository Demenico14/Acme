"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Cylinder } from "@/types"

interface CylinderManagerProps {
  cylinders: Cylinder[]
  onUpdate: (cylinders: Cylinder[]) => void
}

export function CylinderManager({ cylinders, onUpdate }: CylinderManagerProps) {
  const [newSize, setNewSize] = useState<string>("")
  const [newCount, setNewCount] = useState<string>("")

  const handleAddCylinder = () => {
    if (!newSize || !newCount) return

    const size = Number.parseFloat(newSize)
    const count = Number.parseInt(newCount)

    if (isNaN(size) || isNaN(count) || size <= 0 || count <= 0) return

    // Check if this cylinder size already exists
    const existingIndex = cylinders.findIndex((c) => c.size === size)

    if (existingIndex >= 0) {
      // Update existing cylinder count
      const updatedCylinders = [...cylinders]
      updatedCylinders[existingIndex] = {
        ...updatedCylinders[existingIndex],
        count: updatedCylinders[existingIndex].count + count,
        lastRestocked: new Date().toISOString(),
      }
      onUpdate(updatedCylinders)
    } else {
      // Add new cylinder type
      const newCylinder: Cylinder = {
        id: Date.now().toString(),
        size,
        count,
        lastRestocked: new Date().toISOString(),
      }
      onUpdate([...cylinders, newCylinder])
    }

    // Reset form
    setNewSize("")
    setNewCount("")
  }

  const handleUpdateCount = (id: string, change: number) => {
    const updatedCylinders = cylinders.map((cylinder) => {
      if (cylinder.id === id) {
        const newCount = Math.max(0, cylinder.count + change)
        return {
          ...cylinder,
          count: newCount,
          lastRestocked: change > 0 ? new Date().toISOString() : cylinder.lastRestocked,
        }
      }
      return cylinder
    })

    onUpdate(updatedCylinders)
  }

  // Calculate total stock from all cylinders
  const totalStock = cylinders.reduce((total, cylinder) => total + cylinder.size * cylinder.count, 0)
  const totalCylinders = cylinders.reduce((total, cylinder) => total + cylinder.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cylinder Management</CardTitle>
        <CardDescription>Manage your gas cylinders inventory</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Total Cylinders</div>
            <div className="mt-1 text-2xl font-bold">{totalCylinders}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Total Gas Volume</div>
            <div className="mt-1 text-2xl font-bold">{totalStock.toFixed(2)} kg</div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Current Cylinders</h3>
          {cylinders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cylinders added yet</p>
          ) : (
            <div className="space-y-2">
              {cylinders.map((cylinder) => (
                <div key={cylinder.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{cylinder.size} kg Cylinder</div>
                    <div className="text-sm text-muted-foreground">
                      {cylinder.count} cylinders ({(cylinder.size * cylinder.count).toFixed(2)} kg total)
                    </div>
                    {cylinder.lastRestocked && (
                      <div className="text-xs text-muted-foreground">
                        Last restocked: {new Date(cylinder.lastRestocked).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleUpdateCount(cylinder.id, -1)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Badge variant="outline">{cylinder.count}</Badge>
                    <Button variant="outline" size="icon" onClick={() => handleUpdateCount(cylinder.id, 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Add New Cylinders</h3>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="grid gap-2">
              <Label htmlFor="cylinder-size">Cylinder Size (kg)</Label>
              <Input
                id="cylinder-size"
                type="number"
                step="0.1"
                min="0"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                placeholder="e.g., 12.5"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cylinder-count">Count</Label>
              <Input
                id="cylinder-count"
                type="number"
                min="1"
                step="1"
                value={newCount}
                onChange={(e) => setNewCount(e.target.value)}
                placeholder="e.g., 5"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddCylinder} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Cylinders
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

