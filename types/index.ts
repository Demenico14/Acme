export interface StockItem {
  id: string
  gasType: string
  price: number
  stock: number
  lastUpdated: string
}

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

