"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore"
import { Package, Plus, Edit, Trash2, Filter, History, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { db } from "@/lib/firebase"
import { setupAutomatedConsumptionTracking } from "@/lib/automated-consumption-service"
import { useAuth } from "@/context/auth-context"
import type { StockItem } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { GasConsumptionGraph } from "@/components/stock/gas-consumption-graph"
import { StockHistory } from "@/components/stock/stock-history"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function StockPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState<StockItem | null>(null)
  const [formData, setFormData] = useState({
    gasType: "",
    price: "",
  })
  const [selectedGasType, setSelectedGasType] = useState<string | undefined>(undefined)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [automationStatus, setAutomationStatus] = useState<"active" | "inactive">("inactive")
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  const fetchStockItems = useCallback(async () => {
    try {
      setLoading(true)
      const stockSnapshot = await getDocs(collection(db, "stock"))
      const stockData = stockSnapshot.docs.map((doc) => {
        const data = doc.data()
        // Ensure cylinders array exists
        if (!data.cylinders) {
          data.cylinders = []
        }
        return {
          id: doc.id,
          ...data,
        }
      }) as StockItem[]
      setStockItems(stockData)
    } catch (error) {
      console.error("Error fetching stock items:", error)
      toast({
        title: "Error",
        description: "Failed to fetch stock items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Set up automated consumption tracking
  useEffect(() => {
    const unsubscribe = setupAutomatedConsumptionTracking()
    setAutomationStatus("active")

    // Show toast notification that automation is active
    toast({
      title: "Automation Active",
      description: "Gas consumption is being tracked automatically",
    })

    return () => {
      unsubscribe()
      setAutomationStatus("inactive")
    }
  }, [toast])

  useEffect(() => {
    fetchStockItems()
  }, [fetchStockItems])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    try {
      const newItem = {
        gasType: formData.gasType,
        price: Number.parseFloat(formData.price),
        stock: 0, // Will be calculated from cylinders
        lastUpdated: new Date().toISOString(),
        cylinders: [], // Start with no cylinders
      }

      const docRef = await addDoc(collection(db, "stock"), newItem)

      // Record initial stock history
      if (user) {
        await addDoc(collection(db, "stockHistory"), {
          gasType: newItem.gasType,
          timestamp: new Date().toISOString(),
          previousStock: 0,
          newStock: 0,
          changeAmount: 0,
          reason: "Initial stock",
          userId: user.uid,
          userName: user.displayName || user.email,
        })
      }

      toast({
        title: "Success",
        description: "Stock item added successfully",
      })

      setIsAddDialogOpen(false)
      setFormData({ gasType: "", price: "" })

      // Open cylinder dialog to add cylinders
      const newStockItem = {
        id: docRef.id,
        gasType: formData.gasType,
        price: Number.parseFloat(formData.price),
        stock: 0,
        lastUpdated: new Date().toISOString(),
        cylinders: [],
      }
      setCurrentItem(newStockItem)
      router.push(`/dashboard/stock/cylinders/${docRef.id}`)

      fetchStockItems()
      setRefreshTrigger((prev) => prev + 1)
    } catch (error) {
      console.error("Error adding stock item:", error)
      toast({
        title: "Error",
        description: "Failed to add stock item",
        variant: "destructive",
      })
    }
  }

  function handleEditClick(item: StockItem) {
    setCurrentItem(item)
    setFormData({
      gasType: item.gasType,
      price: item.price.toString(),
    })
    setIsEditDialogOpen(true)
  }


  async function handleUpdateItem(e: React.FormEvent) {
    e.preventDefault()
    if (!currentItem || !user) return

    try {
      // Update fields directly
      await updateDoc(doc(db, "stock", currentItem.id), {
        gasType: formData.gasType,
        price: Number.parseFloat(formData.price),
        lastUpdated: new Date().toISOString(),
      })

      toast({
        title: "Success",
        description: "Stock item updated successfully",
      })

      setIsEditDialogOpen(false)
      setCurrentItem(null)
      setFormData({ gasType: "", price: "" })
      fetchStockItems()
      setRefreshTrigger((prev) => prev + 1)
    } catch (error) {
      console.error("Error updating stock item:", error)
      toast({
        title: "Error",
        description: "Failed to update stock item",
        variant: "destructive",
      })
    }
  }


  // Add a new function to handle cylinder restocking after the handleUpdateCylinders function

  async function handleDeleteItem(id: string) {
    try {
      await deleteDoc(doc(db, "stock", id))
      toast({
        title: "Success",
        description: "Stock item deleted successfully",
      })
      fetchStockItems()
    } catch (error) {
      console.error("Error deleting stock item:", error)
      toast({
        title: "Error",
        description: "Failed to delete stock item",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Stock Management</h2>
        <div className="flex items-center gap-2">
          <Badge
            variant={automationStatus === "active" ? "default" : "outline"}
            className={automationStatus === "active" ? "bg-green-500" : ""}
          >
            <Zap className="mr-1 h-3 w-3" />
            Automated Tracking {automationStatus === "active" ? "Active" : "Inactive"}
          </Badge>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Gas Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Gas Type</DialogTitle>
                <DialogDescription>Enter the details for the new gas type.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddItem}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="gasType">Gas Type</Label>
                    <Input id="gasType" name="gasType" value={formData.gasType} onChange={handleInputChange} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="price">Price per kg</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Gas Type</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle>Cylinder-Based Stock Management</CardTitle>
          <CardDescription>Track your gas inventory by managing individual cylinders</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            The system now tracks individual cylinders for each gas type. Add different cylinder sizes and quantities to
            accurately manage your inventory. Stock levels are automatically calculated based on the total volume of all
            cylinders.
          </p>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Consumption is automatically tracked when cylinder counts change
        </CardFooter>
      </Card>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="consumption">Consumption Analytics</TabsTrigger>
          <TabsTrigger value="history">Stock History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Gas Inventory</CardTitle>
              <CardDescription>Manage your gas inventory by cylinder</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <p>Loading stock items...</p>
                </div>
              ) : stockItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No stock items found</h3>
                  <p className="text-sm text-muted-foreground">Add your first gas type to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gas Type</TableHead>
                      <TableHead>Price per kg</TableHead>
                      <TableHead>Total Cylinders</TableHead>
                      <TableHead>Total Stock (kg)</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.gasType}</TableCell>
                        <TableCell>${item.price.toFixed(2)}</TableCell>
                        <TableCell>
                          {item.cylinders?.reduce((total, cylinder) => total + cylinder.count, 0) || 0}
                        </TableCell>
                        <TableCell>{item.stock.toFixed(2)} kg</TableCell>
                        <TableCell>{new Date(item.lastUpdated).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
                              <Link href={`/dashboard/stock/cylinders/${item.id}`}>
                                <Package className="h-4 w-4" />
                                Manage Cylinders
                              </Link>
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleEditClick(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumption">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Gas Consumption Analytics</h3>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedGasType || "all"}
                onValueChange={(value) => setSelectedGasType(value || undefined)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by gas type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gas Types</SelectItem>
                  {stockItems.map((item) => (
                    <SelectItem key={item.id} value={item.gasType}>
                      {item.gasType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <GasConsumptionGraph gasType={selectedGasType} refreshTrigger={refreshTrigger} showRestockEvents={true} />

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Cylinder Inventory</CardTitle>
                <CardDescription>Current cylinder inventory by gas type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {stockItems.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <h3 className="font-medium">{item.gasType}</h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {item.cylinders && item.cylinders.length > 0 ? (
                          item.cylinders.map((cylinder) => (
                            <div key={cylinder.id} className="rounded-lg border p-3">
                              <div className="text-sm font-medium">{cylinder.size} kg Cylinder</div>
                              <div className="mt-1 text-xl font-bold">{cylinder.count} units</div>
                              <div className="text-xs text-muted-foreground">
                                Total: {(cylinder.size * cylinder.count).toFixed(2)} kg
                              </div>
                              {cylinder.lastRestocked && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Last restocked: {new Date(cylinder.lastRestocked).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-sm text-muted-foreground">
                            No cylinders added for this gas type
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Stock History</h3>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedGasType || "all"}
                onValueChange={(value) => setSelectedGasType(value || undefined)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by gas type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gas Types</SelectItem>
                  {stockItems.map((item) => (
                    <SelectItem key={item.id} value={item.gasType}>
                      {item.gasType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <StockHistory gasType={selectedGasType} showRestockEvents={true} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gas Type</DialogTitle>
            <DialogDescription>Update the details for this gas type.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateItem}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-gasType">Gas Type</Label>
                <Input
                  id="edit-gasType"
                  name="gasType"
                  value={formData.gasType}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Price per kg</Label>
                <Input
                  id="edit-price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Update Gas Type</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

