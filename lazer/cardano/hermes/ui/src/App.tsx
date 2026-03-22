import { BrowserRouter, Route, Routes } from "react-router-dom"
import { MarketDashboard } from "@/components/MarketDashboard"
import { HistoryPage } from "@/pages/HistoryPage"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MarketDashboard />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
