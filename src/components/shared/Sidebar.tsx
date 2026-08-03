'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutDashboard, FileText, Wrench, Users, UserCog, Building2, Zap, PackagePlus, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()

  const links = [
    { name: 'Bảng điều khiển', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Khách thuê', href: '/tenants', icon: Users },
    { name: 'Quản lý phòng', href: '/rooms', icon: Home },
    { name: 'Hoá đơn', href: '/invoices', icon: DollarSign },
    { name: 'Điện nước', href: '/utilities', icon: Zap },
    { name: 'Bảo trì', href: '/tickets', icon: Wrench },
    { name: 'Tài khoản Quản lý', href: '/managers', icon: UserCog },
    { name: 'Chi nhánh', href: '/branches', icon: Building2 },
    { name: 'Dịch vụ', href: '/services', icon: PackagePlus },
  ]

  return (
    <div className="flex h-full w-full flex-col border-r bg-gray-50/40">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Home className="h-6 w-6 text-primary" />
          <span className="text-lg">RMS Admin</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "")} />
                {link.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
