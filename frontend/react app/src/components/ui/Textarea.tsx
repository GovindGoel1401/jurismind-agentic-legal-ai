import * as React from 'react'
import { cn } from '../../lib/utils'

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[120px] w-full rounded-md border border-slate-700 bg-legal-card px-3 py-2 text-sm text-legal-text placeholder:text-legal-muted focus:border-legal-blue focus:outline-none focus:ring-2 focus:ring-legal-blue/30 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
})

Textarea.displayName = 'Textarea'

export { Textarea }
