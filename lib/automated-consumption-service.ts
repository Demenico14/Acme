import { collection, query, onSnapshot, doc, getDoc, addDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { StockItem } from "@/types"

// This service automatically tracks and records gas consumption by monitoring stock changes
export function setupAutomatedConsumptionTracking() {
  // Listen for changes to the stock collection
  const stockQuery = query(collection(db, "stock"))

  return onSnapshot(stockQuery, async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      // We're only interested in modified documents (stock level changes)
      if (change.type === "modified") {
        const newData = change.doc.data() as StockItem

        // Get the previous version of the document to compare
        try {
          // Get the document's previous state from stockHistory

          const historySnapshot = await getDoc(doc(db, "stock", change.doc.id))
          const previousData = historySnapshot.data() as StockItem | undefined

          // If we have previous data and the stock has decreased, record consumption
          if (previousData && previousData.stock > newData.stock) {
            const consumptionAmount = previousData.stock - newData.stock

            // Record the transaction automatically
            await addDoc(collection(db, "transactions"), {
              gasType: newData.gasType,
              date: new Date().toISOString(),
              kgs: consumptionAmount,
              total: consumptionAmount * newData.price,
              currency: "$",
              paymentMethod: "Automated",
              createdAt: new Date().toISOString(),
              isAutomated: true,
              reason: "Automated consumption tracking",
            })

            console.log(`Automated consumption recorded: ${consumptionAmount}kg of ${newData.gasType}`)
          }
        } catch (error) {
          console.error("Error in automated consumption tracking:", error)
        }
      }
    })
  })
}

// Function to update stock levels from external sources (e.g., IoT sensors)
export async function updateStockFromSensor(stockId: string, newLevel: number) {
  try {
    const stockRef = doc(db, "stock", stockId)
    const stockDoc = await getDoc(stockRef)

    if (!stockDoc.exists()) {
      throw new Error("Stock item not found")
    }

    const currentStock = stockDoc.data() as StockItem
    const previousLevel = currentStock.stock

    // Update the stock level
    await updateDoc(stockRef, {
      stock: newLevel,
      lastUpdated: new Date().toISOString(),
    })

    // Record the stock history
    await addDoc(collection(db, "stockHistory"), {
      gasType: currentStock.gasType,
      timestamp: new Date().toISOString(),
      previousStock: previousLevel,
      newStock: newLevel,
      changeAmount: newLevel - previousLevel,
      reason: "Sensor update",
      userId: "system",
      userName: "Automated System",
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating stock from sensor:", error)
    return { success: false, error }
  }
}

