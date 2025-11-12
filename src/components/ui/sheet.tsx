'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: 'left' | 'right' | 'top' | 'bottom'
  children: React.ReactNode
}

export function Sheet({ open, onOpenChange, side = 'left', children }: SheetProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!mounted || !open) return null

  const sideClasses = {
    left: 'left-0 top-0 h-full',
    right: 'right-0 top-0 h-full',
    top: 'top-0 left-0 w-full',
    bottom: 'bottom-0 left-0 w-full',
  }

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        className={`fixed z-50 ${sideClasses[side]} w-full md:w-[380px] bg-background text-foreground shadow-lg transition-transform duration-200 ease-in-out flex flex-col`}
        style={{
          background: 'var(--card)',
          color: 'var(--text)',
        }}
      >
        {children}
      </div>
    </>
  )

  return createPortal(content, document.body)
}

