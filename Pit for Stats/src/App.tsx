import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'

// Page placeholders — we'll fill these in one by one
import Dashboard from './pages/Dashboard'
import LiveTracker from './pages/LiveTracker'
import Schedule from './pages/Schedule'
import Drivers from './pages/Drivers'
import RaceAnalysis from './pages/RaceAnalysis'
import Predictor from './pages/Predictor'
import Trivia from './pages/Trivia'
import News from './pages/News'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--f1-dark)' }}>
        <Navbar />
        <main className="pt-16">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/live"          element={<LiveTracker />} />
            <Route path="/schedule"      element={<Schedule />} />
            <Route path="/drivers"       element={<Drivers />} />
            <Route path="/race-analysis" element={<RaceAnalysis />} />
            <Route path="/predictor"     element={<Predictor />} />
            <Route path="/trivia"        element={<Trivia />} />
            <Route path="/news"          element={<News />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}