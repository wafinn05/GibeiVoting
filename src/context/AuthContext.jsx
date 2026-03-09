import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [memberAuth, setMemberAuth] = useState(() => {
        const id = sessionStorage.getItem('memberId')
        const name = sessionStorage.getItem('memberName')
        return id && name ? { id, name } : null
    })

    const [adminAuth, setAdminAuth] = useState(() => {
        const id = sessionStorage.getItem('adminId')
        const name = sessionStorage.getItem('adminName')
        return id && name ? { id, name } : null
    })

    const loginMember = useCallback((id, name) => {
        sessionStorage.setItem('memberId', id)
        sessionStorage.setItem('memberName', name)
        setMemberAuth({ id, name })
    }, [])

    const logoutMember = useCallback(() => {
        sessionStorage.removeItem('memberId')
        sessionStorage.removeItem('memberName')
        setMemberAuth(null)
    }, [])

    const loginAdmin = useCallback((id, name) => {
        sessionStorage.setItem('adminId', id)
        sessionStorage.setItem('adminName', name)
        setAdminAuth({ id, name })
    }, [])

    const logoutAdmin = useCallback(() => {
        sessionStorage.removeItem('adminId')
        sessionStorage.removeItem('adminName')
        setAdminAuth(null)
    }, [])

    const value = {
        memberAuth,
        adminAuth,
        isMemberLoggedIn: !!memberAuth,
        isAdminLoggedIn: !!adminAuth,
        loginMember,
        logoutMember,
        loginAdmin,
        logoutAdmin
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
