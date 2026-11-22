/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import Logo from '../../components/Logo'
import { content } from '../../data/content'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Link, navigate } from '../../lib/router'
import { initialOf } from '../../lib/stats'

const ParentDataContext = createContext(null)
export const useParentData = () => useContext(ParentDataContext)

const SEEN_KEY = 'li_cards_seen'
const todayKey = () => new Date().toDateString()

export default function ParentLayout({ path, children }) {
  const { parent: text } = content
  const auth = useAuth()
  const [kids, setKids] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [dailyTip, setDailyTip] = useState(null)
  // Menus ouverts « sur une page » : ils se referment tout seuls quand la page change.
  const [menuAt, setMenuAt] = useState(null)
  const [accountAt, setAccountAt] = useState(null)
  const menuOpen = menuAt === path
  const accountOpen = accountAt === path
  const seen = path === '/parent/cards' || localStorage.getItem(SEEN_KEY) === todayKey()

  const reload = useCallback(async () => {
    try {
      setKids(await api.listChildren())
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    api.getDailyTip().then((tip) => !cancelled && setDailyTip(tip)).catch(() => !cancelled && setDailyTip(null))
    api
      .listChildren()
      .then((data) => {
        if (cancelled) return
        setKids(data)
        setLoadError(false)
      })
      .catch(() => !cancelled && setLoadError(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  // La carte du jour est « lue » dès que la mère ouvre la page des cartes.
  useEffect(() => {
    if (path === '/parent/cards') localStorage.setItem(SEEN_KEY, todayKey())
  }, [path])

  async function logout() {
    await auth.logoutParent()
    navigate('/', { replace: true })
  }

  const name = auth.parent.fullName
  const title = path === '/parent/cards' ? text.cardsTitle : name

  return (
    <ParentDataContext.Provider value={{ kids, loading, loadError, reload, dailyTip }}>
      <div className="shell">
        {menuOpen && <button type="button" className="shell__scrim" aria-label={text.openMenu} onClick={() => setMenuAt(null)} />}

        <aside className={menuOpen ? 'sidebar is-open' : 'sidebar'}>
          <Logo to="/parent" />

          <nav className="sidebar__nav" aria-label="القائمة الرئيسية">
            {text.nav.map((item) => {
              const active = item.path === path || (item.path === '/parent/children' && path.startsWith('/parent/children/'))
              return (
                <Link key={item.path} to={item.path} className={active ? 'sidebar__link is-active' : 'sidebar__link'} aria-current={active ? 'page' : undefined}>
                  <Icon name={item.icon} size={20} />
                  <span>{item.label}</span>
                  {item.badge && !seen && <b className="sidebar__badge">1</b>}
                </Link>
              )
            })}
          </nav>

          <div className="sidebar__foot">
            <div className="sidebar__promo">
              <span className="icon-box icon-box--white icon-box--coral-ink">
                <Icon name="heart" size={22} />
              </span>
              <strong>{text.side.title}</strong>
              <p>{text.side.text}</p>
            </div>
            <Link to="/" className="sidebar__back">
              {text.side.back}
            </Link>
          </div>
        </aside>

        <div className="shell__main">
          <header className="topbar">
            <button type="button" className="topbar__burger" aria-label={text.openMenu} onClick={() => setMenuAt(path)}>
              <Icon name="menu" size={22} />
            </button>

            <div className="topbar__title">
              <small>{text.greeting}</small>
              <strong>{title}</strong>
            </div>

            <div className="topbar__tools">
              <Link to="/parent/cards" className="topbar__bell" aria-label={text.notifications}>
                <Icon name="bell" size={20} />
                {!seen && <i className="dot" />}
              </Link>
              <div className="account">
                <button type="button" className="account__btn" aria-expanded={accountOpen} onClick={() => setAccountAt(accountOpen ? null : path)}>
                  <span className="avatar avatar--navy avatar--sm">{initialOf(name)}</span>
                  <span>{text.account}</span>
                </button>
                {accountOpen && (
                  <div className="account__menu">
                    <button type="button" onClick={logout}>
                      <Icon name="logout" size={18} />
                      {text.logout}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="page">
            {loading ? <p className="page__status">{text.loading}</p> : children}
          </main>
        </div>
      </div>
    </ParentDataContext.Provider>
  )
}
