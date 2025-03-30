import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { format } from "date-fns"

export interface SavedReport {
  id: string
  year: number
  month: number
  title: string
  createdAt: string
  fileUrl?: string
  fileType: "pdf" | "csv" | "json"
  metadata: {
    transactionCount: number
    totalRevenue: number
    totalVolume: number
  }
}

export async function saveReportMetadata(
  year: number,
  month: number,
  fileType: "pdf" | "csv" | "json",
  metadata: {
    transactionCount: number
    totalRevenue: number
    totalVolume: number
  },
  fileUrl?: string,
): Promise<string> {
  try {
    const reportData: Omit<SavedReport, "id"> = {
      year,
      month,
      title: `${format(new Date(year, month), "MMMM yyyy")} Report`,
      createdAt: new Date().toISOString(),
      fileType,
      fileUrl,
      metadata,
    }

    const docRef = await addDoc(collection(db, "reports"), reportData)
    return docRef.id
  } catch (error) {
    console.error("Error saving report metadata:", error)
    throw error
  }
}

export async function uploadReportFile(
  year: number,
  month: number,
  fileType: "pdf" | "csv" | "json",
  file: Blob,
): Promise<string> {
  try {
    const fileName = `reports/${year}/${month + 1}/${format(new Date(), "yyyyMMdd-HHmmss")}.${fileType}`
    const storageRef = ref(storage, fileName)

    await uploadBytes(storageRef, file)
    const downloadUrl = await getDownloadURL(storageRef)

    return downloadUrl
  } catch (error) {
    console.error("Error uploading report file:", error)
    throw error
  }
}

export async function getReportsByMonth(year: number, month: number): Promise<SavedReport[]> {
  try {
    const reportsQuery = query(
      collection(db, "reports"),
      where("year", "==", year),
      where("month", "==", month),
      orderBy("createdAt", "desc"),
    )

    const snapshot = await getDocs(reportsQuery)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SavedReport[]
  } catch (error) {
    console.error("Error getting reports by month:", error)
    throw error
  }
}

export async function getAllReports(): Promise<SavedReport[]> {
  try {
    const reportsQuery = query(
      collection(db, "reports"),
      orderBy("year", "desc"),
      orderBy("month", "desc"),
      orderBy("createdAt", "desc"),
    )

    const snapshot = await getDocs(reportsQuery)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SavedReport[]
  } catch (error) {
    console.error("Error getting all reports:", error)
    throw error
  }
}

