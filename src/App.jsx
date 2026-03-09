import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import VotingPage from './pages/VotingPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminPage from './pages/AdminPage'

import UserManagementPage from './pages/UserManagementPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/vote" element={<VotingPage />} />
                    <Route path="/admin" element={<AdminLoginPage />} />
                    <Route path="/admin/dashboard" element={<AdminPage />} />
                    <Route path="/admin/users" element={<UserManagementPage />} />

                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Router>
        </AuthProvider>
    )
}
