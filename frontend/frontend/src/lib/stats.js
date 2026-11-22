import { categories } from '../data/quizzes'

export const POINTS_PER_ANSWER = 10
export const percentOf = (attempt) => attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0

export function levelLabel(percent) {
  if (percent >= 85) return 'متقدّم'
  if (percent >= 60) return 'متوسط'
  return 'مبتدئ'
}

export function bestByQuiz(child) {
  const best = {}
  for (const attempt of child?.attempts || []) {
    if (attempt.status && attempt.status !== 'completed') continue
    const value = percentOf(attempt)
    if (!(attempt.quizId in best) || value > best[attempt.quizId]) best[attempt.quizId] = value
  }
  return best
}

export function categoryProgress(child, categoryId) {
  const best = bestByQuiz(child)

  const list = (child?.quizzes || []).filter(
    (quiz) => quiz.categoryId === categoryId
  )

  const sum = list.reduce(
    (total, quiz) => total + (best[quiz.id] || 0),
    0
  )

  const percent = list.length
    ? Math.round(sum / list.length)
    : 0

  return { percent, label: levelLabel(percent) }
}

export function overallProgress(child) {
  const best = bestByQuiz(child)
  const list = child?.quizzes || []
  const sum = list.reduce((total, quiz) => total + (best[quiz.id] || 0), 0)
  return list.length ? Math.round(sum / list.length) : 0
}

export function totals(children) {
  let completed = 0, points = 0, seconds = 0, correct = 0, questions = 0
  for (const child of children) {
    points += child.points || 0
    for (const attempt of child.attempts || []) {
      if (attempt.status && attempt.status !== 'completed') continue
      completed += 1
      seconds += attempt.seconds || 0
      correct += attempt.score || 0
      questions += attempt.total || 0
    }
  }
  return { completed, points, seconds, correct, wrong: Math.max(0, questions - correct), accuracy: questions ? Math.round((correct / questions) * 100) : 0 }
}

export function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return hours ? `${hours}س ${minutes}د` : `${minutes}د`
}
export const formatNumber = (value) => Number(value || 0).toLocaleString('en-US')
const DAY_LETTERS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
const dayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
export function weeklyActivity(children) {
  const days = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(); date.setDate(date.getDate() - offset)
    days.push({ key: dayKey(date), label: DAY_LETTERS[date.getDay()], value: 0 })
  }
  for (const child of children) for (const attempt of child.attempts || []) {
    if (attempt.status && attempt.status !== 'completed') continue
    const slot = days.find((day) => day.key === dayKey(new Date(attempt.at)))
    if (slot) slot.value += (attempt.score || 0) * POINTS_PER_ANSWER
  }
  return days
}
export const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('ar-TN', { day: 'numeric', month: 'long' }) : ''
export const initialOf = (name) => (name || '?').trim().charAt(0)
export const tones = ['cyan', 'coral', 'navy']
export const toneFor = (index) => tones[index % tones.length]
export { categories }
