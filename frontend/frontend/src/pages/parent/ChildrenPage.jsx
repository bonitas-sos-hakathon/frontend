import { useCallback, useEffect, useRef, useState } from 'react'
import Bar from '../../components/Bar'
import Icon from '../../components/Icon'
import { categories as designCategories } from '../../data/quizzes'
import { content } from '../../data/content'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Link, navigate } from '../../lib/router'
import { categoryProgress, initialOf, overallProgress, toneFor } from '../../lib/stats'
import { useParentData } from './ParentLayout'

export function CategoryTiles({ child }) {
  return (
    <div className="tiles">
      {(child.themes?.length ? child.themes : designCategories.map((item) => ({ ...item, id: item.id }))).map((theme, index) => {
        const name = `${theme.name || theme.title || ''}`.toLowerCase()
        const design = name.includes('social') ? designCategories.find((item) => item.id === 'social') : name.includes('hygi') ? designCategories.find((item) => item.id === 'hygiene') : name.includes('sex') || name.includes('corps') ? designCategories.find((item) => item.id === 'body') : designCategories[index % designCategories.length]
        const progress = categoryProgress(child, theme.id)
        return <div key={theme.id} className="tile"><Icon name={design.icon} size={20} /><div className="tile__text"><strong>{design.title}</strong><small>{progress.label}</small></div><span className="tile__value">{progress.percent}%</span></div>
      })}
    </div>
  )
}

function AddChildModal({ onClose, onCreated }) {
  const { children: text, errors } = content
  const form = text.form
  const [values, setValues] = useState({ name: '', age: form.ages[0].value, pin: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)
  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function change(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: name === 'pin' ? value.replace(/\D/g, '').slice(0, 4) : value }))
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (!values.name.trim()) return setError(errors.required)
    if (!/^\d{4}$/.test(values.pin)) return setError(errors.invalid_pin)
    setBusy(true)
    try {
      const child = await api.addChild({ firstName: values.name, age: Number(values.age), pin: values.pin })
      setCreated(child)
      onCreated()
    } catch (failure) {
      setError(errors[failure.message] || errors.generic)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal__panel" role="dialog" aria-modal="true" aria-labelledby="add-child-title">
        <button type="button" className="modal__close" onClick={onClose} aria-label={content.login.close}>
          <Icon name="x" size={22} />
        </button>

        {created ? (
          <div className="done">
            <span className="icon-box icon-box--cyan">
              <Icon name="check" size={24} />
            </span>
            <h2 id="add-child-title" className="modal__title">
              {form.doneTitle}
            </h2>
            <p className="modal__sub">{`تم إنشاء ملف ${created.firstName} بنجاح.`}</p>
            <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
              {form.done}
            </button>
          </div>
        ) : (
          <>
            <h2 id="add-child-title" className="modal__title">
              {form.title}
            </h2>
            <form className="form" onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="child-name">{form.name}</label>
                <div className="field__box">
                  <Icon name="user" size={18} />
                  <input id="child-name" name="name" ref={nameRef} placeholder={form.namePlaceholder} value={values.name} onChange={change} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="child-age">{form.age}</label>
                <div className="field__box field__box--plain">
                  <select id="child-age" name="age" value={values.age} onChange={change}>
                    {form.ages.map((age) => (
                      <option key={age.value} value={age.value}>
                        {age.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="child-pin">{form.pin}</label>
                <div className="field__box">
                  <Icon name="lock" size={18} />
                  <input id="child-pin" name="pin" dir="ltr" inputMode="numeric" autoComplete="off" placeholder="••••" value={values.pin} onChange={change} />
                </div>
                <small className="field__hint">{form.pinHint}</small>
              </div>
              {error && (
                <p className="form__error" role="alert">
                  {error}
                </p>
              )}
              <div className="form__row">
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {form.submit}
                </button>
                <button type="button" className="btn btn--outline" onClick={onClose}>
                  {form.cancel}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export function ChildHeader({ child, index }) {
  const { children: text } = content
  const overall = overallProgress(child)

  return (
    <div className="kid__top">
      <span className={`avatar avatar--${toneFor(index)} avatar--xl`}>{initialOf(child.firstName)}</span>
      <div className="kid__info">
        <div className="kid__name">
          <h2>{child.firstName}</h2>
          <span className="pill">{text.age(child.ageGroup)}</span>
        </div>
        <Bar value={overall} label={text.overall} />
      </div>
      <div className="kid__stats">
        <div>
          <strong>{overall}%</strong>
          <small>{text.overall}</small>
        </div>
        <div>
          <strong className="is-accent">{child.points}</strong>
          <small>{text.points}</small>
        </div>
      </div>
    </div>
  )
}

export default function ChildrenPage() {
  const { children: text } = content
  const auth = useAuth()
  const { kids, loadError, reload } = useParentData()
  const [adding, setAdding] = useState(false)
  const closeAdd = useCallback(() => setAdding(false), [])

  async function openSpace(child) {
    try { await auth.openChildAsParent(child); navigate('/child') } catch { window.alert(content.errors.generic) }
  }

  return (
    <>
      <header className="page__head page__head--row">
        <div>
          <p className="page__eyebrow">{text.eyebrow}</p>
          <h1 className="page__title">{text.title}</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} />
          {text.add}
        </button>
      </header>

      {loadError && <p className="form__error">{content.errors.generic}</p>}

      {kids.length === 0 && !loadError ? (
        <div className="card empty">
          <h2>{text.emptyTitle}</h2>
          <p>{text.emptyText}</p>
        </div>
      ) : (
        <div className="stack">
          {kids.map((child, index) => (
            <article key={child.id} className="card kid">
              <ChildHeader child={child} index={index} />
              <hr className="kid__rule" />
              <CategoryTiles child={child} />
              <div className="kid__actions">
                <button type="button" className="btn btn--navy" onClick={() => openSpace(child)}>
                  <Icon name="play" size={16} />
                  {text.open(child.firstName)}
                </button>
                <Link to={`/parent/children/${child.id}`} className="btn btn--outline">
                  {text.profile}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {adding && <AddChildModal onClose={closeAdd} onCreated={reload} />}
    </>
  )
}
