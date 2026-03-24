import { Palette, SlidersHorizontal } from 'lucide-react'
import {
  COLOR_TAB_COLORS, COLOR_TAB_COLORS_BG,
  COLOR_TAB_FILTERS, COLOR_TAB_FILTERS_BG,
} from '@/lib/colors'

interface Props {
  isColorsOpen: boolean
  isFiltersOpen: boolean
  onToggleColors: () => void
  onToggleFilters: () => void
}

/**
 * Vertical tab strip between canvas and right sidebars.
 * Two toggle buttons: Colors/Stats and Filters.
 *
 * @param props - Open state and toggle callbacks for each tab.
 * @returns Tab strip element.
 */
export function RightTabStrip({
  isColorsOpen,
  isFiltersOpen,
  onToggleColors,
  onToggleFilters,
}: Props): React.JSX.Element {
  return (
    <div className="flex h-screen shrink-0 flex-col items-center gap-1 border-l border-slate-200 bg-slate-50 px-1 pt-2">
      <button
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded transition-colors"
        style={isColorsOpen
          ? { backgroundColor: COLOR_TAB_COLORS_BG, color: COLOR_TAB_COLORS }
          : { color: COLOR_TAB_COLORS }}
        onClick={onToggleColors}
        aria-label="Toggle Colors panel"
        title={isColorsOpen ? 'Close colors & stats' : 'Open colors & stats'}
      >
        <Palette className="h-4 w-4" />
      </button>
      <button
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded transition-colors"
        style={isFiltersOpen
          ? { backgroundColor: COLOR_TAB_FILTERS_BG, color: COLOR_TAB_FILTERS }
          : { color: COLOR_TAB_FILTERS }}
        onClick={onToggleFilters}
        aria-label="Toggle Filters panel"
        title={isFiltersOpen ? 'Close filters' : 'Open filters'}
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    </div>
  )
}
