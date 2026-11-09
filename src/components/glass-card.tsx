"use client"

import * as React from "react"
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react"
import { cn } from "@/lib/utils"

export interface GlassCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, keyof HTMLMotionProps<"div">>,
    Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode
  className?: string
  chipLabel?: string
  hover?: boolean
}

export function GlassCard({
  children,
  className,
  chipLabel,
  hover = true,
  ...props
}: GlassCardProps) {
  const shouldReduceMotion = useReducedMotion()

  const cardContent = (
    <>
      {chipLabel && (
        <span className="inline-block bg-sand/20 text-sand text-xs font-medium px-3 py-1 rounded-full mb-4 w-fit">
          {chipLabel}
        </span>
      )}
      {children}
    </>
  )

  const cardClasses = cn(
    "bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] p-6 text-cream",
    className
  )

  if (!hover) {
    return (
      <div
        className={cardClasses}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {cardContent}
      </div>
    )
  }

  return (
    <motion.div
      whileHover={
        shouldReduceMotion
          ? undefined
          : { y: -4, transition: { duration: 0.2 } }
      }
      className={cardClasses}
      {...props}
    >
      {cardContent}
    </motion.div>
  )
}

export default GlassCard
