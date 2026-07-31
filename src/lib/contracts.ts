import { createAdminClient } from '@/lib/supabase/admin'
import { Client } from 'pg'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContractImagesDbValue = unknown

type ContractImagesResult = {
  id: number
  contractImages: string[]
}

export type CreateContractInput = {
  contractCode: string
  tenantId: number
  roomId: number
  startDate: string
  endDate?: string | null
  depositAmount: number
  monthlyPrice: number
  status?: 'active' | 'expired' | 'terminated'
  contractImages?: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeContractImages(value: ContractImagesDbValue): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.filter(
    (url: unknown): url is string => {
      if (typeof url !== 'string' || url.length === 0) return false
      if (seen.has(url)) return false
      seen.add(url)
      return true
    }
  )
}

function toJsonb(images: string[]) {
  return JSON.stringify(images)
}

// ---------------------------------------------------------------------------
// Raw pg client — chỉ dùng cho INSERT vì Supabase client bị schema-cache
// lỗi với cột jsonb mới thêm.
// ---------------------------------------------------------------------------

function getDirectHost(): string {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('Chưa cấu hình DATABASE_URL')

  const parsed = new URL(connectionString)
  const userParts = parsed.username.split('.')
  const tenantRef = userParts[1] || parsed.hostname.split('.')[0]
  return `db.${tenantRef}.supabase.co`
}

async function withPgClient<T>(executor: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('Chưa cấu hình DATABASE_URL')

  const parsed = new URL(connectionString)
  const password = decodeURIComponent(parsed.password)
  const database = parsed.pathname.substring(1).split('?')[0]

  // Thử direct host trước, fallback về pooler
  const configs = [
    { host: getDirectHost(), port: 5432, user: 'postgres', password, database },
    { host: parsed.hostname, port: 6543, user: parsed.username, password, database },
  ]

  let lastError: unknown = null

  for (const config of configs) {
    const client = new Client({
      ...config,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10_000,
    })
    try {
      await client.connect()
      const result = await executor(client)
      return result
    } catch (err) {
      lastError = err
    } finally {
      await client.end().catch(() => {})
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Kết nối cơ sở dữ liệu thất bại')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isContractImagesSchemaCacheError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('schema cache') && message.includes('contract_images')
}

/**
 * Đọc ảnh hợp đồng theo contract ID — dùng Supabase admin client.
 */
export async function getContractImagesById(contractId: number): Promise<string[]> {
  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from('contracts')
    .select('contract_images')
    .eq('id', contractId)
    .single()

  if (error || !data) return []
  return normalizeContractImages(data.contract_images)
}

/**
 * Đọc ảnh hợp đồng active mới nhất theo tenant ID — dùng Supabase admin client.
 */
export async function getActiveContractImagesByTenantId(tenantId: number): Promise<string[]> {
  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from('contracts')
    .select('contract_images')
    .eq('tenant_id', tenantId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return []
  return normalizeContractImages(data.contract_images)
}

/**
 * Tạo hợp đồng mới kèm ảnh — dùng raw pg vì Supabase client bị schema-cache
 * lỗi với cột contract_images (jsonb).
 */
export async function createContractDirectly(
  input: CreateContractInput
): Promise<ContractImagesResult> {
  const contractImages = input.contractImages ?? []

  const result = await withPgClient((client) =>
    client.query<{ id: number; contract_images: ContractImagesDbValue }>(
      `INSERT INTO contracts (
         contract_code, tenant_id, room_id, start_date,
         end_date, status, deposit_amount, monthly_price, contract_images
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       RETURNING id, contract_images`,
      [
        input.contractCode,
        input.tenantId,
        input.roomId,
        input.startDate,
        input.endDate ?? null,
        input.status ?? 'active',
        input.depositAmount,
        input.monthlyPrice,
        toJsonb(contractImages),
      ]
    )
  )

  const row = result.rows[0]
  if (!row) throw new Error('Không tạo được hợp đồng')

  return {
    id: row.id,
    contractImages: normalizeContractImages(row.contract_images),
  }
}

/**
 * Cập nhật ảnh hợp đồng — dùng raw pg để đảm bảo ghi đúng vào cột jsonb.
 */
export async function updateContractImagesDirectly(
  contractId: number,
  contractImages: string[]
): Promise<ContractImagesResult | null> {
  const result = await withPgClient((client) =>
    client.query<{ id: number; contract_images: ContractImagesDbValue }>(
      `UPDATE contracts
       SET contract_images = $1::jsonb
       WHERE id = $2
       RETURNING id, contract_images`,
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
