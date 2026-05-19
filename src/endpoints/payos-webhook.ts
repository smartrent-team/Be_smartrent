import { PayloadHandler } from 'payload'
import { payos } from '../utils/payos'

export const payOSWebhook: PayloadHandler = async (req) => {
  try {
    if (!req.json) {
      return Response.json({ error: 'Request body is required' }, { status: 400 })
    }

    const body = await req.json()

    // Verify webhook data sent from payOS
    const webhookData = await payos.webhooks.verify(body)

    if (webhookData.code === '00') {
      const invoiceId = webhookData.orderCode // invoice ID from our DB

      // Fetch invoice to verify it exists and is unpaid
      const invoice = await req.payload.findByID({
        collection: 'invoices',
        id: invoiceId,
        req,
      })

      if (!invoice) {
        return Response.json({ error: `Invoice with ID ${invoiceId} not found` }, { status: 404 })
      }

      if (invoice.status === 'paid') {
        return Response.json({ message: 'Invoice already marked as paid' }, { status: 200 })
      }

      // Update invoice status to 'paid'
      await req.payload.update({
        collection: 'invoices',
        id: invoiceId,
        data: {
          status: 'paid',
        },
        context: { skipPayOSHooks: true }, // prevent infinite loops
        req, // Thread transaction
      })

      return Response.json({ success: true, message: 'Payment successfully updated' }, { status: 200 })
    }

    return Response.json({ success: false, message: 'Payment not completed or failed' }, { status: 200 })
  } catch (error) {
    console.error('PayOS Webhook Error:', error)
    return Response.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
