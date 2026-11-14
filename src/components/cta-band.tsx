"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/utils";

export interface CtaBandAction {
  label: string;
  href: string;
}

export interface CtaBandProps {
  title: string;
  description?: string;
  primaryAction: CtaBandAction;
  secondaryAction?: CtaBandAction;
  className?: string;
}

export function CtaBand({
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: CtaBandProps) {
  return (
    <section
      className={cn(
        "w-full bg-gradient-to-b from-teal/15 via-orange/5 to-transparent border-y border-border py-16 md:py-24 px-6 relative overflow-hidden",
        className
      )}
    >
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-30"
      >
        <div
          className="w-[500px] h-[250px] blur-[120px] rounded-full"
          style={{
            background: "radial-gradient(circle, var(--glow-teal) 0%, var(--glow-orange) 55%, transparent 80%)",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-4xl mx-auto text-center flex flex-col items-center"
      >
        {/* Title */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-foreground tracking-tight max-w-3xl leading-tight">
          {title}
        </h2>

        {/* Description */}
        {description && (
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mt-4 sm:mt-5 leading-relaxed">
            {description}
          </p>
        )}

        {/* Two PillButton actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 sm:mt-10 w-full sm:w-auto">
          <PillButton
            asChild
            variant="primary"
            size="lg"
            className="w-full sm:w-auto min-w-[160px] shadow-lg shadow-primary/25 cursor-pointer"
          >
            <Link href={primaryAction.href}>{primaryAction.label}</Link>
          </PillButton>

          {secondaryAction && (
            <PillButton
              asChild
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto min-w-[160px] cursor-pointer"
            >
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </PillButton>
          )}
        </div>
      </motion.div>
    </section>
  );
}

export default CtaBand;
