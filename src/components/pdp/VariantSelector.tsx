"use client";

import * as React from "react";
import { formatCLP } from "@/lib/format";

export type VariantOption = {
  id: string;        // "normal" | "foil" | "etched"
  label: string;     // "Normal", "Foil", "Etched"
  priceClp: number | null;
  disabled?: boolean;
};

export function VariantSelector({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (v: string) => void;
  options: VariantOption[];
}) {
  return (
    <div
      className="grid grid-cols-1 gap-2"
      role="radiogroup"
      aria-label="Select card finish"
    >
      {options.map((opt) => {
        const isDisabled = !!opt.disabled || opt.priceClp == null;
        return (
          <label
            key={opt.id}
            htmlFor={`variant-${opt.id}`}
            className={`
              flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors
              hover:bg-accent/40 focus-within:ring-2 focus-within:ring-ring
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id={`variant-${opt.id}`}
                name="variant"
                value={opt.id}
                checked={value === opt.id}
                onChange={(e) => onChange(e.target.value)}
                disabled={isDisabled}
                className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300"
              />
              <span className="font-medium">{opt.label}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {opt.priceClp != null ? formatCLP(opt.priceClp) : "—"}
            </span>
          </label>
        );
      })}
    </div>
  );
}
