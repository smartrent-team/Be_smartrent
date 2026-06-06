'use client'

import { QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ViewQRButtonProps {
  invoiceId: string
  amount: number
  bankBin: string
  accountNumber: string
  accountName: string
}

export function ViewQRButton({ invoiceId, amount, bankBin, accountNumber, accountName }: ViewQRButtonProps) {
  const qrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${invoiceId}&accountName=${encodeURIComponent(accountName.toUpperCase())}`

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 gap-1 ml-2">
            <QrCode className="w-4 h-4" />
            <span className="sr-only sm:not-sr-only sm:inline">Xem QR</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mã thanh toán VietQR</DialogTitle>
          <DialogDescription>
            Gửi mã này cho khách thuê để thanh toán hoá đơn {invoiceId}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={qrUrl} 
              alt="VietQR" 
              className="w-[250px] h-[300px] object-contain"
            />
          </div>
          <div className="text-center text-sm space-y-1 text-slate-600">
            <p><strong>Ngân hàng:</strong> {bankBin}</p>
            <p><strong>Số tài khoản:</strong> {accountNumber}</p>
            <p><strong>Chủ tài khoản:</strong> {accountName}</p>
            <p><strong>Số tiền:</strong> {amount.toLocaleString()}đ</p>
            <p><strong>Nội dung:</strong> {invoiceId}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
