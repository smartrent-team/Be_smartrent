import { Client, type QueryResultRow } from 'pg'

type ContractImagesDbValue = unknown

type ContractImagesResult = {
  id: number
  contractImages: string[]
}

type CreateContractInput = {
  contractCode: string
  tenantId: number
  roomId: number
  startDate: string
  depositAmount: number
  monthlyPrice: number
  status?: 'active' | 'expired' | 'terminated'
  contractImages?: string[]
}

type DatabaseConfig = {
  name: string
  host: string
  port: number
  user: string
  password: string
  database: string
}

let resolvedConfig: DatabaseConfig | null = null

function normalizeContractImages(value: ContractImagesDbValue): string[] {
  if (!Array.isArray(value)) return []

  return value.filter(
    (url: unknown): url is string => typeof url === 'string' && url.length > 0
  )
}

function toJsonb(images: string[]) {
  return JSON.stringify(images)
}

function getDatabaseConfigs(): DatabaseConfig[] {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured')
  }

  const parsed = new URL(connectionString)
  const password = decodeURIComponent(parsed.password)
  const database = parsed.pathname.substring(1).split('?')[0]
  const userParts = parsed.username.split('.')
  const tenantRef = userParts[1] || parsed.hostname.split('.')[0]
  const directSniHost = `db.${tenantRef}.supabase.co`

  return [
    {
      name: 'Direct SNI Host (Port 5432, postgres user)',
      host: directSniHost,
      port: 5432,
      user: 'postgres',
      password,
      database,
    },
    {
      name: 'Direct Connection (Port 5432, full username)',
      host: parsed.hostname,
      port: 5432,
      user: parsed.username,
      password,
      database,
    },
    {
      name: 'Pooler Connection (Port 6543, full username)',
      host: parsed.hostname,
      port: 6543,
      user: parsed.username,
      password,
      database,
    },
  ]
}

async function withDatabaseClient<T>(
  executor: (client: Client) => Promise<T>
): Promise<T> {
  const configs = getDatabaseConfigs()
  const attemptedConfigs = resolvedConfig
    ? [resolvedConfig, ...configs.filter((config) => !isSameConfig(config, resolvedConfig))]
    : configs

  let lastError: unknown = null

  for (const config of attemptedConfigs) {
    const client = new Client({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 10_000,
    })

    try {
      await client.connect()
      const result = await executor(client)
      resolvedConfig = config
      return result
    } catch (error: unknown) {
      lastError = error
    } finally {
      await client.end().catch(() => {})
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }

  throw new Error('All connection configurations failed')
}

function isSameConfig(left: DatabaseConfig, right: DatabaseConfig) {
  return (
    left.host === right.host &&
    left.port === right.port &&
    left.user === right.user &&
    left.database === right.database
  )
}

export function isContractImagesSchemaCacheError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('schema cache') && message.includes('contract_images')
}

export async function getContractImagesById(contractId: number): Promise<string[]> {
  const result = await withDatabaseClient((client) =>
    client.query<{ contract_images: ContractImagesDbValue }>(
      'SELECT contract_images FROM contracts WHERE id = $1 LIMIT 1',
      [contractId]
    )
  )

  return normalizeContractImages(result.rows[0]?.contract_images)
}

export async function getActiveContractImagesByTenantId(tenantId: number): Promise<string[]> {
  const result = await withDatabaseClient((client) =>
    client.query<{ contract_images: ContractImagesDbValue }>(
      `
        SELECT contract_images
        FROM contracts
        WHERE tenant_id = $1
        ORDER BY id DESC
        LIMIT 1
      `,
      [tenantId]
    )
  )

  return normalizeContractImages(result.rows[0]?.contract_images)
}

export async function createContractDirectly(
  input: CreateContractInput
): Promise<ContractImagesResult> {
  const contractImages = input.contractImages ?? []
  const result = await withDatabaseClient((client) =>
    client.query<{ id: number; contract_images: ContractImagesDbValue }>(
      `
        INSERT INTO contracts (
          contract_code,
          tenant_id,
          room_id,
          start_date,
          status,
          deposit_amount,
          monthly_price,
          contract_images
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        RETURNING id, contract_images
      `,
      [
        input.contractCode,
        input.tenantId,
        input.roomId,
        input.startDate,
        input.status ?? 'active',
        input.depositAmount,
        input.monthlyPrice,
        toJsonb(contractImages),
      ]
    )
  )

  const row = result.rows[0]

  if (!row) {
    throw new Error('Không tạo được hợp đồng')
  }

  return {
    id: row.id,
    contractImages: normalizeContractImages(row.contract_images),
  }
}

export async function updateContractImagesDirectly(
  contractId: number,
  contractImages: string[]
): Promise<ContractImagesResult | null> {
  const result = await withDatabaseClient((client) =>
    client.query<{ id: number; contract_images: ContractImagesDbValue }>(
      `
        UPDATE contracts
        SET contract_images = $1::jsonb
        WHERE id = $2
        RETURNING id, contract_images
      `,
      [toJsonb(contractImages), contractId]
    )
  )

  const row = result.rows[0]
  if (!row) return null

  return {
    id: row.id,
    contractImages: normalizeContractImages(row.contract_images),
  }
}
