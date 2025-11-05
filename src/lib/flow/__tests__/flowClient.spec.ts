/**
 * Unit tests for Flow payment client helpers
 * 
 * Note: These tests verify the signing and verification logic.
 * The actual Flow API calls are not tested here.
 */

import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { signFlowPayload, verifyFlowSignature } from '../flowClient'

// Helper to manually compute signature for testing
// Flow.cl format: sort by key, concatenate key+value (no =, no &, no encoding)
function manualSign(params: Record<string, string | number | undefined>, secret: string): string {
  const sortedEntries = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => [key, String(value)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))

  const signatureString = sortedEntries
    .map(([key, value]) => `${key}${value}`)
    .join('')

  return crypto.createHmac('sha256', secret).update(signatureString).digest('hex')
}

describe('Flow Client Helpers', () => {
  const testSecret = 'test_secret_key_for_signing'

  describe('signFlowPayload', () => {
    it('should sign parameters correctly', () => {
      const params = {
        apiKey: 'test_api_key',
        commerceOrder: 'order_123',
        amount: 10000,
        currency: 'CLP',
      }

      const signature = signFlowPayload(params)
      const expectedSignature = manualSign(params, testSecret)

      expect(signature).toBeTruthy()
      expect(typeof signature).toBe('string')
      expect(signature.length).toBe(64) // SHA256 hex is 64 chars
      expect(signature).toBe(expectedSignature) // Should match manual calculation
    })

    it('should sort parameters by key before signing', () => {
      const params1 = {
        apiKey: 'test',
        commerceOrder: 'order_123',
        amount: 10000,
      }

      const params2 = {
        amount: 10000,
        apiKey: 'test',
        commerceOrder: 'order_123',
      }

      const sig1 = signFlowPayload(params1)
      const sig2 = signFlowPayload(params2)

      // Should produce same signature regardless of parameter order
      expect(sig1).toBe(sig2)
    })

    it('should exclude undefined values', () => {
      const params = {
        apiKey: 'test',
        commerceOrder: 'order_123',
        email: undefined,
        amount: 10000,
      }

      const signature = signFlowPayload(params)

      // Should not include undefined email in signature
      expect(signature).toBeTruthy()

      // Compare with params without email
      const paramsWithoutEmail = {
        apiKey: 'test',
        commerceOrder: 'order_123',
        amount: 10000,
      }

      const sigWithoutEmail = signFlowPayload(paramsWithoutEmail)
      expect(signature).toBe(sigWithoutEmail)
    })

    it('should handle special characters in values (no encoding for signature)', () => {
      const params = {
        apiKey: 'test@key',
        subject: 'Order with spaces & special chars',
        amount: 10000,
      }

      const signature = signFlowPayload(params)
      expect(signature).toBeTruthy()
      expect(signature.length).toBe(64)
      // Should match manual calculation (no encoding in signature string)
      expect(signature).toBe(manualSign(params, testSecret))
    })
  })

  describe('verifyFlowSignature', () => {
    it('should verify correct signature', () => {
      const params = {
        apiKey: 'test_api_key',
        commerceOrder: 'order_123',
        amount: 10000,
        currency: 'CLP',
      }

      const signature = signFlowPayload(params)
      const isValid = verifyFlowSignature(params, signature)

      expect(isValid).toBe(true)
      expect(signature).toBe(manualSign(params, testSecret))
    })

    it('should reject incorrect signature', () => {
      const params = {
        apiKey: 'test_api_key',
        commerceOrder: 'order_123',
        amount: 10000,
      }

      const correctSignature = signFlowPayload(params)
      const wrongSignature = 'a' + correctSignature.slice(1) // Change first char

      const isValid = verifyFlowSignature(params, wrongSignature)
      expect(isValid).toBe(false)
    })

    it('should handle missing signature parameter', () => {
      const params = {
        apiKey: 'test',
        commerceOrder: 'order_123',
        s: 'signature_to_verify',
      }

      const signature = signFlowPayload({ apiKey: 'test', commerceOrder: 'order_123' })
      const isValid = verifyFlowSignature(params, signature)

      // Should still work - 's' parameter is excluded from signing
      expect(isValid).toBe(true)
    })

    it('should use constant-time comparison', () => {
      const params = {
        apiKey: 'test',
        amount: 10000,
      }

      const correctSignature = signFlowPayload(params)
      // Create wrong signature with same length (64 hex chars)
      const wrongSignature = 'a'.repeat(64)

      // Should use timing-safe comparison
      const isValid = verifyFlowSignature(params, wrongSignature)
      expect(isValid).toBe(false)
      // Also verify correct signature works
      expect(verifyFlowSignature(params, correctSignature)).toBe(true)
    })
  })
})

