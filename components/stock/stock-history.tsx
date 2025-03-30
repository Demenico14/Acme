"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, getDocs, where } from "firebase/firestore"
import { format, parseISO } from "date-fns"
import { ArrowUp, ArrowDown, Zap, User, RefreshCw, Package } from "lucide-react"

import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

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
      } catch (error) {
        console.error("Error fetching stock history:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStockHistory()
  }, [gasType])

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
              {history.map((entry) => (
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
    </Card>
  )
}

