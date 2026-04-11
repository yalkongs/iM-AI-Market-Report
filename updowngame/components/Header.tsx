'use client'

import { useAuth } from './AuthProvider'
import Link from 'next/link'

export default function Header() {
  const { user, profile, signIn, signOutUser, loginError, loading } = useAuth()

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
      {loginError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-600 text-center">
          ⚠️ {loginError}
        </div>
      )}
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">📈</span>
          <span className="font-black text-gray-800 text-lg">UPDOWN</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">KOSPI</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/leaderboard" className="text-sm text-gray-500 hover:text-gray-800 font-medium">
            🏆 리더보드
          </Link>

          {loading ? (
            <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="" className="w-7 h-7 rounded-full" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                  {profile?.name?.[0] ?? user.displayName?.[0] ?? '?'}
                </div>
              )}
              <button
                onClick={signOutUser}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={signIn}
              className="text-sm bg-gray-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-gray-700 transition"
            >
              로그인
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
