"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ArrowLeft, Loader2, Plus, Trash2, RefreshCw, Package, Save } from "lucide-react"
import Link from "next/link"

import type { Cylinder, StockItem, StockAttachment } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context"

export default function CylinderManagementPage({ params }: { params: { stockId: string } }) {
  const { stockId } = params
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  const [stockItem, setStockItem] = useState<StockItem | null>(null)
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [availableCylinders, setAvailableCylinders] = useState<StockAttachment[]>([])
  const [selectedCylinderId, setSelectedCylinderId] = useState<string>("")
  const [restockCylinderId, setRestockCylinderId] = useState<string>("")
  const [restockQuantity, setRestockQuantity] = useState<string>("1")

  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRestocking, setIsRestocking] = useState(false)

  // Fetch stock item and cylinders
  useEffect(() => {
    async function fetchStockItem() {
      try {
        setLoading(true)

        // Get stock item
        const stockDoc = await getDoc(doc(db, "stock", stockId))
        if (!stockDoc.exists()) {
          toast({
            title: "Error",
            description: "Stock item not found",
            variant: "destructive",
          })
          router.push("/dashboard/stock")
          return
        }

        const stockData = { id: stockDoc.id, ...stockDoc.data() } as StockItem
        setStockItem(stockData)
        setCylinders(stockData.cylinders || [])

        // Fetch available cylinders
        const cylindersQuery = query(collection(db, "stockAttachments"), where("type", "==", "cylinder"))
        const snapshot = await getDocs(cylindersQuery)

        // Convert to StockAttachment objects
        const cylinderAttachments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as StockAttachment[]

        // Filter out cylinders that are already assigned to this stock item
        const alreadyAssignedIds = new Set((stockData.cylinders || []).map((c) => c.id))
        const availableCyls = cylinderAttachments.filter((c) => !alreadyAssignedIds.has(c.id))

        setAvailableCylinders(availableCyls)
      } catch (error) {
        console.error("Error fetching stock item:", error)
        toast({
          title: "Error",
          description: "Failed to load cylinder data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStockItem()
  }, [stockId, router, toast])

  // Add a new cylinder
  const handleAddCylinder = async () => {
    if (!selectedCylinderId || !stockItem) {
      toast({
        title: "Validation Error",
        description: "Please select a cylinder",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      // Find the selected cylinder from available cylinders
      const selectedAttachment = availableCylinders.find((c) => c.id === selectedCylinderId)

      if (!selectedAttachment) {
        throw new Error("Selected cylinder not found")
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

      // Calculate total stock from cylinders
      const totalStock = updatedCylinders.reduce((total, cylinder) => {
        return total + cylinder.size * cylinder.count
      }, 0)

      // Get previous stock for history
      const previousStock = stockItem.stock

      // Update stock item with new cylinders and calculated stock
      await updateDoc(doc(db, "stock", stockId), {
        cylinders: updatedCylinders,
        stock: totalStock,
        lastUpdated: new Date().toISOString(),
      })

      // Record stock history if stock changed
      if (user && totalStock !== previousStock) {
        await addDoc(collection(db, "stockHistory"), {
          gasType: stockItem.gasType,
          timestamp: new Date().toISOString(),
          previousStock,
          newStock: totalStock,
          changeAmount: totalStock - previousStock,
          reason: "Cylinder added",
          userId: user.uid,
          userName: user.displayName || user.email,
          isRestock: true,
        })
      }

      // Reset form
      setSelectedCylinderId("")

      // Update available cylinders
      setAvailableCylinders(availableCylinders.filter((c) => c.id !== selectedCylinderId))

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
    } finally {
      setIsSaving(false)
    }
  }

  // Remove a cylinder
  const handleRemoveCylinder = async (cylinderId: string) => {
    if (!stockItem) return

    try {
      setIsSaving(true)

      const updatedCylinders = cylinders.filter((c) => c.id !== cylinderId)
      setCylinders(updatedCylinders)

      // Calculate total stock from cylinders
      const totalStock = updatedCylinders.reduce((total, cylinder) => {
        return total + cylinder.size * cylinder.count
      }, 0)

      // Get previous stock for history
      const previousStock = stockItem.stock

      // Update stock item with new cylinders and calculated stock
      await updateDoc(doc(db, "stock", stockId), {
        cylinders: updatedCylinders,
        stock: totalStock,
        lastUpdated: new Date().toISOString(),
      })

      // Record stock history if stock changed
      if (user && totalStock !== previousStock) {
        await addDoc(collection(db, "stockHistory"), {
          gasType: stockItem.gasType,
          timestamp: new Date().toISOString(),
          previousStock,
          newStock: totalStock,
          changeAmount: totalStock - previousStock,
          reason: "Cylinder removed",
          userId: user.uid,
          userName: user.displayName || user.email,
        })
      }

      // Add the removed cylinder back to available cylinders
      const removedCylinder = cylinders.find((c) => c.id === cylinderId)
      if (removedCylinder) {
        // Get the full attachment data
        const attachmentDoc = await getDoc(doc(db, "stockAttachments", cylinderId))
        if (attachmentDoc.exists()) {
          setAvailableCylinders([...availableCylinders, { id: cylinderId, ...attachmentDoc.data() } as StockAttachment])
        }
      }

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
    } finally {
      setIsSaving(false)
    }
  }

  // Restock a cylinder
  const handleRestock = async () => {
    if (!restockCylinderId || !restockQuantity || !stockItem) {
      toast({
        title: "Validation Error",
        description: "Please select a cylinder and specify a quantity",
        variant: "destructive",
      })
      return
    }

    try {
      setIsRestocking(true)

      // Find the cylinder to restock
      const cylinderIndex = cylinders.findIndex((c) => c.id === restockCylinderId)
      if (cylinderIndex === -1) {
        throw new Error("Cylinder not found")
      }

      // Create a copy of the cylinders array
      const updatedCylinders = [...cylinders]

      // Update the cylinder count
      updatedCylinders[cylinderIndex].count += Number.parseInt(restockQuantity)
      updatedCylinders[cylinderIndex].lastRestocked = new Date().toISOString()

      // Calculate new total stock
      const totalStock = updatedCylinders.reduce((total, cylinder) => {
        return total + cylinder.size * cylinder.count
      }, 0)

      // Get previous stock for history
      const previousStock = stockItem.stock

      // Update stock item with new cylinders and calculated stock
      await updateDoc(doc(db, "stock", stockId), {
        cylinders: updatedCylinders,
        stock: totalStock,
        lastUpdated: new Date().toISOString(),
      })

      // Record stock history for the restock
      if (user) {
        await addDoc(collection(db, "stockHistory"), {
          gasType: stockItem.gasType,
          timestamp: new Date().toISOString(),
          previousStock,
          newStock: totalStock,
          changeAmount: totalStock - previousStock,
          reason: `Cylinder ${updatedCylinders[cylinderIndex].serialNumber} restocked (+${restockQuantity})`,
          userId: user.uid,
          userName: user.displayName || user.email,
          isRestock: true,
        })
      }

      // Update local state
      setCylinders(updatedCylinders)

      // Reset form
      setRestockCylinderId("")
      setRestockQuantity("1")

      toast({
        title: "Success",
        description: `Cylinder restocked with ${restockQuantity} additional units`,
      })
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!stockItem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium">Stock item not found</h3>
        <p className="text-muted-foreground mb-4">The requested stock item could not be found</p>
        <Button asChild>
          <Link href="/dashboard/stock">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stock Management
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/stock">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Stock
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight ml-4">Manage Cylinders</h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cylinder Management for {stockItem.gasType}</CardTitle>
          <CardDescription>Add, restock, or remove cylinders to manage your gas inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="col-span-1 md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Current Stock Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Gas Type</p>
                      <p className="text-lg font-semibold">{stockItem.gasType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Price per kg</p>
                      <p className="text-lg font-semibold">${stockItem.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Stock</p>
                      <p className="text-lg font-semibold">{stockItem.stock.toFixed(2)} kg</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Cylinders</p>
                      <p className="text-lg font-semibold">
                        {cylinders.reduce((total, cylinder) => total + cylinder.count, 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Add New Cylinder</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cylinder">Select Cylinder</Label>
                      <Select value={selectedCylinderId} onValueChange={setSelectedCylinderId}>
                        <SelectTrigger id="cylinder">
                          <SelectValue placeholder="Select a cylinder" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCylinders.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
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

                    <Button
                      onClick={handleAddCylinder}
                      disabled={isSaving || !selectedCylinderId || availableCylinders.length === 0}
                      className="w-full"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Assign Cylinder
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Restock Section */}
          {cylinders.length > 0 && (
            <Card className="mb-8 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle>Restock Existing Cylinder</CardTitle>
                <CardDescription>Add more units to an existing cylinder</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="restock-cylinder">Select Cylinder</Label>
                    <Select value={restockCylinderId} onValueChange={setRestockCylinderId}>
                      <SelectTrigger id="restock-cylinder">
                        <SelectValue placeholder="Select a cylinder to restock" />
                      </SelectTrigger>
                      <SelectContent>
                        {cylinders.map((cylinder) => (
                          <SelectItem key={cylinder.id} value={cylinder.id}>
                            {cylinder.serialNumber} - {cylinder.size} kg - Current: {cylinder.count} units
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="restock-quantity">Additional Quantity</Label>
                    <Input
                      id="restock-quantity"
                      type="number"
                      min="1"
                      value={restockQuantity}
                      onChange={(e) => setRestockQuantity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={handleRestock}
                    disabled={isRestocking || !restockCylinderId}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isRestocking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Restocking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Restock Cylinder
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assigned Cylinders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Assigned Cylinders</CardTitle>
              <CardDescription>Cylinders currently assigned to this gas type</CardDescription>
            </CardHeader>
            <CardContent>
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
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Size (kg)</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Total Volume (kg)</TableHead>
                        <TableHead>Last Restocked</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cylinders.map((cylinder) => (
                        <TableRow key={cylinder.id}>
                          <TableCell className="font-medium">{cylinder.serialNumber}</TableCell>
                          <TableCell>{cylinder.size || cylinder.capacity || 0}</TableCell>
                          <TableCell>{cylinder.count}</TableCell>
                          <TableCell>
                            {((cylinder.size || cylinder.capacity || 0) * cylinder.count).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {cylinder.lastRestocked ? new Date(cylinder.lastRestocked).toLocaleDateString() : "Never"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={cylinder.status === "available" ? "default" : "secondary"}>
                              {cylinder.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRestockCylinderId(cylinder.id)
                                  setRestockQuantity("1")
                                }}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Restock
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveCylinder(cylinder.id)}
                                disabled={isSaving}
                              >
                                {isSaving && restockCylinderId === cylinder.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
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
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="mr-auto">
                <Link href="/dashboard/stock">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Stock
                </Link>
              </Button>

              <Button asChild>
                <Link href="/dashboard/stock">
                  <Save className="mr-2 h-4 w-4" />
                  Done
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

