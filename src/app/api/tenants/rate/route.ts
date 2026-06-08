import { NextResponse } from 'next/server'
import { verifyRole } from '@/lib/rbac'

export async function POST(req: Request) {
  try {
    const { user, supabase, organizationId, role } = await verifyRole()
    
    if (!user || (role !== 'super_admin' && role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized. Only super_admin and manager can rate.' }, { status: 403 })
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization attached to user.' }, { status: 400 })
    }

    const { tenant_id, rating, comment } = await req.json()

    if (!tenant_id || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
    }

    // 1. Fetch tenant's identity_number and user's phone
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('identity_number, users(phone)')
      .eq('id', tenant_id)
      .single()

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 })
    }

    const identityNumber = tenant.identity_number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRow = Array.isArray(tenant.users) ? tenant.users[0] : tenant.users as any
    const phone = userRow?.phone

    if (!identityNumber) {
      return NextResponse.json({ error: 'Tenant does not have an identity number.' }, { status: 400 })
    }

    // 2. Insert rating
    const { error: insertErr } = await supabase
      .from('tenant_ratings')
      .insert({
        identity_number: identityNumber,
        phone: phone,
        organization_id: organizationId,
        rating,
        comment
      })

    if (insertErr) {
      console.error('Error inserting rating:', insertErr)
      return NextResponse.json({ error: 'Failed to save rating.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Rating saved successfully.' })

  } catch (error) {
    console.error('API /tenants/rate error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
