import * as React from "react"
import { cn } from "@/lib/utils"

export interface SectionHeadingProps {
  children: string
  highlightWords?: string[]
  className?: string
  as?: "h1" | "h2" | "h3"
}

export function SectionHeading({
  children,
  highlightWords = [],
  className,
  as: Component = "h2",
}: SectionHeadingProps) {
  const sizeClasses: Record<"h1" | "h2" | "h3", string> = {
    h1: "text-4xl md:text-5xl lg:text-6xl",
    h2: "text-4xl",
    h3: "text-2xl md:text-3xl",
  }

  if (!highlightWords || highlightWords.length === 0) {
    return (
      <Component
        className={cn(
          "font-heading font-bold tracking-tight text-cream",
          sizeClasses[Component],
          className
        )}
      >
        {children}
      </Component>
    )
  }

  // Escape special regex characters and sort by length descending to match phrases first
  const escapedWords = highlightWords
    .filter(Boolean)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length)

  if (escapedWords.length === 0) {
    return (
      <Component
        className={cn(
          "font-heading font-bold tracking-tight text-cream",
          sizeClasses[Component],
          className
        )}
      >
        {children}
      </Component>
    )
  }

  const regex = new RegExp(`(${escapedWords.join("|")})`, "gi")
  const parts = children.split(regex)

  const highlightLookup = new Set(
    highlightWords.map((word) => word.toLowerCase())
  )

  return (
    <Component
      className={cn(
        "font-heading font-bold tracking-tight text-cream",
        sizeClasses[Component],
        className
      )}
    >
      {parts.map((part, index) => {
        const isMatch = highlightLookup.has(part.toLowerCase())
        if (isMatch) {
          return (
            <span key={index} className="text-sand">
              {part}
            </span>
          )
        }
        return <React.Fragment key={index}>{part}</React.Fragment>
      })}
    </Component>
  )
}

export default SectionHeading
