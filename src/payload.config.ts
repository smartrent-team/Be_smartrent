import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Branches } from './collections/Branches'
import { Rooms } from './collections/Rooms'
import { Tenants } from './collections/Tenants'
import { Invoices } from './collections/Invoices'
import { Contracts } from './collections/Contracts'
import { MaintenanceTickets } from './collections/MaintenanceTickets'
import { processKYC } from './endpoints/process-kyc'
import { payOSWebhook } from './endpoints/payos-webhook'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  cors: [
    'http://localhost:3000',
    'https://your-mobile-app-domain.com', // Replace with real Flutter app domain if needed
  ],
  endpoints: [
    {
      path: '/process-kyc',
      method: 'post',
      handler: processKYC,
    },
    {
      path: '/payos-webhook',
      method: 'post',
      handler: payOSWebhook,
    },
  ],
  collections: [Users, Media, Branches, Rooms, Tenants, Invoices, Contracts, MaintenanceTickets],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
