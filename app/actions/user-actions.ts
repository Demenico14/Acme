"use server"

import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { adminAuth } from "@/lib/firebase-admin"
import type { NewUserData } from "@/types"
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth"

// Check if a user already exists in Authentication
async function checkUserExists(email: string): Promise<boolean> {
  try {
    // Try to find the user by email using Admin SDK
    const userRecord = await adminAuth.getUserByEmail(email)
    return !!userRecord
  } catch (error) {
    // If error code is auth/user-not-found, the user doesn't exist
    if (error === "auth/user-not-found") {
      return false
    }
    // For any other error, log it and assume the user might exist
    console.error("Error checking if user exists:", error)
    return false
  }
}

// Create a Firestore document for an existing Authentication user
async function createFirestoreDocForExistingUser(email: string, userData: Omit<NewUserData, "password">) {
  try {
    // Get the user by email
    const userRecord = await adminAuth.getUserByEmail(email)

    // Create the Firestore document
    await setDoc(doc(db, "users", userRecord.uid), {
      ...userData,
      uid: userRecord.uid,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    })

    return { success: true, uid: userRecord.uid }
  } catch (error) {
    console.error("Error creating Firestore doc for existing user:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create user document",
    }
  }
}

export async function createUserWithAdmin(userData: NewUserData) {
  try {
    // Check if user already exists
    const userExists = await checkUserExists(userData.email)

    if (userExists) {
      // If user exists in Authentication but not in Firestore, create the Firestore document
      const {  password, ...userDataWithoutPassword } = userData
      console.log(password)
      return await createFirestoreDocForExistingUser(userData.email, userDataWithoutPassword)
    }

    // Prepare user creation data
    const userCreateData: {
      email: string
      password: string
      displayName: string
      phoneNumber?: string
    } = {
      email: userData.email,
      password: userData.password,
      displayName: userData.name,
    }

    // Only add phone number if it exists and is properly formatted
    if (userData.phone && userData.phone.trim()) {
      // Check if phone number already has the + prefix
      const phoneNumber = userData.phone.startsWith("+") ? userData.phone : `+${userData.phone}`

      // Only include if it looks like a valid phone number
      if (/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
        userCreateData.phoneNumber = phoneNumber
      }
    }

    // Use Firebase Admin SDK to create the user
    const userRecord = await adminAuth.createUser(userCreateData)

    // Prepare user data for Firestore (without password)
    const { password, ...userDataWithoutPassword } = userData
    console.log(password)


    try {
      // Create user document in Firestore
      await setDoc(doc(db, "users", userRecord.uid), {
        ...userDataWithoutPassword,
        uid: userRecord.uid,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      })
    } catch (firestoreError) {
      console.error("Error writing to Firestore:", firestoreError)

      // If we can't write to Firestore, we should delete the Auth user to avoid orphaned accounts
      try {
        await adminAuth.deleteUser(userRecord.uid)
      } catch (deleteError) {
        console.error("Error deleting orphaned auth user:", deleteError)
      }

      throw firestoreError
    }

    return { success: true, uid: userRecord.uid }
  } catch (error) {
    console.error("Error creating user with admin:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create user",
    }
  }
}

// Alternative function that uses client-side Firebase Auth
export async function createUserWithClientSDK(userData: NewUserData) {
  try {
    // Check if user already exists
    const userExists = await checkUserExists(userData.email)

    if (userExists) {
      // If user exists in Authentication but not in Firestore, create the Firestore document
      const { password, ...userDataWithoutPassword } = userData
      console.log(password)
      return await createFirestoreDocForExistingUser(userData.email, userDataWithoutPassword)
    }

    // Import the auth from the client-side Firebase SDK
    const auth = getAuth()

    // Create the user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password)

    const user = userCredential.user

    // Prepare user data for Firestore (without password)
    const { password, ...userDataWithoutPassword } = userData
    console.log(password)


    // Check if Firestore document already exists
    const userDocRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      // Create user document in Firestore
      await setDoc(userDocRef, {
        ...userDataWithoutPassword,
        uid: user.uid,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      })
    }

    return { success: true, uid: user.uid }
  } catch (error) {
    console.error("Error creating user with client SDK:", error)

    // If the error is that the email is already in use, try to create just the Firestore document
    if (error instanceof Error && error.message.includes("auth/email-already-in-use")) {
      try {
        const { password, ...userDataWithoutPassword } = userData
        console.log(password)

        return await createFirestoreDocForExistingUser(userData.email, userDataWithoutPassword)
      } catch (docError) {
        console.error("Error creating document for existing user:", docError)
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create user",
    }
  }
}

// Function to create a Firestore document for a user that exists in Authentication
export async function syncUserToFirestore(email: string, userData: Omit<NewUserData, "password">) {
  return await createFirestoreDocForExistingUser(email, userData)
}

