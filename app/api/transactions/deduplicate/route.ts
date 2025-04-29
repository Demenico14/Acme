import { db } from "@/lib/firebase-admin"
import { findDuplicateTransactions } from "@/lib/transaction-utils"
import type { Transaction } from "@/types"
import { doc, getDoc, getDocs, collection, query, orderBy, writeBatch } from "firebase/firestore"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    // Get all transactions
    const transactionsRef = collection(db, "transactions")
    const transactionsQuery = query(transactionsRef, orderBy("date", "asc"))
    const querySnapshot = await getDocs(transactionsQuery)

    const transactions = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[]

    // Find duplicate groups with 1-minute window
    const duplicateGroups = findDuplicateTransactions(transactions, 60000)

    if (duplicateGroups.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No duplicate transactions found",
        removedCount: 0,
      })
    }

    // For each group, keep the earliest transaction and delete the rest
    const batch = writeBatch(db)
    let removedCount = 0

    for (const group of duplicateGroups) {
      // Sort by date (oldest first)
      group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Keep the earliest transaction, delete the rest
      const [keep, ...duplicatesToRemove] = group

      for (const duplicate of duplicatesToRemove) {
        // Verify the transaction still exists before deleting
        const docRef = doc(db, "transactions", duplicate.id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          batch.delete(docRef)
          removedCount++
        }
      }
    }

    // Commit the batch
    await batch.commit()

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${removedCount} duplicate transactions`,
      removedCount,
      duplicateGroups,
    })
  } catch (error) {
    console.error("Error deduplicating transactions:", error)
    return NextResponse.json({ success: false, message: "Failed to deduplicate transactions" }, { status: 500 })
  }
}
