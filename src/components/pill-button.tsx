"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

export const pillButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sand focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "bg-sand text-ink hover:bg-sand/90",
        secondary:
          "border border-cream/20 text-cream bg-transparent hover:bg-cream/5",
        ghost: "text-cream hover:bg-cream/5",
      },
      size: {
        sm: "px-4 py-1.5 text-sm",
        md: "px-6 py-2.5 text-base",
        lg: "px-8 py-3 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface PillButtonProps
  extends Omit<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"
    >,
    VariantProps<typeof pillButtonVariants> {
  icon?: React.ReactNode;
  asChild?: boolean;
  href?: string;
}

export const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  (
    {
      className,
      variant,
      size,
      icon,
      asChild = false,
      href,
      children,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();

    if (href) {
      return (
        <motion.div
          whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          className="inline-block"
        >
          <Link
            href={href}
            className={cn(pillButtonVariants({ variant, size, className }))}
          >
            {children}
            {icon && (
              <span className="inline-flex shrink-0 items-center justify-center">
                {icon}
              </span>
            )}
          </Link>
        </motion.div>
      );
    }

    if (asChild && React.isValidElement(children)) {
      const childElement = children as React.ReactElement<any>;
      return React.cloneElement(childElement, {
        className: cn(
          pillButtonVariants({ variant, size, className }),
          childElement.props?.className
        ),
        ...props,
      });
    }

    return (
      <motion.button
        ref={ref}
        whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
        className={cn(pillButtonVariants({ variant, size, className }))}
        {...(props as HTMLMotionProps<"button">)}
      >
        {children}
        {icon && (
          <span className="inline-flex shrink-0 items-center justify-center">
            {icon}
          </span>
        )}
      </motion.button>
    );
  }
);

PillButton.displayName = "PillButton";

export default PillButton;
