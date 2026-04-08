import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { appRoutes } from '../../config/routes'

const defaultTitle = 'JurisMind AI'

export default function RouteEffects() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  useEffect(() => {
    const activeRoute =
      appRoutes.find((route) => route.path === location.pathname) ??
      appRoutes.find((route) =>
        route.path.includes('/:') && location.pathname.startsWith(route.path.split('/:')[0] + '/'),
      )
    document.title = activeRoute?.title ? `${activeRoute.title} | ${defaultTitle}` : defaultTitle
  }, [location.pathname])

  return null
}
