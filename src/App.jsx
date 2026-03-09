import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LoadingSpinner from './components/LoadingSpinner'

// Lazy load pages
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const VotingPage = lazy(() => import('./pages/VotingPage'))
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Suspense fallback={<LoadingSpinner text="Loading page..." large />}>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/vote" element={<VotingPage />} />
                        <Route path="/admin" element={<AdminLoginPage />} />
                        <Route path="/admin/dashboard" element={<AdminPage />} />
                        <Route path="/admin/users" element={<UserManagementPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </Router>
        </AuthProvider>
    )
}
