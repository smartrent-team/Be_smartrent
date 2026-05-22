export const sendPushNotification = async (token: string, title: string, body: string) => {
  // TODO: Đổi link và Server Key này thành thông tin dự án Firebase của bạn
  // Hoặc đổi sang code gọi thư viện firebase-admin tuỳ ý
  const fcmUrl = process.env.FCM_SERVER_URL || 'https://fcm.googleapis.com/fcm/send'
  const fcmServerKey = process.env.FCM_SERVER_KEY || 'YOUR_SERVER_KEY'

  try {
    console.log(`Bắn notification tới token: ${token}`)
    
    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          sound: 'default',
        },
      }),
    })

    const data = await response.json()
    console.log('Kết quả FCM:', data)
    return data
  } catch (error) {
    console.error('Lỗi khi gửi thông báo FCM:', error)
  }
}
