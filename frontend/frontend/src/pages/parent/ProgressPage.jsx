import { useState } from 'react'
import Icon from '../../components/Icon'
import { content } from '../../data/content'
import { formatDuration, formatNumber, initialOf, overallProgress, toneFor, totals, weeklyActivity } from '../../lib/stats'
import { useParentData } from './ParentLayout'

export function Chart({ days, title, unit }) {
  const max = Math.max(...days.map((day) => day.value), 1)

  return (
    <section className="card chart" aria-label={title}>
      <h2 className="panel__title">{title}</h2>
      <div className="chart__bars" role="img" aria-label={unit}>
        {days.map((day) => (
          <div key={day.key} className="chart__col" title={`${day.value}`}>
            <span className="chart__bar" style={{ blockSize: `${Math.max((day.value / max) * 100, 3)}%` }} />
            <small>{day.label}</small>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function ProgressPage() {
  const { progress: text } = content
  const { kids } = useParentData()
  const [selected, setSelected] = useState('all')
  const scope = selected === 'all' ? kids : kids.filter((child) => child.id === selected)
  const sum = totals(scope)

  const main = [
    { icon: 'check', value: sum.completed, label: text.levels },
    { icon: 'sparkles', value: formatNumber(sum.points), label: text.points },
    { icon: 'clock', value: formatDuration(sum.seconds), label: text.time },
  ]
  const detail = [
    { icon: 'check', value: sum.correct, label: text.correct },
    { icon: 'x', value: sum.wrong, label: text.wrong },
    { icon: 'chart', value: `${sum.accuracy}%`, label: text.accuracy },
  ]

  return (
    <>
      <header className="page__head">
        <p className="page__eyebrow">{text.eyebrow}</p>
        <h1 className="page__title">{text.title}</h1>
      </header>

      {kids.length > 1 && (
        <div className="chips" role="tablist" aria-label={text.title}>
          {[{ id: 'all', firstName: text.all }, ...kids].map((child) => (
            <button
              key={child.id}
              type="button"
              role="tab"
              aria-selected={selected === child.id}
              className={selected === child.id ? 'chip-btn is-active' : 'chip-btn'}
              onClick={() => setSelected(child.id)}
            >
              {child.firstName}
            </button>
          ))}
        </div>
      )}

      {kids.length === 0 || sum.completed === 0 ? (
        <div className="card empty">
          <p>{text.empty}</p>
        </div>
      ) : (
        <>
          <div className="grid grid--3">
            {main.map((stat) => (
              <div key={stat.label} className="card metric">
                <Icon name={stat.icon} size={20} />
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          <Chart days={weeklyActivity(scope)} title={text.chart} unit={text.chartUnit} />

          <div className="grid grid--3">
            {detail.map((stat) => (
              <div key={stat.label} className="card metric">
                <Icon name={stat.icon} size={20} />
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          {selected === 'all' && kids.length > 1 && (
            <section className="card panel">
              <h2 className="panel__title">{text.perChild}</h2>
              <ul className="mini-list">
                {kids.map((child, index) => {
                  const own = totals([child])
                  return (
                    <li key={child.id} className="mini">
                      <span className={`avatar avatar--${toneFor(index)} avatar--md`}>{initialOf(child.firstName)}</span>
                      <span className="mini__body">
                        <strong>{child.firstName}</strong>
                        <small>
                          {own.completed} {text.levels} · {formatNumber(child.points)} {content.children.points}
                        </small>
                      </span>
                      <span className="mini__value">{overallProgress(child)}%</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  )
}
