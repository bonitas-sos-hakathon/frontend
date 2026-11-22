import Icon from '../../components/Icon'
import Logo from '../../components/Logo'
import { content } from '../../data/content'
import { useAuth } from '../../lib/auth'
import { navigate } from '../../lib/router'
import { initialOf } from '../../lib/stats'

export default function ChildLayout({ children }) {
  const { child: text } = content
  const auth = useAuth()
  const { child, viaParent } = auth

  async function leave() {
    if (viaParent) {
      await auth.logoutChild()
      navigate('/parent/children')
    } else {
      await auth.logoutChild()
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="kidshell">
      <header className="kidbar">
        <div className="container kidbar__inner">
          <Logo to="/child" />
          <div className="kidbar__tools">
            <span className="kidbar__points">
              <Icon name="star" size={16} fill="currentColor" />
              {child.points}
            </span>
            <span className="avatar avatar--coral avatar--sm" title={child.firstName}>
              {initialOf(child.firstName)}
            </span>
            <button type="button" className="btn btn--outline btn--sm" onClick={leave}>
              <Icon name="logout" size={16} />
              {viaParent ? text.backToParent : text.logout}
            </button>
          </div>
        </div>
      </header>
      <main className="container kidmain">{children}</main>
    </div>
  )
}
