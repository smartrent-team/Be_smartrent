import { getLatestEffectiveContract } from '@/lib/contract-selection'
import { replaceContractImagesForRoomChange } from '@/lib/contract-images'

describe('getLatestEffectiveContract', () => {
  it('should prefer the newest active contract instead of an older one', () => {
    const contracts = [
      { id: 101, status: 'expired', start_date: '2024-01-01', end_date: '2024-12-31' },
      { id: 202, status: 'active', start_date: '2025-02-01', end_date: '2026-02-28' },
      { id: 303, status: 'active', start_date: '2025-03-01', end_date: '2026-03-31' },
    ]

    expect(getLatestEffectiveContract(contracts)?.id).toBe(303)
  })

  it('should also handle pending checkout / inspection states as effective contracts', () => {
    const contracts = [
      { id: 11, status: 'active', start_date: '2024-01-01', end_date: '2025-01-31' },
      { id: 12, status: 'inspection', start_date: '2025-02-01', end_date: '2026-02-28' },
    ]

    expect(getLatestEffectiveContract(contracts)?.id).toBe(12)
  })
})

describe('replaceContractImagesForRoomChange', () => {
  it('should discard old room images and keep only the newest room contract images', () => {
    const oldImages = ['old-room-1.jpg', 'old-room-2.jpg']
    const newImages = ['new-room-1.jpg', 'new-room-2.jpg']

    expect(replaceContractImagesForRoomChange(oldImages, newImages)).toEqual(newImages)
    expect(replaceContractImagesForRoomChange(oldImages, newImages)).not.toContain('old-room-1.jpg')
  })
})
