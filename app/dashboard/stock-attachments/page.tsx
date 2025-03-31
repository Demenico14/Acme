"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Package, Plus, Edit, Trash2, Cylinder, Settings } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Define the StockAttachment interface
interface StockAttachment {
  id: string
  name: string
  type: string
  serialNumber: string
  purchaseDate: string
  condition: string
  location: string
  notes: string
  lastInspection: string
  nextInspection: string
  capacity?: number
}

export default function StockAttachmentsPage() {
  const [attachments, setAttachments] = useState<StockAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentAttachment, setCurrentAttachment] = useState<StockAttachment | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    type: "cylinder",
    serialNumber: "",
    purchaseDate: "",
    condition: "good",
    location: "",
    notes: "",
    lastInspection: "",
    nextInspection: "",
    capacity: 0,
  })
  const { toast } = useToast()

  const fetchAttachments = useCallback(async () => {
    try {
      setLoading(true)
      const attachmentsSnapshot = await getDocs(collection(db, "stockAttachments"))
      const attachmentsData = attachmentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StockAttachment[]
      setAttachments(attachmentsData)
    } catch (error) {
      console.error("Error fetching attachments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch attachments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function handleSelectChange(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleAddAttachment(e: React.FormEvent) {
    e.preventDefault()
    try {
      const newAttachment = {
        ...formData,
        purchaseDate: formData.purchaseDate || new Date().toISOString().split("T")[0],
        lastInspection: formData.lastInspection || new Date().toISOString().split("T")[0],
        nextInspection: formData.nextInspection || new Date().toISOString().split("T")[0],
      }

      await addDoc(collection(db, "stockAttachments"), newAttachment)

      toast({
        title: "Success",
        description: "Attachment added successfully",
      })

      setIsAddDialogOpen(false)
      setFormData({
        name: "",
        type: "cylinder",
        serialNumber: "",
        purchaseDate: "",
        condition: "good",
        location: "",
        notes: "",
        lastInspection: "",
        nextInspection: "",
        capacity: 0,
      })
      fetchAttachments()
    } catch (error) {
      console.error("Error adding attachment:", error)
      toast({
        title: "Error",
        description: "Failed to add attachment",
        variant: "destructive",
      })
    }
  }

  function handleEditClick(attachment: StockAttachment) {
    setCurrentAttachment(attachment)
    setFormData({
      name: attachment.name,
      type: attachment.type,
      serialNumber: attachment.serialNumber,
      purchaseDate: attachment.purchaseDate,
      condition: attachment.condition,
      location: attachment.location,
      notes: attachment.notes,
      lastInspection: attachment.lastInspection,
      nextInspection: attachment.nextInspection,
      capacity: attachment.capacity || 0,
    })
    setIsEditDialogOpen(true)
  }

  async function handleUpdateAttachment(e: React.FormEvent) {
    e.preventDefault()
    if (!currentAttachment) return

    try {
      const updatedAttachment = {
        ...formData,
        purchaseDate: formData.purchaseDate || new Date().toISOString().split("T")[0],
        lastInspection: formData.lastInspection || new Date().toISOString().split("T")[0],
        nextInspection: formData.nextInspection || new Date().toISOString().split("T")[0],
      }

      await updateDoc(doc(db, "stockAttachments", currentAttachment.id), updatedAttachment)

      toast({
        title: "Success",
        description: "Attachment updated successfully",
      })

      setIsEditDialogOpen(false)
      setCurrentAttachment(null)
      setFormData({
        name: "",
        type: "cylinder",
        serialNumber: "",
        purchaseDate: "",
        condition: "good",
        location: "",
        notes: "",
        lastInspection: "",
        nextInspection: "",
        capacity: 0,
      })
      fetchAttachments()
    } catch (error) {
      console.error("Error updating attachment:", error)
      toast({
        title: "Error",
        description: "Failed to update attachment",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteAttachment(id: string) {
    if (confirm("Are you sure you want to delete this attachment?")) {
      try {
        await deleteDoc(doc(db, "stockAttachments", id))

        toast({
          title: "Success",
          description: "Attachment deleted successfully",
        })

        fetchAttachments()
      } catch (error) {
        console.error("Error deleting attachment:", error)
        toast({
          title: "Error",
          description: "Failed to delete attachment",
          variant: "destructive",
        })
      }
    }
  }

  // Function to get icon based on attachment type
  function getAttachmentIcon(type: string) {
    switch (type.toLowerCase()) {
      case "cylinder":
        return <Cylinder className="h-5 w-5" />
      case "manifold":
        return <Settings className="h-5 w-5" />
      default:
        return <Package className="h-5 w-5" />
    }
  }

  // Function to get color based on condition
  function getConditionColor(condition: string) {
    switch (condition.toLowerCase()) {
      case "excellent":
        return "text-green-600"
      case "good":
        return "text-blue-600"
      case "fair":
        return "text-yellow-600"
      case "poor":
        return "text-orange-600"
      case "critical":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Equipment & Attachments</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Equipment</DialogTitle>
              <DialogDescription>Enter the details for the new equipment or attachment.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAttachment}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      name="type"
                      value={formData.type}
                      onValueChange={(value) => handleSelectChange("type", value)}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cylinder">Cylinder</SelectItem>
                        <SelectItem value="manifold">Manifold</SelectItem>
                        <SelectItem value="regulator">Regulator</SelectItem>
                        <SelectItem value="valve">Valve</SelectItem>
                        <SelectItem value="hose">Hose</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    name="serialNumber"
                    value={formData.serialNumber}
                    onChange={handleInputChange}
                  />
                </div>

                {formData.type === "cylinder" && (
                  <div className="grid gap-2">
                    <Label htmlFor="capacity">Capacity (kg)</Label>
                    <Input
                      id="capacity"
                      name="capacity"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.capacity || ""}
                      onChange={handleInputChange}
                      required={formData.type === "cylinder"}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                      id="purchaseDate"
                      name="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      name="condition"
                      value={formData.condition}
                      onValueChange={(value) => handleSelectChange("condition", value)}
                    >
                      <SelectTrigger id="condition">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" value={formData.location} onChange={handleInputChange} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="lastInspection">Last Inspection</Label>
                    <Input
                      id="lastInspection"
                      name="lastInspection"
                      type="date"
                      value={formData.lastInspection}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nextInspection">Next Inspection</Label>
                    <Input
                      id="nextInspection"
                      name="nextInspection"
                      type="date"
                      value={formData.nextInspection}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional information about this equipment"
                    className="min-h-[80px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Equipment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Equipment</DialogTitle>
              <DialogDescription>Update the details for this equipment or attachment.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateAttachment}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-type">Type</Label>
                    <Select
                      name="type"
                      value={formData.type}
                      onValueChange={(value) => handleSelectChange("type", value)}
                    >
                      <SelectTrigger id="edit-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cylinder">Cylinder</SelectItem>
                        <SelectItem value="manifold">Manifold</SelectItem>
                        <SelectItem value="regulator">Regulator</SelectItem>
                        <SelectItem value="valve">Valve</SelectItem>
                        <SelectItem value="hose">Hose</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-serialNumber">Serial Number</Label>
                  <Input
                    id="edit-serialNumber"
                    name="serialNumber"
                    value={formData.serialNumber}
                    onChange={handleInputChange}
                  />
                </div>

                {formData.type === "cylinder" && (
                  <div className="grid gap-2">
                    <Label htmlFor="capacity">Capacity (kg)</Label>
                    <Input
                      id="capacity"
                      name="capacity"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.capacity || ""}
                      onChange={handleInputChange}
                      required={formData.type === "cylinder"}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-purchaseDate">Purchase Date</Label>
                    <Input
                      id="edit-purchaseDate"
                      name="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-condition">Condition</Label>
                    <Select
                      name="condition"
                      value={formData.condition}
                      onValueChange={(value) => handleSelectChange("condition", value)}
                    >
                      <SelectTrigger id="edit-condition">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input id="edit-location" name="location" value={formData.location} onChange={handleInputChange} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-lastInspection">Last Inspection</Label>
                    <Input
                      id="edit-lastInspection"
                      name="lastInspection"
                      type="date"
                      value={formData.lastInspection}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-nextInspection">Next Inspection</Label>
                    <Input
                      id="edit-nextInspection"
                      name="nextInspection"
                      type="date"
                      value={formData.nextInspection}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional information about this equipment"
                    className="min-h-[80px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Update Equipment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipment & Attachments Inventory</CardTitle>
          <CardDescription>Manage your gas equipment, cylinders, manifolds and other attachments</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <p>Loading equipment...</p>
            </div>
          ) : attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No equipment found</h3>
              <p className="text-sm text-muted-foreground">Add your first equipment item to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Next Inspection</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attachments.map((attachment) => (
                  <TableRow key={attachment.id}>
                    <TableCell className="font-medium">{attachment.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAttachmentIcon(attachment.type)}
                        <span className="capitalize">{attachment.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{attachment.serialNumber || "—"}</TableCell>
                    <TableCell>
                      <span className={`capitalize ${getConditionColor(attachment.condition)}`}>
                        {attachment.condition}
                      </span>
                    </TableCell>
                    <TableCell>{attachment.location || "—"}</TableCell>
                    <TableCell>{new Date(attachment.nextInspection).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditClick(attachment)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDeleteAttachment(attachment.id)}>
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

