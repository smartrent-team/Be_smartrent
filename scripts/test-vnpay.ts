import { attachVNPayToInvoice } from '../src/lib/invoice-payment'
import { createAdminClient } from '../src/lib/supabase/admin'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() {
  console.log('Testing VNPay generation flow...')
  
  const supabase = createAdminClient()
  
  const mockInvoice = {
    id: 999999999,
    invoice_code: 'INV-TEST-' + Date.now(),
    total_amount: 150000 // 150k
  }

  console.log('Mock Invoice Data:', mockInvoice)

  try {
    const { payment, warning } = await attachVNPayToInvoice(
      supabase,
      mockInvoice,
      '127.0.0.1'
    )

    if (warning) {
      console.log('Warning received:', warning)
    }

    if (payment) {
      console.log('✅ VNPay Checkout URL generated successfully:')
      console.log(payment.checkoutUrl)
      
      // Basic validation of the URL parameters
      const url = new URL(payment.checkoutUrl)
      console.log('Validating parameters:')
      console.log('- vnp_TmnCode:', url.searchParams.get('vnp_TmnCode') === process.env.VNPAY_TMN_CODE ? 'OK' : 'FAIL')
      console.log('- vnp_Amount:', url.searchParams.get('vnp_Amount') === String(mockInvoice.total_amount * 100) ? 'OK' : 'FAIL')
      console.log('- vnp_TxnRef:', url.searchParams.get('vnp_TxnRef'))
      console.log('- vnp_SecureHash is present:', !!url.searchParams.get('vnp_SecureHash') ? 'OK' : 'FAIL')
    } else {
      console.log('❌ Failed to generate payment.')
    }
    
  } catch (err) {
    console.error('Error during test:', err)
  }
}

run()
