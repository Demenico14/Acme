"use client"

import { useState } from "react"
import { collection, getDocs, addDoc, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import type { StockItem, Transaction } from "@/types"

export default function SetupStockHistory() {
  const [isRunning, setIsRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const { toast } = useToast()

  async function setupStockHistory() {
    try {
      setIsRunning(true)
      setLog(["Starting migration..."])

      // Get all stock items
      const stockSnapshot = await getDocs(collection(db, "stock"))
      const stockItems = stockSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StockItem[]

      setLog((prev) => [...prev, `Found ${stockItems.length} stock items`])

      // Get all transactions ordered by date
      const transactionsQuery = query(collection(db, "transactions"), orderBy("date", "asc"))
      const transactionsSnapshot = await getDocs(transactionsQuery)
      const transactions = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[]

      setLog((prev) => [...prev, `Found ${transactions.length} transactions`])

      // Create initial stock history entries
      for (const item of stockItems) {
        await addDoc(collection(db, "stockHistory"), {
          gasType: item.gasType,
          timestamp: item.lastUpdated || new Date().toISOString(),
          previousStock: 0,
          newStock: item.stock,
          changeAmount: item.stock,
          reason: "Initial stock",
          userId: "system",
          userName: "System Migration",
        })

        setLog((prev) => [...prev, `Created initial history for ${item.gasType}`])
      }

      // Create history entries for each transaction
      for (const transaction of transactions) {
        // Find the stock item for this transaction
        const stockItem = stockItems.find((item) => item.gasType === transaction.gasType)

        if (stockItem) {
          await addDoc(collection(db, "stockHistory"), {
            gasType: transaction.gasType,
            timestamp: transaction.date,
            previousStock: 0, // We don't know the previous stock
            newStock: 0, // We don't know the new stock
            changeAmount: -transaction.kgs, // Negative because it's consumption
            reason: "Transaction",
            userId: "system",
            userName: "System Migration",
          })

          setLog((prev) => [...prev, `Created history for transaction ${transaction.id}`])
        }
      }

      setLog((prev) => [...prev, "Migration completed successfully"])
      toast({
        title: "Success",
        description: "Stock history migration completed successfully",
      })
    } catch (error) {
      console.error("Migration error:", error)
      setLog((prev) => [...prev, `Error: ${error}`])
      toast({
        title: "Error",
        description: "Failed to complete migration",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Stock History</CardTitle>
        <CardDescription>
          This will create stock history entries based on existing stock and transactions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-60 overflow-auto rounded border p-4">
          {log.length === 0 ? (
            <p className="text-muted-foreground">Migration logs will appear here</p>
          ) : (
            log.map((entry, index) => (
              <div key={index} className="py-1">
                <span className="text-sm">{entry}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={setupStockHistory} disabled={isRunning}>
          {isRunning ? "Running Migration..." : "Run Migration"}
        </Button>
      </CardFooter>
    </Card>
  )
}

