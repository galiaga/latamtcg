/**
 * Flow Payment Gateway Client
 * 
 * Handles all Flow API interactions including:
 * - Payment creation
 * - Payment status checking
 * - Signature verification for webhooks
 */

import crypto from 'crypto'

// Flow API configuration
// Note: We validate these at runtime when functions are called, not at module load time
// This allows the app to start even if env vars are missing (useful for dev/testing)
export function getFlowConfig() {
  const FLOW_API_KEY = process.env.FLOW_API_KEY
  const FLOW_SECRET = process.env.FLOW_SECRET
  const FLOW_BASE_URL = process.env.FLOW_BASE_URL || 'https://www.flow.cl/api'
  const FLOW_RETURN_URL = process.env.FLOW_RETURN_URL
  const FLOW_CALLBACK_URL = process.env.FLOW_CALLBACK_URL

  // Validate required environment variables
  if (!FLOW_API_KEY) {
    throw new Error('FLOW_API_KEY environment variable is required')
  }
  if (!FLOW_SECRET) {
    throw new Error('FLOW_SECRET environment variable is required')
  }
  if (!FLOW_RETURN_URL) {
    throw new Error('FLOW_RETURN_URL environment variable is required')
  }
  if (!FLOW_CALLBACK_URL) {
    throw new Error('FLOW_CALLBACK_URL environment variable is required')
  }

  // Validate URL format
  try {
    new URL(FLOW_RETURN_URL)
    new URL(FLOW_CALLBACK_URL)
  } catch (e) {
    throw new Error(`Invalid URL format in Flow environment variables: ${e instanceof Error ? e.message : 'Unknown error'}`)
  }

  return {
    FLOW_API_KEY,
    FLOW_SECRET,
    FLOW_BASE_URL,
    FLOW_RETURN_URL,
    FLOW_CALLBACK_URL,
  }
}

export interface FlowPaymentCreateParams {
  commerceOrder: string // Order ID
  subject: string // Payment description
  amount: number // Amount in CLP
  currency?: string // Currency code (default: CLP)
  email?: string // Customer email
  urlReturn?: string // Return URL after payment
  urlConfirmation?: string // Callback URL for webhook
}

export interface FlowPaymentResponse {
  token: string
  url: string
  status?: number
  message?: string
}

export interface FlowPaymentStatus {
  status: number // 1 = pending, 2 = paid, 3 = rejected, 4 = expired
  flowOrder: string
  payer?: {
    name?: string
    email?: string
  }
  paymentData?: {
    amount?: number
    currency?: string
  }
}

/**
 * Signs a payload using HMAC-SHA256 with FLOW_SECRET
 * Flow.cl signature format:
 * 1. Sort parameters alphabetically by key
 * 2. Concatenate as key+value (no =, no &, no encoding): key1value1key2value2...
 * 3. Sign with HMAC-SHA256
 */
export function signFlowPayload(params: Record<string, string | number | undefined>): string {
  const { FLOW_SECRET } = getFlowConfig()
  
  // Filter out undefined, null, and empty string values, then sort by key
  const sortedEntries = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => [key, String(value)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))

  // Build signature string: concatenate key+value (no separators, no encoding)
  const signatureString = sortedEntries
    .map(([key, value]) => `${key}${value}`)
    .join('')

  // Sign with HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', FLOW_SECRET)
    .update(signatureString)
    .digest('hex')

  return signature
}

/**
 * Creates a payment in Flow and returns the payment URL
 */
export async function createPayment(params: FlowPaymentCreateParams): Promise<FlowPaymentResponse> {
  const config = getFlowConfig()
  
  const payload: Record<string, string | number> = {
    apiKey: config.FLOW_API_KEY,
    commerceOrder: params.commerceOrder,
    subject: params.subject,
    currency: params.currency || 'CLP',
    amount: params.amount,
    urlReturn: params.urlReturn || config.FLOW_RETURN_URL,
    urlConfirmation: params.urlConfirmation || config.FLOW_CALLBACK_URL,
  }

  // Email is required by Flow API
  if (!params.email || params.email.trim() === '') {
    throw new Error('Email is required for Flow payment creation')
  }
  payload.email = params.email.trim()

  // Flow.cl signature format: 
  // 1. Sort parameters alphabetically by key
  // 2. Concatenate as key+value (no =, no &, no encoding): key1value1key2value2...
  // 3. Sign with HMAC-SHA256
  const sortedEntries = Object.entries(payload)
    .map(([key, value]) => [key, String(value)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))

  // Build signature string: concatenate key+value (no separators, no encoding)
  const signatureString = sortedEntries
    .map(([key, value]) => `${key}${value}`)
    .join('')
  
  console.log('[flow] Signature calculation:', {
    signatureString: signatureString.substring(0, 200) + (signatureString.length > 200 ? '...' : ''),
    paramCount: sortedEntries.length,
    params: sortedEntries.map(([k, v]) => `${k}=${v.substring(0, 20)}${v.length > 20 ? '...' : ''}`),
  })
  
  // Calculate signature with HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', config.FLOW_SECRET)
    .update(signatureString)
    .digest('hex')

  console.log('[flow] Generated signature:', signature.substring(0, 16) + '...')

  // Build body with signature parameter last (common pattern for payment gateways)
  // The signature is calculated WITHOUT including the 's' parameter itself
  const bodyParams = sortedEntries
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
  const body = `${bodyParams}&s=${encodeURIComponent(signature)}`

  console.log('[flow] Creating payment:', {
    url: `${config.FLOW_BASE_URL}/payment/create`,
    payload: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, k === 's' ? '***' : v])),
    bodyPreview: body.substring(0, 150) + '...',
  })

  const response = await fetch(`${config.FLOW_BASE_URL}/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const responseText = await response.text().catch(() => 'Failed to read response')
  
  if (!response.ok) {
    console.error('[flow] Payment creation failed:', {
      status: response.status,
      statusText: response.statusText,
      responseText: responseText.substring(0, 500),
    })
    throw new Error(`Flow API error: ${response.status} - ${responseText}`)
  }

  let data: any
  try {
    data = JSON.parse(responseText)
  } catch (parseError) {
    // Flow might return form-urlencoded response
    const params = new URLSearchParams(responseText)
    data = Object.fromEntries(params.entries())
    console.log('[flow] Parsed form-urlencoded response:', { hasToken: !!data.token, hasUrl: !!data.url })
  }

  console.log('[flow] Full response data:', {
    status: data.status,
    token: data.token ? `${data.token.substring(0, 10)}...` : null,
    url: data.url,
    message: data.message,
    keys: Object.keys(data),
  })

  // Flow returns different formats, handle both
  if (data.status === 0 && data.token) {
    // Construct payment URL with token as query parameter
    // Flow's payment page expects token in the URL
    const baseUrl = data.url || `${config.FLOW_BASE_URL.replace('/api', '')}/app/web/pay.php`
    const paymentUrl = baseUrl.includes('?') 
      ? `${baseUrl}&token=${data.token}`
      : `${baseUrl}?token=${data.token}`
    
    return {
      token: data.token,
      url: paymentUrl,
    }
  }

  if (data.status !== undefined && data.status !== 0) {
    const errorMsg = data.message || data.Mensaje || 'Unknown error'
    console.error('[flow] Payment creation failed:', { status: data.status, message: errorMsg, data })
    throw new Error(`Flow payment creation failed: ${errorMsg}`)
  }

  // If no token, something went wrong
  if (!data.token) {
    console.error('[flow] No token in response:', data)
    throw new Error(`Flow API did not return a payment token. Response: ${JSON.stringify(data)}`)
  }

  // Construct payment URL with token
  const baseUrl = data.url || `${config.FLOW_BASE_URL.replace('/api', '')}/app/web/pay.php`
  const paymentUrl = baseUrl.includes('?') 
    ? `${baseUrl}&token=${data.token}`
    : `${baseUrl}?token=${data.token}`

  return {
    token: data.token,
    url: paymentUrl,
  }
}

/**
 * Gets payment status from Flow
 */
export async function getPaymentStatus(token: string): Promise<FlowPaymentStatus> {
  const config = getFlowConfig()
  
  const params: Record<string, string> = {
    apiKey: config.FLOW_API_KEY,
    token,
  }

  // Sign the parameters
  const signature = signFlowPayload(params)
  params.s = signature

  // Build query string
  const queryString = new URLSearchParams(params).toString()

  const response = await fetch(`${config.FLOW_BASE_URL}/payment/getStatus?${queryString}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Flow API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  return {
    status: data.status || 0,
    flowOrder: data.flowOrder || '',
    payer: data.payer || {},
    paymentData: data.paymentData || {},
  }
}

/**
 * Verifies Flow webhook signature
 * Flow sends signature in 's' parameter or header
 */
export function verifyFlowSignature(
  params: Record<string, string | undefined>,
  receivedSignature: string
): boolean {
  const { FLOW_SECRET } = getFlowConfig()
  
  // Remove the signature parameter before signing
  const paramsToSign = { ...params }
  delete paramsToSign.s

  // Generate expected signature
  const expectedSignature = signFlowPayload(paramsToSign)

  // Compare signatures (constant-time comparison)
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

/**
 * Parses Flow callback payload (form-urlencoded or JSON)
 */
export async function parseFlowCallback(
  request: Request
): Promise<Record<string, string>> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const json = await request.json()
    return Object.entries(json).reduce((acc, [key, value]) => {
      acc[key] = String(value)
      return acc
    }, {} as Record<string, string>)
  }

  // Default to form-urlencoded
  const formData = await request.formData()
  const params: Record<string, string> = {}
  formData.forEach((value, key) => {
    params[key] = String(value)
  })
  return params
}

