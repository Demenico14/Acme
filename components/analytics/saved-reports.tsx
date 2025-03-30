"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { FileText, Download, Eye, Trash2 } from "lucide-react"

import { getReportsByMonth, type SavedReport } from "@/lib/report-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface SavedReportsProps {
  year: number
  month: number
}

export function SavedReports({ year, month }: SavedReportsProps) {
  const [reports, setReports] = useState<SavedReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (year && month !== null) {
      fetchReports(year, month)
    }
  }, [year, month])

  async function fetchReports(year: number, month: number) {
    try {
      setLoading(true)
      const reportsList = await getReportsByMonth(year, month)
      setReports(reportsList)
    } catch (error) {
      console.error("Error fetching reports:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleDownload(url: string, title: string) {
    if (!url) return

    const a = document.createElement("a")
    a.href = url
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No saved reports</h3>
          <p className="mt-2 text-sm text-muted-foreground">Generate and save reports to view them here</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Reports</CardTitle>
        <CardDescription>Previously generated reports for {format(new Date(year, month), "MMMM yyyy")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <h4 className="font-medium">{report.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Created {format(new Date(report.createdAt), "MMM d, yyyy h:mm a")}</span>
                      <Badge variant="outline">{report.fileType.toUpperCase()}</Badge>
                    </div>
                    <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                      <span>{report.metadata.transactionCount} transactions</span>
                      <span>${report.metadata.totalRevenue.toFixed(2)} revenue</span>
                      <span>{report.metadata.totalVolume.toFixed(2)} kg volume</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {report.fileUrl && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => window.open(report.fileUrl, "_blank")}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(report.fileUrl!, report.title)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

