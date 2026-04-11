import { unstable_cache } from 'next/cache'
import { adminDb } from '@/lib/firebase-admin'
import { UserProfile, LeaderboardEntry } from '@/lib/types'

export const getLeaderboard = unstable_cache(
  async (): Promise<LeaderboardEntry[]> => {
    try {
      const snapshot = await adminDb
        .collection('users')
        .orderBy('currentStreak', 'desc')
        .limit(50)
        .get()

      return snapshot.docs
        .filter(doc => (doc.data() as UserProfile).totalBets > 0)
        .map(doc => {
          const data = doc.data() as UserProfile
          return {
            uid: data.uid,
            name: data.name,
            photoURL: data.photoURL,
            currentStreak: data.currentStreak || 0,
            maxStreak: data.maxStreak || 0,
            totalBets: data.totalBets || 0,
            correctBets: data.correctBets || 0,
            accuracy: data.totalBets > 0
              ? Math.round((data.correctBets / data.totalBets) * 100)
              : 0,
          }
        })
    } catch {
      return []
    }
  },
  ['leaderboard'],
  { revalidate: 30, tags: ['leaderboard'] }
)
