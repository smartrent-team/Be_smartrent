import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Building2, Sparkles, ShieldCheck, ChevronRight, BarChart3, Smartphone, BrainCircuit, Users, LayoutDashboard } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none -z-10 animate-[pulse_6s_ease-in-out_infinite]" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-[pulse_8s_ease-in-out_infinite] delay-1000" />
      <div className="absolute top-[40%] left-[-10%] w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-[pulse_7s_ease-in-out_infinite]" />

      {/* Header */}
      <header className="px-6 lg:px-12 h-20 flex items-center border-b border-white/10 bg-slate-950/50 backdrop-blur-md z-50 sticky top-0 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <Link className="flex items-center justify-center gap-2 group" href="/">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 group-hover:scale-110 group-hover:rotate-[15deg] transition-all duration-300 shadow-lg shadow-indigo-500/30">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            SmartRent
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium text-slate-300 hover:text-white transition-colors hover:underline underline-offset-4" href="/login">
            Đăng nhập
          </Link>
          <Link href="/register">
            <Button className="bg-white text-slate-950 hover:bg-slate-200 hover:-translate-y-1 rounded-full px-6 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] active:scale-95">
              Đăng ký miễn phí
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full pt-24 pb-12 md:pt-32 md:pb-20 lg:pt-40 lg:pb-24 flex justify-center relative px-4 md:px-6 z-10">
          <div className="flex flex-col items-center space-y-8 text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-sm text-indigo-300 backdrop-blur-sm animate-[fade-in-down_0.5s_ease-out] hover:bg-indigo-500/20 transition-colors cursor-default shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Sparkles className="w-4 h-4 animate-spin-slow" style={{ animationDuration: '3s' }} />
              <span className="font-medium tracking-wide">Hệ Sinh Thái Quản Lý Bất Động Sản Số 1</span>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl animate-[fade-in-up_0.6s_ease-out]">
              Quản lý phòng trọ <br className="hidden sm:block" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-[gradient_8s_ease_infinite] bg-[length:200%_200%] filter drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                tự động & thông minh
              </span>
            </h1>
            
            <p className="mx-auto max-w-[750px] text-slate-400 md:text-xl leading-relaxed animate-[fade-in-up_0.8s_ease-out]">
              Trải nghiệm sức mạnh của AI, ứng dụng Mobile cho khách thuê & chủ nhà, cùng hệ thống thanh toán tự động hoàn toàn. Tự động hóa 90% công việc quản lý.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-6 w-full sm:w-auto animate-[fade-in-up_1s_ease-out]">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 px-8 text-lg rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] hover:-translate-y-1.5 transition-all duration-300 group">
                  Dùng thử miễn phí
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full h-14 px-8 text-lg rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md hover:-translate-y-1.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300">
                  Xem Demo Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Dashboard Mockup Image with 3D Effect */}
        <section className="w-full pb-20 flex justify-center px-4 md:px-6 relative z-20">
          <div className="max-w-5xl w-full mx-auto relative group perspective-[2000px] animate-[fade-in-up_1.2s_ease-out]">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 bottom-0 top-[50%] pointer-events-none" />
            <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-[40px] opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-500 animate-[pulse_4s_ease-in-out_infinite]" />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl shadow-black/80 transform transition-all duration-700 hover:scale-[1.03] hover:-translate-y-4">
              <Image 
                src="/images/dashboard-mockup.png" 
                alt="SmartRent Dashboard Interface" 
                width={1200} 
                height={800} 
                className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                priority
              />
            </div>
          </div>
        </section>

        {/* Extended Features Bento Grid */}
        <section className="w-full py-24 flex justify-center bg-slate-900/40 border-t border-white/5 relative z-10 backdrop-blur-sm">
          <div className="container px-4 md:px-6 max-w-7xl">
            <div className="text-center mb-20 animate-[fade-in_1s_ease-out]">
              <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                Hệ Sinh Thái Toàn Diện
              </div>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                Tính năng vượt trội, dẫn đầu công nghệ
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  icon: <BrainCircuit className="w-7 h-7 text-yellow-400" />,
                  title: 'Nhận diện số điện nước AI',
                  desc: 'Core AI mạnh mẽ viết bằng FastAPI Python giúp quét ảnh đồng hồ điện nước và xuất ra số liệu chính xác 99.9%, không cần ghi chép thủ công.',
                  colSpan: 'md:col-span-2 lg:col-span-2',
                  bg: 'bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-transparent'
                },
                {
                  icon: <LayoutDashboard className="w-7 h-7 text-blue-400" />,
                  title: 'Mobile App Chủ Nhà',
                  desc: 'Theo dõi báo cáo, gạch nợ, và phê duyệt hợp đồng ngay trên điện thoại di động mọi lúc mọi nơi.',
                  colSpan: 'md:col-span-2 lg:col-span-1',
                  bg: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/5'
                },
                {
                  icon: <Users className="w-7 h-7 text-pink-400" />,
                  title: 'Mobile App Khách Thuê',
                  desc: 'Trải nghiệm xịn sò cho khách thuê: Xem hóa đơn, quét mã thanh toán, và gửi ticket báo lỗi sự cố phòng.',
                  colSpan: 'md:col-span-2 lg:col-span-1',
                  bg: 'bg-gradient-to-br from-pink-500/10 to-rose-500/5'
                },
                {
                  icon: <Smartphone className="w-7 h-7 text-emerald-400" />,
                  title: 'Thanh toán PayOS siêu tốc',
                  desc: 'Mỗi hóa đơn sinh ra một mã QR động. Khách quét mã, tiền vào tài khoản chủ nhà, hệ thống tự động gạch nợ trong 1 giây.',
                  colSpan: 'md:col-span-2 lg:col-span-2',
                  bg: 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent'
                },
                {
                  icon: <BarChart3 className="w-7 h-7 text-purple-400" />,
                  title: 'Báo cáo Realtime',
                  desc: 'Dashboard trực quan, phân tích doanh thu và công nợ liên tục 24/7.',
                  colSpan: 'md:col-span-2 lg:col-span-1',
                  bg: 'bg-gradient-to-br from-purple-500/10 to-violet-500/5'
                },
                {
                  icon: <ShieldCheck className="w-7 h-7 text-indigo-400" />,
                  title: 'Chuẩn SaaS Đa Tầng',
                  desc: 'Dữ liệu được cô lập an toàn, quy mô hàng ngàn tòa nhà.',
                  colSpan: 'md:col-span-2 lg:col-span-1',
                  bg: 'bg-gradient-to-br from-indigo-500/10 to-blue-500/5'
                }
              ].map((feat, i) => (
                <div key={i} className={`group flex flex-col p-8 rounded-[2rem] border border-white/10 backdrop-blur-md transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-indigo-500/20 hover:border-white/20 cursor-default overflow-hidden relative ${feat.colSpan} ${feat.bg}`}>
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-500" />
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 shadow-inner border border-white/10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative z-10">
                    {feat.icon}
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white relative z-10 group-hover:text-indigo-200 transition-colors">{feat.title}</h3>
                  <p className="text-slate-400 leading-relaxed relative z-10 text-lg">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 border-t border-white/10 text-center text-slate-500 text-sm bg-slate-950 relative z-10">
        <p className="flex items-center justify-center gap-2">
          © {new Date().getFullYear()} SmartRent SaaS Platform. Build with 
          <span className="text-red-500 animate-pulse">❤️</span> 
          and AI.
        </p>
      </footer>
    </div>
  )
}
