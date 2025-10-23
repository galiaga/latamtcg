"use client";
import * as React from "react";
import { PriceBlock } from "@/components/pdp/PriceBlock";
import { VariantSelector, VariantOption } from "@/components/pdp/VariantSelector";
import AddToCartButton from "@/components/AddToCartButton";

export function VariantSectionClient({
  initialVariantId,
  variants,
  printingId
}: {
  initialVariantId: string;
  variants: VariantOption[];
  printingId: string;
}) {
  // Persistent variant memory using localStorage
  const storageKey = `variant-${printingId}`;
  
  const [selectedId, setSelectedId] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved && variants.some(v => v.id === saved)) {
        return saved;
      }
    }
    return initialVariantId;
  });

  // Save to localStorage when variant changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, selectedId);
    }
  }, [selectedId, storageKey]);

  const current = React.useMemo(
    () => variants.find(v => v.id === selectedId) ?? variants[0],
    [selectedId, variants]
  );

  return (
    <div className="flex flex-col gap-4">
      <PriceBlock
        variantLabel={current?.label ?? ""}
        priceClp={current?.priceClp ?? null}
      />

      <VariantSelector
        value={selectedId}
        onChange={setSelectedId}
        options={variants}
      />

      <div className="flex flex-col gap-1">
        <AddToCartButton printingId={printingId} size="lg" />
      </div>
    </div>
  );
}
