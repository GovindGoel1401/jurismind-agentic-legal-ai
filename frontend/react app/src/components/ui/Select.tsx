import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SelectProps extends React.ComponentProps<'select'> {
  options: Array<{ label: string; value: string }>
}

function Select({ className, options, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'flex h-10 w-full appearance-none rounded-md border border-slate-700 bg-legal-card px-3 py-2 pr-9 text-sm text-legal-text focus:border-legal-blue focus:outline-none focus:ring-2 focus:ring-legal-blue/30 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-legal-muted"
      />
    </div>
  )
}

export { Select }
