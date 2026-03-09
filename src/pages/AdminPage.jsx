import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import { exportToExcel } from '../utils/exportExcel'
import LoadingSpinner from '../components/LoadingSpinner'
import styles from './AdminPage.module.css'

export default function AdminPage() {
    const navigate = useNavigate()
    const { adminAuth, isAdminLoggedIn, logoutAdmin } = useAuth()

    // Dashboard state
    const [dashboardLoading, setDashboardLoading] = useState(true)
    const [totalVoters, setTotalVoters] = useState(0)
    const [topCandidate, setTopCandidate] = useState('-')
    const [sortedCandidates, setSortedCandidates] = useState([])
    const [votesData, setVotesData] = useState([])
    const [paslonData, setPaslonData] = useState({})
    const [exporting, setExporting] = useState(false)
    const [deletingAll, setDeletingAll] = useState(false)

    // Modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('')

    useEffect(() => {
        if (!isAdminLoggedIn) {
            navigate('/admin', { replace: true })
            return
        }
        loadDashboardData()
    }, [isAdminLoggedIn])

    // ====== LOAD DASHBOARD DATA ======
    async function loadDashboardData() {
        setDashboardLoading(true)
        try {
            const votesSnap = await getDocs(collection(db, 'votes'))
            const votes = []
            votesSnap.forEach(docSnap => {
                votes.push({ id: docSnap.id, ...docSnap.data() })
            })

            const paslonDoc = await getDoc(doc(db, 'VotingGIBEI', 'Paslon'))
            const paslon = paslonDoc.exists() ? paslonDoc.data() : {}

            // Process statistics
            const candidateStats = {}
            Object.keys(paslon).forEach(key => {
                candidateStats[key] = {
                    name: paslon[key].name || paslon[key],
                    number: paslon[key].number || key,
                    shortName: paslon[key].shortName || `Paslon ${key}`,
                    totalScore: 0,
                    voteCount: 0,
                    average: 0
                }
            })

            votes.forEach(vote => {
                if (vote.ratings) {
                    Object.keys(vote.ratings).forEach(paslonKey => {
                        const item = vote.ratings[paslonKey]
                        if (item && typeof item.rating === 'number') {
                            const candidateKey = paslonKey === 'paslon1' ? 'A' :
                                paslonKey === 'paslon2' ? 'B' :
                                    paslonKey === 'paslon3' ? 'C' :
                                        paslonKey === 'paslon4' ? 'D' : paslonKey

                            if (candidateStats[candidateKey]) {
                                candidateStats[candidateKey].totalScore += item.rating
                                candidateStats[candidateKey].voteCount += 1
                            }
                        }
                    })
                }
            })

            Object.keys(candidateStats).forEach(key => {
                if (candidateStats[key].voteCount > 0) {
                    candidateStats[key].average = candidateStats[key].totalScore / candidateStats[key].voteCount
                }
            })

            const sorted = Object.keys(candidateStats)
                .map(key => ({ id: key, ...candidateStats[key] }))
                .sort((a, b) => b.average - a.average)

            setTotalVoters(votes.length)
            setTopCandidate(sorted.length > 0 ? sorted[0].name : '-')
            setSortedCandidates(sorted)
            setVotesData(votes)
            setPaslonData(paslon)
        } catch (error) {
            console.error('Error loading dashboard:', error)
            alert('Failed to load dashboard data: ' + error.message)
        }
        setDashboardLoading(false)
    }

    // ====== EXPORT EXCEL ======
    async function handleExport() {
        setExporting(true)
        try {
            await exportToExcel()
            alert('Excel file successfully created and ready for download!')
        } catch (error) {
            console.error('Export error:', error)
            alert('Failed to create Excel file: ' + error.message)
        }
        setExporting(false)
    }

    // ====== LOGOUT ======
    function handleLogout() {
        logoutAdmin()
        navigate('/admin')
    }

    // ====== DELETE ALL VOTES ======
    function handleDeleteAllVotes() {
        setIsDeleteModalOpen(true)
        setDeleteSuccessMsg('')
    }

    async function executeDeleteAllVotes() {
        setDeletingAll(true)
        try {
            const batch = writeBatch(db)

            // 1. Get all votes and delete them
            const votesSnap = await getDocs(collection(db, 'votes'))
            votesSnap.forEach((docSnap) => {
                batch.delete(docSnap.ref)
            })

            // 2. Get all users and reset their hasVoted status
            const usersSnap = await getDocs(collection(db, 'users'))
            usersSnap.forEach((userDoc) => {
                batch.update(userDoc.ref, {
                    hasVoted: false,
                    votedAt: null
                })
            })

            // Commit the batch
            await batch.commit()

            setDeleteSuccessMsg('All voting data has been successfully deleted and voter statuses have been reset.')
            loadDashboardData() // Refresh dashboard completely

            // Auto close modal after 3 seconds
            setTimeout(() => {
                setIsDeleteModalOpen(false)
                setDeleteSuccessMsg('')
            }, 3000)

        } catch (error) {
            console.error('Delete all error:', error)
            setDeleteSuccessMsg('An error occurred while deleting data: ' + error.message)
        }
        setDeletingAll(false)
    }

    // ====== RENDER RANKING ======
    function renderRanking() {
        if (sortedCandidates.length === 0) {
            return (
                <div className={styles.noData}>
                    <i className="fas fa-chart-bar"></i>
                    <p>No voting data available yet</p>
                </div>
            )
        }

        return sortedCandidates.map((candidate, index) => {
            const rankClass = index === 0 ? styles.rank1 :
                index === 1 ? styles.rank2 :
                    index === 2 ? styles.rank3 : ''

            return (
                <div key={candidate.id} className={`${styles.rankingItem} ${rankClass}`}>
                    <div className={styles.rankNumber}>{index + 1}</div>
                    <div className={styles.candidateInfo}>
                        <div className={styles.candidateName}>{candidate.name} ({candidate.number})</div>
                        <div className={styles.candidateStats}>
                            <span>Average: <span className={styles.ratingScore}>{candidate.voteCount > 0 ? candidate.average.toFixed(2) : '0.00'}</span></span>
                            <span>Total Voters: {candidate.voteCount}</span>
                            <span>Total Score: {candidate.totalScore}</span>
                        </div>
                    </div>
                </div>
            )
        })
    }

    // ====== RENDER VOTES TABLE ======
    function renderVotesTable() {
        if (votesData.length === 0) {
            return (
                <div className={styles.noData}>
                    <i className="fas fa-inbox"></i>
                    <p>No voting data available yet</p>
                </div>
            )
        }

        return (
            <table className={styles.votesTable}>
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Name</th>
                        <th>Voting Score</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    {votesData.map(vote => {
                        const voteValues = []
                        let hasValid = false

                        if (vote.ratings) {
                            Object.keys(vote.ratings).forEach(paslonKey => {
                                const item = vote.ratings[paslonKey]
                                if (item && typeof item.rating === 'number') {
                                    const candidateKey = paslonKey === 'paslon1' ? 'A' :
                                        paslonKey === 'paslon2' ? 'B' :
                                            paslonKey === 'paslon3' ? 'C' :
                                                paslonKey === 'paslon4' ? 'D' : paslonKey

                                    const name = paslonData[candidateKey]
                                        ? (paslonData[candidateKey].name || paslonData[candidateKey])
                                        : (item.candidateName || paslonKey)

                                    voteValues.push({ name, rating: item.rating })
                                    hasValid = true
                                }
                            })
                        }

                        return (
                            <tr key={vote.id}>
                                <td className={styles.userId}>{vote.id}</td>
                                <td>{vote.memberName || 'No name'}</td>
                                <td>
                                    <div className={styles.voteValues}>
                                        {hasValid ? voteValues.map((v, i) => (
                                            <div key={i} className={styles.voteValue}>
                                                {v.name}: <strong>*</strong>
                                            </div>
                                        )) : (
                                            <div className={`${styles.voteValue} ${styles.voteValueError}`}>
                                                No score data available
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className={styles.timestamp}>
                                    {vote.timestamp ? new Date(vote.timestamp).toLocaleString('en-US') : 'No data'}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        )
    }

    if (!isAdminLoggedIn) return null

    return (
        <div className={styles.adminBody}>
            <div className={styles.container}>
                {/* Minimal Top Bar */}
                <div className={styles.topBar}>
                    <div className={styles.pageInfo}>
                        <h1 className={styles.pageTitle}>Admin Dashboard</h1>
                        <p className={styles.pageSubtitle}>President & VP Election Data Analysis</p>
                    </div>

                    <div className={styles.topActions}>
                        <div className={styles.totalVotersBadge}>
                            <i className="fas fa-users"></i> {totalVoters} Voters
                        </div>
                        <Link to="/admin/users" className={styles.btnRealtimeMini}>
                            <i className="fas fa-user-cog"></i> <span className={styles.btnText}>Manage Access</span>
                        </Link>
                        <button onClick={handleExport} className={styles.btnExportMini} disabled={exporting}>
                            <i className={`fas ${exporting ? 'fa-spinner fa-spin' : 'fa-file-excel'}`}></i>
                            <span className={styles.btnText}>{exporting ? 'Exporting...' : 'Export'}</span>
                        </button>
                        <button onClick={handleLogout} className={styles.btnLogoutMini}>
                            <i className="fas fa-sign-out-alt"></i> <span className={styles.btnText}>Logout</span>
                        </button>
                    </div>
                </div>

                <div className={styles.mainContent}>
                    <div className={styles.dashboardLayout}>
                        {/* Left Panel - Ranking Paslon */}
                        <div className={styles.rankingColumn}>
                            <h2 className={styles.sectionTitle}>Candidate Ranking</h2>
                            <div className={styles.rankingList}>
                                {renderRanking()}
                            </div>
                        </div>

                        {/* Right Panel - Analytics */}
                        <div className={styles.detailColumn}>
                            {dashboardLoading ? (
                                <LoadingSpinner text="Memuat data voting..." />
                            ) : (
                                <div className={styles.votesSection}>
                                    <div className={styles.sectionHeaderFlex}>
                                        <h2 className={styles.sectionTitle}>Voting Detail</h2>
                                        <button onClick={handleDeleteAllVotes} className={styles.btnDeleteAll} disabled={deletingAll}>
                                            <i className={`fas ${deletingAll ? 'fa-spinner fa-spin' : 'fa-trash'}`}></i> {deletingAll ? 'Deleting...' : 'Delete All'}
                                        </button>
                                    </div>
                                    <div className={styles.votesTableContainer}>
                                        {renderVotesTable()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>⚠️ Warning</h3>

                        {!deleteSuccessMsg ? (
                            <div>
                                <p style={{ marginBottom: '15px', lineHeight: '1.5' }}>
                                    Are you sure you want to <strong>DELETE ALL VOTING RESULTS</strong>?
                                </p>
                                <p style={{ marginBottom: '20px', lineHeight: '1.5', color: '#c62828' }}>
                                    Deleted data cannot be recovered! It is highly recommended to <strong>Export to Excel</strong> first.
                                </p>
                                <div className={styles.modalActions}>
                                    <button onClick={() => setIsDeleteModalOpen(false)} className={styles.btnCancel}>Cancel</button>
                                    <button onClick={executeDeleteAllVotes} className={styles.btnDeleteConfirm} disabled={deletingAll}>
                                        {deletingAll ? 'Deleting...' : 'Yes, Delete All'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p style={{ marginBottom: '20px', lineHeight: '1.5', fontWeight: '500' }}>
                                    {deleteSuccessMsg}
                                </p>
                                <div className={styles.modalActions}>
                                    <button onClick={() => setIsDeleteModalOpen(false)} className={styles.btnCancel}>Close</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
