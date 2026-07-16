type InvoiceRoomRef = { branch_id: number | null } | { branch_id: number | null }[] | null

export async function assertManagerCanAccessInvoice(
  supabase: { from: (table: string) => any },
  invoiceId: number,
  role: string,
  branchId: number | null | undefined
): Promise<{ ok: true; invoice: Record<string, unknown> } | { ok: false; error: string; status: number }> {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, invoice_code, total_amount, payment_status, due_date, tenant_id, room_id, rooms(branch_id)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (error) {
    return { ok: false, error: error.message, status: 500 }
  }
  if (!invoice) {
    return { ok: false, error: 'Không tìm thấy hóa đơn', status: 404 }
  }

  if (role === 'super_admin') {
    return { ok: true, invoice }
  }

  if (role !== 'manager' || !branchId) {
    return { ok: false, error: 'Bạn không có quyền thực hiện thao tác này', status: 403 }
  }

  const rooms = invoice.rooms as InvoiceRoomRef
  const room = Array.isArray(rooms) ? rooms[0] : rooms
  if (!room || room.branch_id !== branchId) {
    return { ok: false, error: 'Hóa đơn không thuộc chi nhánh của bạn', status: 403 }
  }

  return { ok: true, invoice }
}
