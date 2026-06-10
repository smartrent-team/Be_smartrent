import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Zap, ChevronRight, BarChart3, BrainCircuit, Users, LayoutDashboard, Fingerprint, CheckCircle2, Star } from 'lucide-react'
import { FadeIn } from '@/components/ui/fade-in'
import { GlowCard } from '@/components/ui/glow-card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500/30 overflow-hidden relative font-sans">
      
      {/* --- PREMIUM BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/50 via-slate-50 to-slate-50"></div>
        
        {/* Animated Glowing Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-400/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-[20%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-teal-400/20 blur-[120px] animate-[pulse_10s_ease-in-out_infinite_reverse]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-green-400/20 blur-[150px] animate-[pulse_12s_ease-in-out_infinite]" />
      </div>

      <header className="px-6 lg:px-12 h-20 flex items-center border-b border-slate-200 bg-white/80 backdrop-blur-xl z-50 sticky top-0">
        <div className="flex-1 flex items-center">
          <Link className="flex items-center gap-3 group" href="/">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 p-[1px] group-hover:scale-105 transition-transform duration-500 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 blur-md opacity-30 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="relative flex items-center justify-center w-full h-full bg-white rounded-xl overflow-hidden">
                <Image src="/logo_smart/logo.jpg" alt="SmartRent Logo" fill className="object-cover" />
              </div>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              SmartRent
            </span>
          </Link>
        </div>

        {/* Centered Navigation */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
          <Link href="#features" className="text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors">Tính năng</Link>
          <Link href="#pricing" className="text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors">Bảng giá</Link>
          <Link href="#testimonials" className="text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors">Khách hàng</Link>
          <Link href="#faq" className="text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors">Hỏi đáp</Link>
        </nav>

        {/* Right Auth Buttons */}
        <nav className="flex-1 flex justify-end gap-2 sm:gap-4 items-center">
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" className="h-10 px-4 rounded-full text-slate-700 hover:text-emerald-600 hover:bg-slate-100 font-bold transition-colors">
              Đăng nhập
            </Button>
          </Link>
          <Link href="/register">
            <Button className="relative h-10 px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm hover:scale-105 transition-all duration-300 overflow-hidden group border-0 shadow-md">
              <span className="relative z-10">Dùng thử miễn phí</span>
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1 relative z-10 flex flex-col items-center">
        
        {/* --- HERO SECTION --- */}
        <section className="w-full pt-28 pb-16 md:pt-40 md:pb-24 flex justify-center px-4 md:px-6">
          <div className="flex flex-col items-center space-y-10 text-center max-w-5xl mx-auto">
            
            {/* Pill Badge */}
            <div className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm animate-[fade-in-down_0.6s_ease-out] hover:bg-slate-50 transition-all duration-500 cursor-pointer">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-slate-600 tracking-wide">Nền tảng SaaS Quản Lý Bất Động Sản</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            {/* Main Headline */}
            <h1 className="text-3xl font-extrabold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl animate-[fade-in-up_0.8s_ease-out]">
              <span className="block text-slate-900 mb-2">Quản lý tự động.</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-green-600 animate-[gradient_6s_ease_infinite] bg-[length:200%_200%] pb-2">
                Tăng trưởng tối đa.
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="mx-auto max-w-2xl text-slate-600 text-base md:text-lg font-medium leading-relaxed tracking-wide animate-[fade-in-up_1s_ease-out]">
              Giải pháp toàn diện tích hợp AI, Mobile App Manager và hệ thống thanh toán tự động. Xóa bỏ 90% khối lượng công việc thủ công của bạn.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-5 pt-4 w-full sm:w-auto animate-[fade-in-up_1.2s_ease-out]">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 px-8 text-base font-semibold rounded-full bg-slate-900 text-white hover:bg-emerald-600 hover:scale-105 hover:shadow-[0_10px_40px_rgba(16,185,129,0.3)] transition-all duration-300 group">
                  Bắt đầu miễn phí
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full h-14 px-8 text-base font-semibold rounded-full border-slate-300 bg-white hover:bg-slate-50 text-slate-900 shadow-sm hover:scale-105 transition-all duration-300">
                  Đăng nhập hệ thống
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* --- DASHBOARD MOCKUP --- */}
        <section className="w-full max-w-6xl mx-auto pb-32 px-4 md:px-6">
          <div className="relative group perspective-[2000px] animate-[fade-in-up_1.5s_ease-out]">
            {/* Glowing Backdrop */}
            <div className="absolute -inset-1 bg-gradient-to-b from-emerald-400/30 via-teal-400/10 to-transparent rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition duration-1000" />
            
            {/* Image Container */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transform transition-all duration-700 hover:-translate-y-2">
              {/* MacOS Browser Header */}
              <div className="absolute top-0 left-0 w-full h-10 bg-white/80 backdrop-blur-md border-b border-slate-200 z-20 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10 opacity-30 pointer-events-none" />
              <Image 
                src="/images/dashboard-mockup.webp" 
                alt="SmartRent Premium Dashboard" 
                width={1400} 
                height={900} 
                className="w-full h-auto object-cover opacity-95 group-hover:opacity-100 group-hover:scale-[1.01] transition-all duration-700 pt-10"
                priority
              />
              
              {/* Floating Element - Example */}
              <div className="absolute top-10 right-10 z-20 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 shadow-xl flex items-center gap-4 animate-bounce-slow" style={{ animationDuration: '4s' }}>
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Doanh thu tháng này</p>
                  <p className="text-sm text-slate-900 font-bold">+24.5%</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- BENTO GRID FEATURES --- */}
        <section className="w-full py-32 relative border-t border-slate-200 bg-white" id="features">
          <FadeIn className="container px-4 md:px-6 max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                Kiến trúc <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">công nghệ lõi</span>
              </h2>
              <p className="max-w-2xl text-slate-600 text-base font-medium">
                Thiết kế nguyên khối mang lại trải nghiệm mượt mà, tối ưu hóa từ phần mềm quản lý đến ứng dụng di động cho mọi đối tượng.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
              
              {/* Card 1 - AI */}
              <GlowCard className="col-span-1 md:col-span-6 lg:col-span-8 group rounded-3xl border border-slate-200 bg-slate-50 p-8 md:p-10 hover:bg-white transition-all duration-500 hover:border-emerald-300 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)]">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-300/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 group-hover:bg-emerald-300/20 transition-colors duration-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-8 border border-emerald-200 text-emerald-600 group-hover:scale-110 transition-transform duration-500">
                    <BrainCircuit className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">Nhận diện AI (FastAPI Python)</h3>
                  <p className="text-slate-600 text-base font-medium leading-relaxed max-w-xl">
                    Hệ thống AI xử lý hình ảnh mạnh mẽ, quét tự động đồng hồ điện/nước và trả về kết quả chính xác 99.9%. Chốt sổ siêu tốc chỉ trong 1 nốt nhạc.
                  </p>
                </div>
              </GlowCard>

              {/* Card 2 - Mobile App Manager */}
              <GlowCard className="col-span-1 md:col-span-6 lg:col-span-4 group rounded-3xl border border-slate-200 bg-slate-50 p-8 md:p-10 hover:bg-white transition-all duration-500 hover:border-teal-300 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(20,184,166,0.15)]">
                 <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-teal-300/10 rounded-full blur-[60px] translate-y-1/3 translate-x-1/3 group-hover:bg-teal-300/20 transition-colors duration-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center mb-8 border border-teal-200 text-teal-600 group-hover:scale-110 transition-transform duration-500">
                    <LayoutDashboard className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Mobile App Manager</h3>
                  <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed">
                    Theo dõi báo cáo, phê duyệt hợp đồng, quản lý khách thuê toàn diện ngay trên thiết bị di động cá nhân của bạn.
                  </p>
                </div>
              </GlowCard>

              {/* Card 3 - Mobile Tenant */}
              <GlowCard className="col-span-1 md:col-span-6 lg:col-span-4 group rounded-3xl border border-slate-200 bg-slate-50 p-8 md:p-10 hover:bg-white transition-all duration-500 hover:border-cyan-300 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(6,182,212,0.15)]">
                 <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-cyan-300/10 rounded-full blur-[60px] -translate-y-1/3 -translate-x-1/3 group-hover:bg-cyan-300/20 transition-colors duration-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-100 flex items-center justify-center mb-8 border border-cyan-200 text-cyan-600 group-hover:scale-110 transition-transform duration-500">
                    <Users className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Mobile App Tenant</h3>
                  <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed">
                    Khách thuê xem hóa đơn minh bạch, quét mã thanh toán, phản ánh sự cố ngay lập tức.
                  </p>
                </div>
              </GlowCard>

              {/* Card 4 - PayOS */}
              <GlowCard className="col-span-1 md:col-span-6 lg:col-span-4 group rounded-3xl border border-slate-200 bg-slate-50 p-8 md:p-10 hover:bg-white transition-all duration-500 hover:border-emerald-300 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)]">
                 <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-emerald-300/10 rounded-full blur-[60px] -translate-y-1/2 -translate-x-1/2 group-hover:bg-emerald-300/20 transition-colors duration-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-8 border border-emerald-200 text-emerald-600 group-hover:scale-110 transition-transform duration-500">
                    <Zap className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Thanh toán PayOS</h3>
                  <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed">
                    Gạch nợ tự động trong 1 giây qua mã QR động riêng biệt.
                  </p>
                </div>
              </GlowCard>

              {/* Card 5 - Security */}
              <GlowCard className="col-span-1 md:col-span-12 lg:col-span-4 group rounded-3xl border border-slate-200 bg-slate-50 p-8 md:p-10 hover:bg-white transition-all duration-500 hover:border-blue-300 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.15)]">
                 <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-300/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 group-hover:bg-blue-300/20 transition-colors duration-700 pointer-events-none" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-8 border border-blue-200 text-blue-600 group-hover:scale-110 transition-transform duration-500">
                    <Fingerprint className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Bảo mật Enterprise</h3>
                  <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed">
                    Dữ liệu cách ly an toàn giữa các tổ chức (Multi-tenant SaaS). An toàn tuyệt đối.
                  </p>
                </div>
              </GlowCard>

            </div>
          </FadeIn>
        </section>

        {/* --- HOW IT WORKS --- */}
        <section className="w-full py-32 bg-slate-50 relative border-t border-slate-200">
          <FadeIn className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                Vận hành tự động chỉ với <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-500">3 bước</span>
              </h2>
              <p className="max-w-2xl text-slate-600 font-medium text-base">Thiết lập một lần, thảnh thơi mãi mãi. Mọi quy trình đều được tối ưu hóa.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
              {/* Connector line (desktop only) */}
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent z-0" />
              
              {[
                { step: "01", title: "Khởi tạo hệ thống", desc: "Đăng ký tài khoản, khai báo chi nhánh và số lượng phòng." },
                { step: "02", title: "Thêm khách thuê", desc: "Hệ thống tự động tạo hợp đồng và gửi tài khoản qua App." },
                { step: "03", title: "Thu tiền tự động", desc: "AI chốt số điện nước. Gạch nợ ngay khi khách quét QR PayOS." }
              ].map((item, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                  <div className="w-24 h-24 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-3xl font-black text-slate-300 mb-6 group-hover:text-emerald-600 group-hover:border-emerald-400 group-hover:shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-all duration-500">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed max-w-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        {/* --- PRICING --- */}
        <section className="w-full py-32 bg-white relative border-t border-slate-200" id="pricing">
          <div className="absolute top-0 right-0 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/50 via-white to-white pointer-events-none" />
          
          <FadeIn className="container px-4 md:px-6 max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                Bảng giá <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500">minh bạch</span>
              </h2>
              <p className="max-w-2xl text-slate-600 font-medium text-base">Đầu tư nhỏ, sinh lời lớn. Chọn gói phù hợp với quy mô kinh doanh của bạn.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Starter */}
              <div className="rounded-3xl border border-slate-200 bg-white p-8 flex flex-col hover:-translate-y-2 hover:shadow-xl transition-all duration-500">
                <h3 className="text-lg font-bold text-slate-700 mb-1">Gói Cơ Bản</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-extrabold text-slate-900">Miễn phí</span>
                </div>
                <p className="text-slate-500 text-sm md:text-base font-medium mb-6 pb-6 border-b border-slate-100">Phù hợp cho chủ nhà cá nhân mới bắt đầu quản lý.</p>
                <ul className="flex flex-col gap-3 mb-6 flex-1 text-slate-700 text-sm md:text-base font-medium">
                  {["Quản lý tối đa 1 chi nhánh", "Quản lý tối đa 10 phòng", "Hóa đơn điện tử cơ bản", "Hỗ trợ qua Email"].map((f, i) => (
                    <li key={i} className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <Link href="/register?plan=free" className="w-full">
                  <Button variant="outline" className="w-full h-12 rounded-full border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-bold shadow-sm">Đăng ký ngay</Button>
                </Link>
              </div>

              {/* Pro (Recommended) */}
              <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50/50 p-8 flex flex-col relative transform md:-translate-y-4 shadow-[0_20px_40px_rgba(16,185,129,0.15)]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-bold tracking-wider uppercase">Đề xuất</div>
                <h3 className="text-lg font-bold text-emerald-700 mb-1">Gói Chuyên Nghiệp</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-extrabold text-slate-900">499.000đ</span>
                  <span className="text-slate-600 font-medium">/ tháng</span>
                </div>
                <p className="text-slate-600 text-sm md:text-base font-medium mb-6 pb-6 border-b border-emerald-200/50">Dành cho mô hình chuỗi trọ, chung cư mini chuyên nghiệp.</p>
                <ul className="flex flex-col gap-3 mb-6 flex-1 text-slate-800 text-sm md:text-base font-medium">
                  {["Quản lý lên đến 5 chi nhánh", "Tối đa 200 phòng", "AI quét đồng hồ tự động", "Thanh toán QR PayOS", "Mobile App Manager & Tenant"].map((f, i) => (
                    <li key={i} className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <Link href="/register?plan=pro" className="w-full">
                  <Button className="w-full h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">Dùng thử 14 ngày</Button>
                </Link>
              </div>

              {/* Enterprise */}
              <div className="rounded-3xl border border-slate-200 bg-white p-8 flex flex-col hover:-translate-y-2 hover:shadow-xl transition-all duration-500">
                <h3 className="text-lg font-bold text-slate-700 mb-1">Gói Doanh Nghiệp</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-extrabold text-slate-900">Liên hệ</span>
                </div>
                <p className="text-slate-500 text-sm md:text-base font-medium mb-6 pb-6 border-b border-slate-100">Quy mô lớn với nhu cầu tùy biến và hạ tầng riêng.</p>
                <ul className="flex flex-col gap-3 mb-6 flex-1 text-slate-700 text-sm md:text-base font-medium">
                  {["Không giới hạn số lượng", "Brand Name trên hóa đơn", "Dedicated Server", "Hỗ trợ kỹ thuật 24/7"].map((f, i) => (
                    <li key={i} className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <Link href="/register?plan=enterprise" className="w-full">
                  <Button variant="outline" className="w-full h-12 rounded-full border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-bold shadow-sm">Liên hệ Sale</Button>
                </Link>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* --- TESTIMONIALS --- */}
        <section className="w-full py-32 bg-slate-50 relative border-t border-slate-200" id="testimonials">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-16">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">Được tin dùng bởi <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-600">500+</span> chủ nhà</h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "Anh Minh Quân", role: "Chủ chuỗi 5 CCMN tại Hà Nội", text: "Từ khi dùng SmartRent, tôi không còn phải đi từng phòng chốt điện nước mỗi tháng. AI quét cực kỳ chính xác. Tính năng gạch nợ tự động của PayOS là một cứu cánh thực sự." },
                { name: "Chị Lan Hương", role: "Quản lý 100+ phòng trọ", text: "Ứng dụng trên điện thoại siêu mượt. Khách thuê tải app về xem hóa đơn và thanh toán luôn. Cực kỳ minh bạch, không còn ai thắc mắc về tiền điện nước nữa." },
                { name: "Anh Quốc Tuấn", role: "Đầu tư BĐS dòng tiền", text: "Tiết kiệm được tiền thuê 1 nhân viên kế toán (7-8 triệu/tháng). Giao diện nhìn rất chuyên nghiệp, thân thiện, xứng đáng là phần mềm xịn nhất mình từng dùng." }
              ].map((t, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-8 flex flex-col gap-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex gap-1 text-yellow-400">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 fill-current" />)}
                  </div>
                  <p className="text-slate-700 text-sm md:text-base font-medium italic flex-1">&quot;{t.text}&quot;</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {t.name.split(' ').pop()?.[0] || 'A'}
                    </div>
                    <div>
                      <p className="text-slate-900 text-sm md:text-base font-bold">{t.name}</p>
                      <p className="text-slate-500 text-xs md:text-sm font-medium">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FAQ --- */}
        <section className="w-full py-32 bg-white relative border-t border-slate-200" id="faq">
          <div className="container px-4 md:px-6 max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4">Câu hỏi thường gặp</h2>
            </div>
            
            <Accordion className="w-full flex flex-col gap-4">
              {[
                { q: "Dữ liệu của tôi có được bảo mật không?", a: "An toàn tuyệt đối. SmartRent áp dụng kiến trúc Multi-tenant SaaS, dữ liệu của mỗi tổ chức được cô lập hoàn toàn. Chúng tôi không bao giờ chia sẻ dữ liệu của bạn." },
                { q: "Tôi có thể nâng cấp/hạ cấp gói cước bất cứ lúc nào không?", a: "Có, bạn hoàn toàn có thể nâng hoặc hạ cấp gói cước ngay trong màn hình Quản lý Thanh toán. Chi phí sẽ được tính theo pro-rated (tỉ lệ ngày sử dụng)." },
                { q: "Tính năng nhận diện AI hoạt động như thế nào?", a: "Bạn chỉ cần mở App Manager, chụp ảnh đồng hồ điện/nước. Hệ thống AI Server (FastAPI) sẽ đọc chỉ số trên ảnh và tự động điền vào hóa đơn với độ chính xác >99%." },
                { q: "Thu tiền qua PayOS có tốn phí giao dịch không?", a: "Chúng tôi tích hợp trực tiếp API PayOS. Tiền khách thuê chuyển khoản sẽ vào TRỰC TIẾP tài khoản ngân hàng của bạn. Chúng tôi không giữ tiền và không thu phí giao dịch." }
              ].map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border border-slate-200 rounded-2xl bg-slate-50 px-6 overflow-hidden data-[state=open]:bg-white data-[state=open]:shadow-md transition-all">
                  <AccordionTrigger className="text-lg font-bold text-slate-800 hover:text-emerald-600 hover:no-underline py-5 text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-slate-600 font-medium text-sm md:text-base pb-5 leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="w-full py-32 relative border-t border-slate-200 bg-emerald-600 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500 via-emerald-600 to-teal-700 z-0" />
          
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-900/20 rounded-full blur-3xl" />
          
          <div className="container px-4 md:px-6 max-w-5xl mx-auto relative z-10 text-center">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 drop-shadow-sm">
              Bắt đầu hành trình <span className="text-teal-100">Tự động hóa</span>
            </h2>
            <p className="text-base md:text-lg text-emerald-50 mb-8 max-w-2xl mx-auto font-medium">
              Đừng để việc quản lý phòng trọ chiếm hết thời gian của bạn. Hãy để SmartRent làm thay việc đó.
            </p>
            <Link href="/register">
              <Button size="lg" className="h-16 px-10 text-lg font-bold rounded-full bg-white text-emerald-700 hover:bg-slate-50 hover:scale-105 transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
                Tạo tài khoản miễn phí ngay
              </Button>
            </Link>
          </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-slate-200 bg-slate-50 relative z-10">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-6">
            <Image src="/logo_smart/logo.jpg" alt="SmartRent Logo" width={32} height={32} className="rounded-lg shadow-sm" />
            <span className="font-bold text-2xl text-slate-800">SmartRent</span>
          </div>
          <p className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            Thiết kế với <span className="text-red-500 animate-pulse">❤</span> bởi SmartRent Team
          </p>
        </div>
      </footer>
    </div>
  )
}
