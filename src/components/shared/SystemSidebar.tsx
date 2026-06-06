'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Server } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SystemSidebar() {
  const pathname = usePathname()

  const links = [
    { name: 'Tổng quan SaaS', href: '/system-admin/dashboard', icon: LayoutDashboard },
    { name: 'Quản lý Chủ Trọ', href: '/system-admin/organizations', icon: Building2 },
  ]

  return (
    <div className="flex h-full w-full flex-col border-r bg-slate-900 text-slate-100">
      <div className="flex h-14 items-center border-b border-slate-800 px-4 lg:h-[60px] lg:px-6">
        <Link href="/system-admin/dashboard" className="flex items-center gap-2 font-semibold">
          <Server className="h-6 w-6 text-emerald-500" />
          <span className="text-lg">Master Admin</span>
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
                    ? "bg-emerald-500/10 text-emerald-400 font-medium" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-emerald-400" : "")} />
                {link.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
