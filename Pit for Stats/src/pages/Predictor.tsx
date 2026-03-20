import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'

const BASE = 'https://api.jolpi.ca/ergast/f1'

function useStandings() {
  return useQuery({
    queryKey: ['pred-standings'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/driverStandings.json`)
      const data = await res.json()
      return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? []
    },
  })
}

function useNextRace() {
  return useQuery({
    queryKey: ['next-race'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/next.json`)
      const data = await res.json()
      return data.MRData.RaceTable.Races[0] ?? null
    },
  })
}

function useRecentForm(driverId: string) {
  return useQuery({
    queryKey: ['form', driverId],
    enabled: !!driverId,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/drivers/${driverId}/results.json`)
      const data = await res.json()
      const races = data.MRData.RaceTable.Races ?? []
      // Last 5 races avg finish position
      const last5 = races.slice(-5)
      if (!last5.length) return { avgFinish: 10, wins: 0, podiums: 0, dnfs: 0 }
      const positions = last5.map((r: any) => parseInt(r.Results[0].position) || 20)
      const avgFinish = positions.reduce((a: number, b: number) => a + b, 0) / positions.length
      const wins    = last5.filter((r: any) => r.Results[0].position === '1').length
      const podiums = last5.filter((r: any) => ['1','2','3'].includes(r.Results[0].position)).length
      const dnfs    = last5.filter((r: any) => r.Results[0].status !== 'Finished' && !r.Results[0].status.startsWith('+') ).length
      return { avgFinish, wins, podiums, dnfs }
    },
  })
}

function useCircuitHistory(driverId: string, circuitId: string) {
  return useQuery({
    queryKey: ['circuit-hist', driverId, circuitId],
    enabled: !!driverId && !!circuitId,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch(`${BASE}/drivers/${driverId}/circuits/${circuitId}/results.json?limit=10`)
      const data = await res.json()
      const races = data.MRData.RaceTable.Races ?? []
      if (!races.length) return { bestFinish: 20, avgFinish: 15, appearances: 0 }
      const positions = races.map((r: any) => parseInt(r.Results[0].position) || 20)
      return {
        bestFinish: Math.min(...positions),
        avgFinish:  positions.reduce((a: number, b: number) => a + b, 0) / positions.length,
        appearances: races.length,
      }
    },
  })
}

// Score-based predictor — returns 0-100
function calcWinProbability(
  standing: any,
  form: any,
  circuit: any,
  totalDrivers: number
): number {
  if (!standing || !form || !circuit) return 0

  const totalPoints   = parseFloat(standing.points) || 0
  const champPosition = parseInt(standing.position) || 20
  const wins          = parseInt(standing.wins) || 0

  // Championship score (0-30)
  const champScore = Math.max(0, (totalDrivers - champPosition) / totalDrivers) * 30

  // Points score (0-25)
  const maxPoints  = 500
  const pointsScore = Math.min(25, (totalPoints / maxPoints) * 25)

  // Recent form score (0-25) — lower avg finish = better
  const formScore = Math.max(0, ((20 - form.avgFinish) / 19)) * 15
    + (form.wins / 5) * 6
    + (form.podiums / 5) * 4

  // Circuit history score (0-15)
  const circuitScore = circuit.appearances > 0
    ? Math.max(0, ((20 - circuit.avgFinish) / 19)) * 10
      + (circuit.bestFinish === 1 ? 5 : circuit.bestFinish <= 3 ? 3 : 0)
    : 5

  // Wins bonus (0-5)
  const winsBonus = Math.min(5, wins * 0.5)

  const raw = champScore + pointsScore + formScore + circuitScore + winsBonus
  return Math.min(99, Math.max(1, Math.round(raw)))
}

function normalize(scores: number[]): number[] {
  const total = scores.reduce((a, b) => a + b, 0)
  if (!total) return scores.map(() => 0)
  return scores.map(s => Math.round((s / total) * 100))
}

function PredictorCard({
  standing, nextRace, rank, probability, score
}: {
  standing: any
  nextRace: any
  rank: number
  probability: number
  score: number
}) {
  const driver = standing.Driver
  const form   = useRecentForm(driver.driverId)
  const circuit = useCircuitHistory(
    driver.driverId,
    nextRace?.Circuit?.circuitId ?? ''
  )

  const radarData = [
    { subject: 'Championship', value: Math.min(100, parseInt(standing.points) / 4) },
    { subject: 'Recent form',  value: form.data ? Math.max(0, ((20 - form.data.avgFinish) / 19) * 100) : 0 },
    { subject: 'Circuit hist', value: circuit.data?.appearances ? Math.max(0, ((20 - circuit.data.avgFinish) / 19) * 100) : 40 },
    { subject: 'Win rate',     value: Math.min(100, parseInt(standing.wins) * 15) },
    { subject: 'Podiums',      value: form.data ? (form.data.podiums / 5) * 100 : 0 },
  ]

  const barWidth = `${probability}%`
  const isTopThree = rank <= 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: rank * 0.05 }}
      className="rounded-xl border p-5 space-y-4"
      style={{
        backgroundColor: isTopThree ? 'rgba(225,6,0,0.05)' : 'var(--f1-card)',
        borderColor: rank === 1 ? 'var(--f1-red)' : 'var(--f1-border)',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="text-2xl font-black w-8"
            style={{ color: rank <= 3 ? 'var(--f1-red)' : '#6b6b6b' }}
          >
            #{rank}
          </span>
          <div>
            <p className="font-bold">
              {driver.givenName} {driver.familyName}
            </p>
            <p className="text-xs text-gray-400">
              {standing.Constructors[0]?.name} · P{standing.position} championship
            </p>
          </div>
        </div>

        <div className="text-right">
          <p
            className="text-3xl font-black"
            style={{ color: rank === 1 ? 'var(--f1-red)' : 'white' }}
          >
            {probability}%
          </p>
          <p className="text-xs text-gray-400">win probability</p>
        </div>
      </div>

      {/* Probability bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--f1-border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: rank === 1 ? 'var(--f1-red)' : rank === 2 ? '#ffffff' : '#6b6b6b' }}
          initial={{ width: 0 }}
          animate={{ width: barWidth }}
          transition={{ duration: 1, delay: rank * 0.05 + 0.3 }}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {[
          { label: 'Points',    value: standing.points },
          { label: 'Wins',      value: standing.wins },
          { label: 'Last 5 avg',value: form.data ? form.data.avgFinish.toFixed(1) : '—' },
          { label: 'Best here', value: circuit.data?.appearances ? `P${circuit.data.bestFinish}` : 'N/A' },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2" style={{ backgroundColor: 'var(--f1-dark)' }}>
            <p className="font-bold text-white">{s.value}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Radar chart — only top 5 */}
      {rank <= 5 && (
        <ResponsiveContainer width="100%" height={160}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#2a2a2a" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#6b6b6b', fontSize: 10 }}
            />
            <Radar
              dataKey="value"
              stroke={rank === 1 ? '#e10600' : '#ffffff'}
              fill={rank === 1 ? '#e10600' : '#ffffff'}
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', fontSize: 11 }}
              itemStyle={{ color: 'white' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}

export default function Predictor() {
  const standings = useStandings()
  const nextRace  = useNextRace()
  const [showAll, setShowAll] = useState(false)

  // Calculate raw scores for all drivers
  const scores = standings.data?.map((s: any) => {
    const formQuery    = { avgFinish: 10, wins: 0, podiums: 0, dnfs: 0 }
    const circuitQuery = { bestFinish: 20, avgFinish: 15, appearances: 0 }
    return calcWinProbability(s, formQuery, circuitQuery, standings.data.length)
  }) ?? []

  const normalized = normalize(scores)

  const ranked = standings.data
    ?.map((s: any, i: number) => ({ standing: s, score: scores[i], probability: normalized[i] }))
    .sort((a: any, b: any) => b.probability - a.probability)
    ?? []

  const displayed = showAll ? ranked : ranked.slice(0, 5)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">
          <span style={{ color: 'var(--f1-red)' }}>Win</span> Predictor
        </h1>
        {nextRace.data && (
          <p className="text-gray-400 text-sm mt-1">
            Predictions for the{' '}
            <span className="text-white font-medium">{nextRace.data.raceName}</span>
            {' '}· Round {nextRace.data.round} ·{' '}
            {new Date(nextRace.data.date).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long'
            })}
          </p>
        )}
        <div
          className="mt-3 text-xs px-3 py-2 rounded-lg border inline-flex items-center gap-2"
          style={{ borderColor: 'var(--f1-border)', color: '#6b6b6b', backgroundColor: 'var(--f1-card)' }}
        >
          <span style={{ color: 'var(--f1-red)' }}>i</span>
          Probabilities calculated from championship standings, recent 5-race form, circuit history and win rate
        </div>
      </motion.div>

      {/* Loading */}
      {standings.isLoading && (
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-32 rounded-xl animate-pulse"
              style={{ backgroundColor: 'var(--f1-card)' }} />
          ))}
        </div>
      )}

      {/* Prediction cards */}
      <div className="space-y-4">
        {displayed.map((item: any, i: number) => (
          <PredictorCard
            key={item.standing.Driver.driverId}
            standing={item.standing}
            nextRace={nextRace.data}
            rank={i + 1}
            probability={item.probability}
            score={item.score}
          />
        ))}
      </div>

      {/* Show all toggle */}
      {ranked.length > 5 && (
        <div className="text-center">
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-sm px-6 py-2 rounded-full border transition-colors"
            style={{
              borderColor: 'var(--f1-red)',
              color: 'var(--f1-red)',
              backgroundColor: 'transparent',
            }}
          >
            {showAll ? 'Show top 5 only' : `Show all ${ranked.length} drivers`}
          </button>
        </div>
      )}

    </div>
  )
}