import { PanelRightClose } from 'lucide-react'
import type { ColorGradientState, FilterMap, PropertyMeta, PropertyStatsResult } from '../types'
import type { PropertyColumns } from '../hooks/useFilterState'
import { CollapsibleSection } from '@/components/sidebar'
import { ColorTab } from './ColorTab'
import { StatisticsPanel } from './StatisticsPanel'

interface Props {
  propertyMetas: PropertyMeta[]
  gradientState: ColorGradientState
  onGradientChange: (s: ColorGradientState) => void
  propertyColumns: PropertyColumns
  filters: FilterMap
  propertyStats: PropertyStatsResult | null
  onClose: () => void
}

/**
 * Right sidebar panel for Colors and Statistics.
 * Colors section is always shown; Stats section appears below when
 * a color property is selected.
 *
 * @param props - Color/gradient state, stats data, and close callback.
 * @returns Colors sidebar element.
 */
export function ColorsSidebar({
  propertyMetas,
  gradientState,
  onGradientChange,
  propertyColumns,
  filters,
  propertyStats,
  onClose,
}: Props): React.JSX.Element {
  const hasProperties = propertyMetas.length > 0

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <CollapsibleSection
          label="Analysis"
          help="Map a node property to a visual encoding — color palette, node size, or both. Works with numbers, dates, strings, and booleans."
          trailing={
            <button
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              onClick={(e): void => { e.preventDefault(); onClose() }}
              aria-label="Close Analysis panel"
              title="Collapse analysis & stats"
            >
              <PanelRightClose className="h-3.5 w-3.5" />
            </button>
          }
        >
          {!hasProperties ? (
            <p className="text-xs italic text-slate-400">This graph has no node properties to color by.</p>
          ) : (
            <ColorTab
              propertyMetas={propertyMetas}
              state={gradientState}
              propertyColumns={propertyColumns}
              filters={filters}
              onChange={onGradientChange}
            />
          )}
        </CollapsibleSection>

        {gradientState.propertyKey && propertyStats && (
          <>
            <div className="my-3 border-t border-slate-200" />
            <CollapsibleSection label="Statistics">
              <StatisticsPanel
                stats={propertyStats}
                propertyKey={gradientState.propertyKey}
              />
            </CollapsibleSection>
          </>
        )}
      </div>
    </div>
  )
}
