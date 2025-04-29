import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { findDuplicateTransactions } from "@/lib/transaction-utils"
import type { Transaction } from "@/types"

export async function POST() {
  try {
    // Get all transactions
    const transactionsRef = adminDb.collection("transactions")
    const transactionsQuery = transactionsRef.orderBy("date", "asc")
    const querySnapshot = await transactionsQuery.get()

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
    const batch = adminDb.batch()
    let removedCount = 0

    for (const group of duplicateGroups) {
      // Sort by date (oldest first)
      group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Keep the earliest transaction, delete the rest
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [keep, ...duplicatesToRemove] = group

      for (const duplicate of duplicatesToRemove) {
        // Verify the transaction still exists before deleting
        const docRef = adminDb.collection("transactions").doc(duplicate.id)
        const docSnap = await docRef.get()

        if (docSnap.exists) {
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
    return NextResponse.json(
      {
        success: false,
        message: "Failed to deduplicate transactions",
        error: String(error),
      },
      { status: 500 },
    )
  }
}
