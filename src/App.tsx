import { Route, Routes } from 'react-router-dom'
import HomeRoute from './routes/HomeRoute'
import LobbyPage from './routes/LobbyPage'

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/lobby/:code" element={<LobbyPage />} />
      </Routes>
    </div>
  )
}
