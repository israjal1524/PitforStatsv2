import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

const BASE = 'https://api.jolpi.ca/ergast/f1'

const card = "rounded-xl border p-5"
const cardStyle = { backgroundColor: 'var(--f1-card)', borderColor: 'var(--f1-border)' }

function useLastRaceResult() {
  return useQuery({
    queryKey: ['last-race-result'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/last/results.json`)
      const data = await res.json()
      return data.MRData.RaceTable.Races[0]
    },
  })
}

function useRaceResult(round: string | undefined) {
  return useQuery({
    queryKey: ['race-result-by-round', round],
    enabled: !!round,
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/${round}/results.json`)
      const data = await res.json()
      return data.MRData.RaceTable.Races[0]
    },
  })
}

function usePitStops(round: string | undefined) {
  return useQuery({
    queryKey: ['pitstops', round],
    enabled: !!round,
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/${round}/pitstops.json?limit=100`)
      const data = await res.json()
      return data.MRData.RaceTable.Races[0]?.PitStops ?? []
    },
  })
}

function useLapTimes(round: string | undefined) {
  return useQuery({
    queryKey: ['laps', round],
    enabled: !!round,
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/${round}/laps.json?limit=100`)
      const data = await res.json()
      return data.MRData.RaceTable.Races[0]?.Laps ?? []
    },
  })
}

function usePrevRaceResult(round: string | undefined) {
  return useQuery({
    queryKey: ['prev-race', round],
    enabled: !!round && parseInt(round) > 1,
    queryFn: async () => {
      const prevRound = String(parseInt(round!) - 1)
      const res = await fetch(`${BASE}/2026/${prevRound}/results.json`)
      const data = await res.json()
      return data.MRData.RaceTable.Races[0]
    },
  })
}

const COLORS = [
  '#e10600', '#ffffff', '#3671C6', '#FF8000', '#27F4D2',
  '#E8002D', '#52E252', '#B6BABD', '#64C4FF', '#229971'
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg border p-3 text-xs space-y-1"
      style={{ backgroundColor: '#1a1a1a', borderColor: 'var(--f1-border)' }}
    >
      <p className="text-gray-400 mb-1">Lap {label}</p>
      {payload.slice(0, 5).map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="text-white font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function RaceAnalysis() {
  const [selectedRound, setSelectedRound] = useState<string | null>(null)

  const lastRace = useLastRaceResult()
  const lastRound = lastRace.data?.round
  const activeRound = selectedRound ?? lastRound

  const activeRace = useRaceResult(activeRound)
  const pitStops   = usePitStops(activeRound)
  const laps       = useLapTimes(activeRound)
  const prevRace   = usePrevRaceResult(activeRound)

  const displayRace = selectedRound ? activeRace.data : lastRace.data

  // Top 5 for lap chart
  const top5 = displayRace?.Results?.slice(0, 5) ?? []
  const lapChartData = laps.data?.map((lap: any) => {
    const entry: any = { lap: parseInt(lap.number) }
    top5.forEach((r: any) => {
      const timing = lap.Timings?.find((t: any) => t.driverId === r.Driver.driverId)
      if (timing) entry[r.Driver.code ?? r.Driver.familyName] = timing.time
    })
    return entry
  }) ?? []

  const pitData = [...(pitStops.data ?? [])].sort(
    (a: any, b: any) => parseFloat(a.duration) - parseFloat(b.duration)
  )

  const activeTop3 = displayRace?.Results?.slice(0, 3) ?? []
  const prevTop3   = prevRace.data?.Results?.slice(0, 3) ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">
          <span style={{ color: 'var(--f1-red)' }}>Race</span> Analysis
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {displayRace
            ? `${displayRace.raceName} · Round ${displayRace.round}`
            : 'Loading race data...'}
        </p>
        {selectedRound && (
          <button
            className="mt-2 text-xs px-3 py-1 rounded border transition-colors"
            style={{ borderColor: 'var(--f1-red)', color: 'var(--f1-red)' }}
            onClick={() => setSelectedRound(null)}
          >
            ← Back to latest race
          </button>
        )}
      </motion.div>

      {/* Current race vs prev race comparison */}
      {displayRace && prevRace.data && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Active race */}
          <div className={card} style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: 'var(--f1-red)', color: 'white' }}
              >
                {selectedRound ? 'SELECTED' : 'LATEST'}
              </span>
              <p className="text-sm font-semibold">{displayRace.raceName}</p>
            </div>
            <div className="space-y-3">
              {activeTop3.map((r: any, i: number) => (
                <div key={r.Driver.driverId} className="flex items-center gap-3">
                  <span
                    className="text-lg font-black w-6"
                    style={{ color: i === 0 ? 'var(--f1-red)' : 'white' }}
                  >
                    P{r.position}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {r.Driver.givenName} {r.Driver.familyName}
                    </p>
                    <p className="text-xs text-gray-400">{r.Constructor.name}</p>
                  </div>
                  <p className="text-xs text-gray-400">{r.Time?.time ?? r.status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Prev race — clickable */}
          <motion.div
            className={card}
            style={{
              ...cardStyle,
              cursor: 'pointer',
              borderColor: selectedRound === prevRace.data?.round
                ? 'var(--f1-red)'
                : 'var(--f1-border)',
            }}
            whileHover={{ borderColor: 'var(--f1-red)', scale: 1.01 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              if (prevRace.data?.round) {
                setSelectedRound(prev =>
                  prev === prevRace.data.round ? null : prevRace.data.round
                )
              }
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: 'var(--f1-border)', color: 'white' }}
              >
                PREV
              </span>
              <p className="text-sm font-semibold">{prevRace.data.raceName}</p>
              <span className="ml-auto text-xs text-gray-500">click to analyse</span>
            </div>
            <div className="space-y-3">
              {prevTop3.map((r: any, i: number) => (
                <div key={r.Driver.driverId} className="flex items-center gap-3">
                  <span
                    className="text-lg font-black w-6"
                    style={{ color: i === 0 ? 'var(--f1-red)' : 'white' }}
                  >
                    P{r.position}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {r.Driver.givenName} {r.Driver.familyName}
                    </p>
                    <p className="text-xs text-gray-400">{r.Constructor.name}</p>
                  </div>
                  <p className="text-xs text-gray-400">{r.Time?.time ?? r.status}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Lap time chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className={card}
        style={cardStyle}
      >
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">
          Lap times — top 5 drivers
        </p>
        {laps.isLoading && (
          <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
            Loading lap data...
          </div>
        )}
        {lapChartData.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lapChartData}>
              <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" />
              <XAxis
                dataKey="lap"
                stroke="#6b6b6b"
                tick={{ fill: '#6b6b6b', fontSize: 11 }}
                label={{ value: 'Lap', position: 'insideBottom', offset: -2, fill: '#6b6b6b', fontSize: 11 }}
              />
              <YAxis
                stroke="#6b6b6b"
                tick={{ fill: '#6b6b6b', fontSize: 11 }}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#6b6b6b', paddingTop: '12px' }} />
              {top5.map((r: any, i: number) => (
                <Line
                  key={r.Driver.driverId}
                  type="monotone"
                  dataKey={r.Driver.code ?? r.Driver.familyName}
                  stroke={COLORS[i]}
                  strokeWidth={i === 0 ? 2.5 : 1.5}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Pit stops table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className={card}
        style={cardStyle}
      >
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">
          Pit stop times
        </p>
        {pitStops.isLoading && (
          <p className="text-gray-500 text-sm">Loading pit data...</p>
        )}
        {pitData.length === 0 && !pitStops.isLoading && (
          <p className="text-gray-500 text-sm">No pit stop data available for this race.</p>
        )}
        {pitData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-xs text-gray-500 border-b"
                  style={{ borderColor: 'var(--f1-border)' }}
                >
                  <th className="pb-2 pr-4">Driver</th>
                  <th className="pb-2 pr-4">Lap</th>
                  <th className="pb-2 pr-4">Stop</th>
                  <th className="pb-2 pr-4">Duration</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {pitData.slice(0, 20).map((p: any, i: number) => (
                  <motion.tr
                    key={`${p.driverId}-${p.stop}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b"
                    style={{ borderColor: 'var(--f1-border)' }}
                  >
                    <td className="py-2 pr-4 font-medium">{p.driverId}</td>
                    <td className="py-2 pr-4 text-gray-400">{p.lap}</td>
                    <td className="py-2 pr-4 text-gray-400">{p.stop}</td>
                    <td className="py-2 pr-4">
                      <span
                        className="font-bold"
                        style={{ color: i === 0 ? 'var(--f1-red)' : 'white' }}
                      >
                        {p.duration}s
                      </span>
                    </td>
                    <td className="py-2 text-gray-400 text-xs">{p.time}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Full results */}
      {displayRace && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className={card}
          style={cardStyle}
        >
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">
            Full race results
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-xs text-gray-500 border-b"
                  style={{ borderColor: 'var(--f1-border)' }}
                >
                  <th className="pb-2 pr-4">Pos</th>
                  <th className="pb-2 pr-4">Driver</th>
                  <th className="pb-2 pr-4">Constructor</th>
                  <th className="pb-2 pr-4">Grid</th>
                  <th className="pb-2 pr-4">Points</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayRace.Results.map((r: any) => (
                  <tr
                    key={r.Driver.driverId}
                    className="border-b"
                    style={{ borderColor: 'var(--f1-border)' }}
                  >
                    <td
                      className="py-2 pr-4 font-bold"
                      style={{ color: parseInt(r.position) <= 3 ? 'var(--f1-red)' : 'white' }}
                    >
                      P{r.position}
                    </td>
                    <td className="py-2 pr-4 font-medium">
                      {r.Driver.givenName} {r.Driver.familyName}
                    </td>
                    <td className="py-2 pr-4 text-gray-400">{r.Constructor.name}</td>
                    <td className="py-2 pr-4 text-gray-400">{r.grid}</td>
                    <td
                      className="py-2 pr-4 font-semibold"
                      style={{ color: parseFloat(r.points) > 0 ? 'var(--f1-red)' : 'var(--f1-muted)' }}
                    >
                      {r.points}
                    </td>
                    <td className="py-2 text-xs text-gray-400">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

    </div>
  )
}