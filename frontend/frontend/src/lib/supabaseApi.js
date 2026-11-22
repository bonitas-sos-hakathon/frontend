import { supabase } from './supabaseClient'

const CHILD_TOKEN_KEY = 'li_child_session'
const storedChildToken = () => {
  const value = sessionStorage.getItem(CHILD_TOKEN_KEY)
  if (!value) return null
  try { return JSON.parse(value)?.token || value } catch { return value }
}

function normalizeError(error) {
  const message = error?.message || error?.context?.error || 'generic'
  if (/already|exists|duplicate|CIN existe/i.test(message)) return new Error('exists')
  if (/invalid|identifiants|PIN/i.test(message)) return new Error('invalid_credentials')
  if (/UNAUTHORIZED|session/i.test(message)) return new Error('invalid_credentials')
  return new Error(message)
}

async function invoke(name, body = {}, childToken = null) {
  const options = { body }
  if (childToken) options.headers = { 'x-child-session': childToken }
  const { data, error } = await supabase.functions.invoke(name, options)
  if (error) {
    let payload = null
    try { payload = await error.context?.json?.() } catch { /* réponse non JSON */ }
    throw normalizeError(payload?.error ? { message: payload.error } : error)
  }
  if (data?.error) throw normalizeError({ message: data.error })
  return data
}

const toAttempt = (row) => ({
  id: row.id,
  quizId: row.quiz_id,
  categoryId: row.quizzes?.theme_id || row.quizzes?.themes?.id || row.category_id || null,
  quizTitle: row.quizzes?.title || '',
  categoryTitle: row.quizzes?.themes?.name || '',
  score: Number(row.score || 0),
  total: Number(row.total_questions ?? row.total ?? 0),
  answers: (row.child_answers || []).map((answer) => ({ correct: answer.is_correct, at: answer.answered_at })),
  seconds: Number(row.seconds || 0),
  status: row.status,
  at: row.completed_at || row.started_at || row.created_at,
})

const toChild = (row, attempts = []) => ({
  id: row.id,
  firstName: row.display_name,
  age: row.age ?? null,
  ageGroup: row.age ? String(row.age) : '—',
  code: row.id,
  points: attempts.reduce((sum, attempt) => sum + (attempt.status === 'completed' ? attempt.score * 10 : 0), 0),
  attempts,
})

export const supabaseApi = {
  async getParent() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const result = await invoke('get-parent-dashboard')
    return {
      id: result.parent.id,
      fullName: result.parent.full_name,
      nationalId: result.parent.cin,
      cin: result.parent.cin,
    }
  },

  async parentLogin(cin, password) {
    const result = await invoke('parent-login', { cin: cin.trim(), password })
    if (!result.session?.access_token || !result.session?.refresh_token) throw new Error('invalid_credentials')
    const { error } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    })
    if (error) throw normalizeError(error)
    return { id: result.parent.id, fullName: result.parent.full_name, nationalId: result.parent.cin, cin: result.parent.cin }
  },

  async parentRegister(fullName, cin, password) {
    await invoke('parent-register', { full_name: fullName.trim(), cin: cin.trim(), password })
    return this.parentLogin(cin, password)
  },

  async parentLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw normalizeError(error)
  },

  async listChildren() {
    const result = await invoke('get-parent-dashboard')
    const attemptsByChild = new Map()
    for (const row of result.attempts || []) {
      const list = attemptsByChild.get(row.child_id) || []
      list.push(toAttempt(row))
      attemptsByChild.set(row.child_id, list)
    }
    const quizzes = result.quizzes || []
    return (result.children || []).map((row) => {
      const attempts = attemptsByChild.get(row.id) || []
      const child = toChild(row, attempts)
      child.quizzes = quizzes.map((quiz) => ({ id: quiz.id, categoryId: quiz.theme_id, title: quiz.title, theme: quiz.themes }))
      child.themes = result.themes || []
      return child
    })
  },

  async getChildAsParent(id) {
    const child = (await this.listChildren()).find((item) => item.id === id)
    if (!child) throw new Error('generic')
    return child
  },

  async addChild({ firstName, age, ageGroup, pin }) {
    const parsedAge = Number(age ?? ageGroup)
    const result = await invoke('create-child', {
      display_name: firstName.trim(),
      pin,
      age: Number.isFinite(parsedAge) ? parsedAge : null,
    })
    return toChild(result.child)
  },

  async updateChild({ id, firstName, pin }) {
    const result = await invoke('update-child', { child_id: id, display_name: firstName, ...(pin ? { pin } : {}) })
    return toChild(result.child)
  },

  async deleteChild(id) {
    return invoke('delete-child', { child_id: id })
  },

  async childLogin(cin, pin, childId = null) {
    const result = await invoke('child-login', { cin: cin.trim(), pin, ...(childId ? { child_id: childId } : {}) })
    if (result.requires_child_selection) return result
    if (!result.token || !result.child) throw new Error('invalid_credentials')
    sessionStorage.setItem(CHILD_TOKEN_KEY, result.token)
    const profile = await this.restoreChild(result.token)
    return { ...profile, token: result.token }
  },

  async restoreChild(token = storedChildToken()) {
    if (!token) return null
    const result = await invoke('get-available-quizzes', {}, token)
    const child = result.child
    if (!child) return null
    const attempts = result.attempts || []
    const themes = (result.themes || []).map((theme) => ({ ...theme, quizzes: theme.quizzes || [] }))
    return {
      id: child.id,
      firstName: child.display_name,
      age: child.age,
      code: child.id,
      points: attempts.filter((a) => a.status === 'completed').reduce((sum, a) => sum + Number(a.score || 0) * 10, 0),
      attempts: attempts.map(toAttempt),
      themes,
      quizzes: themes.flatMap((theme) => (theme.quizzes || []).map((quiz) => ({ ...quiz, categoryId: theme.id }))),
      token,
    }
  },

  async parentOpenChild(childId) {
    return invoke('parent-open-child', { child_id: childId })
  },

  async childLogout(token = storedChildToken()) {
    if (token) await invoke('child-logout', {}, token)
    sessionStorage.removeItem(CHILD_TOKEN_KEY)
  },

  async getAvailableQuizzes(token = storedChildToken()) {
    return invoke('get-available-quizzes', {}, token)
  },

  async startQuiz(quizId, token = storedChildToken()) {
    const result = await invoke('start-quiz', { quiz_id: quizId }, token)
    return result.attempt
  },

  async getQuizQuestions(quizId, token = storedChildToken()) {
    return invoke('get-quiz-questions', { quiz_id: quizId }, token)
  },

  async resumeQuiz(attemptId, token = storedChildToken()) {
    return invoke('resume-quiz', { attempt_id: attemptId }, token)
  },

  async saveAnswer(attemptId, questionId, optionId, token = storedChildToken()) {
    return invoke('save-answer', { attempt_id: attemptId, question_id: questionId, selected_option_id: optionId }, token)
  },

  async completeQuiz(attemptId, token = storedChildToken()) {
    return invoke('complete-quiz', { attempt_id: attemptId }, token)
  },

  async getChildHistory(childId) {
    return invoke('get-child-history', { child_id: childId })
  },

  async getChildReport(childId, attemptId) {
    return invoke('get-child-report', { child_id: childId, attempt_id: attemptId })
  },

  async getDailyTip() {
    const result = await invoke('get-daily-parenting-tip')
    return result.tip || null
  },
}
