import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
    return (
        <div className={styles.notFoundBody}>
            <div className={styles.message}>
                <h2>404</h2>
                <h1>Page Not Found</h1>
                <p>The specified file was not found on this website. Please check the URL for mistakes and try again.</p>
                <Link to="/" className={styles.btnHome}>Kembali ke Beranda</Link>
            </div>
        </div>
    )
}
