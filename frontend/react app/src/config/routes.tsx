import { Route } from 'react-router-dom'
import Home from '../pages/Home'
import CaseInput from '../pages/CaseInput'
import AIAnalysis from '../pages/AIAnalysis'
import CaseSearch from '../pages/CaseSearch'
import DebateSimulation from '../pages/DebateSimulation'
import About from '../pages/About'
import Contact from '../pages/Contact'
import Feedback from '../pages/Feedback'
import KnowledgeGraph from '../pages/KnowledgeGraph'
import NotFound from '../pages/NotFound'
import Verdict from '../pages/Verdict'

export const appRoutes = [
  { path: '/', element: <Home />, title: 'Home' },
  { path: '/case-input', element: <CaseInput />, title: 'Case Input' },
  { path: '/analysis', element: <AIAnalysis />, title: 'Analysis' },
  { path: '/analysis/:caseId', element: <AIAnalysis />, title: 'Analysis' },
  { path: '/debate', element: <DebateSimulation />, title: 'Debate Simulation' },
  { path: '/debate/:caseId', element: <DebateSimulation />, title: 'Debate Simulation' },
  { path: '/verdict', element: <Verdict />, title: 'Verdict' },
  { path: '/verdict/:caseId', element: <Verdict />, title: 'Verdict' },
  { path: '/similar-cases', element: <CaseSearch />, title: 'Similar Cases' },
  { path: '/similar-cases/:caseId', element: <CaseSearch />, title: 'Similar Cases' },
  { path: '/knowledge-graph', element: <KnowledgeGraph />, title: 'Knowledge Graph' },
  { path: '/knowledge-graph/:caseId', element: <KnowledgeGraph />, title: 'Knowledge Graph' },
  { path: '/feedback', element: <Feedback />, title: 'Feedback' },
  { path: '/feedback/:caseId', element: <Feedback />, title: 'Feedback' },
  { path: '/about', element: <About />, title: 'About' },
  { path: '/contact', element: <Contact />, title: 'Contact' },
]

export function renderAppRoutes() {
  return (
    <>
      {appRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
      <Route path="*" element={<NotFound />} />
    </>
  )
}
