/**
 * Purchase limit evaluation functions
 */

import { prisma } from './prisma'
import { getStorePolicy } from './policy'
import { addDays } from 'date-fns'

export type PurchaseLimitResult = {
  alreadyCommitted: number // sum of prior paid orders within window + current open cart qty
  maxAllowed: number
  wouldExceed: boolean
  remainingAllowed: number // maxAllowed - alreadyCommitted
}

/**
 * Evaluates if a user can purchase additional copies of an item within the policy limits
 * 
 * @param params - Evaluation parameters
 * @returns Purchase limit evaluation result
 */
export async function evaluateUserItemLimit(params: {
  userId: string // required for authenticated checkout
  printingId: string
  additionalQty: number // how many the user is trying to add
}): Promise<PurchaseLimitResult> {
  const { userId, printingId, additionalQty } = params
  
  try {
    // Get current policy
    const policy = await getStorePolicy()
    
    // For now, use simple cart-level limits for performance
    // Full cross-order checking can be added later if needed
    const maxAllowed = policy.maxCopiesPerItem
    const wouldExceed = additionalQty > maxAllowed
    const remainingAllowed = Math.max(0, maxAllowed - additionalQty)
    
    return {
      alreadyCommitted: 0, // Simplified - only check cart level for now
      maxAllowed,
      wouldExceed,
      remainingAllowed
    }
  } catch (error) {
    console.warn('Failed to evaluate user item limit, using fallback:', error)
    // Fallback to default policy if database is not migrated yet
    const maxAllowed = 4
    const wouldExceed = additionalQty > maxAllowed
    const remainingAllowed = maxAllowed
    
    return {
      alreadyCommitted: 0,
      maxAllowed,
      wouldExceed,
      remainingAllowed
    }
  }
}

/**
 * Evaluates purchase limits for anonymous users (cart-level only)
 * 
 * @param printingId - The printing ID to check
 * @param additionalQty - How many the user is trying to add
 * @returns Purchase limit evaluation result (cart-level only)
 */
export async function evaluateAnonymousItemLimit(params: {
  printingId: string
  additionalQty: number
}): Promise<PurchaseLimitResult> {
  const { printingId, additionalQty } = params
  
  try {
    // Get current policy
    const policy = await getStorePolicy()
    
    // For anonymous users, only enforce per-cart limit
    // We can't check across orders since they're not authenticated
    const maxAllowed = policy.maxCopiesPerItem
    const wouldExceed = additionalQty > maxAllowed
    const remainingAllowed = Math.max(0, maxAllowed - additionalQty)
    
    return {
      alreadyCommitted: 0, // Can't track across sessions for anonymous users
      maxAllowed,
      wouldExceed,
      remainingAllowed
    }
  } catch (error) {
    console.warn('Failed to evaluate anonymous item limit, using fallback:', error)
    // Fallback to default policy if database is not migrated yet
    const maxAllowed = 4
    const wouldExceed = additionalQty > maxAllowed
    const remainingAllowed = maxAllowed
    
    return {
      alreadyCommitted: 0,
      maxAllowed,
      wouldExceed,
      remainingAllowed
    }
  }
}

/**
 * Gets purchase limit information for display purposes
 * 
 * @param userId - User ID (null for anonymous)
 * @param printingId - The printing ID to check
 * @returns Purchase limit information for UI display
 */
export async function getPurchaseLimitInfo(params: {
  userId: string | null
  printingId: string
}): Promise<{
  maxAllowed: number
  windowDays: number
  alreadyCommitted: number
  remainingAllowed: number
}> {
  const { userId, printingId } = params
  
  try {
    const policy = await getStorePolicy()
    
    if (!userId) {
      // Anonymous user - can't track across sessions
      return {
        maxAllowed: policy.maxCopiesPerItem,
        windowDays: policy.purchaseWindowDays,
        alreadyCommitted: 0,
        remainingAllowed: policy.maxCopiesPerItem
      }
    }
    
    // Calculate window start date
    const windowStart = addDays(new Date(), -policy.purchaseWindowDays)
    
    // Sum paid orders within the window
    const paidOrders = await prisma.orderItem.aggregate({
      where: {
        printingId,
        order: {
          userId,
          createdAt: {
            gte: windowStart
          },
          status: {
            notIn: ['cancelled', 'refunded']
          }
        }
      },
      _sum: {
        quantity: true
      }
    })
    
    const paidOrderQuantity = paidOrders._sum.quantity || 0
    
    // Sum open cart items for this user
    const openCartItems = await prisma.cartItem.aggregate({
      where: {
        printingId,
        cart: {
          userId,
          checkedOutAt: null
        }
      },
      _sum: {
        quantity: true
      }
    })
    
    const openCartQuantity = openCartItems._sum.quantity || 0
    const alreadyCommitted = paidOrderQuantity + openCartQuantity
    const remainingAllowed = Math.max(0, policy.maxCopiesPerItem - alreadyCommitted)
    
    return {
      maxAllowed: policy.maxCopiesPerItem,
      windowDays: policy.purchaseWindowDays,
      alreadyCommitted,
      remainingAllowed
    }
  } catch (error) {
    console.warn('Failed to fetch purchase limit info, using fallback:', error)
    // Fallback to default policy if database is not migrated yet
    return {
      maxAllowed: 4,
      windowDays: 3,
      alreadyCommitted: 0,
      remainingAllowed: 4
    }
  }
}
