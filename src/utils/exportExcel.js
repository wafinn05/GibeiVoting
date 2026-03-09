import * as XLSX from 'xlsx'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

export async function exportToExcel() {
    // Ambil data
    const votesSnap = await getDocs(collection(db, 'votes'))
    const paslonDoc = await getDoc(doc(db, 'VotingGIBEI', 'Paslon'))
    const paslonData = paslonDoc.exists() ? paslonDoc.data() : {}

    const votesData = []
    votesSnap.forEach(docSnap => {
        votesData.push({
            id: docSnap.id,
            ...docSnap.data()
        })
    })

    // Hitung statistics
    const candidateStats = {}
    Object.keys(paslonData).forEach(key => {
        candidateStats[key] = {
            name: paslonData[key].name || paslonData[key],
            number: paslonData[key].number || key,
            shortName: paslonData[key].shortName || `Paslon ${key}`,
            totalScore: 0,
            voteCount: 0,
            average: 0
        }
    })

    let totalAllScores = 0
    let totalAllVotes = 0

    votesData.forEach(vote => {
        if (vote.ratings) {
            Object.keys(vote.ratings).forEach(paslonKey => {
                const paslonDataItem = vote.ratings[paslonKey]
                if (paslonDataItem && typeof paslonDataItem.rating === 'number') {
                    const candidateKey = paslonKey === 'paslon1' ? 'A' :
                        paslonKey === 'paslon2' ? 'B' :
                            paslonKey === 'paslon3' ? 'C' :
                                paslonKey === 'paslon4' ? 'D' : paslonKey

                    if (candidateStats[candidateKey]) {
                        candidateStats[candidateKey].totalScore += paslonDataItem.rating
                        candidateStats[candidateKey].voteCount += 1
                        totalAllScores += paslonDataItem.rating
                        totalAllVotes += 1
                    }
                }
            })
        }
    })

    // Hitung rata-rata
    Object.keys(candidateStats).forEach(key => {
        if (candidateStats[key].voteCount > 0) {
            candidateStats[key].average = candidateStats[key].totalScore / candidateStats[key].voteCount
        }
    })

    // Urutkan ranking
    const sortedCandidates = Object.keys(candidateStats)
        .map(key => ({ id: key, ...candidateStats[key] }))
        .sort((a, b) => b.average - a.average)

    // BUAT WORKBOOK
    const wb = XLSX.utils.book_new()

    // Sheet 1: Ringkasan Hasil
    const summaryData = [
        ['LAPORAN HASIL VOTING GIBEI'],
        ['Tanggal Export', new Date().toLocaleString('id-ID')],
        ['Total Voters', votesData.length],
        [''],
        ['RINGKASAN HASIL VOTING'],
        ['Ranking', 'Nama Paslon', 'Rata-rata', 'Total Voters', 'Total Score']
    ]

    sortedCandidates.forEach((candidate, index) => {
        summaryData.push([
            index + 1,
            candidate.name,
            candidate.voteCount > 0 ? candidate.average.toFixed(2) : '0.00',
            candidate.voteCount,
            candidate.totalScore
        ])
    })

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
    wsSummary['!cols'] = [
        { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
    ]
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Hasil')

    // Sheet 2: Detail Voting
    const detailData = [
        ['DETAIL VOTING PER USER'],
        ['No.', 'ID User', 'Nama', 'Timestamp']
    ]

    Object.keys(paslonData).forEach(key => {
        const candidateName = paslonData[key].name || paslonData[key]
        detailData[1].push(candidateName)
    })

    votesData.forEach((vote, index) => {
        const row = [
            index + 1,
            vote.id,
            vote.memberName || 'N/A',
            vote.timestamp ? new Date(vote.timestamp).toLocaleString('id-ID') : 'N/A'
        ]

        Object.keys(paslonData).forEach(key => {
            const paslonKey = key === 'A' ? 'paslon1' :
                key === 'B' ? 'paslon2' :
                    key === 'C' ? 'paslon3' :
                        key === 'D' ? 'paslon4' : `paslon${key}`

            let ratingValue = ''
            if (vote.ratings && vote.ratings[paslonKey]) {
                const ratingData = vote.ratings[paslonKey]
                if (typeof ratingData.rating === 'number') {
                    ratingValue = ratingData.rating
                }
            }
            row.push(ratingValue)
        })

        detailData.push(row)
    })

    const wsDetail = XLSX.utils.aoa_to_sheet(detailData)
    const detailColWidths = [
        { wch: 8 }, { wch: 25 }, { wch: 25 }, { wch: 20 }
    ]
    Object.keys(paslonData).forEach(() => {
        detailColWidths.push({ wch: 12 })
    })
    wsDetail['!cols'] = detailColWidths
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Voting')

    // Sheet 3: Statistik
    const overallAvg = totalAllVotes > 0 ? (totalAllScores / totalAllVotes).toFixed(2) : '0.00'
    const topCandidate = sortedCandidates.length > 0 ? sortedCandidates[0].name : 'N/A'

    const statsData = [
        ['STATISTIK VOTING GIBEI'],
        ['Metric', 'Nilai'],
        ['Total Voters', votesData.length],
        ['Total Votes', totalAllVotes],
        ['Rata-rata Keseluruhan', overallAvg],
        ['Paslon Terbaik', topCandidate],
        ['Rata-rata Paslon Terbaik', sortedCandidates.length > 0 ? sortedCandidates[0].average.toFixed(2) : 'N/A']
    ]

    const wsStats = XLSX.utils.aoa_to_sheet(statsData)
    wsStats['!cols'] = [{ wch: 25 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, wsStats, 'Statistik')

    // Export file
    const fileName = `Hasil_Voting_GIBEI_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
}
