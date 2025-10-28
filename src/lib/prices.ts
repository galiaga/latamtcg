import { createClient } from '@supabase/supabase-js'

export type Finish = 'nonfoil' | 'foil' | 'etched'

/**
 * Null-safe current price read from mtgcard_current_price
 * Uses anon key for reads; writes must use service role elsewhere
 */
export async function getCurrentPrice(
  scryfallId: string,
  finish: Finish = 'nonfoil'
): Promise<{ price: number | null, price_at: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createClient(url, anon)

  const { data, error } = await supabase
    .from('mtgcard_current_price')
    .select('price, price_at')
    .eq('scryfall_id', scryfallId)
    .eq('finish', finish)
    .maybeSingle()

  if (error) {
    return { price: null, price_at: null }
  }

  return {
    price: (data?.price ?? null) as number | null,
    price_at: (data?.price_at ?? null) as string | null,
  }
}


