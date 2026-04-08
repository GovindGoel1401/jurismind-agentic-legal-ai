const CASE_STAGE_HREFS = ['/analysis', '/verdict', '/debate', '/similar-cases', '/knowledge-graph', '/feedback']

export function getCaseIdFromPathname(pathname: string) {
  const match = pathname.match(/^\/(?:analysis|verdict|debate|similar-cases|knowledge-graph|feedback)\/([^/]+)$/)
  return match?.[1] || ''
}

export function resolveCaseAwareHref(href: string, pathname: string, activeCaseId = '') {
  const resolvedCaseId = getCaseIdFromPathname(pathname) || String(activeCaseId || '').trim()
  if (!resolvedCaseId) return href
  if (CASE_STAGE_HREFS.includes(href)) {
    return `${href}/${resolvedCaseId}`
  }
  return href
}
