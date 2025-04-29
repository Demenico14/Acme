"use client"

import { useEffect, useState, useCallback } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { format, startOfMonth, endOfMonth } from "date-fns"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { DollarSign, CreditCard, TrendingUp, BarChart3, FolderOpen } from "lucide-react"

import { db } from "@/lib/firebase"
import type { StockItem, Transaction, User } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { DatePicker } from "@/components/ui/date-picker"
import { MonthlyFolders } from "@/components/analytics/monthly-folders"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

export default function AnalyticsPage() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [, setStockItems] = useState<StockItem[]>([])
  const [, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("all")
  const [gasTypeFilter, setGasTypeFilter] = useState("all")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth())
  const [isMonthlyView, setIsMonthlyView] = useState(false)
  const [] = useState("report")

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch transactions
      const transactionsQuery = query(collection(db, "transactions"))
      const transactionsSnapshot = await getDocs(transactionsQuery)
      const transactionsData = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[]
      setTransactions(transactionsData)

      // Fetch stock items
      const stockSnapshot = await getDocs(collection(db, "stock"))
      const stockData = stockSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StockItem[]
      setStockItems(stockData)

      // Fetch users
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]
      setUsers(usersData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch data for analytics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // When a month is selected, update the date range to that month
  useEffect(() => {
    if (selectedYear !== null && selectedMonth !== null) {
      const start = startOfMonth(new Date(selectedYear, selectedMonth))
      const end = endOfMonth(new Date(selectedYear, selectedMonth))
      setStartDate(start)
      setEndDate(end)
      setTimeRange("custom")
      setIsMonthlyView(true)

      // Update the page title to show the selected month
      document.title = `Analytics - ${format(new Date(selectedYear, selectedMonth), "MMMM yyyy")}`
    } else {
      setIsMonthlyView(false)
      document.title = "Analytics Dashboard"
    }
  }, [selectedYear, selectedMonth])

  // Fetch data for a specific month
  async function fetchMonthData(year: number, month: number) {
    try {
      setLoading(true)

      // Calculate start and end dates for the selected month
      const startDate = startOfMonth(new Date(year, month))
      const endDate = endOfMonth(new Date(year, month))

      // Fetch transactions for the selected month
      const transactionsQuery = query(
        collection(db, "transactions"),
        where("date", ">=", startDate.toISOString()),
        where("date", "<=", endDate.toISOString()),
      )

      const transactionsSnapshot = await getDocs(transactionsQuery)
      const transactionsData = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[]

      setTransactions(transactionsData)

      // Update the date range filters
      setStartDate(startDate)
      setEndDate(endDate)
      setTimeRange("custom")
    } catch (error) {
      console.error("Error fetching month data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch data for the selected month",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle month selection
  const handleSelectMonth = (year: number, month: number) => {
    setSelectedYear(year)
    setSelectedMonth(month)
    fetchMonthData(year, month)
  }

  // Clear month selection
  const clearMonthSelection = () => {
    setSelectedYear(null)
    setSelectedMonth(null)
    setIsMonthlyView(false)
    setTimeRange("all")
    setStartDate(undefined)
    setEndDate(undefined)
    fetchData()
  }

  // Update the getFilteredTransactions function to use the new date field:
  const getFilteredTransactions = () => {
    if (startDate && endDate) {
      // Custom date range filter
      return transactions.filter((t) => {
        const transactionDate = new Date(t.date)
        return transactionDate >= startDate && transactionDate <= endDate
      })
    }

    if (timeRange === "all") return transactions

    const now = new Date()
    const filterStartDate = new Date()

    switch (timeRange) {
      case "week":
        filterStartDate.setDate(now.getDate() - 7)
        break
      case "month":
        filterStartDate.setMonth(now.getMonth() - 1)
        break
      case "quarter":
        filterStartDate.setMonth(now.getMonth() - 3)
        break
      case "year":
        filterStartDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        return transactions
    }

    return transactions.filter((t) => new Date(t.date) >= filterStartDate)
  }

  // Update the getFilteredByGasType function to use the new gasType field:
  const getFilteredByGasType = (trans: Transaction[]) => {
    if (gasTypeFilter === "all") return trans
    return trans.filter((t) => t.gasType === gasTypeFilter)
  }

  const filteredTransactions = getFilteredByGasType(getFilteredTransactions())

  // Update the getSalesTrendData function to use the new date and total fields:
  const getSalesTrendData = () => {
    const monthlyData: Record<string, number> = {}

    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.date)
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = 0
      }

      monthlyData[monthYear] += transaction.total
    })

    return Object.entries(monthlyData)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  // Get daily sales data for monthly view
  const getDailySalesData = () => {
    if (!selectedYear || selectedMonth === null) return []

    const dailyData: Record<string, { date: string; sales: number; volume: number }> = {}

    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.date)
      const day = date.getDate()
      const dateKey = format(date, "yyyy-MM-dd")

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: `${day}`,
          sales: 0,
          volume: 0,
        }
      }

      dailyData[dateKey].sales += transaction.total
      dailyData[dateKey].volume += transaction.kgs
    })

    return Object.values(dailyData).sort((a, b) => Number.parseInt(a.date) - Number.parseInt(b.date))
  }

  // Update the getGasTypeDistribution function to use the new gasType and kgs fields:
  const getGasTypeDistribution = () => {
    const gasTypeData: Record<string, number> = {}

    filteredTransactions.forEach((transaction) => {
      if (!gasTypeData[transaction.gasType]) {
        gasTypeData[transaction.gasType] = 0
      }

      gasTypeData[transaction.gasType] += transaction.kgs
    })

    return Object.entries(gasTypeData).map(([name, value]) => ({ name, value }))
  }

  // Update the getTransactionTypeData function to use the new total field:
  // Since there's no transaction type in the new interface, we'll use payment method instead
  const getTransactionTypeData = () => {
    const typeData: Record<string, number> = {}

    filteredTransactions.forEach((transaction) => {
      const method = transaction.paymentMethod || "Unknown"
      if (!typeData[method]) {
        typeData[method] = 0
      }
      typeData[method] += transaction.total
    })

    return Object.entries(typeData).map(([name, value]) => ({ name, value }))
  }

  // Update the getRevenueByGasType function to use the new gasType and total fields:
  const getRevenueByGasType = () => {
    const revenueData: Record<string, number> = {}

    filteredTransactions.forEach((transaction) => {
      if (!revenueData[transaction.gasType]) {
        revenueData[transaction.gasType] = 0
      }

      revenueData[transaction.gasType] += transaction.total
    })

    return Object.entries(revenueData).map(([name, value]) => ({ name, value }))
  }

  // Update the getTotalRevenue function to use the new total field:
  const getTotalRevenue = () => {
    return filteredTransactions.reduce((sum, transaction) => sum + transaction.total, 0)
  }

  // Update the getTotalVolume function to use the new kgs field:
  const getTotalVolume = () => {
    return filteredTransactions.reduce((sum, transaction) => sum + transaction.kgs, 0)
  }

  // Update the getUniqueGasTypes function to use the new gasType field:
  const getUniqueGasTypes = () => {
    const gasTypes = new Set<string>()
    transactions.forEach((item) => gasTypes.add(item.gasType))
    return Array.from(gasTypes)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isMonthlyView && selectedYear !== null && selectedMonth !== null
              ? `${format(new Date(selectedYear, selectedMonth), "MMMM yyyy")} Analytics`
              : "Analytics Dashboard"}
          </h2>
          {isMonthlyView && (
            <Button variant="link" className="p-0 h-auto text-muted-foreground" onClick={clearMonthSelection}>
              ← Back to all analytics
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Monthly Archives
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="py-6">
                <h3 className="text-lg font-medium mb-4">Monthly Archives</h3>
                <MonthlyFolders
                  onSelectMonth={handleSelectMonth}
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="grid gap-2">
            <Label htmlFor="time-range">Time Range</Label>
            <Select
              value={timeRange}
              onValueChange={(value) => {
                setTimeRange(value)
                // Clear custom date range when selecting a preset
                if (value !== "custom") {
                  setStartDate(undefined)
                  setEndDate(undefined)
                  setSelectedYear(null)
                  setSelectedMonth(null)
                  setIsMonthlyView(false)
                }
              }}
            >
              <SelectTrigger id="time-range" className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="quarter">Last 3 Months</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {timeRange === "custom" && (
            <div className="flex flex-col md:flex-row gap-2">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <DatePicker selected={startDate} onDateSelect={setStartDate} disabled={timeRange !== "custom"} />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <DatePicker
                  selected={endDate}
                  onDateSelect={setEndDate}
                  disabled={timeRange !== "custom"}
                  minDate={startDate}
                />
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="gas-type">Gas Type</Label>
            <Select value={gasTypeFilter} onValueChange={setGasTypeFilter}>
              <SelectTrigger id="gas-type" className="w-[180px]">
                <SelectValue placeholder="Select gas type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gas Types</SelectItem>
                {getUniqueGasTypes().map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `$${getTotalRevenue().toFixed(2)}`}</div>
            <p className="text-xs text-muted-foreground">
              {isMonthlyView && selectedYear !== null && selectedMonth !== null
                ? format(new Date(selectedYear, selectedMonth), "MMMM yyyy")
                : timeRange === "all"
                  ? "All time"
                  : `Last ${timeRange === "week" ? "7 days" : timeRange === "month" ? "30 days" : timeRange === "quarter" ? "3 months" : "year"}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `${getTotalVolume().toFixed(2)} kg`}</div>
            <p className="text-xs text-muted-foreground">Total gas volume sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : filteredTransactions.length}</div>
            <p className="text-xs text-muted-foreground">Total number of transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading || filteredTransactions.length === 0
                ? "..."
                : `$${(getTotalRevenue() / filteredTransactions.length).toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground">Average transaction value</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="sales">{isMonthlyView ? "Daily Sales" : "Sales Trend"}</TabsTrigger>
          <TabsTrigger value="distribution">Gas Distribution</TabsTrigger>
          <TabsTrigger value="transactions">Transaction Types</TabsTrigger>
          <TabsTrigger value="revenue">Revenue by Type</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" style={{ backgroundColor: "#ffffff" }}>
          <Card>
            <CardHeader>
              <CardTitle>
                {isMonthlyView && selectedYear !== null && selectedMonth !== null ? "Daily Sales" : "Sales Trend"}
              </CardTitle>
              <CardDescription>
                {isMonthlyView && selectedYear !== null && selectedMonth !== null
                  ? `Daily sales for ${format(new Date(selectedYear, selectedMonth), "MMMM yyyy")}`
                  : "Monthly sales over time"}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {isMonthlyView && selectedYear !== null && selectedMonth !== null ? (
                    // Daily sales chart for monthly view
                    <LineChart data={getDailySalesData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#3b82f6" name="Revenue ($)" />
                      <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#10b981" name="Volume (kg)" />
                    </LineChart>
                  ) : (
                    // Monthly sales trend for overall view
                    <LineChart data={getSalesTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" activeDot={{ r: 8 }} name="Revenue" />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Gas Type Distribution</CardTitle>
              <CardDescription>Volume sold by gas type</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getGasTypeDistribution()}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getGasTypeDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} kg`, "Volume"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Type Analysis</CardTitle>
              <CardDescription>Revenue by transaction type</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getTransactionTypeData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Gas Type</CardTitle>
              <CardDescription>Total revenue by gas type</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getRevenueByGasType()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                    <Legend />
                    <Bar dataKey="value" fill="#82ca9d" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
