'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, usePathname } from 'next/navigation'
import React from 'react'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/shared/Sidebar'

const breadcrumbMap: Record<string, string> = {
  'dashboard': 'Bảng điều khiển',
  'rooms': 'Quản lý phòng',
  'tenants': 'Khách thuê',
  'invoices': 'Hoá đơn',
  'tickets': 'Bảo trì',
}

export function Header({ email }: { email?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  
  const pathSegments = pathname.split('/').filter(Boolean)
  const currentSegment = pathSegments[pathSegments.length - 1]
  const pageTitle = breadcrumbMap[currentSegment] || 'Dashboard'

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-gray-50/40 px-4 lg:h-[60px] lg:px-6">
      <div className="md:hidden flex items-center">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" size="icon" className="shrink-0" />
            }
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>
      <div className="w-full flex-1">
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" alt={email || "Admin"} />
            <AvatarFallback className="text-xs uppercase">
              {email ? email.substring(0, 2) : "AD"}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Toggle user menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Tài khoản</p>
                <p className="text-xs leading-none text-muted-foreground">{email || "admin@example.com"}</p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Cài đặt</DropdownMenuItem>
          <DropdownMenuItem>Hỗ trợ</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
