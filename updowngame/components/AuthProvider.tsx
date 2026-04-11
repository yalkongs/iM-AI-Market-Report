'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider, db } from '@/lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { UserProfile } from '@/lib/types'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  loginError: string | null
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  loginError: null,
  signIn: async () => {},
  signOutUser: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginError, setLoginError] = useState<string | null>(null)

  const loadProfile = async (u: User) => {
    const docRef = doc(db, 'users', u.uid)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      setProfile(docSnap.data() as UserProfile)
    } else {
      // Firestore 문서가 없으면 Auth 정보로 프로필 생성
      const newProfile: UserProfile = {
        uid: u.uid,
        email: u.email || '',
        name: u.displayName || '익명',
        photoURL: u.photoURL || '',
        currentStreak: 0,
        maxStreak: 0,
        totalBets: 0,
        correctBets: 0,
        lastBetDate: null,
        updatedAt: Date.now(),
      }
      await setDoc(docRef, newProfile)
      setProfile(newProfile)
    }
  }

  useEffect(() => {
    // 안전장치: onAuthStateChanged가 5초 내에 응답 없으면 강제 로딩 해제
    // (Firebase 초기화 실패, 네트워크 차단, SDK 오류 등 모든 케이스 방어)
    const timeoutId = setTimeout(() => {
      console.warn('[Auth] onAuthStateChanged 5초 초과 — 강제 로딩 해제')
      setLoading(false)
    }, 5000)

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      clearTimeout(timeoutId)
      setUser(u)
      if (u) {
        try {
          await loadProfile(u)
        } catch (e) {
          // loadProfile 실패 시에도 user는 유지, profile만 null로 처리
          console.error('[Auth] 프로필 로드 오류:', e)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      // 항상 실행 보장 — 실행되지 않으면 authLoading이 영원히 true가 됨
      setLoading(false)
    })

    return () => {
      clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [])

  const signIn = async () => {
    setLoginError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const u = result.user

      // 이름/사진 항상 최신으로 업데이트 후 프로필 로드
      const userRef = doc(db, 'users', u.uid)
      const existing = await getDoc(userRef)
      if (existing.exists()) {
        await setDoc(userRef, {
          name: u.displayName,
          photoURL: u.photoURL,
          email: u.email,
          updatedAt: Date.now(),
        }, { merge: true })
      }
      // loadProfile이 문서 없을 때 자동 생성
      await loadProfile(u)
    } catch (e: unknown) {
      console.error('로그인 오류:', e)
      const code = (e as { code?: string })?.code || ''
      const msg = (e as { message?: string })?.message || String(e)
      if (code === 'auth/popup-blocked') {
        setLoginError('팝업이 차단됐습니다. 브라우저 팝업 허용 후 다시 시도해 주세요.')
      } else if (code === 'auth/unauthorized-domain') {
        setLoginError('이 도메인은 Firebase에 등록되지 않았습니다. (auth/unauthorized-domain)')
      } else if (code === 'auth/popup-closed-by-user') {
        // 사용자가 닫은 경우 — 무시
      } else {
        setLoginError(`로그인 오류: ${code || msg}`)
      }
    }
  }

  const signOutUser = async () => {
    await signOut(auth)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) await loadProfile(user)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginError, signIn, signOutUser, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
