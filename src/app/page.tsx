import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Building2, Zap, ChevronRight, BarChart3, BrainCircuit, Users, LayoutDashboard, Fingerprint } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#030712] text-slate-50 selection:bg-indigo-500/30 overflow-hidden relative font-sans">
      
      {/* --- PREMIUM BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Deep dark background noise/texture could go here, simulating with color stops */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#030712] to-[#030712]"></div>
        
        {/* Animated Glowing Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-600/10 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-[20%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-purple-600/10 blur-[120px] animate-[pulse_10s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-pink-600/5 blur-[150px] animate-[pulse_12s_ease-in-out_infinite]" />
      </div>

      {/* --- HEADER --- */}
      <header className="px-6 lg:px-12 h-20 flex items-center border-b border-white/[0.05] bg-[#030712]/40 backdrop-blur-xl z-50 sticky top-0 supports-[backdrop-filter]:bg-background/60">
        <Link className="flex items-center justify-center gap-3 group" href="/">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px] group-hover:scale-105 transition-transform duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center justify-center w-full h-full bg-[#030712] rounded-xl">
              <Building2 className="h-5 w-5 text-indigo-400 group-hover:text-white transition-colors duration-500" />
            </div>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            SmartRent
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="/login">
            Đăng nhập
          </Link>
          <Link href="/register">
            <Button className="relative h-10 px-6 rounded-full bg-white text-black font-semibold text-sm hover:scale-105 transition-all duration-300 overflow-hidden group">
              <span className="relative z-10">Đăng ký ngay</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1 relative z-10 flex flex-col items-center">
        
        {/* --- HERO SECTION --- */}
        <section className="w-full pt-28 pb-16 md:pt-40 md:pb-24 flex justify-center px-4 md:px-6">
          <div className="flex flex-col items-center space-y-10 text-center max-w-5xl mx-auto">
            
            {/* Pill Badge */}
            <div className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md animate-[fade-in-down_0.6s_ease-out] hover:bg-white/[0.06] transition-all duration-500 cursor-pointer">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-300 tracking-wide">Nền tảng SaaS Quản Lý Bất Động Sản</span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
            </div>
            
            {/* Main Headline */}
            <h1 className="text-5xl font-extrabold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl animate-[fade-in-up_0.8s_ease-out]">
              <span className="block text-white mb-2">Quản lý tự động.</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-[gradient_6s_ease_infinite] bg-[length:200%_200%] pb-2">
                Tăng trưởng tối đa.
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="mx-auto max-w-2xl text-slate-400 md:text-xl font-light leading-relaxed tracking-wide animate-[fade-in-up_1s_ease-out]">
              Giải pháp toàn diện tích hợp AI, Mobile App Manager và hệ thống thanh toán tự động. Xóa bỏ 90% khối lượng công việc thủ công của bạn.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-5 pt-4 w-full sm:w-auto animate-[fade-in-up_1.2s_ease-out]">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 px-8 text-base font-semibold rounded-full bg-white text-black hover:bg-slate-200 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-300 group">
                  Bắt đầu miễn phí
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full h-14 px-8 text-base font-semibold rounded-full border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white backdrop-blur-md hover:scale-105 transition-all duration-300">
                  Xem Demo Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* --- DASHBOARD MOCKUP --- */}
        <section className="w-full max-w-6xl mx-auto pb-32 px-4 md:px-6">
          <div className="relative group perspective-[2000px] animate-[fade-in-up_1.5s_ease-out]">
            {/* Glowing Backdrop */}
            <div className="absolute -inset-1 bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
            
            {/* Image Container */}
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0A0A0A] shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] transform transition-all duration-700 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent z-10 opacity-60 pointer-events-none" />
              <Image 
                src="/images/dashboard-mockup.png" 
                alt="SmartRent Premium Dashboard" 
                width={1400} 
                height={900} 
                className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.01] transition-all duration-700"
                priority
              />
              
              {/* Floating Element - Example */}
              <div className="absolute top-10 right-10 z-20 bg-[#030712]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-bounce-slow" style={{ animationDuration: '4s' }}>
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Doanh thu tháng này</p>
                  <p className="text-sm text-white font-bold">+24.5%</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- BENTO GRID FEATURES --- */}
        <section className="w-full py-32 relative border-t border-white/[0.05] bg-[#030712]/50">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col items-center text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
                Kiến trúc <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">công nghệ lõi</span>
              </h2>
              <p className="max-w-2xl text-slate-400 text-lg">
                Thiết kế nguyên khối mang lại trải nghiệm mượt mà, tối ưu hóa từ phần mềm quản lý đến ứng dụng di động cho mọi đối tượng.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
              
              {/* Card 1 - AI */}
              <div className="col-span-1 md:col-span-6 lg:col-span-8 group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 md:p-10 hover:bg-white/[0.04] transition-colors duration-500">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 group-hover:bg-indigo-500/20 transition-colors duration-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-8 border border-indigo-500/30 text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                    <BrainCircuit className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Nhận diện AI (FastAPI Python)</h3>
                  <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                    Hệ thống AI xử lý hình ảnh mạnh mẽ, quét tự động đồng hồ điện/nước và trả về kết quả chính xác 99.9%. Chốt sổ siêu tốc chỉ trong 1 nốt nhạc.
                  </p>
                </div>
              </div>

              {/* Card 2 - Mobile App Manager */}
              <div className="col-span-1 md:col-span-6 lg:col-span-4 group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 md:p-10 hover:bg-white/[0.04] transition-colors duration-500">
                 <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[60px] translate-y-1/3 translate-x-1/3 group-hover:bg-purple-500/20 transition-colors duration-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-8 border border-purple-500/30 text-purple-400 group-hover:scale-110 transition-transform duration-500">
                    <LayoutDashboard className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Mobile App Manager</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Theo dõi báo cáo, phê duyệt hợp đồng, quản lý khách thuê toàn diện ngay trên thiết bị di động cá nhân của bạn.
                  </p>
                </div>
              </div>

              {/* Card 3 - Mobile Tenant */}
              <div className="col-span-1 md:col-span-6 lg:col-span-4 group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 md:p-10 hover:bg-white/[0.04] transition-colors duration-500">
                 <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[60px] -translate-y-1/3 -translate-x-1/3 group-hover:bg-pink-500/20 transition-colors duration-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-pink-500/20 flex items-center justify-center mb-8 border border-pink-500/30 text-pink-400 group-hover:scale-110 transition-transform duration-500">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Mobile App Tenant</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Khách thuê xem hóa đơn minh bạch, quét mã thanh toán, phản ánh sự cố ngay lập tức.
                  </p>
                </div>
              </div>

              {/* Card 4 - PayOS */}
              <div className="col-span-1 md:col-span-6 lg:col-span-4 group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 md:p-10 hover:bg-white/[0.04] transition-colors duration-500">
                 <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[60px] -translate-y-1/2 -translate-x-1/2 group-hover:bg-emerald-500/20 transition-colors duration-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-8 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition-transform duration-500">
                    <Zap className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Thanh toán PayOS</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Gạch nợ tự động trong 1 giây qua mã QR động riêng biệt.
                  </p>
                </div>
              </div>

              {/* Card 5 - Security */}
              <div className="col-span-1 md:col-span-12 lg:col-span-4 group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 md:p-10 hover:bg-white/[0.04] transition-colors duration-500">
                 <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 group-hover:bg-blue-500/20 transition-colors duration-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-8 border border-blue-500/30 text-blue-400 group-hover:scale-110 transition-transform duration-500">
                    <Fingerprint className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Bảo mật cấp độ Enterprise</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Dữ liệu được cách ly an toàn giữa các tổ chức (Multi-tenant SaaS). An toàn tuyệt đối 24/7.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-white/[0.05] bg-[#030712] relative z-10">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="h-6 w-6 text-indigo-400" />
            <span className="font-bold text-xl text-white">SmartRent</span>
          </div>
          <p className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            Thiết kế với <span className="text-red-500 animate-pulse">❤</span> bởi SmartRent Team
          </p>
        </div>
      </footer>
    </div>
  )
}
