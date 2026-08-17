import { App, cert, getApps, initializeApp } from 'firebase-admin/app'
import { FirebaseMessagingError, getMessaging } from 'firebase-admin/messaging'

function sanitizeEnvValue(val: string | undefined): string | undefined {
  if (!val) return val
  let clean = val.trim()
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.substring(1, clean.length - 1)
  }
  if (clean.startsWith("'") && clean.endsWith("'")) {
    clean = clean.substring(1, clean.length - 1)
  }
  return clean.trim()
}

// Initialize Firebase Admin App (singleton pattern)
function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const projectId = sanitizeEnvValue(process.env.FIREBASE_PROJECT_ID)
  const clientEmail = sanitizeEnvValue(process.env.FIREBASE_CLIENT_EMAIL)
  const rawPrivateKey = sanitizeEnvValue(process.env.FIREBASE_PRIVATE_KEY)
  const privateKey = rawPrivateKey?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Thiếu biến môi trường Firebase Admin (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)')
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

export type PushSendResult =
  | { ok: true; messageId: string }
  | { ok: false; staleToken: boolean; code?: string }

function isStaleTokenError(error: unknown): boolean {
  if (error instanceof FirebaseMessagingError) {
    return (
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-registration-token'
    )
  }

  const code = (error as { errorInfo?: { code?: string } })?.errorInfo?.code
  return (
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token'
  )
}

function maskToken(token: string): string {
  if (token.length <= 12) return '***'
  return `${token.slice(0, 8)}...${token.slice(-6)}`
}

/**
 * Gửi push notification qua Firebase Admin SDK (FCM v1 API).
 * Thay thế Legacy FCM API (fcm.googleapis.com/fcm/send) đã bị xoá từ 06/2024.
 */
export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<PushSendResult> => {
  try {
    const app = getFirebaseAdminApp()
    const messaging = getMessaging(app)

    const response = await messaging.send({
      token,
      notification: {
        title,
        body,
      },
      ...(data && Object.keys(data).length > 0 ? { data } : {}),
      android: {
        notification: {
          sound: 'default',
          channelId: 'smart_rent_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    })

    return { ok: true, messageId: response }
  } catch (error) {
    if (isStaleTokenError(error)) {
      console.warn(
        `[FCM] Token không còn hợp lệ (${maskToken(token)}), sẽ xóa khỏi device_tokens.`
      )
      const code =
        error instanceof FirebaseMessagingError
          ? error.code
          : (error as { errorInfo?: { code?: string } })?.errorInfo?.code
      return { ok: false, staleToken: true, code }
    }

    console.error(`[FCM] Gửi thông báo thất bại (${maskToken(token)}):`, error)
    return { ok: false, staleToken: false }
  }
}
