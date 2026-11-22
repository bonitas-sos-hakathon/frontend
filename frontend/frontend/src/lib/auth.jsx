/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'

const AuthContext = createContext(null)
const SESSION_KEY = 'li_child_session'
const readSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } catch { return null } }

export function AuthProvider({ children }) {
  const [parent, setParent] = useState(null)
  const [child, setChild] = useState(null)
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      try {
        let currentParent = null
        try { currentParent = await api.getParent() } catch { currentParent = null }
        if (cancelled) return
        setParent(currentParent)
        const saved = readSession()
        if (saved?.token) {
          const restored = await api.restoreChild(saved.token)
          if (!cancelled && restored) { setChild(restored); setSession(saved) }
          else sessionStorage.removeItem(SESSION_KEY)
        } else if (saved?.viaParent && currentParent) {
          const restored = await api.getChildAsParent(saved.id)
          if (!cancelled) { setChild(restored); setSession(saved) }
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEY)
      } finally { if (!cancelled) setReady(true) }
    }
    restore()
    return () => { cancelled = true }
  }, [])

  const startChildSession = useCallback((data, nextSession) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    setChild(data)
  }, [])

  const value = useMemo(() => ({
    parent, child, viaParent: Boolean(session?.viaParent), ready,
    async loginParent(cin, password) { setParent(await api.parentLogin(cin, password)) },
    async registerParent(fullName, cin, password) { setParent(await api.parentRegister(fullName, cin, password)) },
    async logoutParent() { await api.parentLogout(); sessionStorage.removeItem(SESSION_KEY); setParent(null); setChild(null); setSession(null) },
    async loginChild(cin, pin, childId) {
      const data = await api.childLogin(cin, pin, childId)
      if (data.requires_child_selection) return data
      startChildSession(data, { token: data.token })
      return data
    },
    async openChildAsParent(data) {
      const sessionData = await api.parentOpenChild(data.id)
      const childData = await api.restoreChild(sessionData.token)
      startChildSession(childData, { viaParent: true, id: data.id, token: sessionData.token })
    },
    async logoutChild() {
      try { await api.childLogout(session?.token) } finally {
        sessionStorage.removeItem(SESSION_KEY); setChild(null); setSession(null)
      }
    },
    async refreshChild() {
      if (!session?.token) return
      const updated = await api.restoreChild(session.token)
      setChild(updated)
    },
  }), [parent, child, session, ready, startChildSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
