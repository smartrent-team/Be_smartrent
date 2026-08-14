-- Migration: Create idempotent_payments table and process_payment_webhook RPC

-- 1. Create idempotent_payments table
CREATE TABLE IF NOT EXISTS idempotent_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'vnpay' or 'payos'
    invoice_id BIGINT REFERENCES invoices(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id, provider)
);

-- 2. Create the RPC function for atomic payment processing
CREATE OR REPLACE FUNCTION process_payment_webhook(
    p_order_id TEXT,
    p_provider TEXT,
    p_invoice_id BIGINT,
    p_amount NUMERIC
) RETURNS json AS $$
DECLARE
    v_existing_record RECORD;
    v_invoice RECORD;
    v_updated BOOLEAN;
BEGIN
    -- Kiểm tra Idempotency Key
    SELECT * INTO v_existing_record FROM idempotent_payments 
    WHERE order_id = p_order_id AND provider = p_provider AND status = 'success'
    FOR UPDATE; -- Lock row if exists

    IF FOUND THEN
        RETURN json_build_object('success', true, 'message', 'Already processed (idempotent)', 'already_paid', true);
    END IF;

    -- Kiểm tra Invoice
    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Invoice not found', 'already_paid', false);
    END IF;

    IF v_invoice.payment_status = 'paid' THEN
        -- Có thể đã được thanh toán qua kênh khác, ghi nhận idempotent record để tránh lặp
        INSERT INTO idempotent_payments (order_id, provider, invoice_id, amount, status)
        VALUES (p_order_id, p_provider, p_invoice_id, p_amount, 'success')
        ON CONFLICT (order_id, provider) DO NOTHING;

        RETURN json_build_object('success', true, 'message', 'Invoice already paid', 'already_paid', true);
    END IF;

    -- Optimistic Locking & Update Invoice
    UPDATE invoices
    SET payment_status = 'paid', paid_at = NOW()
    WHERE id = p_invoice_id AND payment_status != 'paid';

    IF NOT FOUND THEN
        -- Optimistic lock failed (Trạng thái đã bị đổi bởi process khác ngay lúc đang chạy)
        RETURN json_build_object('success', false, 'message', 'Failed to update invoice (concurrent update)', 'already_paid', false);
    END IF;

    -- Insert Idempotency Record
    INSERT INTO idempotent_payments (order_id, provider, invoice_id, amount, status)
    VALUES (p_order_id, p_provider, p_invoice_id, p_amount, 'success');

    -- Trả về JSON thành công
    RETURN json_build_object('success', true, 'message', 'Payment processed successfully', 'already_paid', false);
EXCEPTION WHEN OTHERS THEN
    -- Rollback everything on exception
    RAISE;
END;
$$ LANGUAGE plpgsql;
