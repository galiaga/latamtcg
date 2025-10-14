/**
 * Formats a card name with flavor name if available
 * @param name - The original card name
 * @param flavorName - The flavor name (optional)
 * @returns Formatted name with flavor name prefix if available
 */
export function formatCardName(name: string, flavorName?: string | null): string {
  if (!flavorName || flavorName.trim() === '') {
    return name
  }
  
  return `${flavorName} - ${name}`
}

/**
 * Formats a card name for display in search results and UI components
 * This includes the flavor name formatting and any other name transformations
 * @param name - The original card name
 * @param flavorName - The flavor name (optional)
 * @returns Formatted display name
 */
export function formatDisplayName(name: string, flavorName?: string | null): string {
  // Apply the flavor name formatting
  const nameWithFlavor = formatCardName(name, flavorName)
  
  // Apply existing transformations (like Full Art -> Borderless)
  return nameWithFlavor.replace(/\(Full Art\)/gi, '(Borderless)')
}
