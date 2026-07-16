/** Ngày 10 tháng kế tiếp sau ngày lập hóa đơn (23:59). */
export function defaultInvoiceDueDate(issuedAt: Date = new Date()): Date {
  const due = new Date(issuedAt)
  due.setMonth(due.getMonth() + 1)
  due.setDate(10)
  due.setHours(23, 59, 59, 999)
  return due
}

export function isInvoiceOverdue(dueDate: string | null | undefined, now = new Date()): boolean {
  if (!dueDate) return false
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return false
  return now > due
}
