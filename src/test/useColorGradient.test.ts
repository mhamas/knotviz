import { describe, expect, it } from 'vitest'
import { computeGradientColors } from '@/hooks/useColorGradient'
import type { ColorGradientState } from '@/types'

const baseState: ColorGradientState = {
  propertyKey: 'age',
  palette: 'Viridis',
  isReversed: false,
  customColors: [],
  customPalettes: [],
}

describe('computeGradientColors', () => {
  describe('number property', () => {
    it('maps min value to first stop and max to last stop', () => {
      const entries = [
        { id: 'a', value: 10 },
        { id: 'b', value: 50 },
      ]
      const result = computeGradientColors(entries, 'number', baseState)
      expect(result.get('a')).toBe('#440154') // t=0
      expect(result.get('b')).toBe('#fde725') // t=1
    })

    it('uses midpoint (t=0.5) when all values are equal', () => {
      const entries = [
        { id: 'a', value: 42 },
        { id: 'b', value: 42 },
      ]
      const result = computeGradientColors(entries, 'number', baseState)
      // t=0.5 for Viridis → stop[2] = '#21908c'
      expect(result.get('a')).toBe('#21908c')
      expect(result.get('b')).toBe('#21908c')
    })

    it('interpolates intermediate values correctly', () => {
      const entries = [
        { id: 'lo', value: 0 },
        { id: 'mid', value: 50 },
        { id: 'hi', value: 100 },
      ]
      const result = computeGradientColors(entries, 'number', baseState)
      expect(result.get('lo')).toBe('#440154')
      expect(result.get('mid')).toBe('#21908c')
      expect(result.get('hi')).toBe('#fde725')
    })
  })

  describe('date property', () => {
    it('maps earliest date to first stop and latest to last stop', () => {
      const entries = [
        { id: 'old', value: '2020-01-01' },
        { id: 'new', value: '2024-01-01' },
      ]
      const result = computeGradientColors(entries, 'date', baseState)
      expect(result.get('old')).toBe('#440154') // t=0
      expect(result.get('new')).toBe('#fde725') // t=1
    })

    it('uses midpoint when all dates are equal', () => {
      const entries = [
        { id: 'a', value: '2023-06-15' },
        { id: 'b', value: '2023-06-15' },
      ]
      const result = computeGradientColors(entries, 'date', baseState)
      expect(result.get('a')).toBe('#21908c')
      expect(result.get('b')).toBe('#21908c')
    })
  })

  describe('boolean property', () => {
    it('maps false to first color and true to last color', () => {
      const entries = [
        { id: 'f', value: false },
        { id: 't', value: true },
      ]
      const result = computeGradientColors(entries, 'boolean', baseState)
      // Viridis: first='#440154', last='#fde725'
      expect(result.get('f')).toBe('#440154')
      expect(result.get('t')).toBe('#fde725')
    })

    it('uses custom colors when provided', () => {
      const state: ColorGradientState = {
        ...baseState,
        customColors: ['#ff0000'],
      }
      const entries = [
        { id: 'f', value: false },
        { id: 't', value: true },
      ]
      const result = computeGradientColors(entries, 'boolean', state)
      // First stop of Viridis for false
      expect(result.get('f')).toBe('#440154')
      // Last color is the custom '#ff0000'
      expect(result.get('t')).toBe('#ff0000')
    })
  })

  describe('string property', () => {
    it('assigns distinct sorted values to palette colors round-robin', () => {
      const entries = [
        { id: '1', value: 'banana' },
        { id: '2', value: 'apple' },
        { id: '3', value: 'cherry' },
      ]
      const result = computeGradientColors(entries, 'string', baseState)
      // Sorted: apple(0), banana(1), cherry(2) → Viridis stops [0],[1],[2]
      expect(result.get('2')).toBe('#440154') // apple → index 0
      expect(result.get('1')).toBe('#3b528b') // banana → index 1
      expect(result.get('3')).toBe('#21908c') // cherry → index 2
    })

    it('wraps around when more distinct values than palette colors', () => {
      const state: ColorGradientState = {
        propertyKey: 'status',
        palette: 'Blues',
        isReversed: false,
        customColors: [],
        customPalettes: [],
      }
      // Blues has 5 stops. Create 6 distinct values to force wrap.
      const entries = [
        { id: '1', value: 'a' },
        { id: '2', value: 'b' },
        { id: '3', value: 'c' },
        { id: '4', value: 'd' },
        { id: '5', value: 'e' },
        { id: '6', value: 'f' },
      ]
      const result = computeGradientColors(entries, 'string', state)
      // 'f' is index 5, 5 % 5 = 0, so it wraps to first color
      expect(result.get('6')).toBe(result.get('1'))
    })

    it('assigns same color to duplicate string values', () => {
      const entries = [
        { id: '1', value: 'alpha' },
        { id: '2', value: 'alpha' },
      ]
      const result = computeGradientColors(entries, 'string', baseState)
      expect(result.get('1')).toBe(result.get('2'))
    })
  })

  describe('edge cases', () => {
    it('returns empty map for empty entries', () => {
      const result = computeGradientColors([], 'number', baseState)
      expect(result.size).toBe(0)
    })

    it('handles single node for number type', () => {
      const entries = [{ id: 'only', value: 99 }]
      const result = computeGradientColors(entries, 'number', baseState)
      // min === max → t=0.5
      expect(result.get('only')).toBe('#21908c')
    })

    it('works with different palettes', () => {
      const state: ColorGradientState = {
        ...baseState,
        palette: 'Reds',
      }
      const entries = [
        { id: 'a', value: 0 },
        { id: 'b', value: 100 },
      ]
      const result = computeGradientColors(entries, 'number', state)
      expect(result.get('a')).toBe('#fff5f0') // Reds first stop
      expect(result.get('b')).toBe('#67000d') // Reds last stop
    })

    it('reverses colors when isReversed is true', () => {
      const state: ColorGradientState = {
        ...baseState,
        isReversed: true,
      }
      const entries = [
        { id: 'a', value: 0 },
        { id: 'b', value: 100 },
      ]
      const result = computeGradientColors(entries, 'number', state)
      // Reversed Viridis: first stop becomes '#fde725', last becomes '#440154'
      expect(result.get('a')).toBe('#fde725')
      expect(result.get('b')).toBe('#440154')
    })
  })
})
