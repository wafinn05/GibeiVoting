import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, getDocs, doc, deleteDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import styles from './UserManagementPage.module.css'

export default function UserManagementPage() {
    const navigate = useNavigate()
    const { isAdminLoggedIn } = useAuth()

    const [activeTab, setActiveTab] = useState('voters') // 'voters' | 'admins'
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const [users, setUsers] = useState([])
    const [admins, setAdmins] = useState([])

    // Form Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState('add') // 'add' | 'edit' | 'delete'
    const [formData, setFormData] = useState({ id: '', name: '', role: '' })

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

            // Fetch voters (users)
            const usersSnap = await getDocs(collection(db, 'users'))
            const usersList = []
            usersSnap.forEach(snap => {
                usersList.push({ id: snap.id, ...snap.data() })
            })
            setUsers(usersList)

            // Fetch admins
            const adminsSnap = await getDocs(collection(db, 'admins'))
            const adminsList = []
            adminsSnap.forEach(snap => {
                adminsList.push({ id: snap.id, ...snap.data() })
            })
            setAdmins(adminsList)

        } catch (err) {
            console.error("Error fetching data:", err)
            setErrorMsg('Failed to load data from database.')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenAddModal = () => {
        setFormData({ id: '', name: '', role: activeTab === 'admins' ? 'administrator' : '' })
        setModalMode('add')
        setErrorMsg('')
        setIsModalOpen(true)
    }

    const handleOpenEditModal = (item) => {
        setFormData({ id: item.id, name: item.name, role: item.role || '' })
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
        const { id, name, role } = formData

        if (!id.trim() || !name.trim()) {
            setErrorMsg('ID and Name cannot be empty.')
            return
        }

        try {
            setActionLoading(true)
            setErrorMsg('')
            const collectionName = activeTab === 'voters' ? 'users' : 'admins'
            const docRef = doc(db, collectionName, id.trim())

            const payload = { name: name.trim() }
            if (activeTab === 'admins') {
                payload.role = 'administrator'
            }

            if (modalMode === 'add') {
                await setDoc(docRef, payload)
            } else {
                await updateDoc(docRef, payload)
            }

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
            const collectionName = activeTab === 'voters' ? 'users' : 'admins'
            const documentId = String(formData.id).trim()

            console.log(`Attempting to delete doc: "${documentId}" from collection: ${collectionName}`)

            const docRef = doc(db, collectionName, documentId)
            await deleteDoc(docRef)

            console.log(`Successfully executed delete on doc: "${documentId}"`)
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
            const collectionName = activeTab === 'voters' ? 'users' : 'admins'
            const snapshot = await getDocs(collection(db, collectionName))

            if (snapshot.empty) {
                setErrorMsg('No data to delete.')
                setIsModalOpen(false)
                return
            }

            const batch = writeBatch(db)
            snapshot.forEach(doc => {
                batch.delete(doc.ref)
            })

            await batch.commit()
            console.log(`Successfully executed batch delete on collection: ${collectionName}`)
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

        return (
            <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <th className={styles.colId}>User ID / NIM</th>
                            <th className={styles.colName}>Full Name</th>
                            <th className={styles.colAction}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dataList.map(item => (
                            <tr key={item.id}>
                                <td style={{ fontFamily: 'monospace' }}>{item.id}</td>
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
                        <h1 className={styles.pageTitle}>Manage Access</h1>
                        <p className={styles.pageSubtitle}>Voters and Administrators database management</p>
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
                </div>

                {errorMsg && (
                    <div className={styles.errorBar}>
                        <i className="fas fa-exclamation-circle"></i> {errorMsg}
                    </div>
                )}

                <div className={styles.contentCard}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            {activeTab === 'voters' ? 'Registered Voters List' : 'Assistants List'}
                        </h2>
                        <div className={styles.sectionHeaderActions}>
                            {activeTab === 'voters' && (
                                <button onClick={handleOpenDeleteAllModal} className={styles.btnDeleteAll}>
                                    <i className="fas fa-trash-alt"></i> Delete All
                                </button>
                            )}
                            <button onClick={handleOpenAddModal} className={styles.btnAdd}>
                                <i className="fas fa-plus"></i> Add {activeTab === 'voters' ? 'Voter' : 'Admin'}
                            </button>
                        </div>
                    </div>

                    {renderTable(activeTab === 'voters' ? users : admins)}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>
                            {modalMode === 'add' ? 'Add Data' : modalMode === 'edit' ? 'Edit Data' : 'Delete Data'} {activeTab === 'voters' ? 'Voter' : 'Admin'}
                        </h3>

                        {modalMode === 'delete' ? (
                            <div>
                                <p style={{ marginBottom: '20px', lineHeight: '1.5' }}>
                                    Are you sure you want to delete access for <strong>{formData.name}</strong> ({formData.id})? This action cannot be undone.
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
                                    WARNING: This will permanently delete ALL {activeTab === 'voters' ? 'Voters' : 'Admins'} from the database! This action is IRREVERSIBLE.
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
                                <div className={styles.formGroup}>
                                    <label>User ID / NIM</label>
                                    <input
                                        type="text"
                                        value={formData.id}
                                        onChange={e => setFormData({ ...formData, id: e.target.value })}
                                        placeholder={activeTab === 'voters' ? 'Enter NIM / ID' : 'Admin ID'}
                                        disabled={modalMode === 'edit'} // ID cannot be updated directly
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
