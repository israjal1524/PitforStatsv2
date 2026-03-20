import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'

const BASE = 'https://api.jolpi.ca/ergast/f1'

function useStandings() {
  return useQuery({
    queryKey: ['standings'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/driverStandings.json`)
      const data = await res.json()
      return data.MRData.StandingsTable.StandingsLists[0].DriverStandings
    },
  })
}

function useConstructors() {
  return useQuery({
    queryKey: ['constructors'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/constructorStandings.json`)
      const data = await res.json()
      return data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings
    },
  })
}

function useLastRace() {
  return useQuery({
    queryKey: ['lastrace'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/2026/last/results.json`)
      const data = await res.json()
      return data.MRData.RaceTable.Races[0]
    },
  })
}

const card = "rounded-xl border p-5"
const cardStyle = { backgroundColor: 'var(--f1-card)', borderColor: 'var(--f1-border)' }

export default function Dashboard() {
  const drivers      = useStandings()
  const constructors = useConstructors()
  const lastRace     = useLastRace()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">
          <span style={{ color: 'var(--f1-red)' }}>2026</span> Season Dashboard
        </h1>
        <p className="text-gray-400 text-sm mt-1">Live standings and latest race results</p>
      </motion.div>

      {/* Last race banner */}
      {lastRace.data && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={card}
          style={cardStyle}
        >
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Last Race</p>
          <h2 className="text-xl font-bold">{lastRace.data.raceName}</h2>
          <p className="text-gray-400 text-sm">{lastRace.data.Circuit.circuitName} · Round {lastRace.data.round}</p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {lastRace.data.Results.slice(0, 3).map((r: any, i: number) => (
              <div key={r.Driver.driverId} className="text-center">
                <p className="text-2xl font-bold" style={{ color: i === 0 ? 'var(--f1-red)' : 'white' }}>
                  P{r.position}
                </p>
                <p className="text-sm font-medium">{r.Driver.familyName}</p>
                <p className="text-xs text-gray-400">{r.Constructor.name}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Driver standings */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={card}
          style={cardStyle}
        >
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Driver standings</p>
          {drivers.isLoading && <p className="text-gray-500 text-sm">Loading...</p>}
          {drivers.data && (
            <div className="space-y-2">
              {drivers.data.slice(0, 10).map((d: any) => (
                <div key={d.Driver.driverId} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-5 text-right">{d.position}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">
                        {d.Driver.givenName} {d.Driver.familyName}
                      </span>
                      <span className="text-sm font-bold" style={{ color: 'var(--f1-red)' }}>
                        {d.points} pts
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: 'var(--f1-red)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(d.points / drivers.data[0].points) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Constructor standings */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className={card}
          style={cardStyle}
        >
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Constructor standings</p>
          {constructors.isLoading && <p className="text-gray-500 text-sm">Loading...</p>}
          {constructors.data && (
            <div className="space-y-2">
              {constructors.data.slice(0, 10).map((c: any) => (
                <div key={c.Constructor.constructorId} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-5 text-right">{c.position}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{c.Constructor.name}</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--f1-red)' }}>
                        {c.points} pts
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: '#ffffff' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(c.points / constructors.data[0].points) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}