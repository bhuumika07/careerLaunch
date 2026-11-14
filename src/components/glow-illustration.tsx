"use client"

import * as React from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

export interface GlowIllustrationProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  glowColor?: string
}

const GLOW_COLOR_MAP: Record<string, string> = {
  default: "var(--glow-teal)",
  teal: "var(--glow-teal)",
  orange: "var(--glow-orange)",
  amber: "var(--glow-orange)",
  sky: "var(--glow-teal)",
  navy: "var(--glow-teal)",
}

export function GlowIllustration({
  src,
  alt,
  width,
  height,
  className,
  glowColor = "default",
}: GlowIllustrationProps) {
  const shouldReduceMotion = useReducedMotion()
  const isSvg = src.toLowerCase().endsWith(".svg")
  const resolvedGlow = GLOW_COLOR_MAP[glowColor] || "var(--glow-teal)"

  return (
    <div
      className={cn(
        "relative flex items-center justify-center p-4",
        className
      )}
    >
      {/* Radial gradient glow behind the illustration: teal (0.35) mixed with orange (0.15) */}
      <div
        className="absolute inset-0 -z-10 rounded-full blur-3xl pointer-events-none opacity-80"
        style={{
          background: `radial-gradient(circle at center, ${resolvedGlow} 0%, var(--glow-orange) 45%, transparent 72%)`,
        }}
        aria-hidden="true"
      />

      {/* Floating illustration */}
      <motion.div
        animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative z-10 flex items-center justify-center"
      >
        <Image
          src={src}
          alt={alt}
          width={width ?? 480}
          height={height ?? 480}
          unoptimized={isSvg}
          className="w-full h-auto max-w-full object-contain"
        />
      </motion.div>
    </div>
  )
}

export default GlowIllustration
