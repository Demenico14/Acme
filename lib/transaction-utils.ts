import type { Transaction } from "@/types"

/**
 * Checks if a transaction is a potential duplicate of another transaction
 * based on gas type, quantity, and time proximity
 */
export function isDuplicateTransaction(
  transaction1: Transaction,
  transaction2: Transaction,
  timeWindowMs = 60000, // Default 1 minute
): boolean {
  // Check if basic transaction properties match
  if (
    transaction1.gasType !== transaction2.gasType ||
    transaction1.kgs !== transaction2.kgs ||
    transaction1.paymentMethod !== transaction2.paymentMethod
  ) {
    return false
  }

  // Check if transactions occurred within the time window
  const date1 = new Date(transaction1.date).getTime()
  const date2 = new Date(transaction2.date).getTime()
  const timeDiff = Math.abs(date1 - date2)

  return timeDiff <= timeWindowMs
}

/**
 * Groups transactions by their key attributes to find duplicates
 */
export function findDuplicateTransactions(
  transactions: Transaction[],
  timeWindowMs = 60000, // Default 1 minute
): Transaction[][] {
  // Sort transactions by date (oldest first)
  const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const duplicateGroups: Transaction[][] = []
  const processedIds = new Set<string>()

  // For each transaction, find potential duplicates
  sortedTransactions.forEach((transaction) => {
    // Skip if already processed as part of a duplicate group
    if (processedIds.has(transaction.id)) return

    const duplicates: Transaction[] = [transaction]
    processedIds.add(transaction.id)

    // Check against all other transactions
    sortedTransactions.forEach((otherTransaction) => {
      if (
        transaction.id !== otherTransaction.id &&
        !processedIds.has(otherTransaction.id) &&
        isDuplicateTransaction(transaction, otherTransaction, timeWindowMs)
      ) {
        duplicates.push(otherTransaction)
        processedIds.add(otherTransaction.id)
      }
    })

    // If duplicates found, add to groups
    if (duplicates.length > 1) {
      duplicateGroups.push(duplicates)
    }
  })

  return duplicateGroups
}

/**
 * Filters out duplicate transactions from a list, keeping only the earliest one
 * from each duplicate group
 */
export function filterDuplicateTransactions(
  transactions: Transaction[],
  timeWindowMs = 60000, // Default 1 minute
): Transaction[] {
  const duplicateGroups = findDuplicateTransactions(transactions, timeWindowMs)

  // Create a set of IDs to remove (all duplicates except the earliest one)
  const idsToRemove = new Set<string>()

  duplicateGroups.forEach((group) => {
    // Sort by date (oldest first)
    group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Keep the earliest transaction, mark the rest for removal
    const [keep, ...remove] = group
    remove.forEach((transaction) => idsToRemove.add(transaction.id))
  })

  // Filter out the transactions marked for removal
  return transactions.filter((transaction) => !idsToRemove.has(transaction.id))
}
