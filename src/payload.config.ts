import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { openapi, swaggerUI } from 'payload-oapi'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Branches } from './collections/Branches'
import { Rooms } from './collections/Rooms'
import { Tenants } from './collections/Tenants'
import { Invoices } from './collections/Invoices'
import { Contracts } from './collections/Contracts'
import { MaintenanceTickets } from './collections/MaintenanceTickets'
import { DeviceTokens } from './collections/DeviceTokens'
import { OtpVerifications } from './collections/OtpVerifications'
import { UtilityLogs } from './collections/UtilityLogs'
import { UtilityAnomalies } from './collections/UtilityAnomalies'
import { Payments } from './collections/Payments'
import { Notifications } from './collections/Notifications'
import { AuditLogs } from './collections/AuditLogs'

import { payOSWebhook } from './endpoints/payos-webhook'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      beforeNavLinks: [
        '@/components/DashboardLink#DashboardLink',
      ],
      views: {
        dashboard: {
          Component: '@/components/Dashboard#default',
        },
      },
    },
  },
  cors: [
    'http://localhost:3000',
    'https://your-mobile-app-domain.com', // Replace with real Flutter app domain if needed
  ],
  endpoints: [

    {
      path: '/payos-webhook',
      method: 'post',
      handler: payOSWebhook,
    },
  ],
  collections: [
    Users,
    Media,
    Branches,
    Rooms,
    Tenants,
    Invoices,
    Contracts,
    MaintenanceTickets,
    DeviceTokens,
    OtpVerifications,
    UtilityLogs,
    UtilityAnomalies,
    Payments,
    Notifications,
    AuditLogs,
  ],
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
  plugins: [
    openapi({
      openapiVersion: '3.0',
      metadata: {
        title: 'Smart Rent API',
        description: 'Tài liệu API cho ứng dụng Quản lý phòng trọ',
        version: '1.0.0',
      },
    }),
    swaggerUI({
      docsUrl: '/api/docs',
    }),
  ],
})
