import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import styles from './LoginPage.module.css'

const LOGO_URL = 'https://gibeitelkomuniversity.my.id/src/assets/logo.png'

export default function LoginPage() {
    const navigate = useNavigate()
    const { loginMember, isMemberLoggedIn } = useAuth()

    const [memberName, setMemberName] = useState('')
    const [memberId, setMemberId] = useState('')
    const [nameError, setNameError] = useState('')
    const [idError, setIdError] = useState('')
    const [loading, setLoading] = useState(false)

    // Redirect if already logged in
    useEffect(() => {
        if (isMemberLoggedIn) {
            navigate('/vote', { replace: true })
        }
    }, [isMemberLoggedIn, navigate])

    const resetErrors = () => {
        setNameError('')
        setIdError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        resetErrors()

        const name = memberName.trim()
        const id = memberId.trim()

        if (!name) {
            setNameError('Member name is required')
            return
        }

        if (!id) {
            setIdError('Member ID is required')
            return
        }

        try {
            setLoading(true)

            const { data: memberData, error } = await supabase
                .from('voters')
                .select('*')
                .eq('id', id)
                .single()

            if (error || !memberData) {
                throw new Error('Member ID not found')
            }

            if (memberData.full_name.toLowerCase() !== name.toLowerCase()) {
                throw new Error('Name does not match the Member ID')
            }

            loginMember(id, memberData.full_name)
            navigate('/vote')
        } catch (err) {
            console.error('Login error:', err)

            if (err.message.includes('not found')) {
                setIdError(err.message)
            } else if (err.message.includes('match')) {
                setNameError(err.message)
            } else {
                setIdError('An error occurred during login. Please try again.')
            }

            setLoading(false)
        }
    }

    return (
        <div className={styles.loginBody}>
            <div className={styles.container}>
                <img src={LOGO_URL} alt="GIBEI" className={styles.logo} />
                <h1 className={styles.title}>President &amp; Vice President Election</h1>
                <p className={styles.subtitle}>Digital Voting System</p>

                <div className={styles.loginForm}>
                    <h2 className={styles.loginFormTitle}>Enter Voting System</h2>

                    {!loading ? (
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label htmlFor="memberName">Member Name</label>
                                <div className={styles.inputWithIcon}>
                                    <i className="fas fa-user"></i>
                                    <input
                                        type="text"
                                        id="memberName"
                                        placeholder="Enter full name"
                                        value={memberName}
                                        onChange={(e) => { setMemberName(e.target.value); setNameError('') }}
                                        className={nameError ? styles.inputError : ''}
                                        required
                                    />
                                </div>
                                {nameError && <div className={styles.errorMessage}>{nameError}</div>}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="memberId">Member ID</label>
                                <div className={styles.inputWithIcon}>
                                    <i className="fas fa-id-card"></i>
                                    <input
                                        type="text"
                                        id="memberId"
                                        placeholder="Enter member ID"
                                        value={memberId}
                                        onChange={(e) => { setMemberId(e.target.value); setIdError('') }}
                                        className={idError ? styles.inputError : ''}
                                        required
                                    />
                                </div>
                                {idError && <div className={styles.errorMessage}>{idError}</div>}
                            </div>

                            <button type="submit" className={styles.btnLogin}>
                                <i className="fas fa-sign-in-alt"></i> Enter Voting System
                            </button>
                        </form>
                    ) : (
                        <LoadingSpinner text="Processing login..." />
                    )}
                </div>

                <div className={styles.adminLink}>
                    <Link to="/admin">
                        <i className="fas fa-cog"></i> Dashboard Admin
                    </Link>
                </div>

                <div className={styles.footerText}>
                    <p>GIBEI Voting System &copy; 2025 - All Rights Reserved</p>
                </div>
            </div>
        </div>
    )
}
