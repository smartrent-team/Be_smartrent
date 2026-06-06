import { Loader2 } from 'lucide-react'

export default function AdminLoading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 animate-ping rounded-full bg-teal-100 opacity-75"></div>
        <Loader2 className="relative h-8 w-8 animate-spin text-teal-600" />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        Đang tải dữ liệu, vui lòng đợi...
      </p>
    </div>
  )
}
