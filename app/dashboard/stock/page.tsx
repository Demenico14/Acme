"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore"
import { Package, Plus, Edit, Trash2 } from "lucide-react"

import { db } from "@/lib/firebase"
import type { StockItem } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function StockPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState<StockItem | null>(null)
  const [formData, setFormData] = useState({
    gasType: "",
    price: "",
    stock: "",
  })
  const { toast } = useToast()

  const fetchStockItems = useCallback(async () => {
    try {
      setLoading(true)
      const stockSnapshot = await getDocs(collection(db, "stock"))
      const stockData = stockSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StockItem[]
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

  useEffect(() => {
    fetchStockItems()
  }, [fetchStockItems])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    try {
      const newItem = {
        gasType: formData.gasType,
        price: Number.parseFloat(formData.price),
        stock: Number.parseFloat(formData.stock),
      }

      await addDoc(collection(db, "stock"), newItem)

      toast({
        title: "Success",
        description: "Stock item added successfully",
      })

      setIsAddDialogOpen(false)
      setFormData({ gasType: "", price: "", stock: "" })
      fetchStockItems()
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
      stock: item.stock.toString(),
    })
    setIsEditDialogOpen(true)
  }

  async function handleUpdateItem(e: React.FormEvent) {
    e.preventDefault()
    if (!currentItem) return

    try {
      const updatedItem = {
        gasType: formData.gasType,
        price: Number.parseFloat(formData.price),
        stock: Number.parseFloat(formData.stock),
      }

      await updateDoc(doc(db, "stock", currentItem.id), updatedItem)

      toast({
        title: "Success",
        description: "Stock item updated successfully",
      })

      setIsEditDialogOpen(false)
      setCurrentItem(null)
      setFormData({ gasType: "", price: "", stock: "" })
      fetchStockItems()
    } catch (error) {
      console.error("Error updating stock item:", error)
      toast({
        title: "Error",
        description: "Failed to update stock item",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteItem(id: string) {
    if (confirm("Are you sure you want to delete this item?")) {
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
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Stock Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Stock Item</DialogTitle>
              <DialogDescription>Enter the details for the new stock item.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddItem}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="gasType">Gas Type</Label>
                  <Input id="gasType" name="gasType" value={formData.gasType} onChange={handleInputChange} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Price</Label>
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
                <div className="grid gap-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    step="0.01"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Item</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Stock Item</DialogTitle>
              <DialogDescription>Update the details for this stock item.</DialogDescription>
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
                  <Label htmlFor="edit-price">Price</Label>
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
                <div className="grid gap-2">
                  <Label htmlFor="edit-stock">Stock Quantity</Label>
                  <Input
                    id="edit-stock"
                    name="stock"
                    type="number"
                    step="0.01"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Update Item</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Inventory</CardTitle>
          <CardDescription>Manage your gas inventory</CardDescription>
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
              <p className="text-sm text-muted-foreground">Add your first stock item to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gas Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock Quantity</TableHead>

                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.gasType}</TableCell>
                    <TableCell>${item.price.toFixed(2)}</TableCell>
                    <TableCell>{item.stock.toFixed(2)}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
    </div>
  )
}

