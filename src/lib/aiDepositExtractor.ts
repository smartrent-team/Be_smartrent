export type DepositExtractionResult = {
  depositAmount: number | null
  currency: 'VND'
  rawTextMatched: string | null
  confidence: number
}

const DEPOSIT_KEYWORDS = [
  'tiền cọc',
  'đặt cọc',
  'cọc phòng',
  'số tiền cọc',
]

const MONEY_PATTERNS = [
  /(\d{1,3}(?:\.\d{3})+(?:,\d+)?)\s*(?:đ|vnđ|vnd)?/gi,
  /(\d{4,})\s*(?:đ|vnđ|vnd)?/gi,
  /(\d+(?:[.,]\d+)?)\s*triệu/gi,
  /(\d+(?:[.,]\d+)?)\s*tr\b/gi,
]

function parseVietnameseAmount(raw: string): number | null {
  const normalized = raw.trim().toLowerCase()

  const trieuMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)\b/)
  if (trieuMatch) {
    const base = Number(trieuMatch[1].replace(',', '.'))
    if (Number.isFinite(base)) return Math.round(base * 1_000_000)
  }

  const digitsOnly = normalized.replace(/[^\d]/g, '')
  if (!digitsOnly) return null

  const amount = Number(digitsOnly)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function extractDepositByRegex(text: string): DepositExtractionResult {
  const lowerText = text.toLowerCase()
  const hasKeyword = DEPOSIT_KEYWORDS.some((kw) => lowerText.includes(kw))

  if (!hasKeyword) {
    return {
      depositAmount: null,
      currency: 'VND',
      rawTextMatched: null,
      confidence: 0,
    }
  }

  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const lineLower = line.toLowerCase()
    if (!DEPOSIT_KEYWORDS.some((kw) => lineLower.includes(kw))) continue

    for (const pattern of MONEY_PATTERNS) {
      pattern.lastIndex = 0
      const match = pattern.exec(line)
      if (match) {
        const amount = parseVietnameseAmount(match[0])
        if (amount != null) {
          return {
            depositAmount: amount,
            currency: 'VND',
            rawTextMatched: line.trim(),
            confidence: 0.65,
          }
        }
      }
    }
  }

  for (const pattern of MONEY_PATTERNS) {
    pattern.lastIndex = 0
    const match = pattern.exec(text)
    if (match) {
      const amount = parseVietnameseAmount(match[0])
      if (amount != null) {
        return {
          depositAmount: amount,
          currency: 'VND',
          rawTextMatched: match[0].trim(),
          confidence: 0.45,
        }
      }
    }
  }

  return {
    depositAmount: null,
    currency: 'VND',
    rawTextMatched: null,
    confidence: 0.2,
  }
}

async function extractDepositByOpenAI(text: string): Promise<DepositExtractionResult | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !text.trim()) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Bạn là trợ lý trích xuất tiền cọc từ hợp đồng thuê phòng tiếng Việt. Trả về JSON với các key: depositAmount (number hoặc null), rawTextMatched (string hoặc null), confidence (0-1).',
        },
        {
          role: 'user',
          content: `Trích xuất tiền cọc từ hợp đồng sau:\n\n${text.slice(0, 12000)}`,
        },
      ],
    }),
  })

  if (!response.ok) return null

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') return null

  try {
    const parsed = JSON.parse(content) as {
      depositAmount?: number | null
      rawTextMatched?: string | null
      confidence?: number
    }

    const depositAmount =
      parsed.depositAmount != null && Number.isFinite(Number(parsed.depositAmount))
        ? Math.round(Number(parsed.depositAmount))
        : null

    return {
      depositAmount,
      currency: 'VND',
      rawTextMatched: parsed.rawTextMatched ?? null,
      confidence:
        typeof parsed.confidence === 'number'
          ? Math.min(1, Math.max(0, parsed.confidence))
          : depositAmount != null
            ? 0.85
            : 0.3,
    }
  } catch {
    return null
  }
}

export async function extractDepositFromContractText(
  text: string
): Promise<DepositExtractionResult> {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      depositAmount: null,
      currency: 'VND',
      rawTextMatched: null,
      confidence: 0,
    }
  }

  const aiResult = await extractDepositByOpenAI(trimmed)
  if (aiResult) return aiResult

  return extractDepositByRegex(trimmed)
}
