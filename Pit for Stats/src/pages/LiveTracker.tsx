import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useState } from 'react'

const OFI = 'https://api.openf1.org/v1'

function useSession() {
  return useQuery({
    queryKey: ['session-latest'],
    queryFn: async () => {
      const res = await fetch(`${OFI}/sessions?session_key=latest`)
      const data = await res.json()
      return data[0] ?? null
    },
    refetchInterval: 30000,
  })
}

function useDrivers(sessionKey: number | undefined) {
  return useQuery({
    queryKey: ['of1-drivers', sessionKey],
    enabled: !!sessionKey,
    queryFn: async () => {
      const res = await fetch(`${OFI}/drivers?session_key=${sessionKey}`)
      const data = await res.json()
      const map: Record<number, any> = {}
      data.forEach((d: any) => { map[d.driver_number] = d })
      return map
    },
    staleTime: Infinity,
  })
}

function useLocations(sessionKey: number | undefined) {
  return useQuery({
    queryKey: ['locations', sessionKey],
    enabled: !!sessionKey,
    queryFn: async () => {
      const res = await fetch(`${OFI}/location?session_key=${sessionKey}&date>${new Date(Date.now() - 60000).toISOString()}`)
      const data = await res.json()
      // Keep only latest position per driver
      const latest: Record<number, any> = {}
      data.forEach((loc: any) => {
        if (!latest[loc.driver_number] || loc.date > latest[loc.driver_number].date) {
          latest[loc.driver_number] = loc
        }
      })
      return Object.values(latest)
    },
    refetchInterval: 3000,
  })
}

function usePositions(sessionKey: number | undefined) {
  return useQuery({
    queryKey: ['positions', sessionKey],
    enabled: !!sessionKey,
    queryFn: async () => {
      const res = await fetch(`${OFI}/position?session_key=${sessionKey}&date>${new Date(Date.now() - 60000).toISOString()}`)
      const data = await res.json()
      const latest: Record<number, any> = {}
      data.forEach((p: any) => {
        if (!latest[p.driver_number] || p.date > latest[p.driver_number].date) {
          latest[p.driver_number] = p
        }
      })
      return latest
    },
    refetchInterval: 3000,
  })
}

function useIntervals(sessionKey: number | undefined) {
  return useQuery({
    queryKey: ['intervals', sessionKey],
    enabled: !!sessionKey,
    queryFn: async () => {
      const res = await fetch(`${OFI}/intervals?session_key=${sessionKey}&date>${new Date(Date.now() - 60000).toISOString()}`)
      const data = await res.json()
      const latest: Record<number, any> = {}
      data.forEach((i: any) => {
        if (!latest[i.driver_number] || i.date > latest[i.driver_number].date) {
          latest[i.driver_number] = i
        }
      })
      return latest
    },
    refetchInterval: 3000,
  })
}

function usePits(sessionKey: number | undefined) {
  return useQuery({
    queryKey: ['pits', sessionKey],
    enabled: !!sessionKey,
    queryFn: async () => {
      const res = await fetch(`${OFI}/pit?session_key=${sessionKey}`)
      const data = await res.json()
      // Latest pit per driver
      const latest: Record<number, any> = {}
      data.forEach((p: any) => {
        if (!latest[p.driver_number] || p.lap_number > latest[p.driver_number].lap_number) {
          latest[p.driver_number] = p
        }
      })
      return latest
    },
    refetchInterval: 10000,
  })
}

function useCarData(sessionKey: number | undefined) {
  return useQuery({
    queryKey: ['cardata', sessionKey],
    enabled: !!sessionKey,
    queryFn: async () => {
      const res = await fetch(`${OFI}/car_data?session_key=${sessionKey}&date>${new Date(Date.now() - 10000).toISOString()}`)
      const data = await res.json()
      const latest: Record<number, any> = {}
      data.forEach((c: any) => {
        if (!latest[c.driver_number] || c.date > latest[c.driver_number].date) {
          latest[c.driver_number] = c
        }
      })
      return latest
    },
    refetchInterval: 3000,
  })
}

// Normalize x/y coords to SVG space
function normalizePositions(locs: any[]) {
  if (!locs.length) return []
  const xs = locs.map(l => l.x)
  const ys = locs.map(l => l.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const pad = 40
  const w = 520, h = 380
  return locs.map(l => ({
    ...l,
    nx: pad + ((l.x - minX) / rangeX) * (w - pad * 2),
    ny: pad + ((l.y - minY) / rangeY) * (h - pad * 2),
  }))
}

function sessionTypeLabel(type: string) {
  const map: Record<string, string> = {
    'Race': 'RACE', 'Qualifying': 'QUALI', 'Practice 1': 'FP1',
    'Practice 2': 'FP2', 'Practice 3': 'FP3', 'Sprint': 'SPRINT',
    'Sprint Qualifying': 'SQ',
  }
  return map[type] ?? type
}

export default function LiveTracker() {
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null)

  const session   = useSession()
  const sk        = session.data?.session_key
  const drivers   = useDrivers(sk)
  const locations = useLocations(sk)
  const positions = usePositions(sk)
  const intervals = useIntervals(sk)
  const pits      = usePits(sk)
  const carData   = useCarData(sk)

  const normalizedLocs = useMemo(
    () => normalizePositions(locations.data ?? []),
    [locations.data]
  )

  // Sort drivers by race position
  const sortedDrivers = useMemo(() => {
    if (!drivers.data) return []
    return Object.values(drivers.data).sort((a: any, b: any) => {
      const posA = positions.data?.[a.driver_number]?.position ?? 99
      const posB = positions.data?.[b.driver_number]?.position ?? 99
      return posA - posB
    })
  }, [drivers.data, positions.data])

  const isLive = session.data?.date_end
    ? new Date(session.data.date_end) > new Date()
    : false

  const selected = selectedDriver
    ? drivers.data?.[selectedDriver]
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span style={{ color: 'var(--f1-red)' }}>Live</span> Tracker
          </h1>
          {session.data && (
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-400 text-sm">
                {session.data.meeting_name} · {session.data.circuit_short_name}
              </p>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: isLive ? 'var(--f1-red)' : 'var(--f1-border)',
                  color: 'white',
                }}
              >
                {isLive ? 'LIVE' : sessionTypeLabel(session.data.session_type)}
              </span>
            </div>
          )}
        </div>

        {isLive && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Updating every 3s
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Track map */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2 rounded-xl border p-4"
          style={{ backgroundColor: 'var(--f1-card)', borderColor: 'var(--f1-border)' }}
        >
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
            Track positions
          </p>

          {locations.isLoading && (
            <div className="h-80 flex items-center justify-center text-gray-500 text-sm">
              Loading position data...
            </div>
          )}

          {!locations.isLoading && normalizedLocs.length === 0 && (
            <div className="h-80 flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
              <p>No live position data available</p>
              <p className="text-xs text-gray-600">Position data is only available during active sessions</p>
            </div>
          )}

          {normalizedLocs.length > 0 && (
            <svg
              width="100%"
              viewBox="0 0 520 380"
              style={{ backgroundColor: 'transparent' }}
            >
              {/* Track path (drawn from car positions) */}
              <polyline
                points={normalizedLocs.map(l => `${l.nx},${l.ny}`).join(' ')}
                fill="none"
                stroke="#2a2a2a"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={normalizedLocs.map(l => `${l.nx},${l.ny}`).join(' ')}
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Car dots */}
              {normalizedLocs.map((loc: any) => {
                const driver  = drivers.data?.[loc.driver_number]
                const color   = driver?.team_colour ? `#${driver.team_colour}` : '#e10600'
                const pos     = positions.data?.[loc.driver_number]?.position
                const isSel   = selectedDriver === loc.driver_number

                return (
                  <g
                    key={loc.driver_number}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedDriver(
                      prev => prev === loc.driver_number ? null : loc.driver_number
                    )}
                  >
                    {isSel && (
                      <circle
                        cx={loc.nx}
                        cy={loc.ny}
                        r={14}
                        fill={color}
                        opacity={0.25}
                      />
                    )}
                    <circle
                      cx={loc.nx}
                      cy={loc.ny}
                      r={isSel ? 8 : 6}
                      fill={color}
                      stroke={isSel ? 'white' : '#0f0f0f'}
                      strokeWidth={isSel ? 2 : 1}
                    />
                    {/* Position label */}
                    {pos && (
                      <text
                        x={loc.nx + 10}
                        y={loc.ny - 8}
                        fill="white"
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="Titillium Web, sans-serif"
                      >
                        {pos}
                      </text>
                    )}
                    {/* Driver code */}
                    {driver?.name_acronym && (
                      <text
                        x={loc.nx + 10}
                        y={loc.ny + 4}
                        fill="#9ca3af"
                        fontSize="8"
                        fontFamily="Titillium Web, sans-serif"
                      >
                        {driver.name_acronym}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          )}
        </motion.div>

        {/* Driver list */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--f1-card)', borderColor: 'var(--f1-border)' }}
        >
          <div className="p-4 border-b" style={{ borderColor: 'var(--f1-border)' }}>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Order</p>
          </div>

          {sortedDrivers.length === 0 && (
            <div className="p-4 text-gray-500 text-sm">No driver data</div>
          )}

          <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
            {sortedDrivers.map((d: any) => {
              const pos      = positions.data?.[d.driver_number]?.position ?? '—'
              const gap      = intervals.data?.[d.driver_number]?.gap_to_leader
              const interval = intervals.data?.[d.driver_number]?.interval
              const inPit    = pits.data?.[d.driver_number]
              const car      = carData.data?.[d.driver_number]
              const isSel    = selectedDriver === d.driver_number
              const color    = d.team_colour ? `#${d.team_colour}` : '#e10600'

              return (
                <motion.div
                  key={d.driver_number}
                  className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer"
                  style={{
                    borderColor: 'var(--f1-border)',
                    backgroundColor: isSel ? 'rgba(255,255,255,0.05)' : 'transparent',
                  }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  onClick={() => setSelectedDriver(
                    prev => prev === d.driver_number ? null : d.driver_number
                  )}
                >
                  {/* Team color bar */}
                  <div
                    className="w-1 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />

                  {/* Position */}
                  <span
                    className="text-sm font-black w-5 flex-shrink-0"
                    style={{ color: pos <= 3 ? 'var(--f1-red)' : 'white' }}
                  >
                    {pos}
                  </span>

                  {/* Name + team */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {d.name_acronym}
                      {inPit && (
                        <span
                          className="ml-2 text-xs px-1.5 py-0.5 rounded font-bold"
                          style={{ backgroundColor: 'rgba(225,6,0,0.2)', color: 'var(--f1-red)' }}
                        >
                          PIT
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{d.team_name}</p>
                  </div>

                  {/* Gap */}
                  <div className="text-right flex-shrink-0">
                    {gap !== undefined && gap !== null && (
                      <p className="text-xs text-gray-400">
                        {typeof gap === 'number' ? `+${gap.toFixed(3)}` : gap}
                      </p>
                    )}
                    {car?.speed !== undefined && (
                      <p className="text-xs font-medium" style={{ color }}>
                        {car.speed} km/h
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Selected driver detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--f1-card)', borderColor: `#${selected.team_colour ?? 'e10600'}` }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest">Selected driver</p>
                <h3 className="text-xl font-black mt-0.5">
                  {selected.full_name}
                  <span
                    className="ml-2 text-sm font-bold"
                    style={{ color: `#${selected.team_colour}` }}
                  >
                    #{selected.driver_number}
                  </span>
                </h3>
                <p className="text-gray-400 text-sm">{selected.team_name}</p>
              </div>

              {carData.data?.[selectedDriver!] && (
                <div className="grid grid-cols-4 gap-4 text-center">
                  {[
                    { label: 'Speed',   value: `${carData.data[selectedDriver!].speed} km/h` },
                    { label: 'Throttle', value: `${carData.data[selectedDriver!].throttle}%` },
                    { label: 'Brake',   value: carData.data[selectedDriver!].brake ? 'ON' : 'OFF' },
                    { label: 'Gear',    value: carData.data[selectedDriver!].n_gear },
                  ].map(stat => (
                    <div key={stat.label}>
                      <p
                        className="text-lg font-black"
                        style={{ color: `#${selected.team_colour ?? 'e10600'}` }}
                      >
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pits.data?.[selectedDriver!] && (
              <div className="mt-4 text-xs text-gray-400 border-t pt-3"
                style={{ borderColor: 'var(--f1-border)' }}>
                Last pit: Lap {pits.data[selectedDriver!].lap_number} ·{' '}
                {pits.data[selectedDriver!].pit_duration?.toFixed(3)}s stop
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}