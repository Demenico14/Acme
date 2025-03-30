"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { getAuth, sendPasswordResetEmail } from "firebase/auth"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import {
  Users,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Upload,
  Key,
  UserPlus,
  Mail,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react"

import { db } from "@/lib/firebase"
import type { User, NewUserData } from "@/types"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

// Add the import at the top of the file
import { createUserWithAdmin } from "@/app/actions/user-actions"
import { createUserWithClientSDK } from "@/app/actions/user-actions"

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const itemsPerPage = 10
  const { toast } = useToast()
  const auth = getAuth()
  const storage = getStorage()

  // New user form state
  const [newUserData, setNewUserData] = useState<NewUserData>({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "customer",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    IdNumber: "",
    profileImageUrl: "",
    status: "active",
    notes: "",
  })

  // Password confirmation state
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]
      setUsers(usersData)
      setFilteredUsers(usersData)
      setTotalPages(Math.ceil(usersData.length / itemsPerPage))
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const applyFilters = useCallback(() => {
    let result = [...users]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.phone && user.phone.toLowerCase().includes(query)) ||
          (user.IdNumber && user.IdNumber.toLowerCase().includes(query)),
      )
    }

    // Apply role filter
    if (roleFilter !== "all") {
      result = result.filter((user) => user.role === roleFilter)
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((user) => user.status === statusFilter)
    }

    setFilteredUsers(result)
    setTotalPages(Math.ceil(result.length / itemsPerPage))
    setCurrentPage(1) // Reset to first page when filters change
  }, [users, searchQuery, roleFilter, statusFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    // Apply filters whenever search query or filters change
    applyFilters()
  }, [searchQuery, roleFilter, statusFilter, users, applyFilters])

  function handleNewUserInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target

    // Handle nested address fields
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1]
      setNewUserData((prev) => ({
        ...prev,
        address: {
          ...prev.address!,
          [addressField]: value,
        },
      }))
    } else {
      setNewUserData((prev) => ({ ...prev, [name]: value }))
    }
  }

  function handleSelectChange(name: string, value: string) {
    setNewUserData((prev) => ({ ...prev, [name]: value }))
  }

  function validatePassword() {
    if (newUserData.password !== passwordConfirm) {
      setPasswordError("Passwords do not match")
      return false
    }

    if (newUserData.password.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return false
    }

    setPasswordError("")
    return true
  }

  async function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)

      // Create a reference to the storage location
      const storageRef = ref(storage, `profile-images/${Date.now()}_${file.name}`)

      // Upload the file
      await uploadBytes(storageRef, file)

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef)

      // Update the form data with the image URL
      setNewUserData((prev) => ({
        ...prev,
        profileImageUrl: downloadURL,
      }))

      toast({
        title: "Success",
        description: "Profile image uploaded successfully",
      })
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Error",
        description: "Failed to upload profile image",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()

    // Validate password
    if (!validatePassword()) return

    // Validate phone number if provided
    if (newUserData.phone && newUserData.phone.trim()) {
      // Simple validation - could be enhanced
      if (!/^\+?[1-9]\d{1,14}$/.test(newUserData.phone)) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid phone number in international format (e.g., +12025550123)",
          variant: "destructive",
        })
        return
      }
    }

    try {
      // First try with Admin SDK
      let result = await createUserWithAdmin(newUserData)

      // If admin SDK fails, try client SDK as fallback
      if (!result.success) {
        toast({
          title: "Warning",
          description: "Admin user creation failed, trying alternative method...",
        })

        result = await createUserWithClientSDK(newUserData)
      }

      if (result.success) {
        toast({
          title: "Success",
          description: "User added successfully",
        })

        // Reset form and close dialog
        setIsAddDialogOpen(false)
        setNewUserData({
          name: "",
          email: "",
          password: "",
          phone: "",
          role: "customer",
          address: {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
          },
          IdNumber: "",
          profileImageUrl: "",
          status: "active",
          notes: "",
        })
        setPasswordConfirm("")
        fetchUsers()
      } else {
        throw new Error(result.error || "Failed to create user")
      }
    } catch (error: unknown) {
      console.error("Error adding user:", error)

      // Check if the error is about the email already being in use
      const errorMessage = error instanceof Error ? error.message : "Failed to add user"

      if (errorMessage.includes("already in use")) {
        toast({
          title: "Email Already Exists",
          description: "A user with this email already exists. Try a different email address.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    }
  }

  function handleViewUser(user: User) {
    setCurrentUser(user)
    setIsViewDialogOpen(true)
  }

  function handleEditClick(user: User) {
    setCurrentUser(user)
    // Convert user data to the form format
    setNewUserData({
      name: user.name,
      email: user.email,
      password: "", // We don't store or display passwords
      phone: user.phone || "",
      role: user.role,
      address: user.address || {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      IdNumber: user.IdNumber || "",
      profileImageUrl: user.profileImageUrl || "",
      status: user.status || "active",
      notes: user.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  function handleResetPasswordClick(user: User) {
    setCurrentUser(user)
    setIsResetPasswordDialogOpen(true)
  }

  async function handleResetPassword() {
    if (!currentUser) return

    try {
      // Send password reset email
      await sendPasswordResetEmail(auth, currentUser.email)

      toast({
        title: "Success",
        description: "Password reset email sent successfully",
      })

      setIsResetPasswordDialogOpen(false)
    } catch (error: unknown) {
      console.error("Error resetting password:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to send password reset email"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) return

    try {
      // Prepare updated user data (without password field)
      const updatedUserData = { ...newUserData }

      await updateDoc(doc(db, "users", currentUser.id), {
        ...updatedUserData,
        updatedAt: new Date().toISOString(),
      })

      toast({
        title: "Success",
        description: "User updated successfully",
      })

      setIsEditDialogOpen(false)
      setCurrentUser(null)
      fetchUsers()
    } catch (error: unknown) {
      console.error("Error updating user:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update user"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  async function handleDeleteUser(id: string) {
    try {
      await deleteDoc(doc(db, "users", id))

      toast({
        title: "Success",
        description: "User deleted successfully",
      })

      fetchUsers()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage)
  }

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" /> Active
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="secondary" className="bg-red-500">
            <XCircle className="mr-1 h-3 w-3" /> Inactive
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" /> Pending
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage your system users and their permissions</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add New User
          </Button>
          <Button variant="outline" onClick={fetchUsers} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 min-w-[150px]">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <p>Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Users className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No users found</h3>
              <p className="text-sm text-muted-foreground">
                {users.length > 0 ? "Try adjusting your search or filters" : "Add your first user to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCurrentPageItems().map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {user.profileImageUrl ? <AvatarImage src={user.profileImageUrl} alt={user.name} /> : null}
                            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            {user.IdNumber && <div className="text-xs text-muted-foreground">{user.IdNumber}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{user.email}</span>
                          {user.phone && <span className="text-xs text-muted-foreground">{user.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin" ? "default" : user.role === "employee" ? "outline" : "secondary"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderStatusBadge(user.status || "active")}</TableCell>
                      <TableCell>
                        <div className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          Last login: {new Date(user.lastLogin).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleViewUser(user)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleResetPasswordClick(user)}>
                            <Key className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the user account and remove
                                  their data from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {filteredUsers.length > 0 && (
          <CardFooter>
            <div className="flex w-full items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min(filteredUsers.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
                {Math.min(filteredUsers.length, currentPage * itemsPerPage)} of {filteredUsers.length} users
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} />
                  </PaginationItem>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show first page, last page, current page, and pages around current
                    let pageToShow: number | null = null

                    if (i === 0) pageToShow = 1
                    else if (i === 4) pageToShow = totalPages
                    else if (totalPages <= 5) pageToShow = i + 1
                    else {
                      // For middle pages, show current and surrounding
                      const middleIndex = Math.min(Math.max(currentPage, 3), totalPages - 2)
                      pageToShow = middleIndex - 2 + i
                    }

                    if (pageToShow === null) return null

                    // Show ellipsis if needed
                    if ((i === 1 && pageToShow > 2) || (i === 3 && pageToShow < totalPages - 1)) {
                      return (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )
                    }

                    return (
                      <PaginationItem key={pageToShow}>
                        <PaginationLink
                          isActive={currentPage === pageToShow}
                          onClick={() => setCurrentPage(pageToShow!)}
                        >
                          {pageToShow}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}

                  <PaginationItem>
                    <PaginationNext onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account with detailed information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="contact">Contact Details</TabsTrigger>
                <TabsTrigger value="settings">Account Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 py-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={newUserData.name}
                      onChange={handleNewUserInputChange}
                      required
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={newUserData.email}
                      onChange={handleNewUserInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={newUserData.password}
                        onChange={handleNewUserInputChange}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label htmlFor="passwordConfirm">Confirm Password *</Label>
                    <Input
                      id="passwordConfirm"
                      type={showPassword ? "text" : "password"}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {passwordError && <div className="text-sm text-destructive">{passwordError}</div>}

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      name="role"
                      value={newUserData.role}
                      onValueChange={(value) => handleSelectChange("role", value)}
                      required
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      name="status"
                      value={newUserData.status}
                      onValueChange={(value) => handleSelectChange("status", value)}
                      required
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="IdNumber">IdNumber</Label>
                  <Input
                    id="IdNumber"
                    name="IdNumber"
                    value={newUserData.IdNumber}
                    onChange={handleNewUserInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Profile Image</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      {newUserData.profileImageUrl ? (
                        <AvatarImage src={newUserData.profileImageUrl} alt="Profile" />
                      ) : null}
                      <AvatarFallback>
                        {newUserData.name ? newUserData.name.substring(0, 2).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploading ? "Uploading..." : "Upload Image"}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={newUserData.phone}
                    onChange={handleNewUserInputChange}
                    placeholder="+12025550123"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter phone number in international format (e.g., +12025550123)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address.street">Street Address</Label>
                  <Input
                    id="address.street"
                    name="address.street"
                    value={newUserData.address?.street}
                    onChange={handleNewUserInputChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address.city">City</Label>
                    <Input
                      id="address.city"
                      name="address.city"
                      value={newUserData.address?.city}
                      onChange={handleNewUserInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address.state">State/Province</Label>
                    <Input
                      id="address.state"
                      name="address.state"
                      value={newUserData.address?.state}
                      onChange={handleNewUserInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address.zipCode">Postal/Zip Code</Label>
                    <Input
                      id="address.zipCode"
                      name="address.zipCode"
                      value={newUserData.address?.zipCode}
                      onChange={handleNewUserInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address.country">Country</Label>
                    <Input
                      id="address.country"
                      name="address.country"
                      value={newUserData.address?.country}
                      onChange={handleNewUserInputChange}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={newUserData.notes}
                    onChange={handleNewUserInputChange}
                    placeholder="Additional information about this user..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="sendWelcomeEmail" />
                    <Label htmlFor="sendWelcomeEmail">Send welcome email</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The user will receive an email with login instructions.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and settings.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="contact">Contact Details</TabsTrigger>
                <TabsTrigger value="settings">Account Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 py-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="edit-name">Full Name *</Label>
                    <Input
                      id="edit-name"
                      name="name"
                      value={newUserData.name}
                      onChange={handleNewUserInputChange}
                      required
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label htmlFor="edit-email">Email Address *</Label>
                    <Input
                      id="edit-email"
                      name="email"
                      type="email"
                      value={newUserData.email}
                      onChange={handleNewUserInputChange}
                      required
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="edit-role">Role *</Label>
                    <Select
                      name="role"
                      value={newUserData.role}
                      onValueChange={(value) => handleSelectChange("role", value)}
                      required
                    >
                      <SelectTrigger id="edit-role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label htmlFor="edit-status">Status *</Label>
                    <Select
                      name="status"
                      value={newUserData.status}
                      onValueChange={(value) => handleSelectChange("status", value)}
                      required
                    >
                      <SelectTrigger id="edit-status">
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-IdNumber">IdNumber</Label>
                  <Input
                    id="edit-IdNumber"
                    name="IdNumber"
                    value={newUserData.IdNumber}
                    onChange={handleNewUserInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Profile Image</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      {newUserData.profileImageUrl ? (
                        <AvatarImage src={newUserData.profileImageUrl} alt="Profile" />
                      ) : null}
                      <AvatarFallback>
                        {newUserData.name ? newUserData.name.substring(0, 2).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleProfileImageUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploading ? "Uploading..." : "Upload Image"}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input id="edit-phone" name="phone" value={newUserData.phone} onChange={handleNewUserInputChange} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-address-street">Street Address</Label>
                  <Input
                    id="edit-address-street"
                    name="address.street"
                    value={newUserData.address?.street}
                    onChange={handleNewUserInputChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-address-city">City</Label>
                    <Input
                      id="edit-address-city"
                      name="address.city"
                      value={newUserData.address?.city}
                      onChange={handleNewUserInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-address-state">State/Province</Label>
                    <Input
                      id="edit-address-state"
                      name="address.state"
                      value={newUserData.address?.state}
                      onChange={handleNewUserInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-address-zipCode">Postal/Zip Code</Label>
                    <Input
                      id="edit-address-zipCode"
                      name="address.zipCode"
                      value={newUserData.address?.zipCode}
                      onChange={handleNewUserInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-address-country">Country</Label>
                    <Input
                      id="edit-address-country"
                      name="address.country"
                      value={newUserData.address?.country}
                      onChange={handleNewUserInputChange}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    value={newUserData.notes}
                    onChange={handleNewUserInputChange}
                    placeholder="Additional information about this user..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Reset Password</h4>
                    <p className="text-xs text-muted-foreground">Send a password reset email to this user</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false)
                      handleResetPasswordClick(currentUser!)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Key className="h-4 w-4" />
                    Reset Password
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View detailed information about this user.</DialogDescription>
          </DialogHeader>

          {currentUser && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                    {currentUser.profileImageUrl ? (
                      <AvatarImage src={currentUser.profileImageUrl} alt={currentUser.name} />
                    ) : null}
                    <AvatarFallback className="text-xl">
                      {currentUser.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="text-lg font-bold">{currentUser.name}</h3>
                    <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Role</h4>
                      <p>{currentUser.role}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                      <p>{renderStatusBadge(currentUser.status || "active")}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Created</h4>
                      <p>{new Date(currentUser.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Last Login</h4>
                      <p>{new Date(currentUser.lastLogin).toLocaleString()}</p>
                    </div>
                    {currentUser.IdNumber && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">IdNumber</h4>
                        <p>{currentUser.IdNumber}</p>
                      </div>
                    )}
                    {currentUser.phone && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Phone</h4>
                        <p>{currentUser.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {currentUser.address && Object.values(currentUser.address).some((value) => value) && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Address</h3>
                  <div className="space-y-1">
                    {currentUser.address.street && <p>{currentUser.address.street}</p>}
                    <p>
                      {[currentUser.address.city, currentUser.address.state, currentUser.address.zipCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {currentUser.address.country && <p>{currentUser.address.country}</p>}
                  </div>
                </div>
              )}

              {currentUser.notes && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Notes</h3>
                  <p className="text-sm">{currentUser.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false)
                    handleEditClick(currentUser)
                  }}
                >
                  Edit User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>Send a password reset email to {currentUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              This will send an email to the user with instructions to reset their password. The current password will
              continue to work until they complete the reset process.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Reset Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

