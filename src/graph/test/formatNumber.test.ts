import { describe, expect, it } from 'vitest'
import { formatNumber } from '../lib/formatNumber'

describe('formatNumber', () => {
  describe('thousands separator', () => {
    it('adds commas to integers above 999', () => {
      expect(formatNumber(1234)).toBe('1,234')
      expect(formatNumber(1234567)).toBe('1,234,567')
      expect(formatNumber(1000000000)).toBe('1,000,000,000')
    })

    it('leaves integers 0-999 unchanged', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(7)).toBe('7')
      expect(formatNumber(999)).toBe('999')
    })

    it('handles negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1,234')
      expect(formatNumber(-1234567.89)).toBe('-1,234,567.89')
    })
  })

  describe('decimal preservation (default — no `decimals` option)', () => {
    it('preserves decimal portion exactly as JS renders it', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56')
      expect(formatNumber(0.5)).toBe('0.5')
      expect(formatNumber(0.125)).toBe('0.125')
    })

    it('preserves long decimals that toLocaleString would have truncated', () => {
      // toLocaleString('en-US') alone caps at 3 decimals by default.
      expect(formatNumber(1.23456789)).toBe('1.23456789')
    })

    it('preserves floating-point-noise as-is (caller opts into cleanup via decimals)', () => {
      expect(formatNumber(0.1 + 0.2)).toBe('0.30000000000000004')
    })
  })

  describe('explicit decimals option', () => {
    it('forces the exact number of decimal places', () => {
      expect(formatNumber(47.02, { decimals: 2 })).toBe('47.02')
      expect(formatNumber(47.0, { decimals: 2 })).toBe('47.00')
      expect(formatNumber(47, { decimals: 2 })).toBe('47.00')
    })

    it('rounds values with more precision than requested', () => {
      expect(formatNumber(1.2345, { decimals: 2 })).toBe('1.23')
      expect(formatNumber(1.2355, { decimals: 2 })).toBe('1.24')
    })

    it('decimals: 0 keeps integer look', () => {
      expect(formatNumber(1234.5, { decimals: 0 })).toBe('1,235')
    })

    it('clamps out-of-range decimals values', () => {
      expect(formatNumber(1.5, { decimals: -1 })).toBe('2') // clamped to 0
      expect(formatNumber(1.5, { decimals: 99 })).toMatch(/^1\.5/) // clamped to 20
    })

    it('commas still apply when decimals is set', () => {
      expect(formatNumber(1234567.89, { decimals: 2 })).toBe('1,234,567.89')
    })
  })

  describe('extreme magnitudes — scientific notation fallback', () => {
    it('uses scientific for very large magnitudes (|x| >= 1e15)', () => {
      expect(formatNumber(1e15)).toBe('1.00e15')
      expect(formatNumber(1e18)).toBe('1.00e18')
      expect(formatNumber(-2.5e20)).toBe('-2.50e20')
    })

    it('uses scientific for very small nonzero magnitudes (|x| < 1e-4)', () => {
      expect(formatNumber(1e-5)).toBe('1.00e-5')
      expect(formatNumber(1e-9)).toBe('1.00e-9')
      expect(formatNumber(-3.14e-7)).toBe('-3.14e-7')
    })

    it('keeps thresholds inclusive on the large side, exclusive on the small side', () => {
      // 1e14 is below the large-magnitude threshold → comma-formatted.
      expect(formatNumber(1e14)).toBe('100,000,000,000,000')
      // 1e-4 exactly is at the small-magnitude boundary → comma-formatted.
      expect(formatNumber(1e-4)).toBe('0.0001')
    })

    it('zero is always 0 (never falls through to scientific)', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(-0)).toBe('0')
    })
  })

  describe('non-finite values', () => {
    it('returns "NaN" for NaN', () => {
      expect(formatNumber(NaN)).toBe('NaN')
    })

    it('returns "Infinity" / "-Infinity" for ±Infinity', () => {
      expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('Infinity')
      expect(formatNumber(Number.NEGATIVE_INFINITY)).toBe('-Infinity')
    })
  })
})
