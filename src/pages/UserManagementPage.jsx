import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import styles from './UserManagementPage.module.css'

export default function UserManagementPage() {
    const navigate = useNavigate()
    const { isAdminLoggedIn } = useAuth()

    const [activeTab, setActiveTab] = useState('voters') // 'voters' | 'admins' | 'candidates'
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const [users, setUsers] = useState([])
    const [admins, setAdmins] = useState([])
    const [candidates, setCandidates] = useState([])

    // Form Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState('add') // 'add' | 'edit' | 'delete' | 'deleteAll'
    const [formData, setFormData] = useState({ id: '', name: '', role: '', candidate_number: '' })

    useEffect(() => {
        if (!isAdminLoggedIn) {
            navigate('/admin', { replace: true })
            return
        }
        fetchData()
    }, [isAdminLoggedIn, navigate])

    const fetchData = async () => {
        try {
            setLoading(true)
            setErrorMsg('')

            // Fetch voters
            const { data: votersList, error: votersError } = await supabase
                .from('voters')
                .select('*')
                .order('id', { ascending: true })

            if (votersError) throw votersError
            setUsers(votersList.map(v => ({ id: v.id, name: v.full_name, hasVoted: v.has_voted })))

            // Fetch admins
            const { data: adminsList, error: adminsError } = await supabase
                .from('administrators')
                .select('*')
                .order('id', { ascending: true })

            if (adminsError) throw adminsError
            setAdmins(adminsList.map(a => ({ id: a.id, name: a.full_name })))

            // Fetch candidates
            const { data: candList, error: candError } = await supabase
                .from('candidates')
                .select('*')
                .order('candidate_number', { ascending: true })

            if (candError) throw candError
            setCandidates(candList.map(c => ({ id: c.id, name: c.candidate_name, number: c.candidate_number })))

        } catch (err) {
            console.error("Error fetching data:", err)
            setErrorMsg('Failed to load data from database.')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenAddModal = () => {
        setFormData({ id: '', name: '', role: activeTab === 'admins' ? 'administrator' : '', candidate_number: '' })
        setModalMode('add')
        setErrorMsg('')
        setIsModalOpen(true)
    }

    const handleOpenEditModal = (item) => {
        setFormData({
            id: item.id,
            name: item.name,
            role: item.role || '',
            candidate_number: item.number || ''
        })
        setModalMode('edit')
        setErrorMsg('')
        setIsModalOpen(true)
    }

    const handleOpenDeleteModal = (item) => {
        setFormData({ id: item.id, name: item.name, role: item.role || '' })
        setModalMode('delete')
        setErrorMsg('')
        setIsModalOpen(true)
    }

    const handleOpenDeleteAllModal = () => {
        setModalMode('deleteAll')
        setErrorMsg('')
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
    }

    const handleSubmitForm = async (e) => {
        e.preventDefault()
        const { id, name, candidate_number } = formData

        if (activeTab !== 'candidates' && (!id.trim() || !name.trim())) {
            setErrorMsg('ID and Name cannot be empty.')
            return
        }

        if (activeTab === 'candidates' && (!name.trim() || !candidate_number)) {
            setErrorMsg('Candidate Name and Number cannot be empty.')
            return
        }

        try {
            setActionLoading(true)
            setErrorMsg('')

            let tableName = ''
            let payload = {}

            if (activeTab === 'voters') {
                tableName = 'voters'
                payload = { id: id.trim(), full_name: name.trim() }
            } else if (activeTab === 'admins') {
                tableName = 'administrators'
                payload = { id: id.trim(), full_name: name.trim() }
            } else {
                tableName = 'candidates'
                payload = {
                    candidate_name: name.trim(),
                    candidate_number: candidate_number.trim()
                }
                if (modalMode === 'edit') {
                    payload.id = id
                } else {
                    payload.id = `paslon${candidate_number.trim()}`
                }
            }

            const { error } = await supabase
                .from(tableName)
                .upsert(payload)

            if (error) throw error

            await fetchData()
            setIsModalOpen(false)
        } catch (err) {
            console.error("Error saving record:", err)
            setErrorMsg('Failed to save action. Check your connection.')
        } finally {
            setActionLoading(false)
        }
    }

    const executeDelete = async () => {
        try {
            setActionLoading(true)
            setErrorMsg('')
            const tableName = activeTab === 'voters' ? 'voters' : activeTab === 'admins' ? 'administrators' : 'candidates'
            const documentId = String(formData.id).trim()

            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', documentId)

            if (error) throw error

            await fetchData()
            setIsModalOpen(false)
        } catch (err) {
            console.error("Error deleting record:", err)
            setErrorMsg(`Failed to delete data: ${err.message}`)
        } finally {
            setActionLoading(false)
        }
    }

    const executeDeleteAll = async () => {
        try {
            setActionLoading(true)
            setErrorMsg('')
            const tableName = activeTab === 'voters' ? 'voters' : activeTab === 'admins' ? 'administrators' : 'candidates'

            // Mass delete in Supabase
            const { error } = await supabase
                .from(tableName)
                .delete()
                .neq('id', 'MASS_DELETE_TRICK_ID_THAT_DOES_NOT_EXIST')

            if (error) throw error

            await fetchData()
            setIsModalOpen(false)
        } catch (err) {
            console.error("Error batch deleting:", err)
            setErrorMsg(`Failed to delete all data: ${err.message}`)
        } finally {
            setActionLoading(false)
        }
    }

    const renderTable = (dataList) => {
        if (loading) return <LoadingSpinner text="Loading list..." />
        if (dataList.length === 0) return <div className={styles.emptyState}>No data found in this category</div>

        const idLabel = activeTab === 'candidates' ? 'No. Urut' : 'User ID / NIM'
        const nameLabel = activeTab === 'candidates' ? 'Nama Paslon' : 'Full Name'

        return (
            <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <th className={styles.colId}>{idLabel}</th>
                            <th className={styles.colName}>{nameLabel}</th>
                            <th className={styles.colAction}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dataList.map(item => (
                            <tr key={item.id}>
                                <td style={{ fontFamily: 'monospace' }}>{activeTab === 'candidates' ? item.number : item.id}</td>
                                <td>{item.name}</td>
                                <td>
                                    <div className={styles.actionsCell}>
                                        <button onClick={() => handleOpenEditModal(item)} className={styles.btnEdit}><i className="fas fa-edit"></i> Edit</button>
                                        <button onClick={() => handleOpenDeleteModal(item)} className={styles.btnDelete}><i className="fas fa-trash"></i> Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    if (!isAdminLoggedIn) return null

    return (
        <div className={styles.adminBody}>
            <div className={styles.container}>

                {/* Header Section */}
                <div className={styles.topBar}>
                    <div>
                        <h1 className={styles.pageTitle}>Manage Access & Data</h1>
                        <p className={styles.pageSubtitle}>System database management for voters, admins, and candidates</p>
                    </div>
                    <div className={styles.topActions}>
                        <Link to="/admin/dashboard" className={styles.btnBack}>
                            <i className="fas fa-arrow-left"></i> Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Main Content */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'voters' ? styles.active : ''}`}
                        onClick={() => setActiveTab('voters')}
                    >
                        Voters Data
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'admins' ? styles.active : ''}`}
                        onClick={() => setActiveTab('admins')}
                    >
                        Admin Data
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'candidates' ? styles.active : ''}`}
                        onClick={() => setActiveTab('candidates')}
                    >
                        Candidates Data
                    </button>
                </div>

                {errorMsg && (
                    <div className={styles.errorBar}>
                        <i className="fas fa-exclamation-circle"></i> {errorMsg}
                    </div>
                )}

                <div className={styles.contentCard}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            {activeTab === 'voters' ? 'Registered Voters List' :
                                activeTab === 'admins' ? 'Assistants List' : 'Candidates List'}
                        </h2>
                        <div className={styles.sectionHeaderActions}>
                            {activeTab !== 'admins' && (
                                <button onClick={handleOpenDeleteAllModal} className={styles.btnDeleteAll}>
                                    <i className="fas fa-trash-alt"></i> Delete All
                                </button>
                            )}
                            <button onClick={handleOpenAddModal} className={styles.btnAdd}>
                                <i className="fas fa-plus"></i> Add {activeTab === 'voters' ? 'Voter' : activeTab === 'admins' ? 'Admin' : 'Candidate'}
                            </button>
                        </div>
                    </div>

                    {renderTable(activeTab === 'voters' ? users : activeTab === 'admins' ? admins : candidates)}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>
                            {modalMode === 'add' ? 'Add Data' : modalMode === 'edit' ? 'Edit Data' :
                                modalMode === 'delete' ? 'Delete Data' : 'Delete All Data'} {
                                activeTab === 'voters' ? 'Voter' : activeTab === 'admins' ? 'Admin' : 'Candidate'
                            }
                        </h3>

                        {modalMode === 'delete' ? (
                            <div>
                                <p style={{ marginBottom: '20px', lineHeight: '1.5' }}>
                                    Are you sure you want to delete <strong>{formData.name}</strong>? This action cannot be undone.
                                </p>
                                <div className={styles.modalActions}>
                                    <button onClick={handleCloseModal} className={styles.btnCancel}>Cancel</button>
                                    <button onClick={executeDelete} className={styles.btnDeleteConfirm} disabled={actionLoading}>
                                        {actionLoading ? 'Deleting...' : 'Yes, Delete'}
                                    </button>
                                </div>
                            </div>
                        ) : modalMode === 'deleteAll' ? (
                            <div>
                                <p style={{ marginBottom: '20px', lineHeight: '1.5', color: '#d32f2f', fontWeight: 'bold' }}>
                                    WARNING: This will permanently delete ALL {
                                        activeTab === 'voters' ? 'Voters' : activeTab === 'candidates' ? 'Candidates' : 'Admins'
                                    } from the database! This action is IRREVERSIBLE.
                                </p>
                                <div className={styles.modalActions}>
                                    <button onClick={handleCloseModal} className={styles.btnCancel}>Cancel</button>
                                    <button onClick={executeDeleteAll} className={styles.btnDeleteConfirm} disabled={actionLoading}>
                                        {actionLoading ? 'Deleting Everything...' : 'Yes, Delete All'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitForm}>
                                {activeTab === 'candidates' ? (
                                    <>
                                        <div className={styles.formGroup}>
                                            <label>Candidate Number (No. Urut)</label>
                                            <input
                                                type="text"
                                                value={formData.candidate_number || ''}
                                                onChange={e => setFormData({ ...formData, candidate_number: e.target.value })}
                                                placeholder="e.g. 01, 02"
                                                required
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Candidate Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Full Candidate Name"
                                                required
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className={styles.formGroup}>
                                            <label>User ID / NIM</label>
                                            <input
                                                type="text"
                                                value={formData.id}
                                                onChange={e => setFormData({ ...formData, id: e.target.value })}
                                                placeholder={activeTab === 'voters' ? 'Enter NIM / ID' : 'Admin ID'}
                                                disabled={modalMode === 'edit'}
                                                required
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Full Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Full Name"
                                                required
                                            />
                                        </div>
                                    </>
                                )}

                                <div className={styles.modalActions}>
                                    <button type="button" onClick={handleCloseModal} className={styles.btnCancel}>Cancel</button>
                                    <button type="submit" className={styles.btnSave} disabled={actionLoading}>
                                        {actionLoading ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
