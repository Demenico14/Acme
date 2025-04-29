export interface StockItem {
  id: string
  gasType: string
  price: number
  stock: number
  lastUpdated: string
  cylinders: Cylinder[] // Add cylinders array to StockItem
}

// Update the StockAttachment interface to include the properties we're using
export interface StockAttachment {
  id: string
  name: string
  type: string // cylinder, manifold, regulator, valve, hose, etc.
  serialNumber: string
  purchaseDate: string
  condition: string // excellent, good, fair, poor, critical
  location: string
  notes: string
  lastInspection: string
  nextInspection: string
  // Optional properties that might be present
  capacity?: number
  manufacturer?: string
}

export interface Transaction {
  createdAt: string
  currency: string
  date: string
  gasType: string
  id: string
  kgs: number
  paymentMethod: string
  total: number
  reason?: string
  isRestock?: boolean
  // Credit transaction fields
  cardDetails?: {
    cardNumber?: string
    cardType?: string
    expiryDate?: string
    nameOnCard?: string
  }
  customerName?: string
  dueDate?: string
  paid?: boolean
  paidDate?: string
  phoneNumber?: string
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface User {
  id: string
  uid?: string
  name: string
  email: string
  phone?: string
  role: "admin" | "customer" | "employee"
  createdAt: string
  lastLogin: string
  address?: Address
  IdNumber?: string
  profileImageUrl?: string
  status: "active" | "inactive" | "pending"
  notes?: string
}

export interface NewUserData {
  name: string
  email: string
  password: string
  phone?: string
  role: "admin" | "customer" | "employee"
  address?: Address
  IdNumber?: string
  profileImageUrl?: string
  status: "active" | "inactive" | "pending"
  notes?: string
}

// Update the Cylinder interface to fix the remaining errors
export interface Cylinder {
  id: string
  serialNumber: string
  capacity: number
  manufacturer: string
  manufactureDate: string
  lastInspectionDate: string
  nextInspectionDate: string
  status: "available" | "in-use" | "maintenance" | "retired"
  location: string
  notes?: string
  size: number // Changed from string to number for arithmetic operations
  count: number
  lastRestocked: string // Added lastRestocked property
}
