"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

export interface ProgramCardProps {
  stepNumber: number
  title: string
  description: string
  chipLabel: string
  items: string[]
  className?: string
}

export function ProgramCard({
  stepNumber,
  title,
  description,
  chipLabel,
  items,
  className,
}: ProgramCardProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      whileHover={
        shouldReduceMotion
          ? undefined
          : { y: -4, transition: { duration: 0.2 } }
      }
      className={cn(
        "bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6 flex flex-col justify-between text-cream",
        className
      )}
    >
      <div>
        {chipLabel && (
          <span className="inline-block bg-sand/20 text-sand text-xs font-medium px-3 py-1 rounded-full mb-4">
            {chipLabel}
          </span>
        )}

        <h3 className="text-xl font-heading font-bold text-cream tracking-tight mb-2">
          {title}
        </h3>

        <p className="text-sm text-cream/65 leading-relaxed mb-5 font-body">
          {description}
        </p>

        {items && items.length > 0 && (
          <ul className="space-y-2.5 mb-6">
            {items.map((item, index) => (
              <li
                key={index}
                className="flex items-center gap-2.5 text-sm text-cream/90"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-sand shrink-0"
                  aria-hidden="true"
                />
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pt-2 mt-auto">
        <span className="inline-flex items-center rounded-full bg-sand/10 text-sand text-xs font-medium px-3 py-1">
          Step {stepNumber}
        </span>
      </div>
    </motion.div>
  )
}

export default ProgramCard
