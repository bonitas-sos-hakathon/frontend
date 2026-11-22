import { useEffect, useState } from 'react'
import Bar from '../../components/Bar'
import Icon from '../../components/Icon'
import { categories as designCategories } from '../../data/quizzes'
import { content } from '../../data/content'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Link } from '../../lib/router'
import { bestByQuiz, categoryProgress, overallProgress } from '../../lib/stats'

function styleForTheme(theme, index) {
  const name = `${theme.name || ''}`.toLowerCase()
  const found = name.includes('social') ? designCategories.find((item) => item.id === 'social')
    : name.includes('hygi') ? designCategories.find((item) => item.id === 'hygiene')
      : name.includes('sex') || name.includes('corps') ? designCategories.find((item) => item.id === 'body')
        : designCategories[index % designCategories.length]
  return { ...found, title: found.title, blurb: theme.description || found.blurb }
}

export default function ChildHome() {
  const { child: text } = content
  const auth = useAuth()
  const { child } = auth
  const [themes, setThemes] = useState(child.themes || [])
  const [loading, setLoading] = useState(!child.themes?.length)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    api.getAvailableQuizzes().then((result) => {
      if (!active) return
      setThemes(result.themes || [])
      setFailed(false)
    }).catch(() => active && setFailed(true)).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const best = bestByQuiz(child)
  const overall = overallProgress({ ...child, quizzes: themes.flatMap((theme) => (theme.quizzes || []).map((quiz) => ({ ...quiz, categoryId: theme.id }))) })

  return (
    <>
      <section className="kidhero">
        <div className="kidhero__text">
          <h1>{text.greeting(child.firstName)}</h1>
          <p>{text.sub}</p>
        </div>
        <div className="kidhero__card">
          <div className="kidhero__row"><strong>{text.overall}</strong><span>{overall}%</span></div>
          <Bar value={overall} label={text.overall} />
          <p className="kidhero__points"><Icon name="star" size={16} fill="currentColor" />{child.points} {text.points}</p>
        </div>
      </section>

      <h2 className="kidtitle">{text.spaceTitle}</h2>
      {loading && <p className="page__status">جاري تحميل الاختبارات...</p>}
      {failed && <p className="form__error">تعذّر تحميل الاختبارات. حاول مجددًا.</p>}
      {!loading && themes.length === 0 && <div className="card empty"><p>لا توجد اختبارات متاحة حاليًا.</p></div>}
      <div className="grid grid--3">
        {themes.map((theme, index) => {
          const design = styleForTheme(theme, index)
          const progress = categoryProgress({ ...child, quizzes: (theme.quizzes || []).map((quiz) => ({ ...quiz, categoryId: theme.id })) }, theme.id)
          return (
            <section key={theme.id} className="card cat">
              <span className={`icon-box icon-box--${design.tone} icon-box--lg`}><Icon name={design.icon} size={28} /></span>
              <h3>{design.title}</h3>
              <p className="cat__blurb">{design.blurb}</p>
              <div className="cat__progress"><Bar value={progress.percent} label={design.title} /><span>{progress.percent}%</span></div>
              <ul className="levels">
                {(theme.quizzes || []).map((quiz, quizIndex) => {
                  const done = quiz.id in best
                  return <li key={quiz.id}>
                    <Link to={`/child/quiz/${quiz.id}`} className="level">
                      <span className={done ? 'level__badge is-done' : 'level__badge'}>{done ? <Icon name="check" size={16} strokeWidth={3} /> : quizIndex + 1}</span>
                      <span className="level__text"><strong>{quiz.title}</strong><small>{done ? text.best(best[quiz.id]) : 'ابدأ الاختبار'}</small></span>
                      <Icon name="arrow" size={18} />
                    </Link>
                  </li>
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}
