import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../context/AuthContext'


import LoadingSpinner from '../components/LoadingSpinner'
import styles from './VotingPage.module.css'

export default function VotingPage() {
    const navigate = useNavigate()
    const { memberAuth, isMemberLoggedIn, logoutMember } = useAuth()

    const [candidates, setCandidates] = useState([])
    const [ratings, setRatings] = useState({})
    const [errors, setErrors] = useState({})
    const [hasVoted, setHasVoted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!isMemberLoggedIn) {
            navigate('/login', { replace: true })
            return
        }
        checkSessionAndLoad()
    }, [isMemberLoggedIn])

    async function checkSessionAndLoad() {
        try {
            const userRef = doc(db, 'users', memberAuth.id)
            const userSnap = await getDoc(userRef)

            if (userSnap.exists() && userSnap.data().hasVoted === true) {
                setHasVoted(true)
                setLoading(false)
                return
            }

            await loadCandidates()
        } catch (error) {
            console.error('Error checking session:', error)
        }
        setLoading(false)
    }

    async function loadCandidates() {
        try {
            const paslonDoc = await getDoc(doc(db, 'VotingGIBEI', 'Paslon'))

            if (!paslonDoc.exists()) {
                setCandidates([
                    { key: 'paslon1', name: 'Paslon 1', number: '01' },
                    { key: 'paslon2', name: 'Paslon 2', number: '02' }
                ])
                return
            }

            const paslonData = paslonDoc.data()
            const loadedCandidates = Object.keys(paslonData).map((key, index) => {
                const paslon = paslonData[key]
                return {
                    key: `paslon${index + 1}`,
                    firestoreKey: key,
                    name: typeof paslon === 'string' ? paslon : paslon.name,
                    number: typeof paslon === 'string' ? `0${index + 1}` : (paslon.number || `0${index + 1}`)
                }
            })

            setCandidates(loadedCandidates)
        } catch (error) {
            console.error('Error loading candidates:', error)
            setCandidates([
                { key: 'paslon1', name: 'Paslon 1', number: '01' },
                { key: 'paslon2', name: 'Paslon 2', number: '02' }
            ])
        }
    }

    function handleRatingChange(key, value) {
        setRatings(prev => ({ ...prev, [key]: value }))
        const numValue = parseInt(value)
        if (!isNaN(numValue) && numValue >= 1 && numValue <= 10) {
            setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
        }
    }

    function validateAllRatings() {
        const newErrors = {}
        let allValid = true
        candidates.forEach(candidate => {
            const value = parseInt(ratings[candidate.key])
            if (isNaN(value) || value < 1 || value > 10) {
                newErrors[candidate.key] = 'Rating must be 1-10'
                allValid = false
            }
        })
        setErrors(newErrors)
        return allValid
    }

    async function handleSubmit() {
        if (!validateAllRatings()) {
            alert('❌ Some ratings are invalid! Ensure all ratings are between 1-10.')
            return
        }

        setSubmitting(true)

        try {
            const userRef = doc(db, 'users', memberAuth.id)
            const userSnap = await getDoc(userRef)

            if (userSnap.exists() && userSnap.data().hasVoted === true) {
                alert('❌ You have already voted!')
                setHasVoted(true)
                setSubmitting(false)
                return
            }

            const ratingsData = {}
            candidates.forEach(candidate => {
                ratingsData[candidate.key] = {
                    candidateName: candidate.name,
                    rating: Number(ratings[candidate.key])
                }
            })

            const voteData = {
                memberId: memberAuth.id,
                memberName: memberAuth.name,
                ratings: ratingsData,
                votedAt: new Date(),
                timestamp: new Date().toISOString()
            }

            await setDoc(doc(db, 'votes', memberAuth.id), voteData)
            await setDoc(userRef, { hasVoted: true, votedAt: new Date().toISOString() }, { merge: true })

            setHasVoted(true)
            setSubmitting(false)
        } catch (error) {
            console.error('Voting error:', error)
            alert('❌ Failed to save vote: ' + error.message)
            setSubmitting(false)
        }
    }

    function handleLogout() {
        logoutMember()
        navigate('/')
    }

    if (loading) {
        return (
            <div className={styles.votingBody}>
                <div className={styles.container}>
                    <Header title="GIBEI President & VP Election" subtitle="Cast your vote using the rating system" />
                    <LoadingSpinner text="Loading voting data..." large />
                </div>
            </div>
        )
    }

    return (
        <div className={styles.votingBody}>
            <div className={styles.container}>
                <Header
                    title="GIBEI President & VP Election"
                    subtitle="Cast your vote using the rating system"
                    userInfo={memberAuth ? `${memberAuth.name} (ID: ${memberAuth.id})` : ''}
                    onLogout={handleLogout}
                    logoSize={45}
                />

                {/* Slim Instruction Banner */}
                <div className={styles.instructionBanner}>
                    <div className={styles.instructionItem}>
                        <i className="fas fa-check-circle"></i>
                        Rating scale <strong>1-10</strong>
                    </div>
                    <div className={styles.instructionItem}>
                        <i className="fas fa-check-circle"></i>
                        1 = Dissatisfied, 10 = Very Satisfied
                    </div>
                    <div className={styles.instructionItem}>
                        <i className="fas fa-check-circle"></i>
                        Vote cannot be changed
                    </div>
                    {hasVoted && (
                        <div className={styles.alertBadge}>
                            <i className="fas fa-exclamation-circle"></i>
                            You have already voted
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className={styles.mainContent}>
                    {!hasVoted && (
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.votingTitle}>Rate Each Candidate Pair</h2>
                            <p className={styles.votingSubtitle}>Select the President & VP candidates by giving a rating of 1-10</p>
                        </div>
                    )}

                    {hasVoted ? (
                        <div className={styles.votedAlert}>
                            <i className={`fas fa-check-circle ${styles.successIcon}`}></i>
                            <h3>Voting Successful!</h3>
                            <p>Thank you for participating in this election.</p>
                            <button onClick={handleLogout} className={styles.btnBackHome}>
                                <i className="fas fa-home"></i> Back to Home
                            </button>
                        </div>
                    ) : submitting ? (
                        <LoadingSpinner text="Processing your vote..." large />
                    ) : (
                        <>
                            <div className={styles.candidatesGrid}>
                                {candidates.map((candidate, index) => (
                                    <div key={candidate.key} className={styles.candidateCard}>
                                        <div className={styles.candidateHeader}>
                                            <div className={styles.candidateNumber}>{candidate.number}</div>
                                            <div className={styles.candidateDetails}>
                                                <div className={styles.candidateName}>{candidate.name}</div>
                                                <div className={styles.candidateId}>President & VP Candidates</div>
                                            </div>
                                        </div>

                                        <div className={styles.ratingContainer}>
                                            <div className={styles.ratingLabel}>
                                                <span>Give rating:</span>
                                                <span>1 — 10</span>
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10"
                                                className={`${styles.ratingInput} ${errors[candidate.key] ? styles.ratingInputInvalid : ''}`}
                                                placeholder="1-10"
                                                value={ratings[candidate.key] || ''}
                                                onChange={(e) => handleRatingChange(candidate.key, e.target.value)}
                                            />
                                            {errors[candidate.key] && (
                                                <div className={styles.validationError}>{errors[candidate.key]}</div>
                                            )}
                                            <div className={styles.ratingScale}>
                                                <span>Lowest</span>
                                                <span>Highest</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.submitSection}>
                                <button onClick={handleSubmit} className={styles.btnSubmit}>
                                    <i className="fas fa-paper-plane"></i> Submit My Vote
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
