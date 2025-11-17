import { getPricingConfig, getDisplayPriceServer } from '@/lib/pricingData';
import { getTranslations } from 'next-intl/server';

export type VariantInfo = { 
  id: "normal" | "foil" | "etched"; 
  label: string; 
  priceClp: number | null;
  available: boolean;
};

// Alias for compatibility with VariantSelector
export type VariantOption = VariantInfo;

export async function getVariantsForCard(card: any): Promise<VariantInfo[]> {
  // Get pricing configuration to compute CLP prices
  const config = await getPricingConfig();
  const t = await getTranslations();
  
  const variants: VariantInfo[] = [];
  
  // Normal variant
  if (card.hasNonfoil && card.priceUsd) {
    const priceClp = getDisplayPriceServer(card, config, ['normal']);
    variants.push({ 
      id: "normal", 
      label: t('search.normal'), 
      priceClp,
      available: true
    });
  }
  
  // Foil variant
  if (card.hasFoil && card.priceUsdFoil) {
    const priceClp = getDisplayPriceServer(card, config, ['foil']);
    variants.push({ 
      id: "foil", 
      label: t('search.foil'), 
      priceClp,
      available: true
    });
  }
  
  // Etched variant
  if (card.hasEtched && card.priceUsdEtched) {
    const priceClp = getDisplayPriceServer(card, config, ['etched']);
    variants.push({ 
      id: "etched", 
      label: t('search.etched'), 
      priceClp,
      available: true
    });
  }
  
  return variants;
}

export async function resolveInitialVariant(variants: VariantInfo[]): Promise<VariantInfo> {
  // Prefer the one that actually has a price; fallback to the first available
  const withPrice = variants.find(v => v.available && typeof v.priceClp === "number" && v.priceClp > 0);
  if (withPrice) return withPrice;
  
  // Fallback to first available variant
  const available = variants.find(v => v.available);
  if (available) return available;
  
  // Last resort: return first variant (even if not available)
  const t = await getTranslations();
  return variants[0] || { id: "normal", label: t('search.normal'), priceClp: null, available: false };
}
