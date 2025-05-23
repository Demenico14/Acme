"use server"

import { adminDb } from "@/lib/firebase-admin"
import { findDuplicateTransactions } from "@/lib/transaction-utils"
import type { Transaction } from "@/types"

/**
 * Server action to detect and remove duplicate transactions
 */
export async function deduplicateTransactions() {
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
      return {
        success: true,
        message: "No duplicate transactions found",
        removedCount: 0,
      }
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

    return {
      success: true,
      message: `Successfully removed ${removedCount} duplicate transactions`,
      removedCount,
      duplicateGroups,
    }
  } catch (error) {
    console.error("Error deduplicating transactions:", error)
    return {
      success: false,
      message: "Failed to deduplicate transactions",
      error: String(error),
    }
  }
}

/**
 * Validates a transaction before adding it to prevent duplicates
 */
export async function validateTransaction(transaction: Partial<Transaction>) {
  try {
    // Get recent transactions from the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

    const transactionsRef = adminDb.collection("transactions")
    const transactionsQuery = transactionsRef.orderBy("date", "desc")
    const querySnapshot = await transactionsQuery.get()

    const allTransactions = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Transaction[]

    const recentTransactions = allTransactions.filter((t) => new Date(t.date) >= new Date(twoMinutesAgo))

    // Check if this transaction would be a duplicate
    for (const existingTransaction of recentTransactions) {
      if (
        existingTransaction.gasType === transaction.gasType &&
        existingTransaction.kgs === transaction.kgs &&
        existingTransaction.paymentMethod === transaction.paymentMethod
      ) {
        // Calculate time difference
        const existingDate = new Date(existingTransaction.date).getTime()
        const newDate = transaction.date ? new Date(transaction.date).getTime() : Date.now()
        const timeDiff = Math.abs(existingDate - newDate)

        // If within 1 minute, consider it a duplicate
        if (timeDiff <= 60000) {
          return {
            success: false,
            isDuplicate: true,
            message: "This appears to be a duplicate transaction",
            existingTransaction,
          }
        }
      }
    }

    return {
      success: true,
      isDuplicate: false,
      message: "Transaction is valid",
    }
  } catch (error) {
    console.error("Error validating transaction:", error)
    return {
      success: false,
      isDuplicate: false,
      message: "Failed to validate transaction",
      error: String(error),
    }
  }
}
