"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface RoleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  className?: string;
}

export function RoleCard({
  title,
  description,
  icon,
  href,
  className,
}: RoleCardProps) {
  return (
    <Link
      href={href}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[20px]"
    >
      <motion.div
        whileHover={{ y: -6, transition: { duration: 0.2, ease: "easeOut" } }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "h-full flex flex-col justify-between p-6 sm:p-7 glass-card transition-colors duration-300 hover:border-accent/50 hover:bg-card",
          className
        )}
      >
        <div>
          {/* Icon: in accent color, 40x40 */}
          <div className="w-10 h-10 text-accent-text flex items-center justify-center shrink-0 mb-4 [&_svg]:w-10 [&_svg]:h-10 [&_svg]:stroke-[1.75]">
            {icon}
          </div>

          {/* Title */}
          <h3 className="text-lg font-heading font-bold text-foreground group-hover:text-accent-text transition-colors">
            {title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            {description}
          </p>
        </div>

        {/* Learn More → link text in primary */}
        <div className="mt-6 flex items-center gap-1 text-sm font-medium text-link group-hover:gap-2 transition-all">
          <span>Learn More</span>
          <span
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

export default RoleCard;
