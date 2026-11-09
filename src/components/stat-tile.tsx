import * as React from "react"
import { cn } from "@/lib/utils"

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  label: string
  className?: string
}

export function StatTile({ value, label, className, ...props }: StatTileProps) {
  return (
    <div
      className={cn(
        "border-[1.5px] border-sand rounded-xl p-6 bg-transparent flex flex-col justify-center",
        className
      )}
      {...props}
    >
      <div className="text-3xl font-heading font-bold text-cream tracking-tight">
        {value}
      </div>
      <div className="text-sm text-cream/65 mt-1 font-body">
        {label}
      </div>
    </div>
  )
}

export default StatTile
