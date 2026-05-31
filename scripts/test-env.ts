import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
console.log("Secret length:", process.env.VNP_HASHSECRET?.length);
console.log("Secret bytes:", Buffer.from(process.env.VNP_HASHSECRET || '').toJSON().data);
