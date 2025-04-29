import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Transaction } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Calendar, CreditCard, Phone, User, Clock, CheckCircle, XCircle } from "lucide-react"
import { format } from "date-fns"

interface TransactionDetailsDialogProps {
  transaction: Transaction | null
  isOpen: boolean
  onClose: () => void
}

export default function TransactionDetailsDialog({ transaction, isOpen, onClose }: TransactionDetailsDialogProps) {
  if (!transaction) return null

  const isCredit = transaction.paymentMethod?.toLowerCase() === "credit"
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP p")
    } catch (error) {
      return dateString
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>Transaction ID: {transaction.id}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Gas Type</h3>
              <p className="text-sm">{transaction.gasType}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Quantity</h3>
              <p className="text-sm">{transaction.kgs.toFixed(2)} kgs</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Payment Method</h3>
              <p className="text-sm">{transaction.paymentMethod}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
              <p className="text-sm">
                {transaction.currency} {transaction.total.toFixed(2)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Date</h3>
              <p className="text-sm">{formatDate(transaction.date)}</p>
            </div>
            {transaction.reason && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Reason</h3>
                <p className="text-sm">{transaction.reason}</p>
              </div>
            )}
          </div>

          {isCredit && (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-3 font-medium">Credit Details</h3>
              <div className="grid grid-cols-1 gap-3">
                {transaction.customerName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <h4 className="text-sm font-medium">Customer</h4>
                      <p className="text-sm">{transaction.customerName}</p>
                    </div>
                  </div>
                )}

                {transaction.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <h4 className="text-sm font-medium">Phone</h4>
                      <p className="text-sm">{transaction.phoneNumber}</p>
                    </div>
                  </div>
                )}

                {transaction.dueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <h4 className="text-sm font-medium">Due Date</h4>
                      <p className="text-sm">{formatDate(transaction.dueDate)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="text-sm font-medium">Payment Status</h4>
                    <div className="mt-1">
                      {transaction.paid ? (
                        <Badge variant="success" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Paid
                          {transaction.paidDate && ` on ${formatDate(transaction.paidDate)}`}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Unpaid
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {transaction.cardDetails && Object.keys(transaction.cardDetails).length > 0 && (
                  <div className="flex items-start gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">Card Details</h4>
                      <div className="mt-1 grid gap-1">
                        {transaction.cardDetails.cardType && (
                          <p className="text-sm">Type: {transaction.cardDetails.cardType}</p>
                        )}
                        {transaction.cardDetails.cardNumber && (
                          <p className="text-sm">Number: •••• {transaction.cardDetails.cardNumber.slice(-4)}</p>
                        )}
                        {transaction.cardDetails.nameOnCard && (
                          <p className="text-sm">Name: {transaction.cardDetails.nameOnCard}</p>
                        )}
                        {transaction.cardDetails.expiryDate && (
                          <p className="text-sm">Expiry: {transaction.cardDetails.expiryDate}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
