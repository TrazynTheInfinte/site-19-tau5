import { Route, Routes } from 'react-router-dom'
import HomeRoute from './routes/HomeRoute'
import LobbyPage from './routes/LobbyPage'
import SiteHeader from './components/layout/SiteHeader'
import SiteFooter from './components/layout/SiteFooter'

export default function App() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/lobby/:code" element={<LobbyPage />} />
      </Routes>
      <SiteFooter />
    </div>
  )
}
