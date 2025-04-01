"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, getDocs, where } from "firebase/firestore"
import { format, parseISO } from "date-fns"
import { ArrowUp, ArrowDown, Zap, User, RefreshCw, Package, ChevronLeft, ChevronRight } from "lucide-react"

import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// Add pagination constants
const ITEMS_PER_PAGE = 20

interface StockHistoryEntry {
  id: string
  gasType: string
  timestamp: string
  previousStock: number
  newStock: number
  changeAmount: number
  reason: string
  userId: string
  userName: string
  isAutomated?: boolean
  isRestock?: boolean
}

interface StockHistoryProps {
  gasType?: string
  showRestockEvents?: boolean
}

export function StockHistory({ gasType }: StockHistoryProps) {
  const [history, setHistory] = useState<StockHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    async function fetchStockHistory() {
      try {
        setLoading(true)

        // Create query
        let historyQuery = query(collection(db, "stockHistory"), orderBy("timestamp", "desc"))

        // Add gas type filter if specified
        if (gasType) {
          historyQuery = query(
            collection(db, "stockHistory"),
            where("gasType", "==", gasType),
            orderBy("timestamp", "desc"),
          )
        }

        const snapshot = await getDocs(historyQuery)
        const historyData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as StockHistoryEntry[]

        setHistory(historyData)
        // Calculate total pages
        setTotalPages(Math.ceil(historyData.length / ITEMS_PER_PAGE))
        // Reset to first page when data changes
        setCurrentPage(1)
      } catch (error) {
        console.error("Error fetching stock history:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStockHistory()
  }, [gasType])

  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return history.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }

  // Handle page navigation
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock History</CardTitle>
        <CardDescription>
          {gasType ? `History of changes for ${gasType}` : "History of all stock changes"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <p>Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex justify-center py-4">
            <p className="text-muted-foreground">No history available</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Gas Type</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Previous Stock</TableHead>
                <TableHead>New Stock</TableHead>
                <TableHead>Updated By</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getCurrentPageItems().map((entry) => (
                <TableRow key={entry.id} className={entry.isRestock ? "bg-green-50 dark:bg-green-900/10" : ""}>
                  <TableCell>{format(parseISO(entry.timestamp), "MMM dd, yyyy HH:mm")}</TableCell>
                  <TableCell>{entry.gasType}</TableCell>
                  <TableCell>
                    {entry.changeAmount > 0 ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        <ArrowUp className="mr-1 h-3 w-3" />+{entry.changeAmount.toFixed(2)} kg
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-100 text-red-800">
                        <ArrowDown className="mr-1 h-3 w-3" />
                        {entry.changeAmount.toFixed(2)} kg
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{entry.previousStock.toFixed(2)} kg</TableCell>
                  <TableCell>{entry.newStock.toFixed(2)} kg</TableCell>
                  <TableCell>{entry.userName}</TableCell>
                  <TableCell>{entry.reason}</TableCell>
                  <TableCell>
                    {entry.isRestock ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Restock
                      </Badge>
                    ) : entry.isAutomated || entry.userId === "system" ? (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        <Zap className="mr-1 h-3 w-3" />
                        Automated
                      </Badge>
                    ) : entry.reason?.includes("Cylinder") ? (
                      <Badge variant="outline" className="bg-purple-100 text-purple-800">
                        <Package className="mr-1 h-3 w-3" />
                        Cylinder
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <User className="mr-1 h-3 w-3" />
                        Manual
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {/* Add pagination controls */}
      {history.length > 0 && (
        <CardFooter className="flex items-center justify-between border-t px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min(history.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} to{" "}
            {Math.min(history.length, currentPage * ITEMS_PER_PAGE)} of {history.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

