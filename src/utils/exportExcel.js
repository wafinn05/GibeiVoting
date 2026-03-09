import * as XLSX from 'xlsx'
import { supabase } from '../services/supabase'

export async function exportToExcel() {
    try {
        // 1. Fetch Candidates (Paslon)
        const { data: paslonArr, error: paslonError } = await supabase
            .from('candidates')
            .select('*')
            .order('candidate_number', { ascending: true })

        if (paslonError) throw paslonError

        // 2. Fetch Votes
        const { data: votes, error: votesError } = await supabase
            .from('votes')
            .select('*')
            .order('created_at', { ascending: true })

        if (votesError) throw votesError

        // Process statistics
        const candidateStats = {}
        const paslonMap = {}

        paslonArr.forEach(p => {
            paslonMap[p.id] = { name: p.candidate_name, number: p.candidate_number }
            candidateStats[p.id] = {
                name: p.candidate_name,
                number: p.candidate_number,
                totalScore: 0,
                voteCount: 0,
                average: 0
            }
        })

        let totalAllItems = 0
        let totalAllVotes = 0

        votes.forEach(vote => {
            if (vote.ratings) {
                Object.keys(vote.ratings).forEach(paslonKey => {
                    const item = vote.ratings[paslonKey]
                    if (item && typeof item.rating === 'number') {
                        if (candidateStats[paslonKey]) {
                            candidateStats[paslonKey].totalScore += item.rating
                            candidateStats[paslonKey].voteCount += 1
                            totalAllItems += item.rating
                            totalAllVotes += 1
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

        const sortedCandidates = Object.keys(candidateStats)
            .map(key => ({ id: key, ...candidateStats[key] }))
            .sort((a, b) => b.average - a.average)

        // CREATE WORKBOOK
        const wb = XLSX.utils.book_new()

        // Sheet 1: Summary Results
        const summaryData = [
            ['GIBEI VOTING RESULTS REPORT'],
            ['Export Date', new Date().toLocaleString('en-US')],
            ['Total Unique Voters', votes.length],
            [''],
            ['VOTING SUMMARY'],
            ['Rank', 'Candidate Name', 'Average Score', 'Total Rated Us', 'Total Score']
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
        wsSummary['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Voting Summary')

        // Sheet 2: Voting Detail
        const detailData = [
            ['INDIVIDUAL VOTING DETAIL'],
            ['No.', 'User ID', 'Name', 'Timestamp']
        ]

        paslonArr.forEach(p => {
            detailData[1].push(p.candidate_name)
        })

        votes.forEach((vote, index) => {
            const row = [
                index + 1,
                vote.voter_id,
                vote.voter_name || 'N/A',
                vote.created_at ? new Date(vote.created_at).toLocaleString('en-US') : 'N/A'
            ]

            paslonArr.forEach(p => {
                let ratingValue = '-'
                if (vote.ratings && vote.ratings[p.id]) {
                    ratingValue = vote.ratings[p.id].rating
                }
                row.push(ratingValue)
            })

            detailData.push(row)
        })

        const wsDetail = XLSX.utils.aoa_to_sheet(detailData)
        XLSX.utils.book_append_sheet(wb, wsDetail, 'Individual Details')

        // Sheet 3: Statistics
        const overallAvg = totalAllVotes > 0 ? (totalAllItems / totalAllVotes).toFixed(2) : '0.00'

        const statsData = [
            ['GIBEI VOTING STATISTICS'],
            ['Metric', 'Value'],
            ['Total Voters', votes.length],
            ['Total Individual Ratings', totalAllVotes],
            ['Overall Rating Average', overallAvg],
            ['Top Candidate', sortedCandidates.length > 0 ? sortedCandidates[0].name : 'N/A'],
            ['Top Candidate Average', sortedCandidates.length > 0 ? sortedCandidates[0].average.toFixed(2) : '0.00']
        ]

        const wsStats = XLSX.utils.aoa_to_sheet(statsData)
        wsStats['!cols'] = [{ wch: 25 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(wb, wsStats, 'Statistics')

        // Export file
        const fileName = `GIBEI_Voting_Results_${new Date().toISOString().split('T')[0]}.xlsx`
        XLSX.writeFile(wb, fileName)
    } catch (error) {
        console.error('Excel Export Error:', error)
        throw error
    }
}
