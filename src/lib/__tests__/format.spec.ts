import { describe, it, expect } from 'vitest'
import { formatUsd, fmtCollector } from '../format'

describe('formatUsd', () => {
  describe('basic number formatting', () => {
    it('should format whole numbers correctly', () => {
      expect(formatUsd(0)).toBe('$0')
      expect(formatUsd(1)).toBe('$1')
      expect(formatUsd(5)).toBe('$5')
      expect(formatUsd(100)).toBe('$100')
      expect(formatUsd(1234)).toBe('$1234')
    })

    it('should format decimal numbers with ceiling', () => {
      expect(formatUsd(1.1)).toBe('$2')
      expect(formatUsd(1.5)).toBe('$2')
      expect(formatUsd(1.99)).toBe('$2')
      expect(formatUsd(2.0)).toBe('$2')
      expect(formatUsd(2.1)).toBe('$3')
    })

    it('should handle two decimal places correctly', () => {
      expect(formatUsd(1.23)).toBe('$2')
      expect(formatUsd(1.99)).toBe('$2')
      expect(formatUsd(2.01)).toBe('$3')
      expect(formatUsd(1234.56)).toBe('$1235')
    })

    it('should handle negative numbers with ceiling', () => {
      expect(formatUsd(-1)).toBe('$-1')
      expect(formatUsd(-1.1)).toBe('$-1')
      expect(formatUsd(-1.9)).toBe('$-1')
      expect(formatUsd(-2.1)).toBe('$-2')
    })
  })

  describe('null/undefined/NaN handling', () => {
    it('should return "Not available" for null', () => {
      expect(formatUsd(null)).toBe('Not available')
    })

    it('should return "Not available" for undefined', () => {
      expect(formatUsd(undefined)).toBe('Not available')
    })

    it('should return "Not available" for NaN', () => {
      expect(formatUsd(NaN)).toBe('Not available')
    })

    it('should return "Not available" for non-numeric strings', () => {
      expect(formatUsd('abc')).toBe('Not available')
      expect(formatUsd('not a number')).toBe('Not available')
    })

    it('should handle empty strings and whitespace as zero', () => {
      expect(formatUsd('')).toBe('$0')
      expect(formatUsd(' ')).toBe('$0')
    })

    it('should return "Not available" for objects that cannot be converted', () => {
      expect(formatUsd({})).toBe('Not available')
      expect(formatUsd(() => {})).toBe('Not available')
    })

    it('should handle arrays as zero', () => {
      expect(formatUsd([])).toBe('$0')
    })
  })

  describe('string inputs that parse to numbers', () => {
    it('should handle string numbers correctly', () => {
      expect(formatUsd('0')).toBe('$0')
      expect(formatUsd('1')).toBe('$1')
      expect(formatUsd('1.5')).toBe('$2')
      expect(formatUsd('1234.56')).toBe('$1235')
      expect(formatUsd('-5.5')).toBe('$-5')
    })

    it('should handle string numbers with whitespace', () => {
      expect(formatUsd(' 1 ')).toBe('$1')
      expect(formatUsd(' 1.5 ')).toBe('$2')
      expect(formatUsd('\t2.1\n')).toBe('$3')
    })

    it('should handle scientific notation strings', () => {
      expect(formatUsd('1e2')).toBe('$100')
      expect(formatUsd('1.5e3')).toBe('$1500')
      expect(formatUsd('1e-2')).toBe('$1')
    })
  })

  describe('very large values', () => {
    it('should handle large numbers correctly', () => {
      expect(formatUsd(1e6)).toBe('$1000000')
      expect(formatUsd(1e9)).toBe('$1000000000')
      expect(formatUsd(1e12)).toBe('$1000000000000')
      expect(formatUsd(Number.MAX_SAFE_INTEGER)).toBe('$9007199254740991')
    })

    it('should handle large decimal numbers with ceiling', () => {
      expect(formatUsd(1e6 + 0.1)).toBe('$1000001')
      expect(formatUsd(1e9 + 0.9)).toBe('$1000000001')
    })

    it('should handle large string numbers', () => {
      expect(formatUsd('1000000000')).toBe('$1000000000')
      expect(formatUsd('1e9')).toBe('$1000000000')
    })
  })

  describe('edge cases', () => {
    it('should handle zero correctly', () => {
      expect(formatUsd(0)).toBe('$0')
      expect(formatUsd(0.0)).toBe('$0')
      expect(formatUsd('0')).toBe('$0')
      expect(formatUsd(-0)).toBe('$0')
    })

    it('should handle very small positive numbers', () => {
      expect(formatUsd(0.1)).toBe('$1')
      expect(formatUsd(0.01)).toBe('$1')
      expect(formatUsd(0.001)).toBe('$1')
      expect(formatUsd(Number.MIN_VALUE)).toBe('$1')
    })

    it('should handle very small negative numbers', () => {
      expect(formatUsd(-0.1)).toBe('$0')
      expect(formatUsd(-0.9)).toBe('$0')
      expect(formatUsd(-1.1)).toBe('$-1')
    })

    it('should handle infinity values', () => {
      expect(formatUsd(Infinity)).toBe('$Infinity')
      expect(formatUsd(-Infinity)).toBe('$-Infinity')
    })
  })

  describe('output format consistency', () => {
    it('should always use dollar sign prefix', () => {
      expect(formatUsd(1)).toMatch(/^\$/)
      expect(formatUsd(1.5)).toMatch(/^\$/)
      expect(formatUsd(0)).toMatch(/^\$/)
    })

    it('should use ceiling function consistently', () => {
      // Verify that Math.ceil behavior is preserved
      expect(formatUsd(1.1)).toBe('$2')
      expect(formatUsd(1.9)).toBe('$2')
      expect(formatUsd(2.0)).toBe('$2')
      expect(formatUsd(2.1)).toBe('$3')
    })

    it('should not have trailing zeros for whole numbers', () => {
      expect(formatUsd(1)).toBe('$1')
      expect(formatUsd(100)).toBe('$100')
      expect(formatUsd(1000)).toBe('$1000')
    })

    it('should maintain consistent error message format', () => {
      expect(formatUsd(null)).toBe('Not available')
      expect(formatUsd(undefined)).toBe('Not available')
      expect(formatUsd('invalid')).toBe('Not available')
    })

    it('should match original implementation behavior exactly', () => {
      // Test cases from the original requirements
      expect(formatUsd(0)).toBe('$0')
      expect(formatUsd(1)).toBe('$1')
      expect(formatUsd(1.5)).toBe('$2')
      expect(formatUsd(1.99)).toBe('$2')
      expect(formatUsd(1234.56)).toBe('$1235')
      expect(formatUsd(null)).toBe('Not available')
      expect(formatUsd(undefined)).toBe('Not available')
      expect(formatUsd(1e9)).toBe('$1000000000')
      expect(formatUsd('1.5')).toBe('$2')
    })
  })

  describe('type safety', () => {
    it('should handle mixed type inputs gracefully', () => {
      expect(formatUsd(true)).toBe('$1')
      expect(formatUsd(false)).toBe('$0')
    })

    it('should handle Date objects', () => {
      const date = new Date('2023-01-01')
      expect(formatUsd(date)).toBe('$1672531200000')
    })

    it('should handle Symbol values by throwing', () => {
      expect(() => formatUsd(Symbol('test'))).toThrow()
    })
  })
})

describe('fmtCollector', () => {
  it('should return null for null/undefined', () => {
    expect(fmtCollector(null)).toBe(null)
    expect(fmtCollector(undefined)).toBe(null)
  })

  it('should trim whitespace and return string', () => {
    expect(fmtCollector(' 123 ')).toBe('123')
    expect(fmtCollector('\t456\n')).toBe('456')
  })

  it('should return null for empty strings', () => {
    expect(fmtCollector('')).toBe(null)
    expect(fmtCollector('   ')).toBe(null)
  })

  it('should convert other types to string', () => {
    expect(fmtCollector(123)).toBe('123')
    expect(fmtCollector(0)).toBe('0')
  })
})
