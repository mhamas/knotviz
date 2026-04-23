import { describe, expect, it } from 'vitest'
import { alignPaletteToType } from '@/components/ColorTab'

describe('alignPaletteToType', () => {
  describe('categorical property types (string / string[] / boolean)', () => {
    it('swaps a sequential palette to Tableau10', () => {
      expect(alignPaletteToType('Viridis', 'string')).toBe('Tableau10')
      expect(alignPaletteToType('Blues', 'boolean')).toBe('Tableau10')
      expect(alignPaletteToType('Plasma', 'string[]')).toBe('Tableau10')
    })

    it('swaps a diverging palette to Tableau10', () => {
      expect(alignPaletteToType('Spectral', 'string')).toBe('Tableau10')
      expect(alignPaletteToType('RdBu', 'boolean')).toBe('Tableau10')
    })

    it('leaves an already-qualitative palette alone', () => {
      expect(alignPaletteToType('Tableau10', 'string')).toBe('Tableau10')
      expect(alignPaletteToType('Observable10', 'boolean')).toBe('Observable10')
      expect(alignPaletteToType('Set2', 'string[]')).toBe('Set2')
    })
  })

  describe('continuous property types (number / date)', () => {
    it('swaps a qualitative palette back to Viridis', () => {
      expect(alignPaletteToType('Tableau10', 'number')).toBe('Viridis')
      expect(alignPaletteToType('Set2', 'date')).toBe('Viridis')
    })

    it('leaves a sequential or diverging palette alone', () => {
      expect(alignPaletteToType('Blues', 'number')).toBe('Blues')
      expect(alignPaletteToType('Viridis', 'date')).toBe('Viridis')
      expect(alignPaletteToType('Spectral', 'number')).toBe('Spectral')
    })
  })

  describe('custom palettes (non-built-in ids)', () => {
    it('never clobbers a user-picked custom palette', () => {
      expect(alignPaletteToType('custom-1', 'string')).toBe('custom-1')
      expect(alignPaletteToType('custom-7', 'number')).toBe('custom-7')
      expect(alignPaletteToType('custom-7', 'boolean')).toBe('custom-7')
    })
  })

  describe('undefined property type (property cleared)', () => {
    it('leaves the palette alone', () => {
      expect(alignPaletteToType('Tableau10', undefined)).toBe('Tableau10')
      expect(alignPaletteToType('Viridis', undefined)).toBe('Viridis')
    })
  })
})
