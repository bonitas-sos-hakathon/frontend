/* eslint-disable react-refresh/only-export-components */
// Mini routeur History API (sans dépendance supplémentaire).
import { useEffect, useState } from 'react'

export function navigate(to, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, '', to)
  else window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const read = () => ({ path: window.location.pathname.replace(/\/+$/, '') || '/', search: window.location.search })

export function useLocation() {
  const [location, setLocation] = useState(read)

  useEffect(() => {
    const onChange = () => setLocation(read())
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])

  return location
}

export function Link({ to, onClick, children, ...rest }) {
  function handle(event) {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    navigate(to)
  }

  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}
