import { Link } from 'react-router-dom'
import styles from './LandingPage.module.css'

const LOGO_URL = '/logo.png'

export default function LandingPage() {
    return (
        <div className={styles.landingBody}>
            <div className={styles.container}>
                {/* Panel Kiri */}
                <div className={styles.leftPanel}>
                    <img src={LOGO_URL} alt="GIBEI" className={styles.logo} />
                    <h1 className={styles.title}>President &amp; Vice President Election</h1>
                    <p className={styles.subtitle}>Digital Voting System</p>

                    <div className={styles.infoBox}>
                        <h3>New Leadership Election</h3>
                        <p>Participate in determining the new direction of the organization through a secure and transparent digital election.</p>
                    </div>
                </div>

                {/* Panel Kanan */}
                <div className={styles.rightPanel}>
                    <h2 className={styles.votingTitle}>President &amp; Vice President Election</h2>
                    <p className={styles.votingSubtitle}>Log in to the voting system to cast your vote for the President and Vice President.</p>

                    <div className={styles.buttonContainer}>
                        <Link to="/login" className={`${styles.actionBtn} ${styles.btnPrimary}`}>
                            <i className={`fas fa-vote-yea ${styles.btnIcon}`}></i>
                            Voting
                        </Link>

                        <Link to="/admin" className={`${styles.actionBtn} ${styles.btnSecondary}`}>
                            <i className={`fas fa-tachometer-alt ${styles.btnIcon}`}></i>
                            Dashboard
                        </Link>
                    </div>

                    <div className={styles.instructions}>
                        <h3>Voting Instructions:</h3>
                        <ul className={styles.instructionList}>
                            <li><i className="fas fa-check-circle"></i> Log in to the voting system</li>
                            <li><i className="fas fa-check-circle"></i> Select President &amp; Vice President candidates</li>
                            <li><i className="fas fa-check-circle"></i> Confirm your selection</li>
                            <li><i className="fas fa-check-circle"></i> Wait for official voting results</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
