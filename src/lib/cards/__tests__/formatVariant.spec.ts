import { describe, it, expect } from 'vitest'
import { formatCardVariant } from '@/lib/cards/formatVariant'

describe('formatCardVariant', () => {
  describe('Frame Effects', () => {
    it('should format showcase frame effect', () => {
      const result = formatCardVariant({
        frameEffects: ['showcase']
      })
      expect(result.tags).toEqual(['Showcase'])
      expect(result.suffix).toBe(' (Showcase)')
    })

    it('should format showcaselegendary frame effect as Showcase', () => {
      const result = formatCardVariant({
        frameEffects: ['showcaselegendary']
      })
      expect(result.tags).toEqual(['Showcase'])
      expect(result.suffix).toBe(' (Showcase)')
    })

    it('should format extendedart frame effect', () => {
      const result = formatCardVariant({
        frameEffects: ['extendedart']
      })
      expect(result.tags).toEqual(['Extended Art'])
      expect(result.suffix).toBe(' (Extended Art)')
    })

    it('should format borderless frame effect', () => {
      const result = formatCardVariant({
        frameEffects: ['borderless']
      })
      expect(result.tags).toEqual(['Borderless'])
      expect(result.suffix).toBe(' (Borderless)')
    })

    it('should format retro frame effect', () => {
      const result = formatCardVariant({
        frameEffects: ['retro']
      })
      expect(result.tags).toEqual(['Retro Frame'])
      expect(result.suffix).toBe(' (Retro Frame)')
    })

    it('should format shatteredglass frame effect', () => {
      const result = formatCardVariant({
        frameEffects: ['shatteredglass']
      })
      expect(result.tags).toEqual(['Shattered Glass'])
      expect(result.suffix).toBe(' (Shattered Glass)')
    })

    it('should format fullart frame effect', () => {
      const result = formatCardVariant({
        frameEffects: ['fullart']
      })
      expect(result.tags).toEqual(['Full Art'])
      expect(result.suffix).toBe(' (Full Art)')
    })

    it('should format inverteddark frame effect', () => {
      const result = formatCardVariant({
        frameEffects: ['inverteddark']
      })
      expect(result.tags).toEqual(['Inverted Dark'])
      expect(result.suffix).toBe(' (Inverted Dark)')
    })

    it('should format future frame effect', () => {
      const result = formatCardVariant({
        frameEffects: ['future']
      })
      expect(result.tags).toEqual(['Future Shifted'])
      expect(result.suffix).toBe(' (Future Shifted)')
    })

    it('should format textless frame effect', () => {
      const result = formatCardVariant({
        frameEffects: ['textless']
      })
      expect(result.tags).toEqual(['Textless'])
      expect(result.suffix).toBe(' (Textless)')
    })

    it('should format borderless from borderColor field', () => {
      const result = formatCardVariant({
        borderColor: 'borderless'
      })
      expect(result.tags).toEqual(['Borderless'])
      expect(result.suffix).toBe(' (Borderless)')
    })

    it('should format showcase + borderless combination with Borderless last', () => {
      const result = formatCardVariant({
        frameEffects: ['showcase'],
        borderColor: 'borderless'
      })
      expect(result.tags).toEqual(['Showcase', 'Borderless'])
      expect(result.suffix).toBe(' (Showcase) (Borderless)')
    })

    it('should format borderless + galaxy foil combination with Borderless last', () => {
      const result = formatCardVariant({
        borderColor: 'borderless',
        promoTypes: ['galaxyfoil']
      })
      expect(result.tags).toEqual(['Galaxy Foil', 'Borderless'])
      expect(result.suffix).toBe(' (Galaxy Foil) (Borderless)')
    })

    it('should ignore inverted frame effect (users don\'t care about it)', () => {
      const result = formatCardVariant({
        frameEffects: ['inverted']
      })
      expect(result.tags).toEqual([])
      expect(result.suffix).toBe('')
    })

    it('should ignore unknown frame effects', () => {
      const result = formatCardVariant({
        frameEffects: ['nyxtouched', 'nyxborn', 'colorshifted', 'snow', 'lesson', 'legendary', 'devoid', 'sunmoondfc', 'compasslanddfc', 'mooneldrazi', 'tombstone', 'adventure', 'companion', 'draft', 'conjured']
      })
      expect(result.tags).toEqual([])
      expect(result.suffix).toBe('')
    })
  })

  describe('Foil Variants', () => {
    it('should format surgefoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['surgefoil']
      })
      expect(result.tags).toEqual(['Surge Foil'])
      expect(result.suffix).toBe(' (Surge Foil)')
    })

    it('should format galaxyfoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['galaxyfoil']
      })
      expect(result.tags).toEqual(['Galaxy Foil'])
      expect(result.suffix).toBe(' (Galaxy Foil)')
    })

    it('should format silverfoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['silverfoil']
      })
      expect(result.tags).toEqual(['Silver Foil'])
      expect(result.suffix).toBe(' (Silver Foil)')
    })

    it('should format ripplefoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['ripplefoil']
      })
      expect(result.tags).toEqual(['Ripple Foil'])
      expect(result.suffix).toBe(' (Ripple Foil)')
    })

    it('should format rainbowfoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['rainbowfoil']
      })
      expect(result.tags).toEqual(['Rainbow Foil'])
      expect(result.suffix).toBe(' (Rainbow Foil)')
    })

    it('should format firstplacefoil promo type with exception', () => {
      const result = formatCardVariant({
        promoTypes: ['firstplacefoil']
      })
      expect(result.tags).toEqual(['First Place Foil'])
      expect(result.suffix).toBe(' (First Place Foil)')
    })

    it('should format halofoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['halofoil']
      })
      expect(result.tags).toEqual(['Halo Foil'])
      expect(result.suffix).toBe(' (Halo Foil)')
    })

    it('should format raisedfoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['raisedfoil']
      })
      expect(result.tags).toEqual(['Raised Foil'])
      expect(result.suffix).toBe(' (Raised Foil)')
    })

    it('should format manafoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['manafoil']
      })
      expect(result.tags).toEqual(['Mana Foil'])
      expect(result.suffix).toBe(' (Mana Foil)')
    })

    it('should format fracturefoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['fracturefoil']
      })
      expect(result.tags).toEqual(['Fracture Foil'])
      expect(result.suffix).toBe(' (Fracture Foil)')
    })

    it('should format confettifoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['confettifoil']
      })
      expect(result.tags).toEqual(['Confetti Foil'])
      expect(result.suffix).toBe(' (Confetti Foil)')
    })

    it('should format dragonscalefoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['dragonscalefoil']
      })
      expect(result.tags).toEqual(['Dragonscale Foil'])
      expect(result.suffix).toBe(' (Dragonscale Foil)')
    })

    it('should format singularityfoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['singularityfoil']
      })
      expect(result.tags).toEqual(['Singularity Foil'])
      expect(result.suffix).toBe(' (Singularity Foil)')
    })

    it('should format cosmicfoil promo type', () => {
      const result = formatCardVariant({
        promoTypes: ['cosmicfoil']
      })
      expect(result.tags).toEqual(['Cosmic Foil'])
      expect(result.suffix).toBe(' (Cosmic Foil)')
    })

    it('should handle foil variants with underscores and hyphens', () => {
      const result = formatCardVariant({
        promoTypes: ['double_rainbow-foil']
      })
      expect(result.tags).toEqual(['Double Rainbow Foil'])
      expect(result.suffix).toBe(' (Double Rainbow Foil)')
    })

    it('should ignore non-foil promo types', () => {
      const result = formatCardVariant({
        promoTypes: ['prerelease', 'promo', 'bundle', 'booster']
      })
      expect(result.tags).toEqual([])
      expect(result.suffix).toBe('')
    })
  })

  describe('Base Finishes', () => {
    it('should format etched finish', () => {
      const result = formatCardVariant({
        finishes: ['etched']
      })
      expect(result.tags).toEqual(['Etched'])
      expect(result.suffix).toBe(' (Etched)')
    })

    it('should not show generic foil finish (removed per requirements)', () => {
      const result = formatCardVariant({
        finishes: ['foil']
      })
      expect(result.tags).toEqual([])
      expect(result.suffix).toBe('')
    })

    it('should not show foil finish when foil variant is present', () => {
      const result = formatCardVariant({
        finishes: ['foil'],
        promoTypes: ['surgefoil']
      })
      expect(result.tags).toEqual(['Surge Foil'])
      expect(result.suffix).toBe(' (Surge Foil)')
    })

    it('should ignore nonfoil finish', () => {
      const result = formatCardVariant({
        finishes: ['nonfoil']
      })
      expect(result.tags).toEqual([])
      expect(result.suffix).toBe('')
    })

    it('should ignore unknown finishes', () => {
      const result = formatCardVariant({
        finishes: ['unknown', 'special']
      })
      expect(result.tags).toEqual([])
      expect(result.suffix).toBe('')
    })
  })

  describe('Combinations', () => {
    it('should format showcase + surge foil combination', () => {
      const result = formatCardVariant({
        frameEffects: ['showcase'],
        promoTypes: ['surgefoil']
      })
      expect(result.tags).toEqual(['Showcase', 'Surge Foil'])
      expect(result.suffix).toBe(' (Showcase) (Surge Foil)')
    })

    it('should format borderless + halo foil combination with Borderless last', () => {
      const result = formatCardVariant({
        borderColor: 'borderless',
        promoTypes: ['halofoil']
      })
      expect(result.tags).toEqual(['Halo Foil', 'Borderless'])
      expect(result.suffix).toBe(' (Halo Foil) (Borderless)')
    })

    it('should format retro frame + etched combination', () => {
      const result = formatCardVariant({
        frameEffects: ['retro'],
        finishes: ['etched']
      })
      expect(result.tags).toEqual(['Retro Frame', 'Etched'])
      expect(result.suffix).toBe(' (Retro Frame) (Etched)')
    })

    it('should format dragonscale foil only', () => {
      const result = formatCardVariant({
        promoTypes: ['dragonscalefoil']
      })
      expect(result.tags).toEqual(['Dragonscale Foil'])
      expect(result.suffix).toBe(' (Dragonscale Foil)')
    })

    it('should format confetti foil only', () => {
      const result = formatCardVariant({
        promoTypes: ['confettifoil']
      })
      expect(result.tags).toEqual(['Confetti Foil'])
      expect(result.suffix).toBe(' (Confetti Foil)')
    })

    it('should not show generic foil only (removed per requirements)', () => {
      const result = formatCardVariant({
        finishes: ['foil']
      })
      expect(result.tags).toEqual([])
      expect(result.suffix).toBe('')
    })

    it('should format etched only', () => {
      const result = formatCardVariant({
        finishes: ['etched']
      })
      expect(result.tags).toEqual(['Etched'])
      expect(result.suffix).toBe(' (Etched)')
    })

    it('should handle no foil or frame effects', () => {
      const result = formatCardVariant({
        finishes: ['nonfoil']
      })
      expect(result.tags).toEqual([])
      expect(result.suffix).toBe('')
    })

    it('should handle multiple frame effects and show all', () => {
      const result = formatCardVariant({
        frameEffects: ['showcase', 'borderless', 'extendedart']
      })
      expect(result.tags).toEqual(['Showcase', 'Extended Art', 'Borderless'])
      expect(result.suffix).toBe(' (Showcase) (Extended Art) (Borderless)')
    })

    it('should handle multiple foil variants and show first', () => {
      const result = formatCardVariant({
        promoTypes: ['surgefoil', 'halofoil', 'galaxyfoil']
      })
      expect(result.tags).toEqual(['Surge Foil'])
      expect(result.suffix).toBe(' (Surge Foil)')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null/undefined arrays', () => {
      const result = formatCardVariant({
        finishes: null,
        promoTypes: undefined,
        frameEffects: null
      })
      expect(result.tags).toEqual([])
      expect(result.suffix).toBe('')
    })

    it('should handle empty arrays', () => {
      const result = formatCardVariant({
        finishes: [],
        promoTypes: [],
        frameEffects: []
      })
      expect(result.tags).toEqual([])
      expect(result.suffix).toBe('')
    })

    it('should handle case insensitive matching', () => {
      const result = formatCardVariant({
        frameEffects: ['SHOWCASE'],
        promoTypes: ['SURGEFOIL'],
        finishes: ['ETCHED']
      })
      expect(result.tags).toEqual(['Showcase', 'Surge Foil', 'Etched'])
      expect(result.suffix).toBe(' (Showcase) (Surge Foil) (Etched)')
    })

    it('should deduplicate tags', () => {
      const result = formatCardVariant({
        frameEffects: ['showcase', 'showcase'],
        promoTypes: ['surgefoil', 'surgefoil']
      })
      expect(result.tags).toEqual(['Showcase', 'Surge Foil'])
      expect(result.suffix).toBe(' (Showcase) (Surge Foil)')
    })
  })
})
