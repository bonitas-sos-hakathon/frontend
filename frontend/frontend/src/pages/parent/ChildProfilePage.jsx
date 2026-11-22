import Icon from '../../components/Icon'
import { useEffect, useState } from 'react'
import { content } from '../../data/content'
import { api } from '../../lib/api'
import { Link } from '../../lib/router'
import { formatDate, overallProgress, percentOf, totals } from '../../lib/stats'
import { CategoryTiles, ChildHeader } from './ChildrenPage'
import { useParentData } from './ParentLayout'

// Les erreurs détaillées sont chargées depuis le rapport sécurisé, visible uniquement par le parent.
export default function ChildProfilePage({ id }) {
  const { profile: text } = content
  const { kids } = useParentData()
  const [mistakes, setMistakes] = useState([])
  useEffect(() => {
    let active = true
    if (!id) return undefined
    const completed = (kids.find((item) => item.id === id)?.attempts || []).filter((item) => item.status === 'completed').slice(0, 5)
    Promise.all(completed.map((attempt) => api.getChildReport(id, attempt.id).catch(() => null))).then((reports) => {
      if (!active) return
      const seen = new Set()
      const list = []
      for (const report of reports) for (const question of report?.questions || []) {
        if (question.is_correct === false && !seen.has(question.question_id)) {
          seen.add(question.question_id)
          list.push({ id: question.question_id, prompt: question.question_text, right: question.correct_answer })
        }
      }
      setMistakes(list.slice(0, 5))
    })
    return () => { active = false }
  }, [id, kids])
  const index = kids.findIndex((child) => child.id === id)
  const child = kids[index]

  if (!child) {
    return (
      <div className="card empty">
        <p>{text.notFound}</p>
        <Link to="/parent/children" className="btn btn--outline">
          {text.back}
        </Link>
      </div>
    )
  }

  const sum = totals([child])
  const history = [...child.attempts].sort((a, b) => new Date(b.at) - new Date(a.at))
  const stats = [
    { value: sum.completed, label: text.levels },
    { value: child.points, label: text.points },
    { value: `${overallProgress(child)}%`, label: text.overall },
    { value: `${sum.accuracy}%`, label: text.accuracy },
  ]

  return (
    <>
      <Link to="/parent/children" className="back">
        <Icon name="arrow" size={18} className="flip" />
        {text.back}
      </Link>

      <article className="card kid">
        <ChildHeader child={child} index={index} />
      </article>

      <div className="grid grid--4">
        {stats.map((stat) => (
          <div key={stat.label} className="card metric">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <section className="card panel">
        <h2 className="panel__title">{text.categories}</h2>
        <CategoryTiles child={child} />
      </section>

      <section className="card panel">
        <h2 className="panel__title">{text.history}</h2>
        {history.length === 0 ? (
          <p className="muted">{text.noHistory}</p>
        ) : (
          <ul className="history">
            {history.map((attempt) => {
              return (
                <li key={attempt.id} className="history__row">
                  <span className="history__title">
                    <strong>{attempt.quizTitle || 'Quiz'}</strong>
                    <small>{attempt.categoryTitle || ''} · {formatDate(attempt.at)} · {attempt.status === 'in_progress' ? 'قيد الإنجاز' : 'مكتمل'}</small>
                  </span>
                  {attempt.status === 'completed' && <span className="history__counts"><b className="ok">{attempt.score} {text.correct}</b><b className="bad">{attempt.total - attempt.score} {text.wrong}</b></span>}
                  <span className="history__score">{attempt.status === 'completed' ? `${percentOf(attempt)}%` : '—'}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {mistakes.length > 0 && (
        <section className="card panel">
          <h2 className="panel__title">{text.review}</h2>
          <p className="muted">{text.reviewHint}</p>
          <ul className="review">
            {mistakes.map((item) => (
              <li key={item.id}>
                <strong>{item.prompt}</strong>
                <span>
                  {text.rightAnswer} {item.right}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
