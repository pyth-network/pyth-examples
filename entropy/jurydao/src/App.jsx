import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { WalletProvider } from './context/WalletContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import CreateProposal from './pages/CreateProposal'
import ProposalDetail from './pages/ProposalDetail'
import JurorPage from './pages/JurorPage'
import AdminPanel from './pages/AdminPanel'

function App() {
    return (
        <WalletProvider>
            <BrowserRouter>
                <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/create" element={<CreateProposal />} />
                        <Route path="/create-proposal" element={<CreateProposal />} />  {/* ✅ Added */}
                        <Route path="/proposal/:id" element={<ProposalDetail />} />
                        <Route path="/juror" element={<JurorPage />} />
                        <Route path="/admin" element={<AdminPanel />} />
                    </Routes>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: '#1e293b',
                                color: '#fff',
                                border: '1px solid #334155'
                            }
                        }}
                    />
                </div>
            </BrowserRouter>
        </WalletProvider>
    )
}

export default App
