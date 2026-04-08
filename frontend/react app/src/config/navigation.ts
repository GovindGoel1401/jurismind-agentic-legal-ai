export interface NavigationItem {
  label: string
  href: string
}

export const primaryNavigation: NavigationItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Case Input', href: '/case-input' },
  { label: 'Analysis', href: '/analysis' },
  { label: 'Verdict', href: '/verdict' },
  { label: 'Debate', href: '/debate' },
  { label: 'Similar Cases', href: '/similar-cases' },
  { label: 'Knowledge Graph', href: '/knowledge-graph' },
  { label: 'Feedback', href: '/feedback' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export const footerPlatformNavigation: NavigationItem[] = [
  { label: 'Analysis', href: '/analysis' },
  { label: 'Verdict', href: '/verdict' },
  { label: 'Debate', href: '/debate' },
  { label: 'Case Input', href: '/case-input' },
  { label: 'Similar Cases', href: '/similar-cases' },
  { label: 'Knowledge Graph', href: '/knowledge-graph' },
  { label: 'Feedback', href: '/feedback' },
]
