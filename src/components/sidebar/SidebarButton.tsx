import { Button } from '@/components/ui/button'

type ButtonColor = 'neutral' | 'green' | 'red'

const colorClasses: Record<ButtonColor, string> = {
  neutral: 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100',
  green: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  red: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
}

interface Props {
  children: React.ReactNode
  onClick: () => void
  color?: ButtonColor
  disabled?: boolean
  className?: string
}

/**
 * Styled sidebar action button with color variants.
 *
 * @param props - Button content, click handler, color variant, and optional overrides.
 * @returns Sidebar button element.
 */
export function SidebarButton({
  children,
  onClick,
  color = 'neutral',
  disabled = false,
  className = '',
}: Props): React.JSX.Element {
  return (
    <Button
      variant="outline"
      size="sm"
      className={`cursor-pointer justify-center text-xs font-medium ${colorClasses[color]} ${disabled ? 'pointer-events-none opacity-50' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}
