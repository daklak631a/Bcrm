"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ArrowLeft, Edit, MessageSquare, CreditCard, PiggyBank, History, FileText, Phone, Mail, MapPin } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function CustomerDetailPage() {
  const params = useParams()
  const customerId = params.id
  
  return (
    <DashboardLayout title={`Chi Tiết Khách Hàng - ${customerId}`}>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/customers" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h2 className="text-xl font-bold text-slate-800">Hồ Sơ Khách Hàng</h2>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium shrink-0">
              <MessageSquare className="w-4 h-4" /> Ghi Nhận Tương Tác
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shrink-0">
              <Edit className="w-4 h-4" /> Chỉnh Sửa
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card - Left Column */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="h-24 bg-emerald-600"></div>
              <div className="px-6 pb-6 relative">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-emerald-600 text-2xl font-bold border-4 border-white shadow-md absolute -top-10">
                  NA
                </div>
                <div className="mt-12">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-2xl font-bold text-slate-800">Nguyễn Văn An</h2>
                  </div>
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 mb-4">
                    VIP
                  </span>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">090 123 4567</p>
                        <p className="text-xs text-slate-500">Số chính</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">an.nguyen@email.com</p>
                        <p className="text-xs text-slate-500">Email cá nhân</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">123 Nguyễn Thị Minh Khai</p>
                        <p className="text-xs text-slate-500">Phường 6, Quận 3, TP HCM</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">079012345678</p>
                        <p className="text-xs text-slate-500">CCCD - Cấp ngày: 15/05/2021</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Thông Số Kênh</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Tỷ lệ sử dụng App</span>
                    <span className="font-medium text-slate-700">Cao (85%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{width: '85%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Trạng thái rủi ro tín dụng</span>
                    <span className="font-medium text-emerald-600">Thấp</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Ngày gia nhập</span>
                    <span className="font-medium text-slate-700">12/03/2020</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Chuyên viên phụ trách</span>
                    <span className="font-medium text-slate-700">Trần Minh</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Info - Right Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Nav Tabs fake */}
            <div className="bg-white border shadow-sm rounded-xl px-2 flex gap-1 overflow-x-auto">
              <button className="px-4 py-3 text-sm font-medium border-b-2 border-emerald-600 text-emerald-600 whitespace-nowrap">Tổng Quan Tài Sản</button>
              <button className="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 whitespace-nowrap">Khoản Vay (1)</button>
              <button className="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 whitespace-nowrap">Tiền Gửi (2)</button>
              <button className="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 whitespace-nowrap">Lịch Sử Tương Tác</button>
            </div>

            {/* Asset Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Tổng Dư Nợ</p>
                  <h3 className="text-xl font-bold text-slate-800">1,200,000,000đ</h3>
                  <p className="text-xs text-slate-500 mt-1">Gồm 1 khoản vay mua nhà</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Tổng Vốn Huy Động</p>
                  <h3 className="text-xl font-bold text-slate-800">3,450,000,000đ</h3>
                  <p className="text-xs text-slate-500 mt-1">Gồm 2 sổ tiết kiệm</p>
                </div>
              </div>
            </div>

            {/* Recent Interactions List */}
            <div className="bg-white border rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Lịch sử tương tác gần đây</h3>
                <Link href="/interactions" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Xem tất cả</Link>
              </div>

              <div className="space-y-6">
                <div className="relative pl-6 border-l-2 border-slate-200">
                  <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <div>
                      <h4 className="text-sm font-medium text-slate-800">Tư vấn gia hạn khoản vay</h4>
                      <p className="text-sm text-slate-600 mt-1">Khách hàng đồng ý phương án gia hạn 12 tháng với lãi suất 8.5%. Cần chuẩn bị hồ sơ ký kết.</p>
                      <p className="text-xs font-medium text-emerald-600 mt-2 bg-emerald-50 inline-block px-2 py-0.5 rounded">Cuộc gọi</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">Hôm nay, 14:30</span>
                  </div>
                </div>

                <div className="relative pl-6 border-l-2 border-slate-200">
                  <div className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <div>
                      <h4 className="text-sm font-medium text-slate-800">Khách hàng đến quầy làm sổ tiết kiệm</h4>
                      <p className="text-sm text-slate-600 mt-1">Mở sổ tiết kiệm 1,5 tỷ VNĐ kỳ hạn 6 tháng.</p>
                      <p className="text-xs font-medium text-blue-600 mt-2 bg-blue-50 inline-block px-2 py-0.5 rounded">Khách tới quầy</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">12/04/2024</span>
                  </div>
                </div>

                <div className="relative pl-6 border-l-2 border-slate-200">
                  <div className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <div>
                      <h4 className="text-sm font-medium text-slate-800">Cập nhật CCCD mới</h4>
                      <p className="text-sm text-slate-600 mt-1">Khách hàng cập nhật số CCCD gắn chip lên hệ thống.</p>
                      <p className="text-xs font-medium text-slate-600 mt-2 bg-slate-100 inline-block px-2 py-0.5 rounded">Hệ thống</p>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">05/01/2024</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
