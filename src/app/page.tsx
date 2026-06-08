import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Building2, Zap, ChevronRight, BarChart3, BrainCircuit, Users, LayoutDashboard, Fingerprint, CheckCircle2, Star } from 'lucide-react'

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
                src="/images/dashboard-mockup.webp" 
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

        {/* --- HOW IT WORKS --- */}
        <section className="w-full py-32 bg-[#0A0A0A] relative border-t border-white/[0.05]">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
                Vận hành tự động chỉ với <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">3 bước</span>
              </h2>
              <p className="max-w-2xl text-slate-400 text-lg">Thiết lập một lần, thảnh thơi mãi mãi. Mọi quy trình đều được tối ưu hóa đến mức tối giản nhất.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
              {/* Connector line (desktop only) */}
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-[1px] bg-gradient-to-r from-transparent via-white/[0.2] to-transparent z-0" />
              
              {[
                { step: "01", title: "Khởi tạo hệ thống", desc: "Đăng ký tài khoản, khai báo chi nhánh và số lượng phòng trong chưa đầy 5 phút." },
                { step: "02", title: "Thêm khách thuê", desc: "Cấp tài khoản cho người thuê. Hệ thống tự động tạo hợp đồng và gửi qua App." },
                { step: "03", title: "Thu tiền tự động", desc: "Tới tháng, AI chốt số điện nước. Hóa đơn gửi tự động và gạch nợ ngay khi khách quét QR PayOS." }
              ].map((item, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                  <div className="w-24 h-24 rounded-full bg-[#030712] border border-white/[0.1] flex items-center justify-center text-3xl font-black text-slate-600 mb-6 group-hover:text-white group-hover:border-indigo-500/50 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all duration-500">
                    {item.step}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed max-w-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- PRICING --- */}
        <section className="w-full py-32 bg-[#030712] relative border-t border-white/[0.05]" id="pricing">
          <div className="absolute top-0 right-0 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#030712] to-[#030712] pointer-events-none" />
          
          <div className="container px-4 md:px-6 max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col items-center text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">
                Bảng giá <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">minh bạch</span>
              </h2>
              <p className="max-w-2xl text-slate-400 text-lg">Đầu tư nhỏ, sinh lời lớn. Chọn gói phù hợp với quy mô kinh doanh của bạn.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Starter */}
              <div className="rounded-3xl border border-white/[0.1] bg-[#0A0A0A] p-8 flex flex-col hover:-translate-y-2 transition-transform duration-500">
                <h3 className="text-xl font-medium text-slate-300 mb-2">Gói Cơ Bản</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-extrabold text-white">Miễn phí</span>
                </div>
                <p className="text-slate-400 mb-8 pb-8 border-b border-white/[0.1]">Phù hợp cho chủ nhà cá nhân mới bắt đầu quản lý.</p>
                <ul className="flex flex-col gap-4 mb-8 flex-1 text-slate-300">
                  {["Quản lý tối đa 1 chi nhánh", "Quản lý tối đa 10 phòng", "Hóa đơn điện tử cơ bản", "Hỗ trợ qua Email"].map((f, i) => (
                    <li key={i} className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full h-12 rounded-full border-white/[0.2] bg-transparent hover:bg-white/[0.05] text-white">Đăng ký ngay</Button>
              </div>

              {/* Pro (Recommended) */}
              <div className="rounded-3xl border-2 border-indigo-500 bg-gradient-to-b from-indigo-500/10 to-[#0A0A0A] p-8 flex flex-col relative transform md:-translate-y-4 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-bold tracking-wider uppercase">Đề xuất</div>
                <h3 className="text-xl font-medium text-indigo-300 mb-2">Gói Chuyên Nghiệp</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-extrabold text-white">499.000đ</span>
                  <span className="text-slate-400">/ tháng</span>
                </div>
                <p className="text-slate-400 mb-8 pb-8 border-b border-white/[0.1]">Dành cho mô hình chuỗi trọ, chung cư mini chuyên nghiệp.</p>
                <ul className="flex flex-col gap-4 mb-8 flex-1 text-slate-300">
                  {["Quản lý lên đến 5 chi nhánh", "Tối đa 200 phòng", "AI quét đồng hồ tự động", "Thanh toán QR PayOS tự động", "Mobile App cho Manager & Tenant"].map((f, i) => (
                    <li key={i} className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <Button className="w-full h-12 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold">Dùng thử 14 ngày</Button>
              </div>

              {/* Enterprise */}
              <div className="rounded-3xl border border-white/[0.1] bg-[#0A0A0A] p-8 flex flex-col hover:-translate-y-2 transition-transform duration-500">
                <h3 className="text-xl font-medium text-slate-300 mb-2">Gói Doanh Nghiệp</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-extrabold text-white">Liên hệ</span>
                </div>
                <p className="text-slate-400 mb-8 pb-8 border-b border-white/[0.1]">Quy mô lớn với nhu cầu tùy biến và hạ tầng riêng.</p>
                <ul className="flex flex-col gap-4 mb-8 flex-1 text-slate-300">
                  {["Không giới hạn chi nhánh", "Không giới hạn số phòng", "Brand Name riêng trên hóa đơn", "Dedicated Server & Database", "Hỗ trợ kỹ thuật 24/7"].map((f, i) => (
                    <li key={i} className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full h-12 rounded-full border-white/[0.2] bg-transparent hover:bg-white/[0.05] text-white">Liên hệ Sale</Button>
              </div>
            </div>
          </div>
        </section>

        {/* --- TESTIMONIALS --- */}
        <section className="w-full py-32 bg-[#0A0A0A] relative border-t border-white/[0.05]">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">Được tin dùng bởi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">500+</span> chủ nhà</h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "Anh Minh Quân", role: "Chủ chuỗi 5 CCMN tại Hà Nội", text: "Từ khi dùng SmartRent, tôi không còn phải đi từng phòng chốt điện nước mỗi tháng. AI quét cực kỳ chính xác. Tính năng gạch nợ tự động của PayOS là một cứu cánh thực sự." },
                { name: "Chị Lan Hương", role: "Quản lý 100+ phòng trọ", text: "Ứng dụng trên điện thoại siêu mượt. Khách thuê tải app về xem hóa đơn và thanh toán luôn. Cực kỳ minh bạch, không còn ai thắc mắc về tiền điện nước nữa." },
                { name: "Anh Quốc Tuấn", role: "Đầu tư BĐS dòng tiền", text: "Bỏ ra 499k/tháng nhưng tiết kiệm được tiền thuê 1 nhân viên kế toán (7-8 triệu/tháng). Giao diện tối màu nhìn rất chuyên nghiệp, xứng đáng là SaaS xịn nhất mình từng dùng." }
              ].map((t, i) => (
                <div key={i} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 flex flex-col gap-6 hover:bg-white/[0.04] transition-colors">
                  <div className="flex gap-1 text-yellow-400">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 fill-current" />)}
                  </div>
                  <p className="text-slate-300 italic flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {t.name.split(' ').pop()?.[0] || 'A'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{t.name}</p>
                      <p className="text-slate-500 text-sm">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FAQ --- */}
        <section className="w-full py-32 bg-[#030712] relative border-t border-white/[0.05]">
          <div className="container px-4 md:px-6 max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Câu hỏi thường gặp</h2>
            </div>
            
            <div className="flex flex-col gap-4">
              {[
                { q: "Dữ liệu của tôi có được bảo mật không?", a: "An toàn tuyệt đối. SmartRent áp dụng kiến trúc Multi-tenant SaaS, dữ liệu của mỗi tổ chức được cô lập hoàn toàn. Chúng tôi không bao giờ chia sẻ dữ liệu của bạn." },
                { q: "Tôi có thể nâng cấp/hạ cấp gói cước bất cứ lúc nào không?", a: "Có, bạn hoàn toàn có thể nâng hoặc hạ cấp gói cước ngay trong màn hình Quản lý Thanh toán. Chi phí sẽ được tính theo pro-rated (tỉ lệ ngày sử dụng)." },
                { q: "Tính năng nhận diện AI hoạt động như thế nào?", a: "Bạn chỉ cần mở App Manager, chụp ảnh đồng hồ điện/nước. Hệ thống AI Server (FastAPI) sẽ đọc chỉ số trên ảnh và tự động điền vào hóa đơn với độ chính xác >99%." },
                { q: "Thu tiền qua PayOS có tốn phí giao dịch không?", a: "Chúng tôi tích hợp trực tiếp API PayOS. Tiền khách thuê chuyển khoản sẽ vào TRỰC TIẾP tài khoản ngân hàng của bạn. Chúng tôi không giữ tiền và không thu phí giao dịch." }
              ].map((faq, i) => (
                <div key={i} className="border border-white/[0.08] rounded-2xl p-6 bg-white/[0.01]">
                  <h3 className="text-xl font-semibold text-white mb-3">{faq.q}</h3>
                  <p className="text-slate-400">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="w-full py-32 relative border-t border-white/[0.05] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-[#030712] z-0" />
          <div className="container px-4 md:px-6 max-w-5xl mx-auto relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
              Bắt đầu hành trình <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Tự động hóa</span>
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Đừng để việc quản lý phòng trọ chiếm hết thời gian của bạn. Hãy để SmartRent làm thay việc đó.
            </p>
            <Link href="/register">
              <Button size="lg" className="h-16 px-10 text-lg font-bold rounded-full bg-white text-black hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                Tạo tài khoản miễn phí ngay
              </Button>
            </Link>
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
