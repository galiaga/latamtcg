import { NextRequest, NextResponse } from 'next/server'
import { getStorePolicy, updateStorePolicy } from '@/lib/policy'
import { z } from 'zod'

const PolicyUpdateSchema = z.object({
  maxCopiesPerItem: z.number().int().min(1).max(100),
  purchaseWindowDays: z.number().int().min(1).max(30)
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Check admin token
    const adminToken = req.headers.get('x-admin-token')
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const policy = await getStorePolicy()
    return NextResponse.json(policy)
  } catch (error) {
    console.error('Failed to fetch store policy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch store policy' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check admin token
    const adminToken = req.headers.get('x-admin-token')
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const result = PolicyUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid policy data', details: result.error.issues },
        { status: 400 }
      )
    }

    const updatedPolicy = await updateStorePolicy(result.data)
    return NextResponse.json(updatedPolicy)
  } catch (error) {
    console.error('Failed to update store policy:', error)
    return NextResponse.json(
      { error: 'Failed to update store policy' },
      { status: 500 }
    )
  }
}
