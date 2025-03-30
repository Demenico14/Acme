"use client"

import { useState, useEffect } from "react"
import { collection, query, getDocs, orderBy } from "firebase/firestore"
import { Folder, ChevronRight, Calendar } from 'lucide-react'
import { format } from "date-fns"

import { db } from "@/lib/firebase"
import { Transaction } from "@/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"

interface MonthlyFolder {
  id: string
  label: string
  count: number
  year: number
  month: number
}

interface YearFolder {
  year: number
  months: MonthlyFolder[]
  count: number
}

interface MonthlyFoldersProps {
  onSelectMonth: (year: number, month: number) => void
  selectedYear: number | null
  selectedMonth: number | null
}

export function MonthlyFolders({ onSelectMonth, selectedYear, selectedMonth }: MonthlyFoldersProps) {
  const [loading, setLoading] = useState(true)
  const [yearFolders, setYearFolders] = useState<YearFolder[]>([])
  const [expandedYears, setExpandedYears] = useState<number[]>([])

  useEffect(() => {
    fetchTransactionsByMonth()
  }, [])

  // If there's a selected year, expand it
  useEffect(() => {
    if (selectedYear && !expandedYears.includes(selectedYear)) {
      setExpandedYears(prev => [...prev, selectedYear])
    }
  }, [selectedYear, expandedYears])

  async function fetchTransactionsByMonth() {
    try {
      setLoading(true)
      
      // Fetch all transactions ordered by date
      const transactionsQuery = query(collection(db, "transactions"), orderBy("date", "desc"))
      const snapshot = await getDocs(transactionsQuery)
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[]
      
      // Group transactions by year and month
      const monthlyData: Record<string, { transactions: Transaction[], year: number, month: number }> = {}
      
      transactions.forEach(transaction => {
        const date = new Date(transaction.date)
        const year = date.getFullYear()
        const month = date.getMonth()
        const key = `${year}-${month}`
        
        if (!monthlyData[key]) {
          monthlyData[key] = {
            transactions: [],
            year,
            month
          }
        }
        
        monthlyData[key].transactions.push(transaction)
      })
      
      // Convert to year and month folders
      const yearMap: Record<number, YearFolder> = {}
      
      Object.entries(monthlyData).forEach(([key, data]) => {
        const { year, month, transactions } = data
        
        if (!yearMap[year]) {
          yearMap[year] = {
            year,
            months: [],
            count: 0
          }
        }
        
        const monthFolder: MonthlyFolder = {
          id: key,
          label: format(new Date(year, month, 1), 'MMMM'),
          count: transactions.length,
          year,
          month
        }
        
        yearMap[year].months.push(monthFolder)
        yearMap[year].count += transactions.length
      })
      
      // Sort years descending and months within years
      const sortedYears = Object.values(yearMap).sort((a, b) => b.year - a.year)
      
      sortedYears.forEach(yearFolder => {
        yearFolder.months.sort((a, b) => b.month - a.month)
      })
      
      setYearFolders(sortedYears)
      
      // Auto-expand current year
      const currentYear = new Date().getFullYear()
      if (sortedYears.some(y => y.year === currentYear)) {
        setExpandedYears([currentYear])
      } else if (sortedYears.length > 0) {
        // If current year doesn't exist, expand the most recent year
        setExpandedYears([sortedYears[0].year])
      }
    } catch (error) {
      console.error("Error fetching transactions by month:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleYearExpanded = (year: number) => {
    setExpandedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year]
    )
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-1 pr-2">
        {yearFolders.map((yearFolder) => (
          <Collapsible 
            key={yearFolder.year} 
            open={expandedYears.includes(yearFolder.year)}
            onOpenChange={() => toggleYearExpanded(yearFolder.year)}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between font-normal"
              >
                <div className="flex items-center">
                  <Folder className="mr-2 h-4 w-4" />
                  <span>{yearFolder.year}</span>
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                    {yearFolder.count}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 ui-open:rotate-90" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 pt-1">
              {yearFolder.months.map((monthFolder) => (
                <Button
                  key={monthFolder.id}
                  variant="ghost"
                  className={`w-full justify-start font-normal ${
                    selectedYear === yearFolder.year && selectedMonth === monthFolder.month
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                  onClick={() => onSelectMonth(yearFolder.year, monthFolder.month)}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>{monthFolder.label}</span>
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                    {monthFolder.count}
                  </span>
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </ScrollArea>
  )
}
