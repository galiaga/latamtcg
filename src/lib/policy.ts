/**
 * Store policy management functions
 */

import { prisma } from './prisma'

export type PurchasePolicy = {
  maxCopiesPerItem: number
  purchaseWindowDays: number
}

/**
 * Gets the current store policy, creating default if none exists
 */
export async function getStorePolicy(): Promise<PurchasePolicy> {
  try {
    let policy = await prisma.storePolicy.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!policy) {
      // Create default policy
      policy = await prisma.storePolicy.create({
        data: {
          maxCopiesPerItem: 4,
          purchaseWindowDays: 3
        }
      })
    }

    return {
      maxCopiesPerItem: policy.maxCopiesPerItem,
      purchaseWindowDays: policy.purchaseWindowDays
    }
  } catch (error) {
    console.warn('Failed to fetch store policy from database, using fallback:', error)
    // Fallback policy if database is not migrated yet
    return {
      maxCopiesPerItem: 4,
      purchaseWindowDays: 3
    }
  }
}

/**
 * Updates the store policy
 */
export async function updateStorePolicy(data: Partial<PurchasePolicy>): Promise<PurchasePolicy> {
  try {
    const existing = await prisma.storePolicy.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (existing) {
      const updated = await prisma.storePolicy.update({
        where: { id: existing.id },
        data: {
          maxCopiesPerItem: data.maxCopiesPerItem,
          purchaseWindowDays: data.purchaseWindowDays
        }
      })

      return {
        maxCopiesPerItem: updated.maxCopiesPerItem,
        purchaseWindowDays: updated.purchaseWindowDays
      }
    } else {
      // Create new policy
      const created = await prisma.storePolicy.create({
        data: {
          maxCopiesPerItem: data.maxCopiesPerItem ?? 4,
          purchaseWindowDays: data.purchaseWindowDays ?? 3
        }
      })

      return {
        maxCopiesPerItem: created.maxCopiesPerItem,
        purchaseWindowDays: created.purchaseWindowDays
      }
    }
  } catch (error) {
    console.warn('Failed to update store policy in database:', error)
    // Return fallback policy if database is not migrated yet
    return {
      maxCopiesPerItem: data.maxCopiesPerItem ?? 4,
      purchaseWindowDays: data.purchaseWindowDays ?? 3
    }
  }
}
