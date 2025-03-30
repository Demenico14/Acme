"use client"
import { db } from "@/lib/firebase"
import { collection, getDocs, orderBy, query } from "firebase/firestore"
import { Search, ShoppingCart, Calendar, ChevronRight, FolderOpen } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEffect, useState } from "react"
import type { Transaction } from "@/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [searchField, setSearchField] = useState("all")
  const [viewMode, setViewMode] = useState<"all" | "folders">("folders")
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const transactionsPerPage = 20

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true)
        const transactionsQuery = query(collection(db, "transactions"), orderBy("date", "desc"))
        const querySnapshot = await getDocs(transactionsQuery)
        const transactionsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Transaction[]
        setTransactions(transactionsData)
        setFilteredTransactions(transactionsData)

        // Set default selected month to the most recent month with transactions
        if (transactionsData.length > 0 && !selectedMonth) {
          const mostRecentDate = new Date(transactionsData[0].date)
          const monthYear = `${mostRecentDate.getFullYear()}-${String(mostRecentDate.getMonth() + 1).padStart(2, "0")}`
          setSelectedMonth(monthYear)
        }
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [selectedMonth])

  useEffect(() => {
    let filtered = transactions

    // First apply month filter if in folder view and a month is selected
    if (viewMode === "folders" && selectedMonth) {
      const [year, month] = selectedMonth.split("-").map(Number)
      filtered = transactions.filter((transaction) => {
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

    transactions.forEach((transaction) => {
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
              <TableHead>Currency</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.id}</TableCell>
                <TableCell>{transaction.kgs.toFixed(2)}</TableCell>
                <TableCell>{transaction.paymentMethod}</TableCell>
                <TableCell>${transaction.total.toFixed(2)}</TableCell>
                <TableCell>{transaction.currency}</TableCell>
                <TableCell>{new Date(transaction.date).toLocaleString()}</TableCell>
              </TableRow>
            ))}
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View and manage all transactions</CardDescription>
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
    </div>
  )
}

