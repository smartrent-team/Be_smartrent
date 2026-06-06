'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateOrganizationStatus } from '../actions'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Lock, Unlock } from 'lucide-react'

type Organization = {
  id: number
  name: string
  contact_phone: string | null
  contact_email: string | null
  status: string
  created_at: string
}

export function OrganizationList({ initialOrgs }: { initialOrgs: Organization[] }) {
  const [orgs, setOrgs] = useState(initialOrgs)
  const [isPending, startTransition] = useTransition()

  const handleToggleStatus = (orgId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    
    startTransition(async () => {
      const res = await updateOrganizationStatus(orgId, newStatus)
      if (res?.error) {
        toast.error(`Lỗi: ${res.error}`)
      } else {
        toast.success(`Đã ${newStatus === 'active' ? 'mở khóa' : 'khóa'} chủ trọ thành công`)
        setOrgs(orgs.map(o => o.id === orgId ? { ...o, status: newStatus } : o))
      }
    })
  }

  return (
    <div className="rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50/50">
          <tr>
            <th className="p-4 text-left font-medium text-gray-500">ID</th>
            <th className="p-4 text-left font-medium text-gray-500">Tên Chủ Trọ / Tổ chức</th>
            <th className="p-4 text-left font-medium text-gray-500">Liên hệ</th>
            <th className="p-4 text-left font-medium text-gray-500">Ngày đăng ký</th>
            <th className="p-4 text-left font-medium text-gray-500">Trạng thái</th>
            <th className="p-4 text-right font-medium text-gray-500">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {orgs.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-gray-500">Chưa có chủ trọ nào</td>
            </tr>
          ) : (
            orgs.map((org) => (
              <tr key={org.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-mono">{org.id}</td>
                <td className="p-4 font-medium">{org.name}</td>
                <td className="p-4 text-gray-600">
                  <div>{org.contact_email}</div>
                  <div>{org.contact_phone}</div>
                </td>
                <td className="p-4 text-gray-600">
                  {format(new Date(org.created_at), 'dd/MM/yyyy HH:mm')}
                </td>
                <td className="p-4">
                  <Badge variant={org.status === 'active' ? 'default' : 'destructive'} className={org.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                    {org.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleToggleStatus(org.id, org.status)}
                    className={org.status === 'active' ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'}
                  >
                    {org.status === 'active' ? (
                      <><Lock className="w-4 h-4 mr-2" /> Khóa tài khoản</>
                    ) : (
                      <><Unlock className="w-4 h-4 mr-2" /> Mở khóa</>
                    )}
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
