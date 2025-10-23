"use client";

import * as React from "react";

export function formatCLP(n?: number | null) {
  if (n == null) return "—";
  return `$${n.toLocaleString("es-CL")}`;
}

export function PriceBlock({
  variantLabel,
  priceClp,
  secondaryNote
}: {
  variantLabel: string;    // e.g., "Normal", "Foil"
  priceClp: number | null; // computed CLP for current variant
  secondaryNote?: string;
}) {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [displayPrice, setDisplayPrice] = React.useState(priceClp);
  const [displayLabel, setDisplayLabel] = React.useState(variantLabel);

  React.useEffect(() => {
    if (priceClp !== displayPrice || variantLabel !== displayLabel) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayPrice(priceClp);
        setDisplayLabel(variantLabel);
        setIsAnimating(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [priceClp, variantLabel, displayPrice, displayLabel]);

  return (
    <div className="flex flex-col gap-1" aria-live="polite">
      <div className="flex items-baseline gap-2">
        <div className={`text-3xl font-semibold text-primary transition-opacity duration-200 ${
          isAnimating ? 'opacity-50' : 'opacity-100'
        }`}>
          {formatCLP(displayPrice)}
        </div>
        <span className={`badge transition-opacity duration-200 ${
          isAnimating ? 'opacity-50' : 'opacity-100'
        }`}>{displayLabel}</span>
      </div>
      {secondaryNote && (
        <p className="text-xs text-muted-foreground">{secondaryNote}</p>
      )}
    </div>
  );
}
