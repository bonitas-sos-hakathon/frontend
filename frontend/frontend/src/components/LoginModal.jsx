import { useEffect, useRef, useState } from 'react'
import { content } from '../data/content'
import { isDemo } from '../lib/api'
import { useAuth } from '../lib/auth'
import { navigate } from '../lib/router'
import Icon from './Icon'
import Logo from './Logo'

const messageFor = (error) => content.errors[error?.message] || content.errors.generic

// Fenêtre de connexion : espace mère (carte d'identité + mot de passe) ou enfant (identifiant + code).
export default function LoginModal({ mode, onMode, onClose }) {
  const { login: text, errors } = content
  const auth = useAuth()
  const isMother = mode === 'mother'
  const copy = isMother ? text.mother : text.child
  const [register, setRegister] = useState(false)
  const [values, setValues] = useState({ name: '', id: '', secret: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [childChoices, setChildChoices] = useState([])
  const [selectedChild, setSelectedChild] = useState('')
  const [busy, setBusy] = useState(false)
  const firstField = useRef(null)

  useEffect(() => {
    firstField.current?.focus()
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, mode, register])

  function change(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: name === 'secret' && !isMother ? value.replace(/\D/g, '').slice(0, 4) : value }))
    setError('')
  }

  function switchMode(next) {
    setValues({ name: '', id: '', secret: '' })
    setRegister(false)
    setError('')
    setNotice('')
    setChildChoices([])
    setSelectedChild('')
    onMode(next)
  }

  async function submit(event) {
    event.preventDefault()
    const { name, id, secret } = values
    if (!id.trim() || !secret || (register && !name.trim())) return setError(errors.required)
    if (!isMother && !/^\d{4}$/.test(secret)) return setError(errors.invalid_pin)
    if (!isMother && !/^\d{8}$/.test(id.trim())) return setError(errors.required)
    if (isMother && register && secret.length < 8) return setError(errors.short_password)

    setBusy(true)
    try {
      if (!isMother) {
        const result = await auth.loginChild(id, secret, selectedChild || undefined)
        if (result.requires_child_selection) {
          setChildChoices(result.children || [])
          setSelectedChild(result.children?.[0]?.id || '')
          setBusy(false)
          return
        }
        navigate('/child')
      } else {
        if (register) await auth.registerParent(name, id, secret)
        else await auth.loginParent(id, secret)
        navigate('/parent')
      }
    } catch (failure) {
      setError(messageFor(failure))
      setBusy(false)
    }
  }

  const title = register ? text.mother.registerTitle : copy.title
  const sub = register ? text.mother.registerSub : copy.sub

  return (
    <div className="modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <button type="button" className="modal__close" onClick={onClose} aria-label={text.close}>
          <Icon name="x" size={22} />
        </button>

        <div className="modal__brand">
          <Logo onClick={(event) => event.preventDefault()} />
        </div>

        <h2 id="login-title" className="modal__title">
          {title}
        </h2>
        <p className="modal__sub">{sub}</p>

        <form className="form" onSubmit={submit} noValidate>
          {register && (
            <div className="field">
              <label htmlFor="login-name">{text.mother.fullName}</label>
              <div className="field__box">
                <Icon name="user" size={18} />
                <input id="login-name" name="name" ref={firstField} autoComplete="name" placeholder={text.mother.fullNamePlaceholder} value={values.name} onChange={change} />
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="login-id">{isMother ? copy.idLabel : 'CIN du parent'}</label>
            <div className="field__box">
              <Icon name="user" size={18} />
              <input
                id="login-id"
                name="id"
                ref={register ? null : firstField}
                dir="ltr"
                inputMode='numeric'
                autoComplete="username"
                autoCapitalize="characters"
                placeholder={isMother ? copy.idPlaceholder : 'CIN du parent (8 chiffres)'}
                value={values.id}
                onChange={change}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="login-secret">{isMother ? copy.password : copy.pin}</label>
            <div className="field__box">
              <Icon name="lock" size={18} />
              <input
                id="login-secret"
                name="secret"
                dir="ltr"
                type="password"
                inputMode={isMother ? 'text' : 'numeric'}
                autoComplete={isMother ? (register ? 'new-password' : 'current-password') : 'one-time-code'}
                placeholder="••••••••"
                value={values.secret}
                onChange={change}
              />
            </div>
          </div>

          {!isMother && childChoices.length > 0 && (
            <div className="field">
              <label htmlFor="child-choice">Choisir le profil de l'enfant</label>
              <div className="field__box field__box--plain">
                <select id="child-choice" value={selectedChild} onChange={(event) => setSelectedChild(event.target.value)}>
                  {childChoices.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}
                </select>
              </div>
            </div>
          )}

          {error && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="form__notice" role="status">
              {notice}
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {register ? text.mother.registerSubmit : copy.submit}
          </button>
        </form>

        <div className="modal__links">
          {isMother && !register && (
            <button type="button" className="link-btn" onClick={() => setNotice(text.mother.forgotNote)}>
              {text.mother.forgot}
            </button>
          )}
          {isMother && (
            <button type="button" className="link-btn" onClick={() => { setRegister((value) => !value); setError(''); setNotice('') }}>
              {register ? text.mother.toLogin : text.mother.toRegister}
            </button>
          )}
          <button type="button" className="link-btn" onClick={() => switchMode(isMother ? 'child' : 'mother')}>
            {isMother ? text.mother.switchToChild : text.child.switchToMother}
          </button>
        </div>

        {isDemo && <p className="modal__demo">{text.demoHint}</p>}
      </div>
    </div>
  )
}
