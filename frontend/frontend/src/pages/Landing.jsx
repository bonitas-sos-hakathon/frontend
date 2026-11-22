import { useCallback, useState } from 'react'
import Bar from '../components/Bar'
import Icon from '../components/Icon'
import LoginModal from '../components/LoginModal'
import Logo from '../components/Logo'
import { content } from '../data/content'
import { useAuth } from '../lib/auth'
import { navigate } from '../lib/router'

function Navbar({ onLogin }) {
  const { nav } = content
  const [open, setOpen] = useState(false)

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Logo />

        <button
          type="button"
          className="nav__burger"
          aria-expanded={open}
          aria-controls="nav-panel"
          aria-label={open ? nav.closeMenu : nav.openMenu}
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? 'x' : 'menu'} size={24} />
        </button>

        <div id="nav-panel" className={open ? 'nav__panel is-open' : 'nav__panel'}>
          <ul className="nav__links">
            {nav.links.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="nav__actions">
            <button type="button" className="btn btn--outline btn--sm" onClick={() => onLogin('mother')}>
              {nav.mother}
            </button>
            <button type="button" className="btn btn--navy btn--sm" onClick={() => onLogin('child')}>
              {nav.child}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

function Hero({ onLogin }) {
  const { hero } = content
  const { mock } = hero
  const tiles = [
    { icon: 'sparkles', label: 'النظافة والصحة' },
    { icon: 'heart', label: 'التربية الاجتماعية' },
    { icon: 'shield', label: 'حماية الجسم' },
  ]

  return (
    <section className="hero">
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="chip">
            <Icon name="heart" size={16} />
            {hero.badge}
          </p>
          <h1 className="hero__title">
            {hero.title1}
            <span>{hero.title2}</span>
          </h1>
          <p className="hero__text">{hero.text}</p>
          <div className="hero__actions">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => onLogin('mother')}>
              {hero.primary}
            </button>
            <a href="#mission" className="btn btn--white btn--lg">
              <Icon name="play" size={16} />
              {hero.secondary}
            </a>
          </div>
        </div>

        <div className="hero__visual" aria-hidden="true">
          <span className="hero__circle" />
          <span className="hero__square" />
          <div className="phone">
            <div className="phone__screen">
              <div className="phone__head">
                <span className="avatar avatar--coral avatar--md">{mock.letter}</span>
                <div className="phone__who">
                  <strong>{mock.greeting}</strong>
                  <small>{mock.sub}</small>
                </div>
                <span className="phone__stars">
                  <Icon name="star" size={15} fill="currentColor" />
                  {mock.stars}
                </span>
              </div>
              <div className="phone__card">
                <span className="icon-box icon-box--soft">
                  <Icon name="shield" size={22} />
                </span>
                <div className="phone__card-text">
                  <strong>{mock.cardTitle}</strong>
                  <small>{mock.cardLevel}</small>
                </div>
                <Bar value={66} label={mock.cardTitle} />
              </div>
              <div className="phone__tiles">
                {tiles.map((tile) => (
                  <span key={tile.label}>
                    <Icon name={tile.icon} size={20} />
                    {tile.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Heading({ eyebrow, title, subtitle }) {
  return (
    <header className="heading">
      {eyebrow && <p className="heading__eyebrow">{eyebrow}</p>}
      <h2 className="heading__title">{title}</h2>
      {subtitle && <p className="heading__sub">{subtitle}</p>}
    </header>
  )
}

function Journey() {
  const { journey } = content

  return (
    <section id="mission" className="section">
      <div className="container">
        <Heading eyebrow={journey.eyebrow} title={journey.title} subtitle={journey.subtitle} />
        <div className="grid grid--3">
          {journey.items.map((item) => (
            <article key={item.title} className="card feature">
              <span className={`icon-box icon-box--${item.tone}`}>
                <Icon name={item.icon} size={24} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function How() {
  const { how } = content

  return (
    <section id="how" className="section section--soft">
      <div className="container">
        <Heading eyebrow={how.eyebrow} title={how.title} subtitle={how.subtitle} />
        <ol className="grid grid--4 steps">
          {how.items.map((item, index) => (
            <li key={item.title} className={item.highlight ? 'card step step--highlight' : 'card step'}>
              <span className="step__num">{index + 1}</span>
              <span className={item.highlight ? 'icon-box icon-box--white' : 'icon-box icon-box--soft'}>
                <Icon name={item.icon} size={22} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Impact() {
  const { impact } = content

  return (
    <section id="impact" className="section">
      <div className="container">
        <Heading eyebrow={impact.eyebrow} title={impact.title} />
        <div className="impact">
          <div className="impact__goal">
            <p className="impact__seeds">{impact.seeds}</p>
            <Bar value={impact.progress} label={impact.progressLabel} tone="inverse" />
            <p className="impact__remain">{impact.seedsRemain}</p>
            <p className="impact__hint">{impact.seedsHint}</p>
          </div>
          <div className="impact__stats">
            {impact.stats.map((stat) => (
              <div key={stat.label} className="card stat">
                <strong className={stat.accent ? 'is-accent' : undefined}>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="note">{impact.badge}</p>
      </div>
    </section>
  )
}

function Faq() {
  const { faq } = content

  return (
    <section id="faq" className="section section--soft">
      <div className="container container--narrow">
        <Heading eyebrow="" title={faq.title} />
        <div className="faq">
          {faq.items.map((item) => (
            <details key={item.q} className="card faq__item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const { footer } = content

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <Logo />
        <p>
          {footer.tagline} {footer.meta}
        </p>
      </div>
    </footer>
  )
}

export default function Landing({ search }) {
  const auth = useAuth()
  // ?login=mother|child ouvre la fenêtre (redirection depuis une page protégée).
  const [mode, setMode] = useState(() => {
    const wanted = new URLSearchParams(search).get('login')
    return wanted === 'mother' || wanted === 'child' ? wanted : null
  })
  const close = useCallback(() => setMode(null), [])

  function openLogin(next) {
    if (next === 'mother' && auth.parent) return navigate('/parent')
    if (next === 'child' && auth.child) return navigate('/child')
    setMode(next)
  }

  return (
    <>
      <Navbar onLogin={openLogin} />
      <main>
        <Hero onLogin={openLogin} />
        <Journey />
        <How />
        <Impact />
        <Faq />
      </main>
      <Footer />
      {mode && <LoginModal mode={mode} onMode={setMode} onClose={close} />}
    </>
  )
}
