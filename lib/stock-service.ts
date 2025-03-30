import { doc, updateDoc, getDoc, collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { StockItem } from "@/types"

export async function updateStockQuantity(
  stockId: string,
  newQuantity: number,
  userId: string,
  userName: string,
  reason = "Manual update",
) {
  try {
    // Get current stock data
    const stockRef = doc(db, "stock", stockId)
    const stockDoc = await getDoc(stockRef)

    if (!stockDoc.exists()) {
      throw new Error("Stock item not found")
    }

    const currentStock = stockDoc.data() as StockItem
    const previousQuantity = currentStock.stock
    const changeAmount = newQuantity - previousQuantity

    // Update stock quantity
    await updateDoc(stockRef, {
      stock: newQuantity,
      lastUpdated: new Date().toISOString(),
    })

    // Record history
    await addDoc(collection(db, "stockHistory"), {
      gasType: currentStock.gasType,
      timestamp: new Date().toISOString(),
      previousStock: previousQuantity,
      newStock: newQuantity,
      changeAmount: changeAmount,
      reason: reason,
      userId: userId,
      userName: userName,
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating stock quantity:", error)
    return { success: false, error }
  }
}

export async function recordGasConsumption(
  stockId: string,
  amount: number,
  userId: string,
  userName: string,
  reason = "Sale",
) {
  try {
    // Get current stock data
    const stockRef = doc(db, "stock", stockId)
    const stockDoc = await getDoc(stockRef)

    if (!stockDoc.exists()) {
      throw new Error("Stock item not found")
    }

    const currentStock = stockDoc.data() as StockItem
    const previousQuantity = currentStock.stock
    const newQuantity = previousQuantity - amount

    if (newQuantity < 0) {
      throw new Error("Insufficient stock")
    }

    // Update stock quantity
    await updateDoc(stockRef, {
      stock: newQuantity,
      lastUpdated: new Date().toISOString(),
    })

    // Record history
    await addDoc(collection(db, "stockHistory"), {
      gasType: currentStock.gasType,
      timestamp: new Date().toISOString(),
      previousStock: previousQuantity,
      newStock: newQuantity,
      changeAmount: -amount, // Negative because it's consumption
      reason: reason,
      userId: userId,
      userName: userName,
    })

    // Create transaction record
    await addDoc(collection(db, "transactions"), {
      gasType: currentStock.gasType,
      date: new Date().toISOString(),
      kgs: amount,
      total: amount * currentStock.price,
      currency: "$",
      paymentMethod: "Cash", // Default, can be updated
      createdAt: new Date().toISOString(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error recording gas consumption:", error)
    return { success: false, error }
  }
}

