import Bar from '../../components/Bar'
import Icon from '../../components/Icon'
import { content } from '../../data/content'
import { Link } from '../../lib/router'
import { formatNumber, initialOf, overallProgress, toneFor, totals } from '../../lib/stats'
import { useParentData } from './ParentLayout'

export default function ParentHome() {
  const { home: text } = content
  const { kids, dailyTip } = useParentData()
  const sum = totals(kids)
  const card = dailyTip || { title: 'نصيحة اليوم', content: 'لا توجد نصيحة متاحة حاليًا.', category: '', example: '' }

  const stats = [
    { icon: 'users', value: kids.length, label: text.stats.children },
    { icon: 'sparkles', value: formatNumber(sum.points), label: text.stats.points },
    { icon: 'check', value: sum.completed, label: text.stats.levels },
  ]

  return (
    <>
      <header className="page__head">
        <p className="page__eyebrow">{text.eyebrow}</p>
        <h1 className="page__title">{text.title}</h1>
      </header>

      <div className="grid grid--3">
        {stats.map((stat) => (
          <div key={stat.label} className="card metric">
            <Icon name={stat.icon} size={20} />
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="split">
        <section className="card panel">
          <h2 className="panel__title">{text.childrenTitle}</h2>
          {kids.length === 0 ? (
            <div className="empty empty--flat">
              <h3>{text.emptyTitle}</h3>
              <p>{text.emptyText}</p>
              <Link to="/parent/children" className="btn btn--primary">
                {content.children.add}
              </Link>
            </div>
          ) : (
            <ul className="mini-list">
              {kids.map((child, index) => (
                <li key={child.id}>
                  <Link to={`/parent/children/${child.id}`} className="mini">
                    <span className={`avatar avatar--${toneFor(index)} avatar--md`}>{initialOf(child.firstName)}</span>
                    <span className="mini__body">
                      <strong>{child.firstName}</strong>
                      <Bar value={overallProgress(child)} label={child.firstName} />
                    </span>
                    <span className="mini__value">{overallProgress(child)}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card today today--cyan">
          <p className="today__kind">{card.category || text.cardTitle}</p>
          <h2>{card.title}</h2>
          <p>{card.content}</p>
          <Link to="/parent/cards" className="btn btn--white btn--sm">
            {text.cardCta}
          </Link>
        </section>
      </div>
    </>
  )
}
