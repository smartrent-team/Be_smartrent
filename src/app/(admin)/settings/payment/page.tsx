'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Building, CreditCard, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getPaymentConfig, updatePaymentConfig } from './actions'

const POPULAR_BANKS = [
  { bin: '970436', name: 'Vietcombank', shortName: 'VCB' },
  { bin: '970422', name: 'MBBank', shortName: 'MB' },
  { bin: '970407', name: 'Techcombank', shortName: 'TCB' },
  { bin: '970415', name: 'VietinBank', shortName: 'CTG' },
  { bin: '970418', name: 'BIDV', shortName: 'BIDV' },
  { bin: '970405', name: 'Agribank', shortName: 'VBA' },
  { bin: '970416', name: 'ACB', shortName: 'ACB' },
  { bin: '970432', name: 'VPBank', shortName: 'VPB' },
  { bin: '970423', name: 'TPBank', shortName: 'TPB' },
  { bin: '970403', name: 'Sacombank', shortName: 'STB' },
  { bin: '970437', name: 'HDBank', shortName: 'HDB' },
  { bin: '970441', name: 'VIB', shortName: 'VIB' },
]

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [config, setConfig] = useState({
    bankBin: '',
    accountNumber: '',
    accountName: ''
  })

  const [savedConfig, setSavedConfig] = useState({
    bankBin: '',
    accountNumber: '',
    accountName: ''
  })

  useEffect(() => {
    async function loadData() {
      const res = await getPaymentConfig()
      if (res.success && res.data) {
        const loadedData = {
          bankBin: res.data.payment_bank_bin || '',
          accountNumber: res.data.payment_account_number || '',
          accountName: res.data.payment_account_name || ''
        }
        setConfig(loadedData)
        setSavedConfig(loadedData)
      } else {
        setError(res.error || 'Lỗi tải dữ liệu')
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    
    const formData = new FormData(e.currentTarget)
    const res = await updatePaymentConfig(formData)
    
    if (res.success) {
      setSuccess(true)
      setSavedConfig(config)
      setTimeout(() => setSuccess(false), 3000)
    } else {
      setError(res.error || 'Lỗi khi lưu dữ liệu')
    }
    setSaving(false)
  }

  // Generate preview VietQR if valid
  const previewQr = config.bankBin && config.accountNumber
    ? `https://img.vietqr.io/image/${config.bankBin}-${config.accountNumber}-compact2.png?amount=0&addInfo=DEMO&accountName=${encodeURIComponent((config.accountName || 'CHỦ TÀI KHOẢN').toUpperCase())}`
    : null

  if (loading) {
    return <div className="p-8">Đang tải...</div>
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cài đặt Thanh toán</h1>
        <p className="text-slate-500 mt-2">
          Thiết lập tài khoản ngân hàng để tạo mã VietQR cho khách thuê thanh toán chuyển khoản.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-slate-200/60 shadow-sm">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Thông tin tài khoản</CardTitle>
              <CardDescription>
                Thông tin này sẽ được in trên hóa đơn của cư dân.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-800 bg-red-100 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p>Đã lưu cài đặt thành công!</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bankBin" className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" /> Ngân hàng
                </Label>
                <Select
                  value={config.bankBin}
                  onValueChange={(value) => setConfig({...config, bankBin: value || ''})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn ngân hàng..." />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_BANKS.map((bank) => (
                      <SelectItem key={bank.bin} value={bank.bin}>
                        <span className="font-medium mr-2">{bank.shortName}</span>
                        <span className="text-slate-500">{bank.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="bankBin" value={config.bankBin} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" /> Số tài khoản
                </Label>
                <Input 
                  id="accountNumber" 
                  name="accountNumber" 
                  placeholder="Nhập số tài khoản ngân hàng" 
                  value={config.accountNumber}
                  onChange={(e) => setConfig({...config, accountNumber: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" /> Tên chủ tài khoản
                </Label>
                <Input 
                  id="accountName" 
                  name="accountName" 
                  placeholder="NGUYEN VAN A" 
                  value={config.accountName}
                  onChange={(e) => setConfig({...config, accountName: e.target.value})}
                  required
                  className="uppercase"
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
              </Button>
            </CardContent>
          </form>
        </Card>

        {/* Cột Xem trước QR */}
        <div className="flex flex-col">
          <Card className="border-slate-200/60 shadow-sm flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>Xem trước mã VietQR</CardTitle>
              <CardDescription>Mã mẫu sẽ được hiển thị khi cư dân quét.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/50 rounded-b-xl border-t border-slate-100">
              {previewQr ? (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center relative w-[250px] h-[300px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={previewQr} 
                    alt="VietQR Preview" 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 bg-slate-200 rounded-2xl mx-auto flex items-center justify-center text-slate-400">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-500 max-w-[250px]">
                    Vui lòng nhập Mã BIN và Số tài khoản để xem trước mã QR.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Danh sách tài khoản đã lưu */}
      <Card className="border-slate-200/60 shadow-sm mt-8">
        <CardHeader>
          <CardTitle>Danh sách tài khoản nhận tiền</CardTitle>
          <CardDescription>Tài khoản hiện tại đang được sử dụng để nhận thanh toán từ cư dân.</CardDescription>
        </CardHeader>
        <CardContent>
          {savedConfig.bankBin && savedConfig.accountNumber ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-600">Ngân hàng</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Số tài khoản</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Chủ tài khoản</th>
                      <th className="px-4 py-3 font-medium text-slate-600">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {POPULAR_BANKS.find(b => b.bin === savedConfig.bankBin)?.shortName || savedConfig.bankBin}
                        <span className="block text-xs text-slate-500 font-normal">
                          {POPULAR_BANKS.find(b => b.bin === savedConfig.bankBin)?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">{savedConfig.accountNumber}</td>
                      <td className="px-4 py-3 font-medium">{savedConfig.accountName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          Đang sử dụng
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-200 rounded-lg">
              Chưa có tài khoản nào được thiết lập. Vui lòng điền thông tin và lưu cài đặt.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
