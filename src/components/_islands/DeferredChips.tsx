"use client"

export default function DeferredChips({ chips }: { chips: Array<{ key: string; label: string }> }) {
  return (
    <div className="mt-2 flex gap-1 flex-wrap">
      {chips.map((c, idx) => (
        <span key={`${c.key}-${idx}`} className="badge" style={{ background: 'var(--chip-active)', borderColor: 'transparent', color: '#3A3350' }}>{c.label}</span>
      ))}
    </div>
  )
}


