import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CATEGORIES = [
  { id: 'history',      label: 'F1 History',       emoji: '📚' },
  { id: 'drivers',      label: 'Drivers',           emoji: '🧑‍✈️' },
  { id: 'constructors', label: 'Constructors',      emoji: '🏭' },
  { id: 'circuits',     label: 'Circuits',          emoji: '🗺️' },
  { id: 'records',      label: 'Records',           emoji: '🏆' },
  { id: '2026',         label: '2026 Season',       emoji: '📅' },
]

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

interface Question {
  question: string
  options: string[]
  correct: number
  explanation: string
}

async function generateQuestions(
  category: string,
  difficulty: string,
  count: number
): Promise<Question[]> {
  const prompt = `Generate ${count} multiple choice F1 trivia questions about "${category}" at "${difficulty}" difficulty.

Return ONLY a valid JSON array with no extra text, in this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of why the answer is correct."
  }
]

Rules:
- correct is the index (0-3) of the correct answer in options
- Make questions accurate and specific to Formula 1
- Explanations should be 1-2 sentences
- Easy: well known facts, Hard: obscure details
- Do not repeat questions`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text ?? '[]'

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return []
  }
}

function OptionButton({
  label, text, onClick, state
}: {
  label: string
  text: string
  onClick: () => void
  state: 'default' | 'correct' | 'wrong' | 'disabled'
}) {
  const colors = {
    default:  { border: 'var(--f1-border)', bg: 'var(--f1-card)',         label: '#6b6b6b' },
    correct:  { border: '#22c55e',          bg: 'rgba(34,197,94,0.1)',    label: '#22c55e' },
    wrong:    { border: '#e10600',          bg: 'rgba(225,6,0,0.1)',      label: '#e10600' },
    disabled: { border: 'var(--f1-border)', bg: 'var(--f1-card)',         label: '#3a3a3a' },
  }
  const c = colors[state]

  return (
    <motion.button
      className="w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-colors"
      style={{ borderColor: c.border, backgroundColor: c.bg, cursor: state === 'disabled' ? 'default' : 'pointer' }}
      whileHover={state === 'default' ? { scale: 1.01, borderColor: 'var(--f1-red)' } : {}}
      onClick={state === 'default' ? onClick : undefined}
    >
      <span
        className="w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black flex-shrink-0"
        style={{ borderColor: c.label, color: c.label }}
      >
        {label}
      </span>
      <span className="text-sm" style={{ color: state === 'disabled' ? '#3a3a3a' : 'white' }}>
        {text}
      </span>
    </motion.button>
  )
}

export default function Trivia() {
  const [category,   setCategory]   = useState('history')
  const [difficulty, setDifficulty] = useState('Medium')
  const [questions,  setQuestions]  = useState<Question[]>([])
  const [current,    setCurrent]    = useState(0)
  const [selected,   setSelected]   = useState<number | null>(null)
  const [score,      setScore]      = useState(0)
  const [finished,   setFinished]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [showExpl,   setShowExpl]   = useState(false)

  const q = questions[current]

  async function startQuiz() {
    setLoading(true)
    setError(null)
    setScore(0)
    setCurrent(0)
    setSelected(null)
    setFinished(false)
    setShowExpl(false)

    try {
      const qs = await generateQuestions(
        CATEGORIES.find(c => c.id === category)?.label ?? category,
        difficulty,
        5
      )
      if (!qs.length) throw new Error('No questions returned')
      setQuestions(qs)
    } catch (e) {
      setError('Failed to generate questions. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleAnswer(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    setShowExpl(true)
    if (idx === q.correct) setScore(s => s + 1)
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setShowExpl(false)
    }
  }

  function getOptionState(idx: number): 'default' | 'correct' | 'wrong' | 'disabled' {
    if (selected === null) return 'default'
    if (idx === q.correct)  return 'correct'
    if (idx === selected)   return 'wrong'
    return 'disabled'
  }

  const scorePercent = Math.round((score / questions.length) * 100)
  const scoreColor   = scorePercent >= 80 ? '#22c55e' : scorePercent >= 50 ? '#f59e0b' : '#e10600'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">
          <span style={{ color: 'var(--f1-red)' }}>F1</span> Trivia
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          AI-generated questions · powered by Claude
        </p>
      </motion.div>

      {/* Setup screen */}
      {!questions.length && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Category */}
          <div className="rounded-xl border p-5 space-y-3"
            style={{ backgroundColor: 'var(--f1-card)', borderColor: 'var(--f1-border)' }}>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Category</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors"
                  style={{
                    borderColor: category === c.id ? 'var(--f1-red)' : 'var(--f1-border)',
                    backgroundColor: category === c.id ? 'rgba(225,6,0,0.1)' : 'var(--f1-dark)',
                    color: category === c.id ? 'white' : '#6b6b6b',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="rounded-xl border p-5 space-y-3"
            style={{ backgroundColor: 'var(--f1-card)', borderColor: 'var(--f1-border)' }}>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Difficulty</p>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className="flex-1 py-2 rounded-lg border text-sm font-medium transition-colors"
                  style={{
                    borderColor: difficulty === d ? 'var(--f1-red)' : 'var(--f1-border)',
                    backgroundColor: difficulty === d ? 'var(--f1-red)' : 'var(--f1-dark)',
                    color: 'white',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: 'var(--f1-red)' }}>{error}</p>
          )}

          <motion.button
            onClick={startQuiz}
            className="w-full py-4 rounded-xl font-bold text-lg tracking-wide"
            style={{ backgroundColor: 'var(--f1-red)', color: 'white' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Start Quiz
          </motion.button>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 gap-4"
        >
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--f1-red)', borderTopColor: 'transparent' }}
          />
          <p className="text-gray-400 text-sm">Claude is generating your questions...</p>
        </motion.div>
      )}

      {/* Quiz */}
      {questions.length > 0 && !finished && q && (
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Progress */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Question {current + 1} of {questions.length}
              </span>
              <span style={{ color: 'var(--f1-red)' }} className="font-bold">
                {score} / {current + (selected !== null ? 1 : 0)} correct
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--f1-border)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: 'var(--f1-red)' }}
                animate={{ width: `${((current + (selected !== null ? 1 : 0)) / questions.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Question */}
            <div className="rounded-xl border p-5"
              style={{ backgroundColor: 'var(--f1-card)', borderColor: 'var(--f1-border)' }}>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
                {CATEGORIES.find(c => c.id === category)?.emoji}{' '}
                {CATEGORIES.find(c => c.id === category)?.label} · {difficulty}
              </p>
              <p className="text-lg font-semibold leading-snug">{q.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {q.options.map((opt, idx) => (
                <OptionButton
                  key={idx}
                  label={['A','B','C','D'][idx]}
                  text={opt}
                  state={getOptionState(idx)}
                  onClick={() => handleAnswer(idx)}
                />
              ))}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showExpl && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border p-4 overflow-hidden"
                  style={{
                    borderColor: selected === q.correct ? '#22c55e' : '#e10600',
                    backgroundColor: selected === q.correct
                      ? 'rgba(34,197,94,0.05)'
                      : 'rgba(225,6,0,0.05)',
                  }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-1"
                    style={{ color: selected === q.correct ? '#22c55e' : '#e10600' }}
                  >
                    {selected === q.correct ? 'Correct!' : 'Wrong!'}
                  </p>
                  <p className="text-sm text-gray-300">{q.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next button */}
            {selected !== null && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleNext}
                className="w-full py-3 rounded-xl font-bold"
                style={{ backgroundColor: 'var(--f1-red)', color: 'white' }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {current + 1 >= questions.length ? 'See Results' : 'Next Question →'}
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Results */}
      {finished && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6 text-center"
        >
          <div className="rounded-xl border p-8 space-y-4"
            style={{ backgroundColor: 'var(--f1-card)', borderColor: 'var(--f1-border)' }}>
            <p className="text-6xl">
              {scorePercent >= 80 ? '🏆' : scorePercent >= 50 ? '🥈' : '💀'}
            </p>
            <div>
              <p
                className="text-5xl font-black"
                style={{ color: scoreColor }}
              >
                {score}/{questions.length}
              </p>
              <p className="text-gray-400 mt-1">
                {scorePercent >= 80
                  ? 'You\'re an F1 legend!'
                  : scorePercent >= 50
                  ? 'Not bad, keep studying!'
                  : 'Back to the garage with you!'}
              </p>
            </div>

            {/* Score bar */}
            <div className="h-3 rounded-full overflow-hidden mx-8"
              style={{ backgroundColor: 'var(--f1-border)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: scoreColor }}
                initial={{ width: 0 }}
                animate={{ width: `${scorePercent}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={startQuiz}
              className="flex-1 py-3 rounded-xl font-bold border transition-colors"
              style={{ borderColor: 'var(--f1-red)', color: 'var(--f1-red)' }}
            >
              Same settings
            </button>
            <button
              onClick={() => { setQuestions([]); setFinished(false) }}
              className="flex-1 py-3 rounded-xl font-bold"
              style={{ backgroundColor: 'var(--f1-red)', color: 'white' }}
            >
              New quiz
            </button>
          </div>
        </motion.div>
      )}

    </div>
  )
}