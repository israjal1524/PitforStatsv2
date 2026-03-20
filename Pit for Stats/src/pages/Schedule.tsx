import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

const BASE = 'https://api.jolpi.ca/ergast/f1'

const flagMap: Record<string, string> = {
  'australia': '🇦🇺', 'bahrain': '🇧🇭', 'saudi_arabia': '🇸🇦', 'japan': '🇯🇵',
  'china': '🇨🇳', 'miami': '🇺🇸', 'imola': '🇮🇹', 'monaco': '🇲🇨',
  'canada': '🇨🇦', 'spain': '🇪🇸', 'austria': '🇦🇹', 'great_britain': '🇬🇧',
  'hungary': '🇭🇺', 'belgium': '🇧🇪', 'netherlands': '🇳🇱', 'italy': '🇮🇹',
  'azerbaijan': '🇦🇿', 'singapore': '🇸🇬', 'united_states': '🇺🇸', 'mexico': '🇲🇽',
  'brazil': '🇧🇷', 'las_vegas': '🇺🇸', 'qatar': '🇶🇦', 'abu_dhabi': '🇦🇪',
}

function getFlag(circuitId: string) {
  for (const key in flagMap) {
    if (circuitId.toLowerCase().includes(key)) return flagMap[key]
  }
  return '🏁'
}

function getRaceStatus(dateStr: string) {
  const raceDate = new Date(dateStr)
  const now = new Date()
  const diff = raceDate.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: 'Completed', color: '#6b6b6b', done: true, days: 0 }
  if (days === 0) return { label: 'Today!', color: '#e10600', done: false, days: 0 }
  if (days <= 7) return { label: `In ${days}d`, color: '#f59e0b', done: false, days }
  return { label: `In ${days}d`, color: '#ffffff', done: false, days }
}

function RacePodium({ round }: { round: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['race-result', round],
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/${round}/results.json`)
      const data = await res.json()
      return data.MRData.RaceTable.Races[0]?.Results?.slice(0, 3) ?? []
    },
  })

  if (isLoading) return (
    <div className="mt-3 flex gap-2">
      {[1,2,3].map(i => (
        <div key={i} className="h-10 flex-1 rounded animate-pulse" style={{ backgroundColor: 'var(--f1-border)' }} />
      ))}
    </div>
  )

  const medals = ['', '', '']

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-3 grid grid-cols-3 gap-2 overflow-hidden"
    >
      {data?.map((r: any, i: number) => (
        <div
          key={r.Driver.driverId}
          className="rounded-lg p-2 text-center border"
          style={{
            backgroundColor: i === 0 ? 'rgba(225,6,0,0.1)' : 'rgba(255,255,255,0.04)',
            borderColor: i === 0 ? 'var(--f1-red)' : 'var(--f1-border)',
          }}
        >
          <p className="text-base">{medals[i]}</p>
          <p className="text-xs font-bold mt-0.5" style={{ color: i === 0 ? 'var(--f1-red)' : 'white' }}>
            P{r.position}
          </p>
          <p className="text-xs text-gray-300 leading-tight mt-0.5">
            {r.Driver.familyName}
          </p>
          <p className="text-xs text-gray-500 truncate">{r.Constructor.name}</p>
        </div>
      ))}
    </motion.div>
  )
}

export default function Schedule() {
  const [expandedRound, setExpandedRound] = useState<string | null>(null)

  const { data: races, isLoading } = useQuery({
    queryKey: ['schedule-2026'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/races.json`)
      const data = await res.json()
      return data.MRData.RaceTable.Races
    },
  })

  const nextRaceIndex = races
    ? races.findIndex((r: any) => new Date(r.date) >= new Date())
    : -1

  function toggleRound(round: string, done: boolean) {
    if (!done) return
    setExpandedRound(prev => prev === round ? null : round)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          <span style={{ color: 'var(--f1-red)' }}>2026</span> Race Calendar
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {races ? `${races.length} races this season` : 'Loading schedule...'}
        </p>
      </motion.div>

      {isLoading && (
        <div className="space-y-3">
          {Array(10).fill(0).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--f1-card)' }} />
          ))}
        </div>
      )}

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-px" style={{ backgroundColor: 'var(--f1-border)' }} />

        <div className="space-y-3">
          {races?.map((race: any, i: number) => {
            const status = getRaceStatus(race.date)
            const isNext = i === nextRaceIndex
            const isExpanded = expandedRound === race.round

            return (
              <motion.div
                key={race.round}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="relative flex items-start gap-4"
              >
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0 mt-5">
                  {isNext ? (
                    <motion.div
                      className="w-4 h-4 rounded-full border-2"
                      style={{ backgroundColor: 'var(--f1-red)', borderColor: 'var(--f1-red)' }}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full border-2"
                      style={{
                        backgroundColor: status.done ? 'var(--f1-border)' : 'var(--f1-card)',
                        borderColor: status.done ? 'var(--f1-muted)' : 'var(--f1-red)',
                      }}
                    />
                  )}
                </div>

                {/* Card */}
                <motion.div
                  className="flex-1 rounded-xl border p-4 cursor-pointer"
                  style={{
                    backgroundColor: isNext ? 'rgba(225,6,0,0.08)' : 'var(--f1-card)',
                    borderColor: isExpanded ? 'var(--f1-red)' : isNext ? 'var(--f1-red)' : 'var(--f1-border)',
                    opacity: status.done && !isExpanded ? 0.6 : 1,
                  }}
                  whileHover={{ scale: status.done ? 1.01 : 1.005, borderColor: 'var(--f1-red)' }}
                  transition={{ duration: 0.15 }}
                  onClick={() => toggleRound(race.round, status.done)}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center w-10 flex-shrink-0">
                      <p className="text-xs text-gray-500">R{race.round}</p>
                      <p className="text-xl">{getFlag(race.Circuit.circuitId)}</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{race.raceName}</p>
                      <p className="text-xs text-gray-400 truncate">{race.Circuit.circuitName}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">
                        {new Date(race.date).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short'
                        })}
                      </p>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: status.color }}>
                        {status.label}
                      </p>
                    </div>

                    {isNext && (
                      <div
                        className="text-xs font-bold px-2 py-1 rounded flex-shrink-0"
                        style={{ backgroundColor: 'var(--f1-red)', color: 'white' }}
                      >
                        NEXT
                      </div>
                    )}

                    {status.done && (
                      <div className="text-gray-500 text-xs flex-shrink-0">
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    )}
                  </div>

                  {/* Podium dropdown */}
                  <AnimatePresence>
                    {isExpanded && <RacePodium round={race.round} />}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}