"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, getDocs, query } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertCircle, Calculator, Edit } from "lucide-react"
import type { Transaction } from "@/types"
import { recordGasConsumption } from "@/lib/stock-service"
import { useAuth } from "@/context/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AddTransactionDialogProps {
  isOpen: boolean
  onClose: () => void
  onTransactionAdded: (transaction: Transaction) => void
}

// Define a type for the transaction data we're sending to Firestore
// This is separate from the Transaction interface because Firestore uses serverTimestamp()
interface FirestoreTransactionData {
  gasType: string
  kgs: number
  paymentMethod: string
  total: number
  currency: string
  date: string
  reason?: string
  isRestock?: boolean
  customerName?: string
  phoneNumber?: string
  dueDate?: string
  paid?: boolean
  paidDate?: string
  cardDetails?: Record<string, string>
  priceType: "suggested" | "custom"
}

interface StockItem {
  id: string
  gasType: string
  price: number
  stock: number
  lastUpdated: string
}

export default function AddTransactionDialog({ isOpen, onClose, onTransactionAdded }: AddTransactionDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [stockLoading, setStockLoading] = useState(true)
  const [stockError, setStockError] = useState<string | null>(null)
  const [insufficientStock, setInsufficientStock] = useState(false)
  const [availableStock, setAvailableStock] = useState<number | null>(null)
  const [priceType, setPriceType] = useState<"suggested" | "custom">("suggested")
  const [transactionType, setTransactionType] = useState<"sale" | "restock">("sale")

  // Basic transaction fields
  const [gasType, setGasType] = useState("")
  const [quantity, setQuantity] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [total, setTotal] = useState("")
  const [suggestedPrice, setSuggestedPrice] = useState("")
  const [currency, setCurrency] = useState("KES")
  const [date, setDate] = useState<Date>(new Date())
  const [reason, setReason] = useState("")

  // Credit transaction fields
  const [customerName, setCustomerName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [paid, setPaid] = useState(false)
  const [paidDate, setPaidDate] = useState<Date | undefined>(undefined)

  // Card details fields
  const [cardType, setCardType] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [nameOnCard, setNameOnCard] = useState("")
  const [expiryDate, setExpiryDate] = useState("")

  const isCredit = paymentMethod === "Credit"
  const isRestock = transactionType === "restock"

  // Fetch stock items when the dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchStockItems()
    }
  }, [isOpen])

  // Check stock availability when gas type or quantity changes
  useEffect(() => {
    if (gasType && quantity) {
      checkStockAvailability()
    } else {
      setInsufficientStock(false)
      setAvailableStock(null)
    }
  }, [gasType, quantity, transactionType])

  // Fetch all stock items from Firestore
  const fetchStockItems = async () => {
    try {
      setStockLoading(true)
      setStockError(null)

      const stockQuery = query(collection(db, "stock"))
      const querySnapshot = await getDocs(stockQuery)
      const stockData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StockItem[]

      setStockItems(stockData)
    } catch (error) {
      console.error("Error fetching stock items:", error)
      setStockError("Failed to load stock data. Please try again.")
    } finally {
      setStockLoading(false)
    }
  }

  // Check if there's enough stock for the selected gas type and quantity
  const checkStockAvailability = () => {
    if (!gasType || !quantity || isRestock) {
      setInsufficientStock(false)
      setAvailableStock(null)
      return
    }

    const stockItem = stockItems.find((item) => item.gasType === gasType)
    if (!stockItem) {
      setInsufficientStock(true)
      setAvailableStock(0)
      return
    }

    const requestedQuantity = Number.parseFloat(quantity)
    setAvailableStock(stockItem.stock)

    if (requestedQuantity > stockItem.stock) {
      setInsufficientStock(true)
    } else {
      setInsufficientStock(false)
    }

    // Calculate suggested price
    const calculatedPrice = stockItem.price * requestedQuantity
    setSuggestedPrice(calculatedPrice.toFixed(2))

    // If using suggested price, update the total
    if (priceType === "suggested") {
      setTotal(calculatedPrice.toFixed(2))
    }
  }

  const resetForm = () => {
    // Reset transaction type
    setTransactionType("sale")
    setPriceType("suggested")

    // Reset basic fields
    setGasType("")
    setQuantity("")
    setPaymentMethod("Cash")
    setTotal("")
    setSuggestedPrice("")
    setCurrency("KES")
    setDate(new Date())
    setReason("")

    // Reset credit fields
    setCustomerName("")
    setPhoneNumber("")
    setDueDate(undefined)
    setPaid(false)
    setPaidDate(undefined)

    // Reset card fields
    setCardType("")
    setCardNumber("")
    setNameOnCard("")
    setExpiryDate("")

    // Reset stock check
    setInsufficientStock(false)
    setAvailableStock(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!gasType || !quantity || !total) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    // Check stock availability again before submitting
    if (!isRestock) {
      const stockItem = stockItems.find((item) => item.gasType === gasType)
      if (!stockItem) {
        toast({
          title: "Stock not found",
          description: `No stock found for ${gasType}. Please check the gas type.`,
          variant: "destructive",
        })
        return
      }

      const requestedQuantity = Number.parseFloat(quantity)
      if (requestedQuantity > stockItem.stock) {
        toast({
          title: "Insufficient stock",
          description: `Not enough ${gasType} in stock. Available: ${stockItem.stock.toFixed(2)} kgs`,
          variant: "destructive",
        })
        return
      }
    }

    try {
      setIsSubmitting(true)

      // Prepare transaction data for Firestore
      const firestoreData: FirestoreTransactionData = {
        gasType,
        kgs: Number.parseFloat(quantity),
        paymentMethod,
        total: Number.parseFloat(total),
        currency,
        date: date.toISOString(),
        isRestock,
        priceType,
      }

      // Add optional fields if they exist
      if (reason) firestoreData.reason = reason

      // Add credit-specific fields if payment method is credit
      if (isCredit) {
        if (customerName) firestoreData.customerName = customerName
        if (phoneNumber) firestoreData.phoneNumber = phoneNumber
        if (dueDate) firestoreData.dueDate = dueDate.toISOString()
        firestoreData.paid = paid
        if (paid && paidDate) firestoreData.paidDate = paidDate.toISOString()

        // Add card details if any are provided
        const cardDetails: Record<string, string> = {}
        if (cardType) cardDetails.cardType = cardType
        if (cardNumber) cardDetails.cardNumber = cardNumber
        if (nameOnCard) cardDetails.nameOnCard = nameOnCard
        if (expiryDate) cardDetails.expiryDate = expiryDate

        if (Object.keys(cardDetails).length > 0) {
          firestoreData.cardDetails = cardDetails
        }
      }

      // Add to Firestore with serverTimestamp
      const docRef = await addDoc(collection(db, "transactions"), {
        ...firestoreData,
        createdAt: serverTimestamp(),
      })

      // Create a Transaction object for the UI
      // Use the current date string for createdAt since serverTimestamp isn't available client-side
      const newTransaction: Transaction = {
        ...firestoreData,
        id: docRef.id,
        createdAt: new Date().toISOString(),
      }

      // Update stock quantity if this is not a restock transaction
      if (!isRestock) {
        const stockItem = stockItems.find((item) => item.gasType === gasType)
        if (stockItem && user) {
          // Use the recordGasConsumption function from stock-service.ts
          const result = await recordGasConsumption(
            stockItem.id,
            Number.parseFloat(quantity),
            user.uid,
            user.displayName || user.email || "Unknown User",
            reason || "Sale",
          )

          if (!result.success) {
            throw new Error("Failed to update stock quantity")
          }
        }
      } else {
        // If it's a restock transaction, we need to add to the stock instead
        // This would typically be handled elsewhere, but we'll add a note
        toast({
          title: "Restock transaction created",
          description:
            "Note: Restock transactions should be processed through the stock management interface to update inventory.",
        })
      }

      // Call the callback with the new transaction
      onTransactionAdded(newTransaction)

      toast({
        title: "Transaction added",
        description: `The ${isRestock ? "restock" : "sale"} transaction has been successfully added${!isRestock ? " and stock updated" : ""}.`,
      })

      // Close the dialog and reset form
      handleClose()
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>Enter the details for the new transaction.</DialogDescription>
        </DialogHeader>

        {stockLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2">Loading stock data...</span>
          </div>
        ) : stockError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{stockError}</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Transaction Type Tabs */}
            <Tabs
              defaultValue="sale"
              value={transactionType}
              onValueChange={(value) => setTransactionType(value as "sale" | "restock")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sale">Sale Transaction</TabsTrigger>
                <TabsTrigger value="restock">Restock Transaction</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gas Type */}
              <div className="space-y-2">
                <Label htmlFor="gasType">Gas Type *</Label>
                <Select value={gasType} onValueChange={setGasType} required>
                  <SelectTrigger id="gasType">
                    <SelectValue placeholder="Select gas type" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockItems.length > 0 ? (
                      stockItems.map((item) => (
                        <SelectItem key={item.id} value={item.gasType}>
                          {item.gasType} ({item.stock.toFixed(2)} kgs available)
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        No gas types available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {availableStock !== null && !isRestock && (
                  <p className="text-xs text-muted-foreground mt-1">Available: {availableStock.toFixed(2)} kgs</p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity" className={insufficientStock ? "text-destructive" : ""}>
                  Quantity (kgs) *
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className={insufficientStock ? "border-destructive" : ""}
                />
                {insufficientStock && !isRestock && (
                  <p className="text-xs text-destructive">
                    Insufficient stock. Available: {availableStock?.toFixed(2)} kgs
                  </p>
                )}
              </div>

              {/* Price Type Selection - only show for sales */}
              {!isRestock && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Price Type</Label>
                  <RadioGroup
                    value={priceType}
                    onValueChange={(value) => {
                      setPriceType(value as "suggested" | "custom")
                      // If switching to suggested, update the total with the suggested price
                      if (value === "suggested" && suggestedPrice) {
                        setTotal(suggestedPrice)
                      }
                    }}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="suggested" id="suggested" />
                      <Label htmlFor="suggested" className="flex items-center">
                        <Calculator className="h-4 w-4 mr-1" /> Suggested Price
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom" className="flex items-center">
                        <Edit className="h-4 w-4 mr-1" /> Custom Price
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                    <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Total */}
              <div className="space-y-2">
                <Label htmlFor="total">Total Amount *</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  required
                  disabled={priceType === "suggested" && !isRestock}
                  className={priceType === "suggested" && !isRestock ? "bg-muted" : ""}
                />
                {gasType && quantity && !isRestock && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggested price: {suggestedPrice || "0.00"} {currency}
                  </p>
                )}
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select value={currency} onValueChange={setCurrency} required>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KES">KES</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Transaction Date *</Label>
                <DatePicker selected={date} onSelect={(date) => date && setDate(date)} />
              </div>

              {/* Reason */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </div>

            {/* Credit-specific fields */}
            {isCredit && !isRestock && (
              <>
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Credit Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Name */}
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name</Label>
                      <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <DatePicker selected={dueDate} onSelect={(date) => date && setDueDate(date)} />
                    </div>

                    {/* Paid Status */}
                    <div className="flex items-center space-x-2 pt-6">
                      <Checkbox id="paid" checked={paid} onCheckedChange={(checked) => setPaid(checked === true)} />
                      <Label htmlFor="paid">Already Paid</Label>
                    </div>

                    {/* Paid Date (only if paid is true) */}
                    {paid && (
                      <div className="space-y-2">
                        <Label htmlFor="paidDate">Payment Date</Label>
                        <DatePicker selected={paidDate} onSelect={(date) => date && setPaidDate(date)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Details */}
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Card Details (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card Type */}
                    <div className="space-y-2">
                      <Label htmlFor="cardType">Card Type</Label>
                      <Select value={cardType} onValueChange={setCardType}>
                        <SelectTrigger id="cardType">
                          <SelectValue placeholder="Select card type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Visa">Visa</SelectItem>
                          <SelectItem value="Mastercard">Mastercard</SelectItem>
                          <SelectItem value="American Express">American Express</SelectItem>
                          <SelectItem value="Discover">Discover</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Card Number */}
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="Last 4 digits only"
                      />
                    </div>

                    {/* Name on Card */}
                    <div className="space-y-2">
                      <Label htmlFor="nameOnCard">Name on Card</Label>
                      <Input id="nameOnCard" value={nameOnCard} onChange={(e) => setNameOnCard(e.target.value)} />
                    </div>

                    {/* Expiry Date */}
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        placeholder="MM/YY"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (!isRestock && insufficientStock) ||
                  (!isRestock && priceType === "suggested" && !suggestedPrice)
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  `Add ${isRestock ? "Restock" : "Sale"} Transaction`
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
