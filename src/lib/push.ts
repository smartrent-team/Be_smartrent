import { App, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

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

/**
 * Gửi push notification qua Firebase Admin SDK (FCM v1 API).
 * Thay thế Legacy FCM API (fcm.googleapis.com/fcm/send) đã bị xoá từ 06/2024.
 */
export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  try {
    const app = getFirebaseAdminApp()
    const messaging = getMessaging(app)

    console.log(`Gửi notification tới token: ${token}`)

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

    console.log('FCM message ID:', response)
  } catch (error) {
    console.error('Lỗi khi gửi thông báo FCM:', error)
  }
}
