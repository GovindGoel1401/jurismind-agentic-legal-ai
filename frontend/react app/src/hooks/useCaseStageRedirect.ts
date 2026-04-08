import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveCase } from '../context/ActiveCaseContext'

export function useCaseStageRedirect(stagePath: string, routeCaseId?: string) {
  const navigate = useNavigate()
  const { activeCaseId } = useActiveCase()

  useEffect(() => {
    if (!routeCaseId && activeCaseId) {
      navigate(`${stagePath}/${activeCaseId}`, { replace: true })
    }
  }, [activeCaseId, navigate, routeCaseId, stagePath])

  return routeCaseId || activeCaseId || ''
}
