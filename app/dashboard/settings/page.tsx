"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { User, Download, Upload, Shield, Database, Moon, Sun, Laptop, Save } from "lucide-react"

import { useAuth } from "@/context/auth-context"
import { useTheme } from "@/components/theme-provider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
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

import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore"
import { updateProfile, deleteUser } from "firebase/auth"
import { db } from "@/lib/firebase"
import type { Transaction, StockItem, User as UserType, StockAttachment } from "@/types"
import { MerchantConfigForm } from "@/components/merchant/merchant-config-form"

// Create a global settings context to share settings across the application

// Define types for CSV data and backup data
interface CsvTransactionData {
  id?: string
  date?: string
  gasType?: string
  quantity?: string | number
  kgs?: string | number
  totalPrice?: string | number
  total?: string | number
  currency?: string
  paymentMethod?: string
  [key: string]: string | number | undefined // For any other fields in the CSV
}

// Generic type for CSV data
interface CsvData {
  [key: string]: string | number | undefined
}

// Type for backup transaction data
interface BackupTransaction extends Omit<Transaction, "id"> {
  id?: string
  userId?: string
  // Credit transaction fields
  cardDetails?: Record<string, string>
  customerName?: string
  dueDate?: string
  paid?: boolean
  paidDate?: string
  phoneNumber?: string
  // Allow other dynamic properties
  [key: string]: string | number | boolean | undefined | Record<string, string>
}

// Type for backup stock item data
interface Cylinder {
  serialNumber: string
  capacity: number
  lastInspectionDate: string
  nextInspectionDate: string
  status: "in_stock" | "in_use" | "out_of_service"
}

interface BackupStockItem {
  id?: string
  gasType: string
  price: number
  stock: number
  lastUpdated: string
  cylinders: Cylinder[] // Make this required to match StockItem
  [key: string]: string | number | boolean | undefined | Cylinder[] // Include Cylinder[] in index signature
}

interface AppSettingsContextType {
  appSettings: {
    language: string
    currency: string
    dateFormat: string
    autoLogout: string
  }
  updateAppSettings: (settings: Partial<AppSettingsContextType["appSettings"]>) => void
}

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const router = useRouter()

  // Refs for file inputs
  const csvFileRef = useRef<HTMLInputElement>(null)
  const jsonFileRef = useRef<HTMLInputElement>(null)
  const backupFileRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const [profileForm, setProfileForm] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    company: "",
  })

  // CSV utility function with proper typing
  const convertToCSV = <T extends CsvData>(data: T[]): string => {
    if (!data || data.length === 0) return ""

    // Get headers from the first object
    const headers = Object.keys(data[0] || {})

    // Create CSV header row
    const csvRows = [headers.join(",")]

    // Add data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header]
        // Handle strings with commas by wrapping in quotes
        return typeof value === "string" && value.includes(",") ? `"${value}"` : String(value)
      })
      csvRows.push(values.join(","))
    }

    return csvRows.join("\n")
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true)

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Update displayName in Firebase Auth
      if (user.displayName !== profileForm.name) {
        await updateProfile(user, {
          displayName: profileForm.name,
        })
      }

      // Store additional profile data in Firestore
      const userRef = doc(db, "users", user.uid)

      // Check if user document exists
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(userRef, {
          name: profileForm.name,
          phone: profileForm.phone,
          company: profileForm.company,
          updatedAt: new Date().toISOString(),
        })
      } else {
        // Create new user document if it doesn't exist
        await setDoc(userRef, {
          id: user.uid,
          name: profileForm.name,
          email: user.email,
          phone: profileForm.phone,
          company: profileForm.company,
          role: "customer", // Default role
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        })
      }

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Update Failed",
        description: "There was a problem updating your profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Define the return type for fetchAllData
  interface AllData {
    currentUser: Record<string, unknown> | null
    users: UserType[]
    transactions: Transaction[]
    stock: StockItem[]
    stockAttachments?: StockAttachment[]
  }

  // Fetch all data for export or backup
  const fetchAllData = async (): Promise<AllData> => {
    if (!user) {
      throw new Error("User not authenticated")
    }

    // Fetch user data
    const userRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userRef)
    const userData = userDoc.exists() ? userDoc.data() : null

    // Fetch all users
    const usersSnapshot = await getDocs(collection(db, "users"))
    const allUsers = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserType[]

    // Fetch transactions
    const transactionsQuery = query(collection(db, "transactions"))
    const transactionsSnapshot = await getDocs(transactionsQuery)
    const transactions = transactionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[]

    // Fetch stock items
    const stockSnapshot = await getDocs(collection(db, "stock"))
    const stockItems = stockSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as StockItem[]

    // Fetch stock attachments if they exist
    let stockAttachments: StockAttachment[] = []
    try {
      const stockAttachmentsSnapshot = await getDocs(collection(db, "stockAttachments"))
      stockAttachments = stockAttachmentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StockAttachment[]
    } catch (error) {
      console.log("No stock attachments found or collection doesn't exist", error)
    }

    return {
      currentUser: userData,
      users: allUsers,
      transactions: transactions,
      stock: stockItems,
      stockAttachments: stockAttachments.length > 0 ? stockAttachments : undefined,
    }
  }

  const handleExportData = async (format: "csv" | "json") => {
    try {
      setIsExporting(true)

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Fetch all data
      const data = await fetchAllData()

      if (format === "json") {
        // JSON export - include all data
        const jsonData = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonData], { type: "application/json" })
        const url = URL.createObjectURL(blob)

        // Create download link
        const downloadLink = document.createElement("a")
        downloadLink.href = url
        downloadLink.download = `gas-management-export-${new Date().toISOString()}.json`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(url)
      } else {
        // For CSV, we'll create separate files for each data type
        // Transactions CSV
        const transactionsCSV = convertToCSV(
          data.transactions.map((t: Transaction) => ({
            id: t.id,
            date: new Date(t.date).toLocaleDateString(),
            gasType: t.gasType,
            quantity: t.kgs,
            totalPrice: t.total,
            currency: t.currency,
            paymentMethod: t.paymentMethod,
            createdAt: new Date(t.createdAt).toLocaleDateString(),
            // Add credit transaction fields if they exist
            ...(t.customerName && { customerName: t.customerName }),
            ...(t.phoneNumber && { phoneNumber: t.phoneNumber }),
            ...(t.dueDate && { dueDate: t.dueDate }),
            ...(t.paid !== undefined && { paid: t.paid ? "Yes" : "No" }),
            ...(t.paidDate && { paidDate: new Date(t.paidDate).toLocaleDateString() }),
          })),
        )

        // Stock CSV
        const stockCSV = convertToCSV(
          data.stock.map((s: StockItem) => ({
            id: s.id,
            gasType: s.gasType,
            price: s.price,
            stock: s.stock,
            lastUpdated: new Date(s.lastUpdated).toLocaleDateString(),
          })),
        )

        // Users CSV
        const usersCSV = convertToCSV(
          data.users.map((u: UserType) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone || "",
            role: u.role,
            status: u.status,
            createdAt: new Date(u.createdAt).toLocaleDateString(),
            lastLogin: new Date(u.lastLogin).toLocaleDateString(),
          })),
        )

        // Stock Attachments CSV if available
        let stockAttachmentsCSV = ""
        if (data.stockAttachments && data.stockAttachments.length > 0) {
          stockAttachmentsCSV = convertToCSV(
            data.stockAttachments.map((a: StockAttachment) => ({
              id: a.id,
              name: a.name,
              type: a.type,
              serialNumber: a.serialNumber,
              condition: a.condition,
              location: a.location,
              purchaseDate: new Date(a.purchaseDate).toLocaleDateString(),
              lastInspection: new Date(a.lastInspection).toLocaleDateString(),
              nextInspection: new Date(a.nextInspection).toLocaleDateString(),
            })),
          )
        }

        // Download transactions CSV
        const transactionsBlob = new Blob([transactionsCSV], { type: "text/csv;charset=utf-8;" })
        const transactionsUrl = URL.createObjectURL(transactionsBlob)
        const transactionsLink = document.createElement("a")
        transactionsLink.href = transactionsUrl
        transactionsLink.download = `transactions-${new Date().toISOString()}.csv`
        document.body.appendChild(transactionsLink)
        transactionsLink.click()
        document.body.removeChild(transactionsLink)
        URL.revokeObjectURL(transactionsUrl)

        // Download stock CSV
        const stockBlob = new Blob([stockCSV], { type: "text/csv;charset=utf-8;" })
        const stockUrl = URL.createObjectURL(stockBlob)
        const stockLink = document.createElement("a")
        stockLink.href = stockUrl
        stockLink.download = `stock-${new Date().toISOString()}.csv`
        document.body.appendChild(stockLink)
        stockLink.click()
        document.body.removeChild(stockLink)
        URL.revokeObjectURL(stockUrl)

        // Download users CSV
        const usersBlob = new Blob([usersCSV], { type: "text/csv;charset=utf-8;" })
        const usersUrl = URL.createObjectURL(usersBlob)
        const usersLink = document.createElement("a")
        usersLink.href = usersUrl
        usersLink.download = `users-${new Date().toISOString()}.csv`
        document.body.appendChild(usersLink)
        usersLink.click()
        document.body.removeChild(usersLink)
        URL.revokeObjectURL(usersUrl)

        // Download stock attachments CSV if available
        if (stockAttachmentsCSV) {
          const attachmentsBlob = new Blob([stockAttachmentsCSV], { type: "text/csv;charset=utf-8;" })
          const attachmentsUrl = URL.createObjectURL(attachmentsBlob)
          const attachmentsLink = document.createElement("a")
          attachmentsLink.href = attachmentsUrl
          attachmentsLink.download = `stock-attachments-${new Date().toISOString()}.csv`
          document.body.appendChild(attachmentsLink)
          attachmentsLink.click()
          document.body.removeChild(attachmentsLink)
          URL.revokeObjectURL(attachmentsUrl)
        }
      }

      toast({
        title: "Export Successful",
        description: `Your data has been exported as ${format.toUpperCase()}.`,
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        title: "Export Failed",
        description: "There was a problem exporting your data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportData = (format: "csv" | "json") => {
    if (format === "csv") {
      csvFileRef.current?.click()
    } else {
      jsonFileRef.current?.click()
    }
  }

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Read CSV file
      const text = await file.text()
      const rows = text.split("\n")
      const headers = rows[0].split(",")

      // Parse CSV data
      const transactions: CsvTransactionData[] = []
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue // Skip empty rows

        const values = rows[i].split(",")
        const transaction: CsvTransactionData = {}

        headers.forEach((header, index) => {
          transaction[header.trim()] = values[index]?.trim() || ""
        })

        transactions.push(transaction)
      }

      // Validate data
      if (!transactions.length) {
        throw new Error("No valid transactions found in the CSV file")
      }

      // Get stock items for reference
      const stockSnapshot = await getDocs(collection(db, "stock"))
      const stockItems = stockSnapshot.docs.map((doc) => ({
        id: doc.id,
        gasType: doc.data().gasType,
      }))

      // Batch write to Firestore
      const batch = writeBatch(db)
      const transactionsRef = collection(db, "transactions")

      for (const transaction of transactions) {
        // Find stock ID by gas type
        const stockItem = stockItems.find((s) => s.gasType === transaction.gasType)
        if (!stockItem) continue

        // Create new transaction document
        const newTransaction = {
          userId: user.uid,
          gasType: transaction.gasType,
          kgs: Number(transaction.quantity || transaction.kgs),
          total: Number(transaction.totalPrice || transaction.total),
          currency: transaction.currency || "USD",
          paymentMethod: transaction.paymentMethod || "Cash",
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }

        const newTransactionRef = doc(transactionsRef)
        batch.set(newTransactionRef, newTransaction)
      }

      await batch.commit()

      toast({
        title: "Import Successful",
        description: `${transactions.length} transactions have been imported.`,
      })

      // Reset file input
      e.target.value = ""
    } catch (error) {
      console.error("Error processing CSV:", error)
      toast({
        title: "Import Failed",
        description: "There was a problem importing your data. Please check the file format.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Define the structure for imported JSON data
  interface ImportedJsonData {
    transactions?: BackupTransaction[]
    stock?: BackupStockItem[]
    stockAttachments?: StockAttachment[]
    currentUser?: Record<string, unknown>
    users?: UserType[]
    [key: string]: unknown
  }

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Read and parse JSON file
      const text = await file.text()
      const data = JSON.parse(text) as ImportedJsonData

      // Validate data structure
      if (!data) {
        throw new Error("Invalid JSON format: data not found")
      }

      // Start batch operations
      const batch = writeBatch(db)

      // Import transactions if available
      if (data.transactions && Array.isArray(data.transactions)) {
        const transactionsRef = collection(db, "transactions")

        for (const transaction of data.transactions) {
          // Create new transaction document with base fields
          const newTransaction: Record<string, string | number | boolean | Record<string, string> | undefined> = {
            userId: user.uid,
            gasType: transaction.gasType,
            kgs: Number(transaction.kgs),
            total: Number(transaction.total),
            currency: transaction.currency || "USD",
            paymentMethod: transaction.paymentMethod || "Cash",
            date: transaction.date || new Date().toISOString(),
            createdAt: transaction.createdAt || new Date().toISOString(),
          }

          // Add credit transaction fields if they exist
          if (transaction.customerName) newTransaction.customerName = transaction.customerName
          if (transaction.phoneNumber) newTransaction.phoneNumber = transaction.phoneNumber
          if (transaction.dueDate) newTransaction.dueDate = transaction.dueDate
          if (transaction.paid !== undefined) newTransaction.paid = transaction.paid
          if (transaction.paidDate) newTransaction.paidDate = transaction.paidDate
          if (transaction.cardDetails) newTransaction.cardDetails = transaction.cardDetails

          const newTransactionRef = doc(transactionsRef)
          batch.set(newTransactionRef, newTransaction)
        }
      }

      // Import stock items if available
      if (data.stock && Array.isArray(data.stock)) {
        const stockRef = collection(db, "stock")

        // First, get existing stock items to avoid duplicates
        const existingStockSnapshot = await getDocs(stockRef)
        const existingStockItems = existingStockSnapshot.docs.map((doc) => ({
          id: doc.id,
          gasType: doc.data().gasType,
        }))

        for (const stockItem of data.stock) {
          // Check if this gas type already exists
          const existingItem = existingStockItems.find(
            (item) => item.gasType.toLowerCase() === stockItem.gasType.toLowerCase(),
          )

          if (existingItem) {
            // Update existing stock item
            batch.update(doc(db, "stock", existingItem.id), {
              price: Number(stockItem.price),
              stock: Number(stockItem.stock),
              lastUpdated: new Date().toISOString(),
            })
          } else {
            // Create new stock item
            const newStockRef = doc(stockRef)
            batch.set(newStockRef, {
              gasType: stockItem.gasType,
              price: Number(stockItem.price),
              stock: Number(stockItem.stock),
              lastUpdated: new Date().toISOString(),
            })
          }
        }
      }

      // Import stock attachments if available
      if (data.stockAttachments && Array.isArray(data.stockAttachments)) {
        const stockAttachmentsRef = collection(db, "stockAttachments")

        for (const attachment of data.stockAttachments) {
          const newAttachmentRef = doc(stockAttachmentsRef)
          batch.set(newAttachmentRef, {
            ...attachment,
            id: newAttachmentRef.id,
          })
        }
      }

      // Import users if available (except current user)
      if (data.users && Array.isArray(data.users)) {
        const usersRef = collection(db, "users")

        for (const userData of data.users) {
          // Skip the current user to avoid overwriting their data
          if (userData.id === user.uid) continue

          // Create or update user document
          batch.set(
            doc(usersRef, userData.id),
            {
              ...userData,
              lastImported: new Date().toISOString(),
            },
            { merge: true },
          )
        }
      }

      await batch.commit()

      toast({
        title: "Import Successful",
        description: "Your data has been imported successfully.",
      })

      // Reset file input
      e.target.value = ""
    } catch (error) {
      console.error("Error importing JSON:", error)
      toast({
        title: "Import Failed",
        description: "There was a problem importing your data. Please check the file format.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Define the structure for backup data
  interface BackupData extends AllData {
    metadata: {
      createdAt: string
      userId: string
      version: string
    }
  }

  const handleBackupDatabase = async () => {
    try {
      setIsBackingUp(true)

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Fetch all data
      const data = await fetchAllData()

      // Create backup object with metadata
      const backup: BackupData = {
        metadata: {
          createdAt: new Date().toISOString(),
          userId: user.uid,
          version: "1.0",
        },
        ...data,
      }

      // Convert to JSON and create download
      const jsonData = JSON.stringify(backup, null, 2)
      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      const downloadLink = document.createElement("a")
      downloadLink.href = url
      downloadLink.download = `gas-management-backup-${new Date().toISOString()}.json`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      URL.revokeObjectURL(url)

      toast({
        title: "Backup Successful",
        description: "Your database has been backed up successfully.",
      })
    } catch (error) {
      console.error("Error backing up database:", error)
      toast({
        title: "Backup Failed",
        description: "There was a problem backing up your database. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestoreDatabase = () => {
    backupFileRef.current?.click()
  }

  const handleBackupFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsRestoring(true)

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Read and parse backup file
      const text = await file.text()
      const backup = JSON.parse(text) as BackupData

      // Validate backup format
      if (!backup.metadata) {
        throw new Error("Invalid backup format: missing metadata")
      }

      // Confirm with user before proceeding
      if (!confirm("This will replace your current data. Are you sure you want to proceed?")) {
        setIsRestoring(false)
        return
      }

      // Start batch operations
      const batch = writeBatch(db)

      // Restore user data if it exists
      if (backup.currentUser) {
        const userRef = doc(db, "users", user.uid)
        batch.set(userRef, { ...backup.currentUser, id: user.uid }, { merge: true })
      }

      // Delete existing transactions for this user
      const existingTransactionsQuery = query(collection(db, "transactions"), where("userId", "==", user.uid))
      const existingTransactionsSnapshot = await getDocs(existingTransactionsQuery)
      existingTransactionsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      // Restore transactions
      if (backup.transactions && Array.isArray(backup.transactions)) {
        const transactionsRef = collection(db, "transactions")
        backup.transactions.forEach((transaction) => {
          const newTransactionRef = doc(transactionsRef)
          batch.set(newTransactionRef, {
            ...transaction,
            userId: user.uid,
            id: newTransactionRef.id,
          })
        })
      }

      // Restore stock items
      if (backup.stock && Array.isArray(backup.stock)) {
        // First, get existing stock items
        const stockRef = collection(db, "stock")
        const existingStockSnapshot = await getDocs(stockRef)
        const existingStockMap = new Map<string, string>()

        existingStockSnapshot.docs.forEach((doc) => {
          existingStockMap.set(doc.data().gasType, doc.id)
        })

        // Update or create stock items
        backup.stock.forEach((stockItem) => {
          const existingId = existingStockMap.get(stockItem.gasType)

          if (existingId) {
            // Update existing stock
            batch.update(doc(db, "stock", existingId), {
              price: Number(stockItem.price),
              stock: Number(stockItem.stock),
              lastUpdated: new Date().toISOString(),
            })
          } else {
            // Create new stock item
            const newStockRef = doc(stockRef)
            batch.set(newStockRef, {
              gasType: stockItem.gasType,
              price: Number(stockItem.price),
              stock: Number(stockItem.stock),
              lastUpdated: new Date().toISOString(),
            })
          }
        })
      }

      // Restore stock attachments if available
      if (backup.stockAttachments && Array.isArray(backup.stockAttachments)) {
        // First, delete existing stock attachments
        try {
          const existingAttachmentsSnapshot = await getDocs(collection(db, "stockAttachments"))
          existingAttachmentsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref)
          })
        } catch (error) {
          console.log("No existing stock attachments found", error)
        }

        // Add restored attachments
        const stockAttachmentsRef = collection(db, "stockAttachments")
        backup.stockAttachments.forEach((attachment: StockAttachment) => {
          const newAttachmentRef = doc(stockAttachmentsRef)
          batch.set(newAttachmentRef, {
            ...attachment,
            id: newAttachmentRef.id,
          })
        })
      }

      // Restore users if available (except current user)
      if (backup.users && Array.isArray(backup.users)) {
        const usersRef = collection(db, "users")

        for (const userData of backup.users) {
          // Skip the current user as we've already handled it
          if (userData.id === user.uid) continue

          // Create or update user document
          batch.set(
            doc(usersRef, userData.id),
            {
              ...userData,
              lastRestored: new Date().toISOString(),
            },
            { merge: true },
          )
        }
      }

      // Commit all changes
      await batch.commit()

      toast({
        title: "Restore Successful",
        description: "Your database has been restored successfully.",
      })

      // Reset file input
      e.target.value = ""
    } catch (error) {
      console.error("Error restoring database:", error)
      toast({
        title: "Restore Failed",
        description: "There was a problem restoring your database. Please check the backup file.",
        variant: "destructive",
      })
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true)

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Delete user data from Firestore first
      const userRef = doc(db, "users", user.uid)
      await deleteDoc(userRef)

      // Delete the user account from Firebase Auth
      await deleteUser(user)

      toast({
        title: "Account Deleted",
        description: "Your account has been deleted successfully. You will be redirected to the login page.",
      })

      // Sign out and redirect to login
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error deleting account:", error)
      toast({
        title: "Deletion Failed",
        description: "There was a problem deleting your account. Please try again.",
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

  // Add this useEffect to load user settings
  useEffect(() => {
    async function loadUserSettings() {
      if (!user) return

      try {
        const userRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()

          // Update profile form
          setProfileForm({
            name: userData.name || user.displayName || "",
            email: userData.email || user.email || "",
            phone: userData.phone || "",
            company: userData.company || "",
          })
        }
      } catch (error) {
        console.error("Error loading user settings:", error)
        toast({
          title: "Error",
          description: "Failed to load your settings. Please refresh the page.",
          variant: "destructive",
        })
      }
    }

    loadUserSettings()
  }, [user, toast])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      {/* Hidden file inputs */}
      <input type="file" ref={csvFileRef} onChange={handleCsvFileChange} accept=".csv" className="hidden" />
      <input type="file" ref={jsonFileRef} onChange={handleJsonFileChange} accept=".json" className="hidden" />
      <input type="file" ref={backupFileRef} onChange={handleBackupFileChange} accept=".json" className="hidden" />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="merchant">Merchant Config</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your personal information and account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    placeholder="Your full name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    placeholder="Your email address"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    placeholder="Your phone number"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    value={profileForm.company}
                    onChange={handleProfileChange}
                    placeholder="Your company name"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Theme Preferences</h3>
                <div className="flex items-center space-x-4">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                    className="flex items-center gap-2"
                  >
                    <Laptop className="h-4 w-4" />
                    System
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Security</h3>
                <Button variant="outline" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Change Password
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Cancel</Button>
              <Button onClick={handleSaveProfile} className="flex items-center gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>Loading...</>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Export, import, and manage your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Export</h3>
                <p className="text-sm text-muted-foreground">
                  Export your data in CSV or JSON format for backup or analysis
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleExportData("csv")}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export as CSV"}
                  </Button>

                  <Button
                    onClick={() => handleExportData("json")}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export as JSON"}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Import</h3>
                <p className="text-sm text-muted-foreground">Import data from CSV or JSON files</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleImportData("csv")}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={isImporting}
                  >
                    <Upload className="h-4 w-4" />
                    {isImporting ? "Importing..." : "Import from CSV"}
                  </Button>
                  <Button
                    onClick={() => handleImportData("json")}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={isImporting}
                  >
                    <Upload className="h-4 w-4" />
                    {isImporting ? "Importing..." : "Import from JSON"}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Database Management</h3>
                <p className="text-sm text-muted-foreground">Manage your database settings and operations</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={handleBackupDatabase}
                    disabled={isBackingUp}
                  >
                    <Database className="h-4 w-4" />
                    {isBackingUp ? "Backing up..." : "Backup Database"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={handleRestoreDatabase}
                    disabled={isRestoring}
                  >
                    <Database className="h-4 w-4" />
                    {isRestoring ? "Restoring..." : "Restore Database"}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove all of your
                        data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting}>
                        {isDeleting ? "Deleting..." : "Delete Account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Merchant Configuration */}
        <TabsContent value="merchant">
          <Card>
            <CardHeader>
              <CardTitle>Merchant Configuration</CardTitle>
              <CardDescription>Configure merchant payment settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <MerchantConfigForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
