"use client"
import { db } from "@/lib/firebase"
import { collection, deleteDoc, doc, getDocs, orderBy, query, writeBatch } from "firebase/firestore"
import {
  Search,
  ShoppingCart,
  Calendar,
  ChevronRight,
  FolderOpen,
  CreditCard,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCallback, useEffect, useState, useRef } from "react"
import type { Transaction } from "@/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import TransactionDetailsDialog from "@/components/transactions/transaction-details-dialog"
import DeleteConfirmationDialog from "@/components/transactions/delete-confirmation-dialog"
import { useToast } from "@/hooks/use-toast"
import AddTransactionDialog from "@/components/transactions/add-transaction-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { filterDuplicateTransactions, findDuplicateTransactions } from "@/lib/transaction-utils"
import { deduplicateTransactions } from "@/app/actions/transaction-actions"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [searchField, setSearchField] = useState("all")
  const [viewMode, setViewMode] = useState<"all" | "folders">("folders")
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const addButtonClickedRef = useRef(false)
  const [duplicatesFound, setDuplicatesFound] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState<Transaction[][]>([])
  const [isDeduplicating, setIsDeduplicating] = useState(false)

  const transactionsPerPage = 20

  // Function to identify and remove duplicate transactions
  const findAndRemoveDuplicates = async () => {
    try {
      setIsDeduplicating(true)

      // Call the server action to deduplicate transactions
      const result = await deduplicateTransactions()

      if (result.success) {
        if (result.removedCount && result.removedCount > 0) {
          toast({
            title: "Duplicates removed",
            description: `Successfully removed ${result.removedCount} duplicate transactions.`,
          })

          // Refresh transactions from the database
          fetchTransactions()
        } else {
          toast({
            title: "No duplicates found",
            description: "No duplicate transactions were found in the database.",
          })
          setDuplicatesFound(false)
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to remove duplicate transactions.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error removing duplicate transactions:", error)
      toast({
        title: "Error",
        description: "Failed to remove duplicate transactions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeduplicating(false)
    }
  }

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const transactionsQuery = query(collection(db, "transactions"), orderBy("date", "desc"))
      const querySnapshot = await getDocs(transactionsQuery)
      const transactionsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[]

      // Client-side duplicate detection (1-minute window)
      const duplicateGroups = findDuplicateTransactions(transactionsData, 60000)
      setDuplicateGroups(duplicateGroups)
      setDuplicatesFound(duplicateGroups.length > 0)

      // Filter out duplicates for display (keeping the earliest transaction in each group)
      const filteredData = filterDuplicateTransactions(transactionsData, 60000)

      setTransactions(transactionsData)
      setFilteredTransactions(filteredData)

      // Set default selected month to the most recent month with transactions
      if (filteredData.length > 0 && !selectedMonth) {
        const mostRecentDate = new Date(filteredData[0].date)
        const monthYear = `${mostRecentDate.getFullYear()}-${String(mostRecentDate.getMonth() + 1).padStart(2, "0")}`
        setSelectedMonth(monthYear)
      }

      // Show toast if duplicates were filtered out
      if (transactionsData.length !== filteredData.length) {
        const filteredCount = transactionsData.length - filteredData.length
        toast({
          title: "Duplicate transactions detected",
          description: `${filteredCount} duplicate transactions have been filtered from the view. Click "Clean Up Duplicates" to remove them from the database.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast({
        title: "Error",
        description: "Failed to load transactions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, toast])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    let filtered = transactions

    // First apply client-side duplicate filtering
    filtered = filterDuplicateTransactions(filtered, 60000)

    // Then apply month filter if in folder view and a month is selected
    if (viewMode === "folders" && selectedMonth) {
      const [year, month] = selectedMonth.split("-").map(Number)
      filtered = filtered.filter((transaction) => {
        const date = new Date(transaction.date)
        return date.getFullYear() === year && date.getMonth() + 1 === month
      })
    }

    // Then apply search filter
    if (searchTerm !== "") {
      const term = searchTerm.toLowerCase()

      filtered = filtered.filter((transaction) => {
        if (searchField === "all") {
          return (
            transaction.gasType?.toLowerCase().includes(term) ||
            transaction.paymentMethod?.toLowerCase().includes(term) ||
            transaction.currency?.toLowerCase().includes(term) ||
            transaction.total.toString().includes(term) ||
            transaction.kgs.toString().includes(term) ||
            transaction.customerName?.toLowerCase().includes(term) ||
            new Date(transaction.date).toLocaleString().toLowerCase().includes(term)
          )
        }

        if (searchField === "paymentMethod") {
          return transaction.paymentMethod?.toLowerCase().includes(term)
        }

        if (searchField === "date") {
          return new Date(transaction.date).toLocaleString().toLowerCase().includes(term)
        }

        if (searchField === "Transaction_ID") {
          return transaction.id.toLowerCase().includes(term)
        }

        if (searchField === "customerName") {
          return transaction.customerName?.toLowerCase().includes(term) || false
        }

        return false
      })
    }

    setFilteredTransactions(filtered)
    setCurrentPage(1)
  }, [searchTerm, searchField, transactions, viewMode, selectedMonth])

  // Get current transactions based on pagination
  const indexOfLastTransaction = currentPage * transactionsPerPage
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage
  const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction)

  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage)

  // Group transactions by month
  const getMonthFolders = () => {
    const folders: { [key: string]: { label: string; count: number } } = {}

    // Use filtered transactions (with duplicates removed)
    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.date)
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthName = date.toLocaleString("default", { month: "long", year: "numeric" })

      if (!folders[monthYear]) {
        folders[monthYear] = { label: monthName, count: 0 }
      }
      folders[monthYear].count++
    })

    // Sort by date (newest first)
    return Object.entries(folders).sort((a, b) => b[0].localeCompare(a[0]))
  }

  const monthFolders = getMonthFolders()

  const paginationButtons = () => {
    return (
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {filteredTransactions.length > 0 ? indexOfFirstTransaction + 1 : 0} to{" "}
          {Math.min(indexOfLastTransaction, filteredTransactions.length)} of {filteredTransactions.length} transactions
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show first 5 pages, or last 5 pages if we're near the end
              let pageNum = i + 1
              if (currentPage > 3 && totalPages > 5) {
                // Adjust which pages are shown
                pageNum = Math.min(currentPage - 2 + i, totalPages - 4 + i)
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8"
                >
                  {pageNum}
                </Button>
              )
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="mx-1">...</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} className="w-8">
                  {totalPages}
                </Button>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    )
  }

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDetailsOpen(true)
  }

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return

    try {
      setIsDeleting(true)
      await deleteDoc(doc(db, "transactions", transactionToDelete.id))

      // Update local state
      setTransactions(transactions.filter((t) => t.id !== transactionToDelete.id))

      toast({
        title: "Transaction deleted",
        description: "The transaction has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast({
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setTransactionToDelete(null)
    }
  }

  const handleClearAllTransactions = () => {
    setIsClearAllDialogOpen(true)
  }

  const confirmClearAllTransactions = async () => {
    try {
      setIsDeleting(true)

      // Get transactions to delete based on current filters
      const transactionsToDelete = filteredTransactions

      // Use batch write for better performance
      const batch = writeBatch(db)

      // Add each transaction to the batch
      transactionsToDelete.forEach((transaction) => {
        const transactionRef = doc(db, "transactions", transaction.id)
        batch.delete(transactionRef)
      })

      // Commit the batch
      await batch.commit()

      // Update local state
      if (viewMode === "folders" && selectedMonth) {
        // If in folder view, only remove transactions from the selected month
        const [year, month] = selectedMonth.split("-").map(Number)
        setTransactions(
          transactions.filter((transaction) => {
            const date = new Date(transaction.date)
            return !(date.getFullYear() === year && date.getMonth() + 1 === month)
          }),
        )
      } else {
        // If in all view, remove all transactions
        setTransactions([])
      }

      toast({
        title: "Transactions cleared",
        description: `${transactionsToDelete.length} transactions have been successfully deleted.`,
      })
    } catch (error) {
      console.error("Error clearing transactions:", error)
      toast({
        title: "Error",
        description: "Failed to clear transactions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsClearAllDialogOpen(false)
    }
  }

  const handleAddTransaction = (newTransaction: Transaction) => {
    // Add the new transaction to the state
    setTransactions((currentTransactions) => [newTransaction, ...currentTransactions])

    // Refresh transactions from the database to ensure we have the latest data
    // Use setTimeout to avoid state update conflicts
    setTimeout(() => {
      fetchTransactions()
    }, 300)
  }

  const handleAddButtonClick = () => {
    // Prevent multiple rapid clicks
    if (addButtonClickedRef.current) return

    addButtonClickedRef.current = true

    // Close dialog if it's open
    setIsAddDialogOpen(false)

    // Wait for state update before reopening
    setTimeout(() => {
      setIsAddDialogOpen(true)
      // Reset the click flag after a delay
      setTimeout(() => {
        addButtonClickedRef.current = false
      }, 1000)
    }, 300)
  }

  function renderTransactionsTable() {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <p>Loading transactions...</p>
        </div>
      )
    }

    if (filteredTransactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <ShoppingCart className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No transactions found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "Try a different search term" : "Add your first transaction to get started."}
          </p>
        </div>
      )
    }

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Quantity (kgs)</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.map((transaction) => {
              const isCredit = transaction.paymentMethod?.toLowerCase() === "credit"
              const isRestock = transaction.isRestock === true

              // Check if this transaction is part of a duplicate group
              const isDuplicate = duplicateGroups.some(
                (group) => group.length > 1 && group.some((t) => t.id === transaction.id),
              )

              return (
                <TableRow key={transaction.id} className={isDuplicate ? "bg-amber-50" : ""}>
                  <TableCell className="font-medium">
                    {transaction.id}
                    {isDuplicate && (
                      <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-200">
                        Duplicate
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.kgs.toFixed(2)}
                    {isRestock && <RefreshCw className="ml-1 h-3 w-3 inline text-green-500" />}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {transaction.paymentMethod}
                      {isCredit && <CreditCard className="ml-1 h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    {transaction.currency} {transaction.total.toFixed(2)}
                  </TableCell>
                  <TableCell>{new Date(transaction.date).toLocaleString()}</TableCell>
                  <TableCell>
                    {isCredit &&
                      (transaction.paid ? (
                        <Badge variant="success">Paid</Badge>
                      ) : (
                        <Badge variant="destructive">Unpaid</Badge>
                      ))}
                    {isRestock && <Badge variant="outline">Restock</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(transaction)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTransaction(transaction)}
                        title="Delete Transaction"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete Transaction</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {paginationButtons()}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
        <div className="flex space-x-2">
          {/* Only one Add Transaction button */}
          <Button
            variant="default"
            size="sm"
            onClick={handleAddButtonClick}
            className="mr-2"
            disabled={addButtonClickedRef.current}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Transaction
          </Button>
          <Button variant={viewMode === "all" ? "default" : "outline"} size="sm" onClick={() => setViewMode("all")}>
            All Transactions
          </Button>
          <Button
            variant={viewMode === "folders" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("folders")}
          >
            Monthly Folders
          </Button>
        </div>
      </div>

      {duplicatesFound && (
        <Alert variant="destructive" className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Duplicate Transactions Detected</AlertTitle>
          <AlertDescription className="text-amber-700 flex items-center justify-between">
            <div>
              <Shield className="h-4 w-4 inline-block mr-1 text-amber-600" />
              We&apos;ve detected potential duplicate transactions within a 1-minute window.
              <span className="block mt-1 text-sm">
                {transactions.length - filteredTransactions.length} duplicates are currently filtered from view.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-4 border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={findAndRemoveDuplicates}
              disabled={isDeduplicating}
            >
              {isDeduplicating ? "Cleaning..." : "Clean Up Duplicates"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View and manage all transactions</CardDescription>
            </div>
            <div className="flex space-x-2">
              {filteredTransactions.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAllTransactions}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  {viewMode === "folders" && selectedMonth ? "Clear Month" : "Clear All Transactions"}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={searchField} onValueChange={setSearchField}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Search by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="gasType">Gas Type</SelectItem>
                <SelectItem value="paymentMethod">Payment Method</SelectItem>
                <SelectItem value="Transaction_ID">Transaction ID</SelectItem>
                <SelectItem value="customerName">Customer Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {viewMode === "folders" ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Monthly folders sidebar */}
              <div className="md:col-span-3 border rounded-lg p-4">
                <h3 className="font-medium mb-3 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Monthly Folders
                </h3>
                <div className="space-y-1">
                  {monthFolders.map(([monthKey, { label, count }]) => (
                    <Button
                      key={monthKey}
                      variant={selectedMonth === monthKey ? "secondary" : "ghost"}
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => setSelectedMonth(monthKey)}
                    >
                      <FolderOpen
                        className={`h-4 w-4 mr-2 ${selectedMonth === monthKey ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span>{label}</span>
                      <span className="ml-auto bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">
                        {count}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Transactions table */}
              <div className="md:col-span-9">
                {selectedMonth && (
                  <div className="mb-4 flex items-center">
                    <h3 className="font-medium">
                      {monthFolders.find(([key]) => key === selectedMonth)?.[1].label || "Transactions"}
                    </h3>
                    <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">{filteredTransactions.length} transactions</span>
                  </div>
                )}

                {renderTransactionsTable()}
              </div>
            </div>
          ) : (
            renderTransactionsTable()
          )}
        </CardContent>
      </Card>

      {/* Only render the dialog when isAddDialogOpen is true */}
      {isAddDialogOpen && (
        <AddTransactionDialog
          key={`transaction-dialog-${Date.now()}`} // Add a unique key to force fresh instance
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onTransactionAdded={handleAddTransaction}
        />
      )}

      <TransactionDetailsDialog
        transaction={selectedTransaction}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDeleteTransaction}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        isDeleting={isDeleting}
      />

      <DeleteConfirmationDialog
        isOpen={isClearAllDialogOpen}
        onClose={() => setIsClearAllDialogOpen(false)}
        onConfirm={confirmClearAllTransactions}
        title={viewMode === "folders" && selectedMonth ? "Clear Month" : "Clear All Transactions"}
        description={
          viewMode === "folders" && selectedMonth
            ? `Are you sure you want to delete all ${filteredTransactions.length} transactions from this month? This action cannot be undone.`
            : `Are you sure you want to delete all ${filteredTransactions.length} transactions? This action cannot be undone.`
        }
        isDeleting={isDeleting}
      />
    </div>
  )
}
