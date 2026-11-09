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
  sand: "rgba(196, 168, 133, 0.2)",
  cream: "rgba(232, 223, 212, 0.2)",
  slate: "rgba(34, 52, 61, 0.3)",
  ink: "rgba(11, 11, 9, 0.4)",
  umber: "rgba(92, 77, 58, 0.25)",
}

export function GlowIllustration({
  src,
  alt,
  width,
  height,
  className,
  glowColor = "sand",
}: GlowIllustrationProps) {
  const shouldReduceMotion = useReducedMotion()
  const isSvg = src.toLowerCase().endsWith(".svg")
  const resolvedGlow = GLOW_COLOR_MAP[glowColor] || glowColor

  return (
    <div
      className={cn(
        "relative flex items-center justify-center p-4",
        className
      )}
    >
      {/* Radial gradient glow behind the illustration */}
      <div
        className="absolute inset-0 -z-10 rounded-full blur-3xl pointer-events-none opacity-80"
        style={{
          background: `radial-gradient(circle at center, ${resolvedGlow} 0%, transparent 70%)`,
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
