'use client'

import * as React from 'react'

interface AccordionContextValue {
  value: string[]
  onValueChange: (value: string | string[]) => void
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined)

interface AccordionProps {
  type?: 'single' | 'multiple'
  defaultValue?: string[]
  value?: string[]
  onValueChange?: (value: string[]) => void
  children: React.ReactNode
  className?: string
}

export function Accordion({
  type = 'multiple',
  defaultValue = [],
  value: controlledValue,
  onValueChange: controlledOnValueChange,
  children,
  className = '',
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string[]>(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue

  const onValueChange = React.useCallback(
    (newValue: string[]) => {
      if (isControlled) {
        controlledOnValueChange?.(newValue)
      } else {
        setInternalValue(newValue)
      }
    },
    [isControlled, controlledOnValueChange]
  )

  const handleValueChange = React.useCallback(
    (input: string | string[]) => {
      if (typeof input === 'string') {
        // Called from AccordionTrigger with a single item value
        const itemValue = input
        if (type === 'single') {
          onValueChange(value.includes(itemValue) ? [] : [itemValue])
        } else {
          onValueChange(
            value.includes(itemValue) ? value.filter((v) => v !== itemValue) : [...value, itemValue]
          )
        }
      } else {
        // Called directly with an array (from external onValueChange prop)
        onValueChange(input)
      }
    },
    [type, value, onValueChange]
  )

  return (
    <AccordionContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  )
}

const AccordionItemContext = React.createContext<{ value: string } | undefined>(undefined)

interface AccordionItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function AccordionItem({ value, children, className = '' }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={className}>{children}</div>
    </AccordionItemContext.Provider>
  )
}

interface AccordionTriggerProps {
  children: React.ReactNode
  className?: string
}

export function AccordionTrigger({ children, className = '' }: AccordionTriggerProps) {
  const context = React.useContext(AccordionContext)
  if (!context) throw new Error('AccordionTrigger must be used within Accordion')

  const itemContext = React.useContext(AccordionItemContext)
  if (!itemContext) throw new Error('AccordionTrigger must be used within AccordionItem')

  const isOpen = context.value.includes(itemContext.value)

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(itemContext.value)}
      className={`w-full flex items-center justify-between ${className}`}
      aria-expanded={isOpen}
    >
      {children}
      <svg
        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

interface AccordionContentProps {
  children: React.ReactNode
  className?: string
}

export function AccordionContent({ children, className = '' }: AccordionContentProps) {
  const context = React.useContext(AccordionContext)
  if (!context) throw new Error('AccordionContent must be used within Accordion')

  const itemContext = React.useContext(AccordionItemContext)
  if (!itemContext) throw new Error('AccordionContent must be used within AccordionItem')

  const isOpen = context.value.includes(itemContext.value)

  return (
    <div
      className={`overflow-hidden transition-all duration-200 ${
        isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}


