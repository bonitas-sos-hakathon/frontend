import { useEffect } from 'react'
import { content } from './data/content'
import { AuthProvider, useAuth } from './lib/auth'
import { navigate, useLocation } from './lib/router'

function Redirect({ to }) {
  useEffect(() => {
    navigate(to, { replace: true })
  }, [to])
  return null
}
import ChildHome from './pages/child/ChildHome'
import ChildLayout from './pages/child/ChildLayout'
import QuizRunner from './pages/child/QuizRunner'
import Landing from './pages/Landing'
import ChildProfilePage from './pages/parent/ChildProfilePage'
import ChildrenPage from './pages/parent/ChildrenPage'
import CommunityPage from './pages/parent/CommunityPage'
import DailyCardsPage from './pages/parent/DailyCardsPage'
import ParentHome from './pages/parent/ParentHome'
import ParentLayout from './pages/parent/ParentLayout'
import ProgressPage from './pages/parent/ProgressPage'

function Parent({ path }) {
  let page
  if (path === '/parent') page = <ParentHome />
  else if (path === '/parent/children') page = <ChildrenPage />
  else if (path.startsWith('/parent/children/')) page = <ChildProfilePage id={path.split('/')[3]} />
  else if (path === '/parent/progress') page = <ProgressPage />
  else if (path === '/parent/cards') page = <DailyCardsPage />
  else if (path === '/parent/community') page = <CommunityPage />
  else return <Redirect to="/parent" />

  return <ParentLayout path={path}>{page}</ParentLayout>
}

function Child({ path }) {
  const quizMatch = path.match(/^\/child\/quiz\/([\w-]+)$/)
  if (path !== '/child' && !quizMatch) return <Redirect to="/child" />
  return <ChildLayout>{quizMatch ? <QuizRunner quizId={quizMatch[1]} /> : <ChildHome />}</ChildLayout>
}

function Routes() {
  const { path, search } = useLocation()
  const auth = useAuth()
  const area = path.startsWith('/parent') ? 'parent' : path.startsWith('/child') ? 'child' : null
  const allowed = area === 'parent' ? auth.parent : area === 'child' ? auth.child : true

  // Retour en haut à chaque changement de page (sauf ancres internes).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])

  // Page protégée sans session : retour à l'accueil avec la fenêtre de connexion ouverte.
  useEffect(() => {
    if (auth.ready && !allowed) navigate(`/?login=${area === 'parent' ? 'mother' : 'child'}`, { replace: true })
  }, [auth.ready, allowed, area])

  useEffect(() => {
    document.title = area ? `Latino Impact | ${area === 'parent' ? content.parent.account : content.child.spaceTitle}` : 'Latino Impact | أفعال صغيرة، أثر كبير'
  }, [area])

  if (!auth.ready) return null
  if (!allowed) return null
  if (area === 'parent') return <Parent path={path} />
  if (area === 'child') return <Child path={path} />
  return <Landing search={search} />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  )
}
