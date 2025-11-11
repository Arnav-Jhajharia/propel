"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"

function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReduced(mediaQuery.matches)
    const onChange = () => setPrefersReduced(mediaQuery.matches)
    mediaQuery.addEventListener?.("change", onChange)
    return () => mediaQuery.removeEventListener?.("change", onChange)
  }, [])

  return prefersReduced
}

export default function PageTransition({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const reduce = usePrefersReducedMotion()

  if (reduce) {
    return <div className="contents">{children}</div>
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}







