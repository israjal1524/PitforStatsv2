import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const links = [
  { to: '/',              label: 'Standings' },
  { to: '/live',          label: 'Live Track Positions'      },
  { to: '/schedule',      label: 'Season Schedule'  },
  { to: '/drivers',       label: 'Class of 2026'   },
  { to: '/race-analysis', label: 'Race Analysis'  },
  { to: '/predictor',     label: 'Win Predictor' },
  { to: '/trivia',        label: 'Trivia'    },
  { to: '/news',          label: 'News'      },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16 border-b"
      style={{ backgroundColor: 'var(--f1-dark)', borderColor: 'var(--f1-border)' }}
    >
      <NavLink to="/" className="flex items-center gap-2 font-bold text-lg tracking-wide">
        <span style={{ color: 'var(--f1-red)' }}>PIT</span>
        <span className="text-white">FOR STATS</span>
      </NavLink>

      <div className="hidden md:flex items-center gap-1">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-sm transition-colors duration-150 ${
                isActive
                  ? 'text-white font-medium'
                  : 'text-gray-400 hover:text-white'
              }`
            }
            style={({ isActive }) => isActive ? { color: 'var(--f1-red)' } : {}}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      <button
        className="md:hidden flex flex-col gap-1.5 p-1"
        onClick={() => setMenuOpen(v => !v)}
      >
        <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
        <span className={`block w-5 h-0.5 bg-white transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-16 left-0 right-0 flex flex-col border-b md:hidden"
            style={{ backgroundColor: 'var(--f1-dark)', borderColor: 'var(--f1-border)' }}
          >
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `px-6 py-3 text-sm border-b transition-colors ${
                    isActive ? 'font-medium' : 'text-gray-400 hover:text-white'
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? { color: 'var(--f1-red)', borderColor: 'var(--f1-border)' }
                    : { borderColor: 'var(--f1-border)' }
                }
              >
                {link.label}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}