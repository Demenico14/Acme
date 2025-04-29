"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  selected?: Date
  onDateSelect?: (date: Date | undefined) => void
  disabled?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
}

function DatePicker({ date, selected, onDateSelect, disabled, className, minDate, maxDate }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            disabled={disabled}
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !(date || selected) && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date || selected ? format(date || (selected as Date), "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date || selected}
            onSelect={onDateSelect}
            initialFocus
            fromDate={minDate}
            toDate={maxDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DatePicker }
