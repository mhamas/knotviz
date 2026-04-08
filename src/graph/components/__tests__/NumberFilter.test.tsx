import { describe, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { NumberFilter } from '@/components/filters/NumberFilter'
import type { NumberFilterState, HistogramBucket } from '@/types'

const baseBuckets: HistogramBucket[] = [
  { from: 0, to: 33, count: 5 },
  { from: 33, to: 67, count: 3 },
  { from: 67, to: 100, count: 2 },
]

const logBuckets: HistogramBucket[] = [
  { from: 0, to: 9, count: 6 },
  { from: 9, to: 99, count: 3 },
  { from: 99, to: 100, count: 1 },
]

const baseState: NumberFilterState = {
  type: 'number',
  isEnabled: true,
  min: 0,
  max: 100,
  domainMin: 0,
  domainMax: 100,
  isLogScale: false,
  histogramBuckets: baseBuckets,
  logHistogramBuckets: logBuckets,
}

describe('rendering', () => {
  test('renders slider with min and max inputs', async () => {
    const screen = await render(
      <NumberFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    const minInput = screen.getByTestId('number-filter-min')
    const maxInput = screen.getByTestId('number-filter-max')
    await expect.element(minInput).toHaveValue('0')
    await expect.element(maxInput).toHaveValue('100.00')
  })

  test('renders slider track', async () => {
    const screen = await render(
      <NumberFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    expect(screen.container.querySelector('[data-slot="slider"]')).not.toBeNull()
  })

  test('renders with small values using toPrecision', async () => {
    const state: NumberFilterState = {
      ...baseState,
      min: 0.001,
      max: 0.009,
      domainMin: 0.001,
      domainMax: 0.009,
    }
    const screen = await render(
      <NumberFilter state={state} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    await expect.element(screen.getByTestId('number-filter-min')).toHaveValue('0.00100')
    await expect.element(screen.getByTestId('number-filter-max')).toHaveValue('0.00900')
  })

  test('renders without crashing when domainMin === domainMax', async () => {
    const state: NumberFilterState = {
      ...baseState,
      min: 42,
      max: 42,
      domainMin: 42,
      domainMax: 42,
      histogramBuckets: [{ from: 42, to: 42, count: 5 }, { from: 42, to: 42, count: 0 }, { from: 42, to: 42, count: 0 }],
      logHistogramBuckets: [{ from: 42, to: 42, count: 5 }, { from: 42, to: 42, count: 0 }, { from: 42, to: 42, count: 0 }],
    }
    const screen = await render(
      <NumberFilter state={state} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    await expect.element(screen.getByTestId('number-filter-min')).toHaveValue('42.00')
    await expect.element(screen.getByTestId('number-filter-max')).toHaveValue('42.00')
  })

  test('renders without crashing when domainMin=0 and domainMax=0', async () => {
    const state: NumberFilterState = {
      ...baseState,
      min: 0,
      max: 0,
      domainMin: 0,
      domainMax: 0,
      histogramBuckets: [{ from: 0, to: 0, count: 3 }, { from: 0, to: 0, count: 0 }, { from: 0, to: 0, count: 0 }],
      logHistogramBuckets: [{ from: 0, to: 0, count: 3 }, { from: 0, to: 0, count: 0 }, { from: 0, to: 0, count: 0 }],
    }
    const screen = await render(
      <NumberFilter state={state} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    await expect.element(screen.getByTestId('number-filter-min')).toHaveValue('0')
    await expect.element(screen.getByTestId('number-filter-max')).toHaveValue('0')
  })
})

describe('histogram', () => {
  test('histogram hidden when isHistogramVisible=false', async () => {
    const screen = await render(
      <NumberFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    expect(screen.container.querySelector('[data-testid="number-filter-histogram"]')).toBeNull()
  })

  test('histogram shown when isHistogramVisible=true', async () => {
    const screen = await render(
      <NumberFilter state={baseState} onChange={vi.fn()} isHistogramVisible={true} />,
    )
    expect(screen.container.querySelector('[data-testid="number-filter-histogram"]')).not.toBeNull()
  })

  test('no histogram rendered when buckets are empty even if visible', async () => {
    const state: NumberFilterState = {
      ...baseState,
      histogramBuckets: [],
      logHistogramBuckets: [],
    }
    const screen = await render(
      <NumberFilter state={state} onChange={vi.fn()} isHistogramVisible={true} />,
    )
    expect(screen.container.querySelector('[data-testid="number-filter-histogram"]')).toBeNull()
  })

  test('renders histogram bars when visible', async () => {
    const screen = await render(
      <NumberFilter state={baseState} onChange={vi.fn()} isHistogramVisible={true} />,
    )
    const bars = screen.container.querySelectorAll('[data-testid="histogram-bar"]')
    expect(bars.length).toBe(3)
  })

  test('switches to log histogram buckets when isLogScale is true', async () => {
    const state: NumberFilterState = {
      ...baseState,
      isLogScale: true,
      logHistogramBuckets: [
        { from: 0, to: 50, count: 8 },
        { from: 50, to: 100, count: 2 },
      ],
      histogramBuckets: [
        { from: 0, to: 33, count: 5 },
        { from: 33, to: 67, count: 3 },
        { from: 67, to: 100, count: 2 },
      ],
    }
    const screen = await render(
      <NumberFilter state={state} onChange={vi.fn()} isHistogramVisible={true} />,
    )
    // Log histogram has 2 buckets → 2 bars
    const bars = screen.container.querySelectorAll('[data-testid="histogram-bar"]')
    expect(bars.length).toBe(2)
  })
})

describe('editable min/max text inputs', () => {
  test('typing a valid min and pressing Enter updates the value', async () => {
    const screen = await render(
      <NumberFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    const minInput = screen.getByTestId('number-filter-min')
    await minInput.click()
    await userEvent.clear(minInput.element())
    await userEvent.type(minInput.element(), '25')
    await userEvent.keyboard('{Enter}')
    await expect.element(minInput).toHaveValue('25.00')
  })

  test('typing a valid max and pressing Enter updates the value', async () => {
    const screen = await render(
      <NumberFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    const maxInput = screen.getByTestId('number-filter-max')
    await maxInput.click()
    await userEvent.clear(maxInput.element())
    await userEvent.type(maxInput.element(), '75')
    await userEvent.keyboard('{Enter}')
    await expect.element(maxInput).toHaveValue('75.00')
  })

  test('typing non-numeric text and blurring reverts to previous value', async () => {
    const screen = await render(
      <NumberFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    const minInput = screen.getByTestId('number-filter-min')
    await minInput.click()
    await userEvent.clear(minInput.element())
    await userEvent.type(minInput.element(), 'abc')
    // Blur by clicking another element
    await screen.getByTestId('number-filter-max').click()
    await expect.element(minInput).toHaveValue('0')
  })

  test('typing empty string and blurring reverts to previous value', async () => {
    const screen = await render(
      <NumberFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    const maxInput = screen.getByTestId('number-filter-max')
    await maxInput.click()
    await userEvent.clear(maxInput.element())
    // Blur by clicking another element
    await screen.getByTestId('number-filter-min').click()
    await expect.element(maxInput).toHaveValue('100.00')
  })

  test('Escape key reverts without committing', async () => {
    const onChange = vi.fn()
    const screen = await render(
      <NumberFilter state={baseState} onChange={onChange} isHistogramVisible={false} />,
    )
    const minInput = screen.getByTestId('number-filter-min')
    await minInput.click()
    await userEvent.clear(minInput.element())
    await userEvent.type(minInput.element(), '50')
    // Dispatch Escape keydown directly on the focused input
    minInput.element().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect.element(minInput).toHaveValue('0')
  })

  test('value above domain is clamped to domainMax', async () => {
    const screen = await render(
      <NumberFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    const maxInput = screen.getByTestId('number-filter-max')
    await maxInput.click()
    await userEvent.clear(maxInput.element())
    await userEvent.type(maxInput.element(), '999')
    await userEvent.keyboard('{Enter}')
    await expect.element(maxInput).toHaveValue('100.00')
  })

  test('value below domain is clamped to domainMin', async () => {
    const screen = await render(
      <NumberFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    const minInput = screen.getByTestId('number-filter-min')
    await minInput.click()
    await userEvent.clear(minInput.element())
    await userEvent.type(minInput.element(), '-50')
    await userEvent.keyboard('{Enter}')
    await expect.element(minInput).toHaveValue('0')
  })

  test('min typed larger than current max is clamped to max', async () => {
    const state: NumberFilterState = { ...baseState, min: 20, max: 50 }
    const screen = await render(
      <NumberFilter state={state} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    const minInput = screen.getByTestId('number-filter-min')
    await minInput.click()
    await userEvent.clear(minInput.element())
    await userEvent.type(minInput.element(), '80')
    await userEvent.keyboard('{Enter}')
    await expect.element(minInput).toHaveValue('50.00')
  })

  test('max typed smaller than current min is clamped to min', async () => {
    const state: NumberFilterState = { ...baseState, min: 20, max: 50 }
    const screen = await render(
      <NumberFilter state={state} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    const maxInput = screen.getByTestId('number-filter-max')
    await maxInput.click()
    await userEvent.clear(maxInput.element())
    await userEvent.type(maxInput.element(), '5')
    await userEvent.keyboard('{Enter}')
    await expect.element(maxInput).toHaveValue('20.00')
  })

  test('scientific notation input is parsed correctly', async () => {
    const state: NumberFilterState = {
      ...baseState,
      domainMin: 0,
      domainMax: 100000,
    }
    const screen = await render(
      <NumberFilter state={state} onChange={vi.fn()} isHistogramVisible={false} />,
    )
    const maxInput = screen.getByTestId('number-filter-max')
    await maxInput.click()
    await userEvent.clear(maxInput.element())
    await userEvent.type(maxInput.element(), '1e3')
    await userEvent.keyboard('{Enter}')
    await expect.element(maxInput).toHaveValue('1000.00')
  })
})
