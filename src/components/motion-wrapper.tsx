"use client"

import * as React from "react"
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react"
import { cn } from "@/lib/utils"

export interface MotionWrapperProps
  extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  once?: boolean
}

export function MotionWrapper({
  children,
  className,
  delay = 0,
  duration = 0.5,
  once = true,
  ...props
}: MotionWrapperProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
      whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{
        duration: shouldReduceMotion ? 0.2 : duration,
        delay,
        ease: "easeOut",
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export default MotionWrapper
