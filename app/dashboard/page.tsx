"use client"

import { useEffect, useState, useCallback } from "react"
import { collection, getDocs, query } from "firebase/firestore"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts"
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  CreditCard,
  ChevronRight,
  ArrowDownLeft,
  Wallet,
} from "lucide-react"

import { db } from "@/lib/firebase"
import type { StockItem, Transaction, User } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

export default function DashboardPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [timeframe, setTimeframe] = useState("week")
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch stock data
      const stockSnapshot = await getDocs(collection(db, "stock"))
      const stockData = stockSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StockItem[]
      setStockItems(stockData)

      // Fetch transactions data
      const transactionsQuery = query(collection(db, "transactions"))
      const transactionsSnapshot = await getDocs(transactionsQuery)
      const transactionsData = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[]
      setTransactions(transactionsData)

      // Fetch users data
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]
      setUsers(usersData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter transactions based on timeframe
  const getFilteredTransactions = useCallback(() => {
    const now = new Date()
    const startDate = new Date()

    switch (timeframe) {
      case "day":
        startDate.setDate(now.getDate() - 1)
        break
      case "week":
        startDate.setDate(now.getDate() - 7)
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        break
      case "quarter":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 7) // Default to week
    }

    return transactions.filter((t) => new Date(t.date) >= startDate)
  }, [transactions, timeframe])

  const filteredTransactions = getFilteredTransactions()

  // Calculate data for charts and metrics
  const stockChartData = stockItems.map((item) => ({
    name: item.gasType,
    value: item.stock,
  }))

  // Calculate low stock items (items with stock less than 20)
  const lowStockItems = stockItems.filter((item) => item.stock < 20)

  // Sales data by day for the selected timeframe
  const getDailyTransactionData = useCallback(() => {
    const days =
      timeframe === "day"
        ? 2
        : timeframe === "week"
          ? 7
          : timeframe === "month"
            ? 30
            : timeframe === "quarter"
              ? 90
              : 365

    const daysArray = Array.from({ length: days }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.setHours(0, 0, 0, 0)
    }).reverse()

    // Map dates to readable format for display
    const formattedDates = daysArray.map((timestamp) =>
      new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    )

    // Create data structure for chart
    return formattedDates.map((date, index) => {
      const dayStart = daysArray[index]
      const dayEnd = index < days - 1 ? daysArray[index + 1] : new Date().getTime()

      const dayTransactions = transactions.filter((t) => {
        const txDate = new Date(t.date).getTime()
        return txDate >= dayStart && txDate < dayEnd
      })

      const daySales = dayTransactions.reduce((sum, t) => sum + t.total, 0)
      const dayVolume = dayTransactions.reduce((sum, t) => sum + t.kgs, 0)

      return {
        name: date,
        sales: daySales,
        volume: dayVolume,
        transactions: dayTransactions.length,
      }
    })
  }, [transactions, timeframe])

  // Transaction distribution by gas type
  const getTransactionsByGasType = useCallback(() => {
    const gasTypes: Record<string, number> = {}

    filteredTransactions.forEach((transaction) => {
      const gasType = transaction.gasType
      if (gasType) {
        gasTypes[gasType] = (gasTypes[gasType] || 0) + transaction.total
      }
    })

    return Object.entries(gasTypes)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredTransactions])

  // Payment method distribution
  const getPaymentMethodDistribution = useCallback(() => {
    const methods: Record<string, number> = {}

    filteredTransactions.forEach((transaction) => {
      const method = transaction.paymentMethod || "Unknown"
      if (!methods[method]) {
        methods[method] = 0
      }
      methods[method] += transaction.total
    })

    return Object.entries(methods)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredTransactions])

  const salesTrend = getDailyTransactionData()
  const transactionsByGasType = getTransactionsByGasType()
  const paymentMethodDistribution = getPaymentMethodDistribution()

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

  // Recent transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  // Total revenue
  const totalRevenue = transactions.reduce((acc, t) => acc + t.total, 0)

  // Filtered period revenue
  const filteredRevenue = filteredTransactions.reduce((acc, t) => acc + t.total, 0)

  // Today's revenue
  const today = new Date().setHours(0, 0, 0, 0)
  const todaysTransactions = transactions.filter((t) => new Date(t.date).setHours(0, 0, 0, 0) === today)
  const todaysRevenue = todaysTransactions.reduce((acc, t) => acc + t.total, 0)
  const todaysVolume = todaysTransactions.reduce((acc, t) => acc + t.kgs, 0)

  // Yesterday's revenue for comparison
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStart = yesterday.setHours(0, 0, 0, 0)
  const yesterdayEnd = yesterday.setHours(23, 59, 59, 999)

  const yesterdaysTransactions = transactions.filter((t) => {
    const date = new Date(t.date).getTime()
    return date >= yesterdayStart && date <= yesterdayEnd
  })

  const yesterdaysRevenue = yesterdaysTransactions.reduce((acc, t) => acc + t.total, 0)

  // Calculate growth percentages
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 100
    return ((current - previous) / previous) * 100
  }

  const revenueGrowth = calculateGrowth(todaysRevenue, yesterdaysRevenue)

  // Top selling gas types
  const topSellingGasTypes = [...transactionsByGasType].slice(0, 3)

  // Stock utilization
  const totalStock = stockItems.reduce((acc, item) => acc + item.stock, 0)
  const totalVolume = filteredTransactions.reduce((acc, t) => acc + t.kgs, 0)
  const stockUtilization = Math.min(100, Math.round(totalStock > 0 ? (totalVolume / totalStock) * 100 : 0))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-muted-foreground">
            Welcome back! Here&#39;s what&#39;s happening with your business today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fetchData()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today&#39;s Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : `${transactions[0]?.currency || "$"}${todaysRevenue.toFixed(2)}`}
            </div>
            <div className="flex items-center pt-1">
              <Badge variant={revenueGrowth >= 0 ? "default" : "destructive"} className="mr-2">
                {revenueGrowth >= 0 ? (
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                ) : (
                  <ArrowDownLeft className="mr-1 h-3 w-3" />
                )}
                {Math.abs(revenueGrowth).toFixed(1)}%
              </Badge>
              <p className="text-xs text-muted-foreground">from yesterday</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today&#39;s Volume</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `${todaysVolume.toFixed(2)} kg`}</div>
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Daily Target: 100kg</span>
                <span>{Math.min(100, Math.round((todaysVolume / 100) * 100))}%</span>
              </div>
              <Progress value={Math.min(100, Math.round((todaysVolume / 100) * 100))} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : filteredTransactions.length}</div>
            <div className="flex items-center pt-1">
              <p className="text-xs text-muted-foreground">
                {timeframe === "day"
                  ? "in the last 24 hours"
                  : timeframe === "week"
                    ? "in the last 7 days"
                    : timeframe === "month"
                      ? "in the last 30 days"
                      : timeframe === "quarter"
                        ? "in the last 3 months"
                        : "in the last year"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : lowStockItems.length}</div>
            <div className="flex items-center pt-1">
              <Badge variant={lowStockItems.length > 0 ? "destructive" : "default"} className="mr-2">
                {lowStockItems.length > 0 ? "Action Required" : "All Stocked"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Sales Trend Chart */}
            <Card className="md:col-span-5">
              <CardHeader>
                <CardTitle>Revenue & Volume Trend</CardTitle>
                <CardDescription>
                  {timeframe === "day"
                    ? "Last 24 hours"
                    : timeframe === "week"
                      ? "Last 7 days"
                      : timeframe === "month"
                        ? "Last 30 days"
                        : timeframe === "quarter"
                          ? "Last 3 months"
                          : "Last year"}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <p>Loading chart data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesTrend}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="sales"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorSales)"
                        name="Revenue"
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="volume"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorVolume)"
                        name="Volume (kg)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Selling Products */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>By revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <p>Loading data...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topSellingGasTypes.map((item, index) => (
                      <div key={item.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div
                              className={`mr-2 h-4 w-4 rounded-full bg-[${COLORS[index % COLORS.length]}]`}
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <span className="text-sm">
                            {transactions[0]?.currency || "$"}
                            {item.value.toFixed(2)}
                          </span>
                        </div>
                        <Progress value={Math.round((item.value / (topSellingGasTypes[0]?.value || 1)) * 100)} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Link href="/dashboard/analytics" className="w-full">
                  <Button variant="outline" size="sm" className="w-full">
                    View Detailed Analytics
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Distribution by revenue</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <p>Loading chart data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentMethodDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [
                          `${transactions[0]?.currency || "$"}${Number(value).toFixed(2)}`,
                          "Revenue",
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Gas Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Gas Type Distribution</CardTitle>
                <CardDescription>By revenue</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <p>Loading chart data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={transactionsByGasType}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {transactionsByGasType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [
                          `${transactions[0]?.currency || "$"}${Number(value).toFixed(2)}`,
                          "Revenue",
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Latest activity</CardDescription>
                </div>
                <Link href="/dashboard/transactions">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <p>Loading data...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center space-x-4">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {transaction.gasType?.substring(0, 2) || "TX"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{transaction.gasType || "Unknown Product"}</p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.date ? new Date(transaction.date).toLocaleString() : "Unknown time"}
                          </p>
                        </div>
                        <div className="text-sm font-medium">
                          {transaction.currency}
                          {transaction.total.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : `${transactions[0]?.currency || "$"}${totalRevenue.toFixed(2)}`}
                </div>
                <p className="text-xs text-muted-foreground">Lifetime</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Period Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : `${transactions[0]?.currency || "$"}${filteredRevenue.toFixed(2)}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {timeframe === "day"
                    ? "Last 24 hours"
                    : timeframe === "week"
                      ? "Last 7 days"
                      : timeframe === "month"
                        ? "Last 30 days"
                        : timeframe === "quarter"
                          ? "Last 3 months"
                          : "Last year"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading || filteredTransactions.length === 0
                    ? "..."
                    : `${transactions[0]?.currency || "$"}${(filteredRevenue / filteredTransactions.length).toFixed(2)}`}
                </div>
                <p className="text-xs text-muted-foreground">Per transaction</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stock Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : `${stockUtilization}%`}</div>
                <Progress value={stockUtilization} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sales Performance</CardTitle>
                <CardDescription>Revenue over time</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <p>Loading chart data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          `${transactions[0]?.currency || "$"}${Number(value).toFixed(2)}`,
                          "Revenue",
                        ]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="sales" stroke="#3b82f6" activeDot={{ r: 8 }} name="Revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Distribution by revenue</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <p>Loading chart data...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {paymentMethodDistribution.map((method) => (
                      <div key={method.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {method.name === "Cash" ? (
                              <Wallet className="h-4 w-4 text-muted-foreground" />
                            ) : method.name === "Credit Card" ? (
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span>{method.name}</span>
                          </div>
                          <span className="font-medium">
                            {transactions[0]?.currency || "$"}
                            {method.value.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={Math.round(
                              (method.value / paymentMethodDistribution.reduce((sum, m) => sum + m.value, 0)) * 100,
                            )}
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(
                              (method.value / paymentMethodDistribution.reduce((sum, m) => sum + m.value, 0)) * 100,
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Recent sales transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Loading data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 text-left">Date</th>
                        <th className="py-3 text-left">Gas Type</th>
                        <th className="py-3 text-left">Amount</th>
                        <th className="py-3 text-left">Payment Method</th>
                        <th className="py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.slice(0, 10).map((transaction) => (
                        <tr key={transaction.id} className="border-b">
                          <td className="py-3">{new Date(transaction.date).toLocaleDateString()}</td>
                          <td className="py-3">{transaction.gasType}</td>
                          <td className="py-3">{transaction.kgs} kg</td>
                          <td className="py-3">{transaction.paymentMethod}</td>
                          <td className="py-3 text-right">
                            {transaction.currency}
                            {transaction.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {Math.min(10, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </p>
              <Link href="/dashboard/transactions">
                <Button variant="outline" size="sm">
                  View All Transactions
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Stock Levels</CardTitle>
                <CardDescription>Current inventory by gas type</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <p>Loading chart data...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" name="Stock Level" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alert</CardTitle>
                <CardDescription>Items requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <p>Loading data...</p>
                  </div>
                ) : lowStockItems.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-4 text-sm font-medium">No Low Stock Items</h3>
                    <p className="mt-2 text-sm text-muted-foreground">All inventory items are adequately stocked.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lowStockItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{item.gasType}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.stock < 10 ? "Critical" : "Low"} stock level
                          </p>
                        </div>
                        <Badge variant={item.stock < 10 ? "destructive" : "outline"}>{item.stock} units</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Link href="/dashboard/stock" className="w-full">
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Inventory
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Details</CardTitle>
              <CardDescription>Complete stock information</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Loading data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 text-left">Gas Type</th>
                        <th className="py-3 text-left">Price</th>
                        <th className="py-3 text-left">Stock Level</th>
                        <th className="py-3 text-left">Status</th>
                        <th className="py-3 text-left">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-3 font-medium">{item.gasType}</td>
                          <td className="py-3">
                            {transactions[0]?.currency || "$"}
                            {item.price.toFixed(2)}
                          </td>
                          <td className="py-3">{item.stock} units</td>
                          <td className="py-3">
                            <Badge
                              variant={item.stock < 10 ? "destructive" : item.stock < 20 ? "outline" : "secondary"}
                            >
                              {item.stock < 10 ? "Critical" : item.stock < 20 ? "Low" : "In Stock"}
                            </Badge>
                          </td>
                          <td className="py-3">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>System users and their information</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Loading data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 text-left">Name</th>
                        <th className="py-3 text-left">Email</th>
                        <th className="py-3 text-left">Role</th>
                        <th className="py-3 text-left">Created At</th>
                        <th className="py-3 text-left">Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b">
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </td>
                          <td className="py-3">{user.email}</td>
                          <td className="py-3">
                            <Badge
                              variant={
                                user.role === "admin" ? "default" : user.role === "employee" ? "secondary" : "outline"
                              }
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className="py-3">{new Date(user.lastLogin).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Link href="/dashboard/users" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Users
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

