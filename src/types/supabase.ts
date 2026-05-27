export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: number
          created_at: string
          room_code: string
          branch_id: number | null
          floor: number
          area: number
          base_price: number
          status: 'available' | 'occupied' | 'maintenance'
          electric_price: number | null
          water_price: number | null
          images: string[] | null
        }
        Insert: Omit<Database['public']['Tables']['rooms']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>
      }
      tenants: {
        Row: {
          id: number
          created_at: string
          user_id: string
          room_id: number | null
          move_in_date: string
          move_out_date: string | null
          deposit_amount: number | null
        }
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      invoices: {
        Row: {
          id: number
          created_at: string
          tenant_id: number
          room_id: number
          invoice_code: string
          total_amount: number
          payment_status: 'paid' | 'unpaid' | 'partial'
          issued_at: string
          paid_at: string | null
          payment_link_id: string | null
          checkoutUrl: string | null
          qrPayload: string | null
          room_price: number
          service_cost: number
          electric_cost: number
          water_cost: number
          electric_old: number | null
          electric_new: number | null
          water_old: number | null
          water_new: number | null
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      contracts: {
        Row: {
          id: number
          created_at: string
          tenant_id: number
          room_id: number
          start_date: string
          end_date: string | null
          deposit_amount: number | null
          contract_images: string[] | null
          status: 'active' | 'expired' | 'terminated'
        }
        Insert: Omit<Database['public']['Tables']['contracts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['contracts']['Insert']>
      }
      maintenance_tickets: {
        Row: {
          id: number
          created_at: string
          room_id: number
          tenant_id: number
          title: string
          description: string | null
          priority: 'low' | 'medium' | 'high'
          status: 'pending' | 'in-progress' | 'resolved'
        }
        Insert: Omit<Database['public']['Tables']['maintenance_tickets']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['maintenance_tickets']['Insert']>
      }
      users: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          role: 'super_admin' | 'manager' | 'tenant' | null
          branch_id: number | null
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
    }
  }
}
