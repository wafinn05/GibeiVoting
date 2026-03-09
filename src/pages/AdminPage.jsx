import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
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

        // ====== REALTIME SUBSCRIPTION ======
        const votesSubscription = supabase
            .channel('any')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
                loadDashboardData() // Reload on any change
            })
            .subscribe()

        return () => {
            supabase.removeChannel(votesSubscription)
        }
    }, [isAdminLoggedIn])

    // ====== LOAD DASHBOARD DATA ======
    async function loadDashboardData() {
        // Only show full loading on first load
        if (votesData.length === 0) setDashboardLoading(true)

        try {
            // 1. Fetch Candidates (Paslon)
            const { data: paslonArr, error: paslonError } = await supabase
                .from('candidates')
                .select('*')
                .order('candidate_number', { ascending: true })

            if (paslonError) throw paslonError

            const paslonMap = {}
            paslonArr.forEach(p => {
                paslonMap[p.id] = {
                    name: p.candidate_name,
                    number: p.candidate_number,
                    shortName: `Paslon ${p.candidate_number}`
                }
            })

            // 2. Fetch Votes
            const { data: votes, error: votesError } = await supabase
                .from('votes')
                .select('*')
                .order('created_at', { ascending: false })

            if (votesError) throw votesError

            // Process statistics
            const candidateStats = {}
            paslonArr.forEach(p => {
                candidateStats[p.id] = {
                    name: p.candidate_name,
                    number: p.candidate_number,
                    shortName: `Paslon ${p.candidate_number}`,
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
                            if (candidateStats[paslonKey]) {
                                candidateStats[paslonKey].totalScore += item.rating
                                candidateStats[paslonKey].voteCount += 1
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
            setPaslonData(paslonMap)
        } catch (error) {
            console.error('Error loading dashboard:', error)
            // Silently fail if we already have data
            if (votesData.length === 0) alert('Failed to load dashboard data: ' + error.message)
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
            // 1. Delete all votes
            const { error: deleteVotesError } = await supabase
                .from('votes')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000') // Mass delete hack for Supabase

            if (deleteVotesError) throw deleteVotesError

            // 2. Reset all voters 'has_voted' status
            const { error: resetVotersError } = await supabase
                .from('voters')
                .update({ has_voted: false, voted_at: null })
                .eq('has_voted', true)

            if (resetVotersError) throw resetVotersError

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
                                    const name = paslonData[paslonKey]
                                        ? (paslonData[paslonKey].name || paslonData[paslonKey])
                                        : (item.candidateName || paslonKey)

                                    voteValues.push({ name, rating: item.rating })
                                    hasValid = true
                                }
                            })
                        }

                        return (
                            <tr key={vote.id}>
                                <td className={styles.userId}>{vote.voter_id}</td>
                                <td>{vote.voter_name || 'No name'}</td>
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
                                    {vote.created_at ? new Date(vote.created_at).toLocaleString('en-US') : 'No data'}
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
