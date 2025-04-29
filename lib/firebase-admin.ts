import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    // Parse the private key properly
    const privateKey = process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY
      ? process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined

    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    })
  } catch (error) {
    console.error("Firebase admin initialization error:", error)
  }
}

export const adminDb = getFirestore()
export const adminAuth = getAuth()
export const db = getFirestore() // Export as db for compatibility
