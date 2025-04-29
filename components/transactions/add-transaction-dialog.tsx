"use client"

import type React from "react"

import { useState } from "react"
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
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp, type FieldValue } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import type { Transaction } from "@/types"

interface AddTransactionDialogProps {
  isOpen: boolean
  onClose: () => void
  onTransactionAdded: (transaction: Transaction) => void
}

// Define a type for the transaction data we're sending to Firestore
interface TransactionData {
  gasType: string
  kgs: number
  paymentMethod: string
  total: number
  currency: string
  date: string
  createdAt: FieldValue
  reason?: string
  isRestock?: boolean
  customerName?: string
  phoneNumber?: string
  dueDate?: string
  paid?: boolean
  paidDate?: string
  cardDetails?: {
    cardType?: string
    cardNumber?: string
    nameOnCard?: string
    expiryDate?: string
  }
}

export default function AddTransactionDialog({ isOpen, onClose, onTransactionAdded }: AddTransactionDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Basic transaction fields
  const [gasType, setGasType] = useState("")
  const [quantity, setQuantity] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [total, setTotal] = useState("")
  const [currency, setCurrency] = useState("KES")
  const [date, setDate] = useState<Date>(new Date())
  const [reason, setReason] = useState("")
  const [isRestock, setIsRestock] = useState(false)

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

  const resetForm = () => {
    // Reset basic fields
    setGasType("")
    setQuantity("")
    setPaymentMethod("Cash")
    setTotal("")
    setCurrency("KES")
    setDate(new Date())
    setReason("")
    setIsRestock(false)

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

    try {
      setIsSubmitting(true)

      // Prepare transaction data
      const transactionData: TransactionData = {
        gasType,
        kgs: Number.parseFloat(quantity),
        paymentMethod,
        total: Number.parseFloat(total),
        currency,
        date: date.toISOString(),
        createdAt: serverTimestamp(),
      }

      // Add optional fields if they exist
      if (reason) transactionData.reason = reason
      if (isRestock) transactionData.isRestock = isRestock

      // Add credit-specific fields if payment method is credit
      if (isCredit) {
        if (customerName) transactionData.customerName = customerName
        if (phoneNumber) transactionData.phoneNumber = phoneNumber
        if (dueDate) transactionData.dueDate = dueDate.toISOString()
        transactionData.paid = paid
        if (paid && paidDate) transactionData.paidDate = paidDate.toISOString()

        // Add card details if any are provided
        const cardDetails: Record<string, string> = {}
        if (cardType) cardDetails.cardType = cardType
        if (cardNumber) cardDetails.cardNumber = cardNumber
        if (nameOnCard) cardDetails.nameOnCard = nameOnCard
        if (expiryDate) cardDetails.expiryDate = expiryDate

        if (Object.keys(cardDetails).length > 0) {
          transactionData.cardDetails = cardDetails as TransactionData["cardDetails"]
        }
      }

      // Add to Firestore
      const docRef = await addDoc(collection(db, "transactions"), transactionData)

      // Add ID to the transaction data
      const newTransaction = {
        ...transactionData,
        id: docRef.id,
      } as Transaction

      // Call the callback with the new transaction
      onTransactionAdded(newTransaction)

      toast({
        title: "Transaction added",
        description: "The transaction has been successfully added.",
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gas Type */}
            <div className="space-y-2">
              <Label htmlFor="gasType">Gas Type *</Label>
              <Select value={gasType} onValueChange={setGasType} required>
                <SelectTrigger id="gasType">
                  <SelectValue placeholder="Select gas type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LPG">LPG</SelectItem>
                  <SelectItem value="Propane">Propane</SelectItem>
                  <SelectItem value="Butane">Butane</SelectItem>
                  <SelectItem value="Natural Gas">Natural Gas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (kgs) *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

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
              />
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
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>

            {/* Is Restock */}
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="isRestock"
                checked={isRestock}
                onCheckedChange={(checked) => setIsRestock(checked === true)}
              />
              <Label htmlFor="isRestock">This is a restock transaction</Label>
            </div>
          </div>

          {/* Credit-specific fields */}
          {isCredit && (
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Transaction"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
