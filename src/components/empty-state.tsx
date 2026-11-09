import * as React from "react"
import { PackageOpen } from "lucide-react"
import { PillButton } from "@/components/pill-button"
import { cn } from "@/lib/utils"

export interface EmptyStateAction {
  label: string
  onClick: () => void
}

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description: string
  icon?: React.ReactNode
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[20px] border border-cream/[0.1] bg-white/[0.02]",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-sand/10 text-sand mb-4 ring-1 ring-sand/20">
        {icon ? (
          icon
        ) : (
          <PackageOpen className="w-7 h-7 text-sand" aria-hidden="true" />
        )}
      </div>

      <h3 className="text-lg font-heading font-semibold text-cream tracking-tight mb-1.5">
        {title}
      </h3>

      <p className="text-sm text-cream/65 max-w-sm font-body leading-relaxed mb-6">
        {description}
      </p>

      {action && (
        <PillButton variant="primary" size="md" onClick={action.onClick}>
          {action.label}
        </PillButton>
      )}
    </div>
  )
}

export default EmptyState
