interface Tab<T extends string> {
  id: T
  label: string
}

interface Props<T extends string> {
  /** Available tabs. */
  tabs: Tab<T>[]
  /** Currently active tab id. */
  activeTab: T
  /** Called when a tab is clicked. */
  onTabChange: (id: T) => void
}

/**
 * A row of small pill-shaped tab buttons. The active tab is highlighted.
 *
 * @param props - Tabs definition, active state, and change handler.
 * @returns Horizontal tab pill row element.
 */
export function TabPills<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: Props<T>): React.JSX.Element {
  return (
    <div className="flex gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={(): void => onTabChange(tab.id)}
          className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
