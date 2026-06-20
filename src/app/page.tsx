import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white">
        <Link className="flex items-center justify-center gap-2" href="/">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl tracking-tight">SmartRent</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="/login">
            Đăng nhập
          </Link>
          <Link href="/login">
            <Button>Bắt đầu ngay</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1 bg-gray-50">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex justify-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Quản Lý Phòng Trọ <span className="text-primary">Thông Minh</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400 mt-4">
                  Giải pháp toàn diện giúp bạn quản lý người thuê, thu phí tự động qua PayOS, điện nước và báo cáo sự cố một cách dễ dàng và hiệu quả.
                </p>
              </div>
              <div className="space-x-4 pt-4">
                <Link href="/login">
                  <Button size="lg" className="h-12 px-8 text-base">Truy cập hệ thống</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} SmartRent. Tất cả các quyền được bảo lưu.
        </p>
      </footer>
    </div>
  )
}
