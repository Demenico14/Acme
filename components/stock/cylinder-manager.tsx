"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Cylinder, StockAttachment } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, RefreshCw, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Define props interface for the component
interface CylinderManagerProps {
  stockId?: string
  cylinders: Cylinder[]
  onUpdate: (cylinders: Cylinder[]) => Promise<void>
  onRestock?: (cylinderId: string, quantity: number) => Promise<void>
}

const CylinderManager: React.FC<CylinderManagerProps> = ({
  cylinders: assignedCylinders,
  onUpdate,
  onRestock,
}) => {
  const { toast } = useToast()
  const [cylinders, setCylinders] = useState<Cylinder[]>(assignedCylinders || [])
  const [availableCylinders, setAvailableCylinders] = useState<StockAttachment[]>([])
  const [selectedCylinderId, setSelectedCylinderId] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)

  const [restockCylinderId, setRestockCylinderId] = useState<string>("")
  const [restockQuantity, setRestockQuantity] = useState<string>("1")
  const [isRestocking, setIsRestocking] = useState<boolean>(false)

  // Fetch available cylinders from stockAttachments collection
  useEffect(() => {
    const fetchAvailableCylinders = async () => {
      try {
        setLoading(true)
        // Query cylinders from stockAttachments where type is "cylinder"
        const cylindersQuery = query(collection(db, "stockAttachments"), where("type", "==", "cylinder"))
        const snapshot = await getDocs(cylindersQuery)

        // Convert to StockAttachment objects
        const cylinderAttachments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as StockAttachment[]

        // Filter out cylinders that are already assigned to this stock item
        const alreadyAssignedIds = new Set(cylinders.map((c) => c.id))
        const availableCyls = cylinderAttachments.filter((c) => !alreadyAssignedIds.has(c.id))

        setAvailableCylinders(availableCyls)
      } catch (error) {
        console.error("Error fetching cylinders:", error)
        toast({
          title: "Error",
          description: "Failed to fetch available cylinders",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableCylinders()
  }, [cylinders, toast])

  // Update local state when props change
  useEffect(() => {
    setCylinders(assignedCylinders || [])
  }, [assignedCylinders])

  // Update the handleAddCylinder function to inherit size from the selected attachment
  const handleAddCylinder = async () => {
    if (!selectedCylinderId) {
      toast({
        title: "Validation Error",
        description: "Please select a cylinder",
        variant: "destructive",
      })
      return
    }

    try {
      // Find the selected cylinder from available cylinders
      const selectedAttachment = availableCylinders.find((c) => c.id === selectedCylinderId)

      if (!selectedAttachment) {
        toast({
          title: "Error",
          description: "Selected cylinder not found",
          variant: "destructive",
        })
        return
      }

      // Get the size from the capacity property in the attachment
      const cylinderSize = selectedAttachment.capacity || 0

      // Create a new cylinder object from the attachment
      const newCylinder: Cylinder = {
        id: selectedAttachment.id,
        serialNumber: selectedAttachment.serialNumber,
        capacity: cylinderSize, // Use the capacity from the attachment
        manufacturer: selectedAttachment.manufacturer || "Unknown",
        manufactureDate: selectedAttachment.purchaseDate,
        lastInspectionDate: selectedAttachment.lastInspection,
        nextInspectionDate: selectedAttachment.nextInspection,
        status: "available",
        location: selectedAttachment.location,
        size: cylinderSize, // Set size from the attachment
        count: 1, // Default to 1
        lastRestocked: new Date().toISOString(),
      }

      const updatedCylinders = [...cylinders, newCylinder]
      setCylinders(updatedCylinders)
      await onUpdate(updatedCylinders)

      // Reset form
      setSelectedCylinderId("")

      toast({
        title: "Success",
        description: "Cylinder assigned successfully",
      })
    } catch (error) {
      console.error("Error adding cylinder:", error)
      toast({
        title: "Error",
        description: "Failed to assign cylinder",
        variant: "destructive",
      })
    }
  }

  const handleRemoveCylinder = async (cylinderId: string) => {
    try {
      const updatedCylinders = cylinders.filter((c) => c.id !== cylinderId)
      setCylinders(updatedCylinders)
      await onUpdate(updatedCylinders)

      toast({
        title: "Success",
        description: "Cylinder removed successfully",
      })
    } catch (error) {
      console.error("Error removing cylinder:", error)
      toast({
        title: "Error",
        description: "Failed to remove cylinder",
        variant: "destructive",
      })
    }
  }

  const handleRestock = async () => {
    if (!restockCylinderId || !restockQuantity || !onRestock) {
      toast({
        title: "Validation Error",
        description: "Please select a cylinder and specify a quantity",
        variant: "destructive",
      })
      return
    }

    try {
      setIsRestocking(true)
      await onRestock(restockCylinderId, Number.parseInt(restockQuantity))

      // Reset form
      setRestockCylinderId("")
      setRestockQuantity("1")
    } catch (error) {
      console.error("Error restocking cylinder:", error)
      toast({
        title: "Error",
        description: "Failed to restock cylinder",
        variant: "destructive",
      })
    } finally {
      setIsRestocking(false)
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Add New Cylinder Section */}
      <div className="rounded-lg border p-6 bg-card shadow-sm">
        <h3 className="text-xl font-medium mb-6">Add New Cylinder</h3>
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-3">
            <Label htmlFor="cylinder" className="text-base">
              Select Cylinder
            </Label>
            <Select value={selectedCylinderId} onValueChange={setSelectedCylinderId}>
              <SelectTrigger id="cylinder" className="h-12">
                <SelectValue placeholder="Select a cylinder" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Loading cylinders...</span>
                  </div>
                ) : availableCylinders.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    No available cylinders. Create cylinders in the Equipment tab first.
                  </div>
                ) : (
                  availableCylinders.map((cylinder) => (
                    <SelectItem key={cylinder.id} value={cylinder.id}>
                      {cylinder.name} - {cylinder.serialNumber} ({cylinder.capacity || 0} kg)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-2">
            <Button
              onClick={handleAddCylinder}
              disabled={loading || !selectedCylinderId}
              className="w-full md:w-auto h-12 px-8 text-base"
            >
              <Plus className="h-5 w-5 mr-2" />
              Assign Cylinder
            </Button>
          </div>
        </div>
      </div>

      {/* Restock Existing Cylinder Section */}
      {cylinders.length > 0 && (
        <div className="rounded-lg border p-6 bg-green-50 dark:bg-green-900/10 shadow-sm">
          <h3 className="text-xl font-medium mb-6">Restock Existing Cylinder</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="restock-cylinder" className="text-base">
                Select Cylinder
              </Label>
              <Select value={restockCylinderId} onValueChange={setRestockCylinderId}>
                <SelectTrigger id="restock-cylinder" className="h-12">
                  <SelectValue placeholder="Select a cylinder to restock" />
                </SelectTrigger>
                <SelectContent>
                  {cylinders.map((cylinder) => (
                    <SelectItem key={cylinder.id} value={cylinder.id}>
                      {cylinder.serialNumber} - Current: {cylinder.count} units
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="restock-quantity" className="text-base">
                Additional Quantity
              </Label>
              <Input
                id="restock-quantity"
                type="number"
                min="1"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleRestock}
              disabled={isRestocking || !restockCylinderId}
              className="w-full md:w-auto h-12 px-8 text-base bg-green-600 hover:bg-green-700"
            >
              {isRestocking ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Restocking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Restock Cylinder
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Assigned Cylinders Table */}
      <div className="rounded-lg border p-6 shadow-sm">
        <h3 className="text-xl font-medium mb-6">Assigned Cylinders</h3>
        {cylinders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No cylinders assigned to this stock item yet</p>
            <p className="text-sm text-muted-foreground mt-2">Add cylinders using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-base">Serial Number</TableHead>
                  <TableHead className="text-base">Size (kg)</TableHead>
                  <TableHead className="text-base">Count</TableHead>
                  <TableHead className="text-base">Total Volume (kg)</TableHead>
                  <TableHead className="text-base">Last Restocked</TableHead>
                  <TableHead className="text-base">Status</TableHead>
                  <TableHead className="text-right text-base">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cylinders.map((cylinder) => (
                  <TableRow key={cylinder.id} className="text-base">
                    <TableCell className="font-medium">{cylinder.serialNumber}</TableCell>
                    <TableCell>{cylinder.size || cylinder.capacity || 0}</TableCell>
                    <TableCell>{cylinder.count}</TableCell>
                    <TableCell>{((cylinder.size || cylinder.capacity || 0) * cylinder.count).toFixed(2)}</TableCell>
                    <TableCell>
                      {cylinder.lastRestocked ? new Date(cylinder.lastRestocked).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={cylinder.status === "available" ? "default" : "secondary"}
                        className="px-3 py-1 text-sm"
                      >
                        {cylinder.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 px-4"
                          onClick={() => {
                            setRestockCylinderId(cylinder.id)
                            setRestockQuantity("1")
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Restock
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 px-4 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveCylinder(cylinder.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

export default CylinderManager

