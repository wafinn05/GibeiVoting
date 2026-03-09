import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import styles from './AdminLoginPage.module.css'

const LOGO_URL = 'https://gibeitelkomuniversity.my.id/src/assets/logo.png'

export default function AdminLoginPage() {
    const navigate = useNavigate()
    const { loginAdmin, isAdminLoggedIn } = useAuth()

    const [adminName, setAdminName] = useState('')
    const [adminId, setAdminId] = useState('')
    const [nameError, setNameError] = useState('')
    const [idError, setIdError] = useState('')
    const [loading, setLoading] = useState(false)

    // Redirect if already logged in
    useEffect(() => {
        if (isAdminLoggedIn) {
            navigate('/admin/dashboard', { replace: true })
        }
    }, [isAdminLoggedIn, navigate])

    const resetErrors = () => {
        setNameError('')
        setIdError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        resetErrors()

        const name = adminName.trim()
        const id = adminId.trim()

        if (!name) {
            setNameError('Admin name is required')
            return
        }
        if (!id) {
            setIdError('Admin ID is required')
            return
        }

        try {
            setLoading(true)

            // Check configuration
            if (!supabase.supabaseUrl || supabase.supabaseUrl === 'undefined') {
                throw new Error('Supabase configuration is missing. Please check your environment variables.')
            }

            // Supabase auth check
            const { data: adminData, error } = await supabase
                .from('administrators')
                .select('*')
                .eq('id', id)
                .single()

            if (error) {
                console.error("Supabase error:", error)
                if (error.code === 'PGRST116') throw new Error('Invalid admin ID or credentials')
                throw new Error(`Connection error: ${error.message}`)
            }

            if (!adminData) {
                throw new Error('Invalid admin ID or credentials')
            }

            if (adminData.full_name.trim().toLowerCase() !== name.trim().toLowerCase()) {
                throw new Error('Name does not match Admin ID')
            }

            loginAdmin(id, adminData.full_name)
            navigate('/admin/dashboard')
        } catch (err) {
            console.error('Login error:', err)
            if (err.message.includes('match')) {
                setNameError(err.message)
            } else {
                setIdError('Invalid admin ID or name. Please check your credentials and try again.')
            }
            setLoading(false)
        }
    }

    return (
        <div className={styles.loginBody}>
            <div className={styles.container}>
                <img src={LOGO_URL} alt="GIBEI" className={styles.logo} />
                <h1 className={styles.title}>Admin Dashboard</h1>
                <p className={styles.subtitle}>Enter admin credentials to access the dashboard</p>

                <div className={styles.loginForm}>
                    <h2 className={styles.loginFormTitle}>Admin Login</h2>

                    {!loading ? (
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label htmlFor="adminNameInput">Admin Name</label>
                                <div className={styles.inputWithIcon}>
                                    <i className="fas fa-user-tie"></i>
                                    <input
                                        type="text"
                                        id="adminNameInput"
                                        placeholder="Enter admin name"
                                        value={adminName}
                                        onChange={(e) => { setAdminName(e.target.value); setNameError('') }}
                                        className={nameError ? styles.inputError : ''}
                                        required
                                    />
                                </div>
                                {nameError && <div className={styles.errorMessage}>{nameError}</div>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="adminIdInput">Admin ID</label>
                                <div className={styles.inputWithIcon}>
                                    <i className="fas fa-key"></i>
                                    <input
                                        type="password"
                                        id="adminIdInput"
                                        placeholder="Enter admin ID"
                                        value={adminId}
                                        onChange={(e) => { setAdminId(e.target.value); setIdError('') }}
                                        className={idError ? styles.inputError : ''}
                                        required
                                    />
                                </div>
                                {idError && <div className={styles.errorMessage}>{idError}</div>}
                            </div>

                            <button type="submit" className={styles.btnLogin}>
                                <i className="fas fa-sign-in-alt"></i> Login to Dashboard
                            </button>
                        </form>
                    ) : (
                        <LoadingSpinner text="Verifying credentials..." />
                    )}
                </div>

                <div className={styles.backLink}>
                    <Link to="/">
                        <i className="fas fa-arrow-left"></i> Back to Home
                    </Link>
                </div>

                <div className={styles.footerText}>
                    <p>GIBEI Voting System &copy; 2025 - All Rights Reserved</p>
                </div>
            </div>
        </div>
    )
}
