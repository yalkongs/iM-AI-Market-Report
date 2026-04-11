import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let _adminApp: App | null = null
let _adminDb: Firestore | null = null

function getAdminApp(): App {
  if (_adminApp) return _adminApp

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim()
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin 환경변수가 설정되지 않았습니다. ' +
      'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY를 확인하세요.'
    )
  }

  const existing = getApps().find(a => a.name === 'admin')
  if (existing) {
    _adminApp = existing
    return _adminApp
  }

  _adminApp = initializeApp(
    {
      credential: cert({ projectId, clientEmail, privateKey }),
    },
    'admin'
  )
  return _adminApp
}

export function getAdminDb(): Firestore {
  if (_adminDb) return _adminDb
  _adminDb = getFirestore(getAdminApp())
  return _adminDb
}

// 하위 호환성을 위한 proxy (실제 호출 시점에 초기화)
export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    const db = getAdminDb()
    const value = (db as any)[prop]
    return typeof value === 'function' ? value.bind(db) : value
  },
})
