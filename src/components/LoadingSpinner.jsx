import styles from './LoadingSpinner.module.css'

export default function LoadingSpinner({ text = 'Memuat...', large = false }) {
    return (
        <div className={styles.loading}>
            <div className={`${styles.spinner} ${large ? styles.spinnerLarge : ''}`}></div>
            <p>{text}</p>
        </div>
    )
}
