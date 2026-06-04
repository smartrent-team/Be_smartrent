// lib/firebaseAdmin.js
import admin from 'firebase-admin';

// Kiểm tra xem ứng dụng Firebase đã được khởi tạo chưa
// Điều này rất quan trọng để tránh khởi tạo lại trong quá trình hot-reloading của Next.js
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Thay thế các ký tự \n trong private key
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    // Nếu bạn sử dụng Realtime Database hoặc Cloud Storage, bạn có thể cần thêm databaseURL
    // databaseURL: "https://your-project-id.firebaseio.com",
  });
}

const firebaseAdmin = admin;
export { firebaseAdmin };
