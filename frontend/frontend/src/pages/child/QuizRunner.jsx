import { useEffect, useRef, useState } from 'react'
import Bar from '../../components/Bar'
import Icon from '../../components/Icon'
import { categories as designCategories } from '../../data/quizzes'
import { content } from '../../data/content'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Link, navigate } from '../../lib/router'
import { POINTS_PER_ANSWER } from '../../lib/stats'

function themeStyle(theme) {
  const name = `${theme?.name || ''}`.toLowerCase()
  return name.includes('social') ? designCategories.find((x) => x.id === 'social')
    : name.includes('hygi') ? designCategories.find((x) => x.id === 'hygiene')
      : designCategories.find((x) => x.id === 'body')
}

export default function QuizRunner({ quizId }) {
  const { quiz: text } = content
  const auth = useAuth()
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [attempt, setAttempt] = useState(null)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const headingRef = useRef(null)

  useEffect(() => {
    let active = true
    async function initialize() {
      try {
        const started = await api.startQuiz(quizId)
        const data = await api.getQuizQuestions(quizId)
        const resumed = await api.resumeQuiz(started.id)
        if (!active) return
        setAttempt(started)
        setQuiz(data.quiz)
        setQuestions(resumed.unanswered_questions || [])
        setStep(resumed.progress?.answered || 0)
        if (!resumed.unanswered_questions?.length) {
          const completed = await api.completeQuiz(started.id)
          if (active) { setResult(completed); await auth.refreshChild() }
        }
      } catch (failure) {
        if (active) setError(failure.message || 'تعذّر تحميل الاختبار.')
      } finally { if (active) setLoading(false) }
    }
    initialize()
    return () => { active = false }
  }, [quizId])

  const total = questions.length + step
  const question = questions[0] || null
  const finished = Boolean(result)
  const theme = auth.child.themes?.find((item) => item.id === quiz?.theme_id)
  const category = themeStyle(theme)

  useEffect(() => { headingRef.current?.focus({ preventScroll: true }) }, [step, finished])

  async function choose(optionId) {
  if (picked || saving || !question || !attempt) return

  setSaving(true)
  setError('')

  try {
    const result = await api.saveAnswer(
      attempt.id,
      question.id,
      optionId
    )

    setPicked(optionId)
    setIsCorrect(result.is_correct)

  } catch (failure) {
    setError(failure.message || 'تعذّر حفظ الإجابة. حاول مجددًا.')
  } finally {
    setSaving(false)
  }
}

  async function next() {
    if (!picked) return
    if (questions.length > 1) {
      setQuestions((current) => current.slice(1))
      setStep((current) => current + 1)
      setPicked(null)
      setIsCorrect(null)
      return
    }
    setSaving(true)
    try {
      const completed = await api.completeQuiz(attempt.id)
      setResult(completed)
      await auth.refreshChild()
    } catch (failure) {
      setError(failure.message || 'تعذّر terminer le quiz.')
    } finally { setSaving(false) }
  }

  if (loading) return <p className="page__status">جاري تحميل الاختبار...</p>
  if (error && !question && !result) return <section className="card empty"><p className="form__error">{error}</p><Link to="/child" className="btn btn--primary">{text.back}</Link></section>

  if (finished) {
    const score = Number(result.score || 0)
    const finalTotal = Number(result.total || total)
    const stars = score === finalTotal ? 3 : score >= finalTotal / 2 ? 2 : 1
    return <section className="card result">
      <p className="result__label">{text.result}</p>
      <div className="result__stars" aria-hidden="true">{[1, 2, 3].map((n) => <Icon key={n} name="star" size={44} fill={n <= stars ? 'currentColor' : 'none'} className={n <= stars ? 'is-on' : undefined} />)}</div>
      <h1 className="result__score" tabIndex={-1} ref={headingRef}>{score} / {finalTotal}</h1>
      <p className="result__points">{text.pointsEarned(score * POINTS_PER_ANSWER)}</p>
      <p className="result__msg">{score === finalTotal ? text.encouragement.perfect : score >= finalTotal * 0.75 ? text.encouragement.good : score >= finalTotal / 2 ? text.encouragement.ok : text.encouragement.low}</p>
      <div className="result__actions"><Link to="/child" className="btn btn--primary">{text.back}</Link></div>
    </section>
  }

  return <section className="quiz">
    <div className="quiz__top"><Link to="/child" className="back"><Icon name="x" size={18} />{text.exit}</Link><span className="quiz__count">{text.progress(step + 1, total)}</span></div>
    <Bar value={(step / total) * 100} label={text.progress(step + 1, total)} />
    {question && <div className="card quiz__card" key={question.id}>
      <p className="quiz__cat">{category?.title || theme?.name || ''} · {quiz?.title}</p>
      <h1 className="quiz__prompt" tabIndex={-1} ref={headingRef}>{question.question_text}</h1>
      <div className="options" role="group" aria-label={question.question_text}>
      {(question.question_options || []).map((option, index) => {
  const isSelected = picked === option.id

  const answerClass = isSelected
    ? isCorrect
      ? 'is-right'
      : 'is-wrong'
    : ''

  return (
    <button
      key={option.id}
      type="button"
      className={`option ${answerClass}`}
      onClick={() => choose(option.id)}
      disabled={Boolean(picked) || saving}
      aria-pressed={isSelected}
    >
      <span className="option__letter">
        {'أبجدهوز'[index] || index + 1}
      </span>

      <span className="option__text">
        {option.option_text}
      </span>

      {isSelected && (
        <Icon
          name={isCorrect ? 'check' : 'x'}
          size={22}
          strokeWidth={3}
        />
      )}
    </button>
  )
})}
      </div>
      {error && <p className="form__error" role="alert">{error}</p>}
      {picked && <div className="feedback" role="status"><p className="feedback__title">تم حفظ إجابتك بنجاح</p><button type="button" className="btn btn--primary" onClick={next} disabled={saving}>{saving ? '...' : step + 1 === total ? text.finish : text.next}</button></div>}
      {saving && !picked && <p className="muted">جاري حفظ الإجابة...</p>}
    </div>}
  </section>
}
