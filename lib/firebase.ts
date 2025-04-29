import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, query, collection, where, getDocs, limit, orderBy } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// Check for potential duplicate transactions
export async function checkDuplicateTransaction(
  gasType: string,
  quantity: number,
  total: number,
  timeWindowMs = 30000, // Default 30 seconds
): Promise<boolean> {
  try {
    // Get recent transactions within the time window
    const timeThreshold = Date.now() - timeWindowMs

    const recentTransactionsQuery = query(
      collection(db, "transactions"),
      where("gasType", "==", gasType),
      where("kgs", "==", quantity),
      where("clientTimestamp", ">=", timeThreshold),
      orderBy("clientTimestamp", "desc"),
      limit(5),
    )

    const querySnapshot = await getDocs(recentTransactionsQuery)

    // If we found any transactions that match these criteria, it's a potential duplicate
    return querySnapshot.size > 0
  } catch (error) {
    console.error("Error checking for duplicate transactions:", error)
    return false // If there's an error, allow the transaction to proceed
  }
}

export { app, auth, db, storage }
