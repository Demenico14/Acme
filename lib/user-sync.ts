import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { adminAuth } from "@/lib/firebase-admin"

/**
 * Synchronizes users from Firebase Authentication to Firestore
 * This is useful when users exist in Authentication but not in Firestore
 */
export async function syncUsersToFirestore() {
  try {
    // Get all users from Authentication
    const listUsersResult = await adminAuth.listUsers()
    const authUsers = listUsersResult.users

    // Get all users from Firestore
    const firestoreSnapshot = await getDocs(collection(db, "users"))
    const firestoreUsers = firestoreSnapshot.docs.map((doc) => doc.id)

    // Find users that exist in Authentication but not in Firestore
    const usersToSync = authUsers.filter((user) => !firestoreUsers.includes(user.uid))

    console.log(`Found ${usersToSync.length} users to sync from Authentication to Firestore`)

    // Create Firestore documents for each user
    for (const user of usersToSync) {
      // Check if the user document already exists
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        // Create a basic user document
        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || user.email?.split("@")[0] || "Unknown User",
          email: user.email || "",
          phone: user.phoneNumber || "",
          role: "customer", // Default role
          createdAt: user.metadata.creationTime || new Date().toISOString(),
          lastLogin: user.metadata.lastSignInTime || new Date().toISOString(),
          status: "active",
        })

        console.log(`Created Firestore document for user ${user.uid}`)
      }
    }

    return {
      success: true,
      syncedCount: usersToSync.length,
    }
  } catch (error) {
    console.error("Error syncing users to Firestore:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync users",
    }
  }
}

