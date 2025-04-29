"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect, useCallback } from "react"
import { db } from "@/lib/firebase"
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  type FieldValue,
  type Timestamp,
} from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { DatePicker } from "@/components/ui/date-picker"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Transaction } from "@/types"
import { validateTransaction } from "@/app/actions/transaction-actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Calculator, Edit } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/context/auth-context"

interface AddTransactionDialogProps {
  isOpen: boolean
  onClose: () => void
  onTransactionAdded: (transaction: Transaction) => void
}

interface StockItem {
  id: string
  gasType: string
  price: number
  stock: number
}

interface TransactionData {
  gasType: string
  kgs: number
  total: number
  currency: string
  paymentMethod: string
  date: string
  createdAt: FieldValue | Timestamp // Using proper Firebase types
  isRestock?: boolean
  reason?: string
  // Credit transaction fields
  customerName?: string
  phoneNumber?: string
  dueDate?: string
  paid?: boolean
  cardDetails?: Record<string, string>
  // Duplicate prevention fields
  idempotencyKey: string
  clientTimestamp: number
  sessionId: string
  priceType: "suggested" | "custom"
  // Custom total fields
  isCustomTotal?: boolean
  calculatedTotal?: number
}

export default function AddTransactionDialog({ isOpen, onClose, onTransactionAdded }: AddTransactionDialogProps) {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [selectedStock, setSelectedStock] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(0)
  const [price, setPrice] = useState<number>(0)
  const [total, setTotal] = useState<number>(0)
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0)
  const [isCustomTotal, setIsCustomTotal] = useState<boolean>(false)
  const [currency, setCurrency] = useState<string>("USD")
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash")
  const [date, setDate] = useState<Date>(new Date())
  const [isRestock, setIsRestock] = useState<boolean>(false)
  const [reason, setReason] = useState<string>("")
  const [priceType, setPriceType] = useState<"suggested" | "custom">("suggested")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isCredit, setIsCredit] = useState<boolean>(false)
  const [customerName, setCustomerName] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState<string>("")
  const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 days from now
  const [sessionId] = useState<string>(`session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [existingTransaction, setExistingTransaction] = useState<Transaction | null>(null)

  const { toast } = useToast()
  const { user } = useAuth()

  // Generate a unique idempotency key for this transaction
  const generateIdempotencyKey = useCallback(() => {
    return `${selectedStock}_${quantity}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }, [selectedStock, quantity])

  const fetchStockItems = useCallback(async () => {
    try {
      const stockQuery = query(collection(db, "stock"), orderBy("gasType"))
      const querySnapshot = await getDocs(stockQuery)
      const stockData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StockItem[]

      setStockItems(stockData)

      // Set default selected stock if available
      if (stockData.length > 0 && !selectedStock) {
        setSelectedStock(stockData[0].id)
        setPrice(stockData[0].price)
      }
    } catch (error) {
      console.error("Error fetching stock items:", error)
      toast({
        title: "Error",
        description: "Failed to load stock items. Please try again.",
        variant: "destructive",
      })
    }
  }, [selectedStock, toast])

  useEffect(() => {
    if (isOpen) {
      fetchStockItems()
    }
  }, [isOpen, fetchStockItems])

  useEffect(() => {
    const newCalculatedTotal = price * quantity
    setCalculatedTotal(newCalculatedTotal)

    // Only update the displayed total if not using custom total
    if (!isCustomTotal) {
      setTotal(newCalculatedTotal)
    }
  }, [price, quantity, isCustomTotal])

  // Update price when selected stock changes
  useEffect(() => {
    if (selectedStock && priceType === "suggested") {
      const selectedItem = stockItems.find((item) => item.id === selectedStock)
      if (selectedItem) {
        setPrice(selectedItem.price)
      }
    }
  }, [selectedStock, stockItems, priceType])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedStock("")
      setQuantity(0)
      setPrice(0)
      setTotal(0)
      setCalculatedTotal(0)
      setIsCustomTotal(false)
      setCurrency("USD")
      setPaymentMethod("Cash")
      setDate(new Date())
      setIsRestock(false)
      setReason("")
      setPriceType("suggested")
      setIsCredit(false)
      setCustomerName("")
      setPhoneNumber("")
      setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      setDuplicateWarning(null)
      setExistingTransaction(null)
    }
  }, [isOpen])

  // Check for potential duplicates when transaction details change
  useEffect(() => {
    const checkForDuplicates = async () => {
      if (!selectedStock || quantity <= 0) {
        setDuplicateWarning(null)
        setExistingTransaction(null)
        return
      }

      const selectedItem = stockItems.find((item) => item.id === selectedStock)
      if (!selectedItem) return

      try {
        const result = await validateTransaction({
          gasType: selectedItem.gasType,
          kgs: quantity,
          paymentMethod,
          date: date.toISOString(),
        })

        if (result.isDuplicate) {
          setDuplicateWarning("This appears to be a duplicate of a recent transaction.")
          setExistingTransaction(result.existingTransaction as Transaction)
        } else {
          setDuplicateWarning(null)
          setExistingTransaction(null)
        }
      } catch (error) {
        console.error("Error checking for duplicates:", error)
      }
    }

    // Debounce the duplicate check to avoid too many requests
    const timeoutId = setTimeout(() => {
      checkForDuplicates()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [selectedStock, quantity, paymentMethod, date, stockItems])

  // Handle custom total toggle
  const handleCustomTotalToggle = (checked: boolean) => {
    setIsCustomTotal(checked)
    if (!checked) {
      // Reset to calculated total when disabling custom total
      setTotal(calculatedTotal)
    }
  }

  // Validate custom total
  const validateCustomTotal = (value: number): { isValid: boolean; message?: string } => {
    // Implement business rules for custom total validation
    if (value <= 0) {
      return { isValid: false, message: "Total must be greater than zero" }
    }

    // Optional: Check if custom total is within reasonable range of calculated total
    const calculatedValue = price * quantity
    const percentDifference = Math.abs((value - calculatedValue) / calculatedValue) * 100

    if (percentDifference > 50) {
      return {
        isValid: true,
        message: "Warning: Custom total differs significantly from calculated value",
      }
    }

    return { isValid: true }
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Validate inputs
      if (!selectedStock) {
        toast({
          title: "Error",
          description: "Please select a gas type.",
          variant: "destructive",
        })
        return
      }

      if (quantity <= 0) {
        toast({
          title: "Error",
          description: "Quantity must be greater than zero.",
          variant: "destructive",
        })
        return
      }

      // Validate custom total if enabled
      if (isCustomTotal) {
        const validation = validateCustomTotal(total)
        if (!validation.isValid) {
          toast({
            title: "Error",
            description: validation.message || "Invalid custom total",
            variant: "destructive",
          })
          return
        }

        if (validation.message) {
          // Show warning but allow to proceed
          const confirmProceed = window.confirm(`${validation.message}. Do you want to proceed?`)
          if (!confirmProceed) {
            return
          }
        }
      }

      // Stock availability is now checked during the stock update process

      // Get the selected stock item
      const selectedItem = stockItems.find((item) => item.id === selectedStock)
      if (!selectedItem) {
        toast({
          title: "Error",
          description: "Selected stock item not found.",
          variant: "destructive",
        })
        return
      }

      // Check for duplicates on the server
      const validationResult = await validateTransaction({
        gasType: selectedItem.gasType,
        kgs: quantity,
        paymentMethod,
        date: date.toISOString(),
      })

      if (validationResult.isDuplicate) {
        // Show confirmation dialog
        const confirmDuplicate = window.confirm(
          "This appears to be a duplicate transaction. Are you sure you want to proceed?",
        )
        if (!confirmDuplicate) {
          return
        }
      }

      // Update stock quantity for sales (not restocks)
      if (!isRestock) {
        try {
          // Get current stock data
          const stockRef = doc(db, "stock", selectedStock)
          const stockDoc = await getDoc(stockRef)

          if (!stockDoc.exists()) {
            throw new Error("Stock item not found")
          }

          const currentStock = stockDoc.data() as StockItem
          const newQuantity = currentStock.stock - quantity

          if (newQuantity < 0) {
            toast({
              title: "Error",
              description: "Not enough stock available for this transaction.",
              variant: "destructive",
            })
            return
          }

          // Update stock quantity
          await updateDoc(stockRef, {
            stock: newQuantity,
            lastUpdated: new Date().toISOString(),
          })

          // Record in stock history
          await addDoc(collection(db, "stockHistory"), {
            gasType: currentStock.gasType,
            timestamp: new Date().toISOString(),
            previousStock: currentStock.stock,
            newStock: newQuantity,
            changeAmount: -quantity, // Negative because it's consumption
            reason: "Sale",
            userId: user?.uid || "system",
            userName: user?.displayName || "System",
          })
        } catch (error) {
          console.error("Error updating stock quantity:", error)
          toast({
            title: "Error",
            description: "Failed to update stock quantity. Please try again.",
            variant: "destructive",
          })
          return
        }
      }

      // Update stock quantity for restocks
      if (isRestock) {
        try {
          // Get current stock data
          const stockRef = doc(db, "stock", selectedStock)
          const stockDoc = await getDoc(stockRef)

          if (!stockDoc.exists()) {
            throw new Error("Stock item not found")
          }

          const currentStock = stockDoc.data() as StockItem
          const newQuantity = currentStock.stock + quantity

          // Update stock quantity
          await updateDoc(stockRef, {
            stock: newQuantity,
            lastUpdated: new Date().toISOString(),
          })

          // Record in stock history
          await addDoc(collection(db, "stockHistory"), {
            gasType: currentStock.gasType,
            timestamp: new Date().toISOString(),
            previousStock: currentStock.stock,
            newStock: newQuantity,
            changeAmount: quantity, // Positive because it's a restock
            reason: reason || "Restock",
            userId: user?.uid || "system",
            userName: user?.displayName || "System",
          })
        } catch (error) {
          console.error("Error updating stock quantity:", error)
          toast({
            title: "Error",
            description: "Failed to update stock quantity. Please try again.",
            variant: "destructive",
          })
          return
        }
      }

      // Create transaction data
      const transactionData: TransactionData = {
        gasType: selectedItem.gasType,
        kgs: quantity,
        total,
        currency,
        paymentMethod,
        date: date.toISOString(),
        createdAt: serverTimestamp(),
        idempotencyKey: generateIdempotencyKey(),
        clientTimestamp: Date.now(),
        sessionId,
        priceType,
      }

      // Add custom total information if applicable
      if (isCustomTotal) {
        transactionData.isCustomTotal = true
        transactionData.calculatedTotal = calculatedTotal
      }

      // Add restock-specific fields
      if (isRestock) {
        transactionData.isRestock = true
        transactionData.reason = reason
      }

      // Add credit-specific fields
      if (isCredit) {
        transactionData.customerName = customerName
        transactionData.phoneNumber = phoneNumber
        transactionData.dueDate = dueDate.toISOString()
        transactionData.paid = false
        transactionData.cardDetails = {
          // Add card details if needed
        }
      }

      // Add the transaction to Firestore
      const docRef = await addDoc(collection(db, "transactions"), transactionData)

      // Get the added transaction with its ID
      const newTransaction = {
        id: docRef.id,
        ...transactionData,
      } as Transaction

      // Notify parent component
      onTransactionAdded(newTransaction)

      toast({
        title: "Success",
        description: "Transaction added successfully.",
      })

      // Close the dialog
      onClose()
    } catch (error) {
      console.error("Error adding transaction:", error)
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>Enter the details for the new transaction.</DialogDescription>
        </DialogHeader>

        {duplicateWarning && existingTransaction && (
          <Alert className="bg-amber-50 border-amber-200 mb-4">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Potential Duplicate Transaction</AlertTitle>
            <AlertDescription className="text-amber-700">
              <p>{duplicateWarning}</p>
              <p className="text-xs mt-1">
                Existing transaction: {existingTransaction.gasType}, {existingTransaction.kgs} kg,{" "}
                {new Date(existingTransaction.date).toLocaleString()}
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="transaction-type" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
              <RadioGroup
                defaultValue="sale"
                value={isRestock ? "restock" : "sale"}
                onValueChange={(value) => setIsRestock(value === "restock")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sale" id="sale" />
                  <Label htmlFor="sale">Sale</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="restock" id="restock" />
                  <Label htmlFor="restock">Restock</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gas-type" className="text-right">
              Gas Type
            </Label>
            <Select value={selectedStock} onValueChange={setSelectedStock}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select gas type" />
              </SelectTrigger>
              <SelectContent>
                {stockItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.gasType} (${item.price.toFixed(2)}/kg)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity (kg)
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              step="0.01"
              value={quantity || ""}
              onChange={(e) => setQuantity(Number.parseFloat(e.target.value) || 0)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price-type" className="text-right">
              Price Type
            </Label>
            <div className="col-span-3">
              <RadioGroup
                defaultValue="suggested"
                value={priceType}
                onValueChange={(value) => setPriceType(value as "suggested" | "custom")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="suggested" id="suggested" />
                  <Label htmlFor="suggested">Suggested</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Custom</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Price per kg
            </Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price || ""}
              onChange={(e) => setPrice(Number.parseFloat(e.target.value) || 0)}
              className="col-span-3"
              disabled={priceType === "suggested"}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right flex justify-end">
              <Label htmlFor="custom-total-toggle" className="mr-2">
                Custom Total
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Override the calculated total with a custom amount</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="col-span-3">
              <Switch id="custom-total-toggle" checked={isCustomTotal} onCheckedChange={handleCustomTotalToggle} />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="total" className="text-right flex items-center justify-end">
              {isCustomTotal ? (
                <span className="flex items-center">
                  Total
                  <Edit className="ml-1 h-3 w-3 text-blue-500" />
                </span>
              ) : (
                <span className="flex items-center">
                  Total
                  <Calculator className="ml-1 h-3 w-3 text-muted-foreground" />
                </span>
              )}
            </Label>
            <div className="col-span-3 flex">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-24 mr-2">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="KES">KES</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="total"
                type="number"
                min="0"
                step="0.01"
                value={total.toFixed(2)}
                onChange={(e) => setTotal(Number.parseFloat(e.target.value) || 0)}
                className="flex-1"
                readOnly={!isCustomTotal}
              />
            </div>
          </div>

          {isCustomTotal && (
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-start-2 col-span-3">
                <div className="text-xs text-muted-foreground flex items-center">
                  <Calculator className="mr-1 h-3 w-3" />
                  Calculated: {currency} {calculatedTotal.toFixed(2)}
                  {Math.abs(total - calculatedTotal) > 0.01 && (
                    <span className="ml-2 text-amber-600">
                      ({total > calculatedTotal ? "+" : "-"}
                      {currency} {Math.abs(total - calculatedTotal).toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment-method" className="text-right">
              Payment Method
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => {
                setPaymentMethod(value)
                setIsCredit(value === "Credit")
              }}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <div className="col-span-3">
              <DatePicker date={date} onDateSelect={(newDate) => newDate && setDate(newDate)} />
            </div>
          </div>

          {isRestock && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Reason
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="col-span-3"
                placeholder="Reason for restock"
              />
            </div>
          )}

          {isCredit && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customer-name" className="text-right">
                  Customer Name
                </Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="col-span-3"
                  placeholder="Customer name"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone-number" className="text-right">
                  Phone Number
                </Label>
                <Input
                  id="phone-number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="col-span-3"
                  placeholder="Phone number"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="due-date" className="text-right">
                  Due Date
                </Label>
                <div className="col-span-3">
                  <DatePicker date={dueDate} onDateSelect={(newDate) => newDate && setDueDate(newDate)} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Transaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
