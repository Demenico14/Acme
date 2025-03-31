"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, getDocs, where } from "firebase/firestore"
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts"
import { Calendar, RefreshCw } from "lucide-react"

import { db } from "@/lib/firebase"
import type { Transaction } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface ChartDataPoint {
  date: string
  rawDate: string
  amount: number
  isRestock?: boolean
  restockAmount?: number
}

interface RestockEvent {
  date: string
  rawDate: string
  amount: number
}

interface GasConsumptionGraphProps {
  gasType?: string
  refreshTrigger?: number
  showRestockEvents?: boolean
}

export function GasConsumptionGraph({
  gasType,
  refreshTrigger = 0,
  showRestockEvents = false,
}: GasConsumptionGraphProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [, setRestockEvents] = useState<RestockEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7days")
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])

  // Fetch transactions and restock events
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Calculate date range based on selected time range
        const now = new Date()
        let startDate: Date

        switch (timeRange) {
          case "7days":
            startDate = subDays(now, 7)
            break
          case "30days":
            startDate = subDays(now, 30)
            break
          case "90days":
            startDate = subDays(now, 90)
            break
          case "year":
            startDate = subDays(now, 365)
            break
          default:
            startDate = subDays(now, 7)
        }

        // Create query with date filter for transactions
        let transactionsQuery = query(
          collection(db, "transactions"),
          where("date", ">=", startOfDay(startDate).toISOString()),
          where("date", "<=", endOfDay(now).toISOString()),
          orderBy("date", "asc"),
        )

        // Add gas type filter if specified
        if (gasType) {
          transactionsQuery = query(
            collection(db, "transactions"),
            where("date", ">=", startOfDay(startDate).toISOString()),
            where("date", "<=", endOfDay(now).toISOString()),
            where("gasType", "==", gasType),
            orderBy("date", "asc"),
          )
        }

        // Get transactions
        const transactionsSnapshot = await getDocs(transactionsQuery)
        const transactionsData = transactionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[]

        setTransactions(transactionsData)

        // Fetch restock events if enabled
        let restockData: RestockEvent[] = []
        if (showRestockEvents) {
          // Query for stock history entries that are restocks
          let restockQuery = query(
            collection(db, "stockHistory"),
            where("timestamp", ">=", startOfDay(startDate).toISOString()),
            where("timestamp", "<=", endOfDay(now).toISOString()),
            where("isRestock", "==", true),
            orderBy("timestamp", "asc"),
          )

          // Add gas type filter if specified
          if (gasType) {
            restockQuery = query(
              collection(db, "stockHistory"),
              where("timestamp", ">=", startOfDay(startDate).toISOString()),
              where("timestamp", "<=", endOfDay(now).toISOString()),
              where("gasType", "==", gasType),
              where("isRestock", "==", true),
              orderBy("timestamp", "asc"),
            )
          }

          const restockSnapshot = await getDocs(restockQuery)
          restockData = restockSnapshot.docs.map((doc) => {
            const data = doc.data()
            return {
              date: format(parseISO(data.timestamp), "MMM dd"),
              rawDate: data.timestamp,
              amount: data.changeAmount,
            }
          })

          setRestockEvents(restockData)
        }

        // Process data for chart - moved inside useEffect
        // Group transactions by date
        const groupedByDate: Record<string, number> = {}

        transactionsData.forEach((transaction) => {
          const date = format(parseISO(transaction.date), "yyyy-MM-dd")

          if (!groupedByDate[date]) {
            groupedByDate[date] = 0
          }

          groupedByDate[date] += transaction.kgs
        })

        // Convert to chart data format
        const data: ChartDataPoint[] = Object.entries(groupedByDate).map(([date, amount]) => ({
          date: format(parseISO(date), "MMM dd"),
          rawDate: date,
          amount,
        }))

        // Add restock events to chart data
        if (showRestockEvents && restockData.length > 0) {
          restockData.forEach((restock) => {
            const restockDate = format(parseISO(restock.rawDate), "yyyy-MM-dd")

            // Find if this date already exists in the data
            const existingIndex = data.findIndex((item) => item.rawDate === restockDate)

            if (existingIndex >= 0) {
              // Add restock flag to existing data point
              data[existingIndex].isRestock = true
              data[existingIndex].restockAmount = restock.amount
            } else {
              // Add new data point for restock
              data.push({
                date: format(parseISO(restockDate), "MMM dd"),
                rawDate: restockDate,
                amount: 0,
                isRestock: true,
                restockAmount: restock.amount,
              })
            }
          })
        }

        // Sort by date
        data.sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())

        setChartData(data)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [timeRange, gasType, refreshTrigger, showRestockEvents])

  // Calculate total consumption
  const totalConsumption = transactions.reduce((sum, transaction) => sum + transaction.kgs, 0)

  // Calculate average daily consumption
  const averageDailyConsumption = chartData.length > 0 ? totalConsumption / chartData.length : 0

  // Custom tooltip to show restock events
  interface TooltipProps {
    active?: boolean
    payload?: Array<{
      value: number
      payload: ChartDataPoint
    }>
    label?: string
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as ChartDataPoint

      return (
        <div className="rounded-md border bg-background p-2 shadow-sm">
          <p className="font-medium">{label}</p>
          <p className="text-sm">Consumption: {payload[0].value.toFixed(2)} kg</p>

          {dataPoint.isRestock && (
            <div className="mt-1 rounded-sm bg-green-100 p-1 text-xs text-green-800">
              <RefreshCw className="mr-1 inline-block h-3 w-3" />
              Restocked: +{dataPoint.restockAmount?.toFixed(2)} kg
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Gas Consumption Over Time</CardTitle>
          <CardDescription>
            {gasType ? `Consumption trend for ${gasType}` : "Consumption trend for all gas types"}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {showRestockEvents && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="bg-green-100 text-green-800">
                <RefreshCw className="mr-1 h-3 w-3" />
                Restock Events
              </Badge>
            </div>
          )}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 3 Months</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="w-full">
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground">No consumption data available for this period</p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-muted-foreground">Total Consumption</div>
                <div className="text-2xl font-bold">{totalConsumption.toFixed(2)} kg</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-muted-foreground">Avg. Daily Consumption</div>
                <div className="text-2xl font-bold">{averageDailyConsumption.toFixed(2)} kg/day</div>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: "Gas Amount (kg)", angle: -90, position: "insideLeft" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name="Gas Consumed"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />

                  {/* Add reference lines for restock events */}
                  {showRestockEvents &&
                    chartData.map((entry, index) =>
                      entry.isRestock ? (
                        <ReferenceLine
                          key={`restock-${index}`}
                          x={entry.date}
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          label={{
                            value: `+${entry.restockAmount?.toFixed(1)}kg`,
                            position: "top",
                            fill: "#10b981",
                            fontSize: 12,
                          }}
                        />
                      ) : null,
                    )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {showRestockEvents && (
              <div className="mt-4 flex items-center justify-end">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span>Restock Events</span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

