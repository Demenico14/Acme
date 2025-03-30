"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { collection, query, getDocs, where } from "firebase/firestore"
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
import { Download, FileText, Save } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

import { db } from "@/lib/firebase"
import type { Transaction } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

interface MonthlyReportProps {
  year: number
  month: number
}

export function MonthlyReport({ year, month }: MonthlyReportProps) {
  const { toast } = useToast()
  const reportRef = useRef<HTMLDivElement>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const fetchMonthlyData = useCallback(async (year: number, month: number) => {
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

      const snapshot = await getDocs(transactionsQuery)
      const transactionsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[]

      setTransactions(transactionsData)
    } catch (error) {
      console.error("Error fetching monthly data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch data for the selected month",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (year && month !== null) {
      fetchMonthlyData(year, month)
    }
  }, [year, month, fetchMonthlyData])

  // Get total revenue
  const getTotalRevenue = () => {
    return transactions.reduce((sum, transaction) => sum + transaction.total, 0)
  }

  // Get total volume
  const getTotalVolume = () => {
    return transactions.reduce((sum, transaction) => sum + transaction.kgs, 0)
  }

  // Get daily sales data
  const getDailySalesData = () => {
    const dailyData: Record<string, { date: string; sales: number; volume: number }> = {}

    transactions.forEach((transaction) => {
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

  // Get gas type distribution
  const getGasTypeDistribution = () => {
    const gasTypeData: Record<string, number> = {}

    transactions.forEach((transaction) => {
      if (!gasTypeData[transaction.gasType]) {
        gasTypeData[transaction.gasType] = 0
      }

      gasTypeData[transaction.gasType] += transaction.kgs
    })

    return Object.entries(gasTypeData).map(([name, value]) => ({ name, value }))
  }

  // Get payment method distribution
  const getPaymentMethodDistribution = () => {
    const methodData: Record<string, number> = {}

    transactions.forEach((transaction) => {
      const method = transaction.paymentMethod || "Unknown"

      if (!methodData[method]) {
        methodData[method] = 0
      }

      methodData[method] += transaction.total
    })

    return Object.entries(methodData).map(([name, value]) => ({ name, value }))
  }

  // Generate PDF report
  const generatePdfReport = async () => {
    if (!reportRef.current) return

    try {
      setIsGeneratingPdf(true)

      // Create a new jsPDF instance
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Add title
      doc.setFontSize(18)
      doc.text(`Monthly Report: ${format(new Date(year, month), "MMMM yyyy")}`, 105, 15, { align: "center" })

      // Add report metadata
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 25)
      doc.text(`Total Transactions: ${transactions.length}`, 20, 30)
      doc.text(`Total Revenue: $${getTotalRevenue().toFixed(2)}`, 20, 35)
      doc.text(`Total Volume: ${getTotalVolume().toFixed(2)} kg`, 20, 40)

      // Capture the chart as an image
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: "#ffffff",
      })

      const imgData = canvas.toDataURL("image/png")

      // Add the chart image to the PDF
      const imgWidth = 170
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      doc.addImage(imgData, "PNG", 20, 50, imgWidth, imgHeight)

      // Add transaction table
      const tableY = 50 + imgHeight + 10
      if (tableY < 250) {
        doc.setFontSize(14)
        doc.text("Recent Transactions", 20, tableY)

        doc.setFontSize(8)
        const headers = ["Date", "Gas Type", "Quantity", "Payment", "Total"]
        const tableData = transactions.slice(0, 10).map((t) => {
          return [
            format(new Date(t.date), "dd/MM/yyyy"),
            t.gasType,
            `${t.kgs.toFixed(2)} kg`,
            t.paymentMethod,
            `${t.currency} ${t.total.toFixed(2)}`,
          ]
        })

        // Simple table rendering
        const cellWidth = 34
        const cellHeight = 7

        // Draw headers
        headers.forEach((header, i) => {
          doc.text(header, 20 + i * cellWidth, tableY + 10)
        })

        // Draw rows
        tableData.forEach((row, rowIndex) => {
          row.forEach((cell, cellIndex) => {
            doc.text(cell, 20 + cellIndex * cellWidth, tableY + 17 + rowIndex * cellHeight)
          })
        })
      }

      // Save the PDF
      const fileName = `gas-management-report-${year}-${month + 1}.pdf`
      doc.save(fileName)

      toast({
        title: "Report Generated",
        description: "Your PDF report has been generated successfully.",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Report Generation Failed",
        description: "There was a problem generating your PDF report.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Save report to Firebase Storage
  const saveReport = async () => {
    // This would be implemented to save the report to Firebase Storage
    // For now, we'll just show a toast
    toast({
      title: "Report Saved",
      description: `Report for ${format(new Date(year, month), "MMMM yyyy")} has been saved.`,
    })
  }

  if (!year || month === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Select a month to view the report</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">{format(new Date(year, month), "MMMM yyyy")} Report</h2>

        <div className="flex gap-2">
          <Button onClick={generatePdfReport} className="flex items-center gap-2" disabled={isGeneratingPdf || loading}>
            <FileText className="h-4 w-4" />
            {isGeneratingPdf ? "Generating..." : "Generate PDF"}
          </Button>
          <Button variant="outline" onClick={saveReport} className="flex items-center gap-2" disabled={loading}>
            <Save className="h-4 w-4" />
            Save Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `$${getTotalRevenue().toFixed(2)}`}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `${getTotalVolume().toFixed(2)} kg`}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : transactions.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="daily">Daily Sales</TabsTrigger>
          <TabsTrigger value="gas">Gas Distribution</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" ref={reportRef}>
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales</CardTitle>
              <CardDescription>
                Sales and volume by day for {format(new Date(year, month), "MMMM yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p>No data available for this month</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
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
                </ResponsiveContainer>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={generatePdfReport}
                disabled={isGeneratingPdf || loading}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="gas">
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
              ) : transactions.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p>No data available for this month</p>
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

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Distribution</CardTitle>
              <CardDescription>Revenue by payment method</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Loading chart data...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p>No data available for this month</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getPaymentMethodDistribution()}>
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
      </Tabs>
    </div>
  )
}