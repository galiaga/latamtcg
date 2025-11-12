'use client'

import * as React from 'react'

interface SetSymbolProps {
  setCode: string
  setName: string
  allSets: Array<{ set_code: string; set_name: string }>
  className?: string
}

export function SetSymbol({ setCode, setName, allSets, className = '' }: SetSymbolProps) {
  const [imageError, setImageError] = React.useState(false)
  const [parentError, setParentError] = React.useState(false)

  // Helper function to get parent set code
  const getParentSetCode = React.useCallback((code: string, name: string): string | null => {
    const lowerCode = code.toLowerCase()
    
    // Pattern 1: Promo sets with "p" prefix (e.g., pspm -> spm, peoe -> eoe)
    if (lowerCode.startsWith('p') && lowerCode.length > 1) {
      const parentCode = lowerCode.substring(1)
      if (parentCode.length >= 2) {
        return parentCode
      }
    }
    
    // Pattern 2: Sets with " Promos" suffix in name
    if (name.toLowerCase().endsWith(' promos')) {
      const parentName = name.slice(0, -7)
      const parentSet = allSets.find(s => 
        s.set_name.toLowerCase() === parentName.toLowerCase() && 
        s.set_code.toLowerCase() !== lowerCode
      )
      if (parentSet) {
        return parentSet.set_code.toLowerCase()
      }
    }
    
    // Pattern 3: Sets with " Promo" suffix (singular)
    if (name.toLowerCase().endsWith(' promo')) {
      const parentName = name.slice(0, -6)
      const parentSet = allSets.find(s => 
        s.set_name.toLowerCase() === parentName.toLowerCase() && 
        s.set_code.toLowerCase() !== lowerCode
      )
      if (parentSet) {
        return parentSet.set_code.toLowerCase()
      }
    }
    
    return null
  }, [allSets])

  const setSymbolUrl = `https://svgs.scryfall.io/sets/${setCode.toLowerCase()}.svg`
  const parentSetCode = getParentSetCode(setCode, setName)
  const parentSymbolUrl = parentSetCode ? `https://svgs.scryfall.io/sets/${parentSetCode}.svg` : null
  const genericSymbolUrl = 'https://svgs.scryfall.io/sets/default.svg'

  const handleError = React.useCallback(() => {
    if (!imageError) {
      setImageError(true)
    } else if (!parentError && parentSymbolUrl) {
      setParentError(true)
    }
  }, [imageError, parentError, parentSymbolUrl])

  React.useEffect(() => {
    setImageError(false)
    setParentError(false)
  }, [setCode, setName])

  // Determine which URL to use
  let currentUrl = setSymbolUrl
  if (imageError && parentSymbolUrl && !parentError) {
    currentUrl = parentSymbolUrl
  } else if (imageError && (!parentSymbolUrl || parentError)) {
    currentUrl = genericSymbolUrl
  }

  return (
    <img
      src={currentUrl}
      alt={`${setName} symbol`}
      className={className}
      onError={handleError}
    />
  )
}

