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

/** Gộp nhiều danh sách ảnh — giữ thứ tự, bỏ trùng URL. */
export function mergeContractImages(...groups: string[][]): string[] {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const group of groups) {
    for (const url of group) {
      if (!url || seen.has(url)) continue
      seen.add(url)
      merged.push(url)
    }
  }
  return merged
}

function toJsonb(images: string[]) {
  return JSON.stringify(images)
}

// ---------------------------------------------------------------------------
// Raw pg client — chỉ dùng cho INSERT vì Supabase client bị schema-cache
// lỗi với cột jsonb mới thêm.
// ---------------------------------------------------------------------------

function assertValidDatabaseUrl(connectionString: string): void {
  try {
    new URL(connectionString)
  } catch {
    const missingAt = !connectionString.includes('@')
    throw new Error(
      missingAt
        ? 'DATABASE_URL sai định dạng: thiếu ký tự @ giữa mật khẩu và host. ' +
          'Ví dụ: postgresql://USER:PASSWORD@aws-0-xxx.pooler.supabase.com:5432/postgres'
        : 'DATABASE_URL không hợp lệ. Nếu mật khẩu có ký tự đặc biệt (@, #, /...), hãy URL-encode (vd. @ → %40).'
    )
  }
}

async function withPgClient<T>(executor: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) throw new Error('Chưa cấu hình DATABASE_URL')

  assertValidDatabaseUrl(connectionString)

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  })

  try {
    await client.connect()
    return await executor(client)
  } finally {
    await client.end().catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isContractImagesSchemaCacheError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('schema cache') && message.includes('contract_images')
}

/** PG không dùng được — thiếu/sai DATABASE_URL, sai mật khẩu, hoặc không kết nối được. */
export function isPgUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const code = (error as { code?: string })?.code
  return (
    code === '28P01' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    message.includes('password authentication failed') ||
    message.includes('Chưa cấu hình DATABASE_URL') ||
    message.includes('DATABASE_URL sai định dạng') ||
    message.includes('DATABASE_URL không hợp lệ') ||
    message.includes('connection timeout') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND')
  )
}

/**
 * Đọc ảnh hợp đồng qua raw pg — đáng tin cậy hơn Supabase (tránh schema-cache jsonb).
 */
export async function getContractImagesByIdDirect(contractId: number): Promise<string[]> {
  const result = await withPgClient((client) =>
    client.query<{ contract_images: ContractImagesDbValue }>(
      `SELECT contract_images FROM contracts WHERE id = $1`,
      [contractId]
    )
  )
  const row = result.rows[0]
  if (!row) return []
  return normalizeContractImages(row.contract_images)
}

/**
 * Đọc ảnh hợp đồng theo contract ID.
 * Ưu tiên raw pg; fallback Supabase admin nếu chưa cấu hình DATABASE_URL.
 */
export async function getContractImagesById(contractId: number): Promise<string[]> {
  if (process.env.DATABASE_URL) {
    try {
      return await getContractImagesByIdDirect(contractId)
    } catch (pgError) {
      console.error('getContractImagesById – pg fallback to supabase:', pgError)
    }
  }

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

export type UpdateContractOnRoomChangeInput = {
  roomId: number
  monthlyPrice: number
  startDate?: string | null
  endDate?: string | null
  contractImages?: string[]
}

export type RoomChangeTransactionInput = {
  tenantId: number
  contractId: number
  oldRoomId: number
  newRoomId: number
  moveInIso: string
  endIso: string | null
  monthlyPrice: number
  contractImages: string[]
}

/**
 * Đổi phòng trong một transaction PG — contract + tenant + trạng thái phòng cùng lúc.
 */
export async function applyRoomChangeTransaction(
  input: RoomChangeTransactionInput
): Promise<ContractImagesResult> {
  return withPgClient(async (client) => {
    await client.query('BEGIN')

    try {
      const existingResult = await client.query<{ contract_images: ContractImagesDbValue }>(
        `SELECT contract_images FROM contracts WHERE id = $1 FOR UPDATE`,
        [input.contractId]
      )
      const existingRow = existingResult.rows[0]
      if (!existingRow) {
        throw new Error(`Không tìm thấy hợp đồng id=${input.contractId}`)
      }

      const mergedImages = mergeContractImages(
        normalizeContractImages(existingRow.contract_images),
        input.contractImages
      )
      if (mergedImages.length === 0) {
        throw new Error('Bắt buộc phải có ít nhất một ảnh hợp đồng')
      }

      const contractSets = [
        'room_id = $2',
        'monthly_price = $3',
        'start_date = $4',
        'contract_images = $5::jsonb',
      ]
      const contractParams: unknown[] = [
        input.contractId,
        input.newRoomId,
        input.monthlyPrice,
        input.moveInIso,
        toJsonb(mergedImages),
      ]
      let paramIndex = 6

      if (input.endIso) {
        contractSets.push(`end_date = $${paramIndex++}`)
        contractParams.push(input.endIso)
      }

      const contractUpdate = await client.query<{ id: number; contract_images: ContractImagesDbValue }>(
        `UPDATE contracts SET ${contractSets.join(', ')} WHERE id = $1 RETURNING id, contract_images`,
        contractParams
      )
      if (!contractUpdate.rows[0]) {
        throw new Error('Không thể cập nhật hợp đồng')
      }

      const tenantUpdate = await client.query(
        `UPDATE tenants SET room_id = $2, move_in_date = $3 WHERE id = $1`,
        [input.tenantId, input.newRoomId, input.moveInIso]
      )
      if (tenantUpdate.rowCount !== 1) {
        throw new Error('Không thể cập nhật hồ sơ cư dân')
      }

      const oldRoomCount = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM tenants
         WHERE room_id = $1 AND move_out_date IS NULL`,
        [input.oldRoomId]
      )
      if (parseInt(oldRoomCount.rows[0]?.count ?? '0', 10) === 0) {
        await client.query(`UPDATE rooms SET status = 'available' WHERE id = $1`, [input.oldRoomId])
      }

      await client.query(`UPDATE rooms SET status = 'occupied' WHERE id = $1`, [input.newRoomId])

      await client.query('COMMIT')

      return {
        id: contractUpdate.rows[0].id,
        contractImages: normalizeContractImages(contractUpdate.rows[0].contract_images),
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })
}

/**
 * Cập nhật hợp đồng khi đổi phòng — ghi trực tiếp qua raw pg (jsonb + metadata).
 */
export async function updateContractOnRoomChangeDirectly(
  contractId: number,
  input: UpdateContractOnRoomChangeInput
): Promise<ContractImagesResult | null> {
  const sets = ['room_id = $2', 'monthly_price = $3']
  const params: unknown[] = [contractId, input.roomId, input.monthlyPrice]
  let paramIndex = 4

  if (input.startDate) {
    sets.push(`start_date = $${paramIndex++}`)
    params.push(input.startDate)
  }
  if (input.endDate) {
    sets.push(`end_date = $${paramIndex++}`)
    params.push(input.endDate)
  }
  if (input.contractImages && input.contractImages.length > 0) {
    sets.push(`contract_images = $${paramIndex++}::jsonb`)
    params.push(toJsonb(input.contractImages))
  }

  const result = await withPgClient((client) =>
    client.query<{ id: number; contract_images: ContractImagesDbValue }>(
      `UPDATE contracts
       SET ${sets.join(', ')}
       WHERE id = $1
       RETURNING id, contract_images`,
      params
    )
  )

  const row = result.rows[0]
  if (!row) return null

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
): Promise<ContractImagesResult> {
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
  if (!row) {
    throw new Error(`Không tìm thấy hợp đồng id=${contractId} để lưu ảnh`)
  }

  return {
    id: row.id,
    contractImages: normalizeContractImages(row.contract_images),
  }
}
