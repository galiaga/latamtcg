import { test, expect } from '@playwright/test'

test('cart badge sync across tabs', async ({ browser, baseURL }) => {
  const context = await browser.newContext()
  const page1 = await context.newPage()
  const page2 = await context.newPage()

  await page1.goto(baseURL!)
  await page2.goto(baseURL!)

  // Initially zero or hidden
  await expect(page1.getByLabel(/items in cart/i)).toHaveCount(0)
  await expect(page2.getByLabel(/items in cart/i)).toHaveCount(0)

  // Trigger an add in page1 via synthetic event (bypasses needing a product)
  await page1.evaluate(() => {
    try {
      window.dispatchEvent(new CustomEvent('cart:update', { detail: { delta: 2 } }))
      localStorage.setItem('cart:delta', String(2))
      localStorage.setItem('cart:pulse', String(Date.now()))
    } catch {}
  })

  // Expect both pages to reflect update
  await expect(page1.getByLabel('2 items in cart')).toBeVisible()
  await expect(page2.getByLabel('2 items in cart')).toBeVisible()
})


