import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export default function NewCustomerPage() {
  return (
    <DashboardLayout title="Thêm Mới Khách Hàng">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link href="/customers" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h2 className="text-xl font-bold text-slate-800">Tạo hồ sơ khách hàng mới</h2>
        </div>

        <div className="bg-white border rounded-xl shadow-sm p-6">
          <form className="space-y-8">
            {/* Thông tin cá nhân */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Thông Tin Cơ Bản</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Họ và Tên <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nguyễn Văn A" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Ngày sinh</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Số CCCD/CMND <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="012345678900" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Ngày cấp CCCD</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Giới tính</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name="gender" value="male" className="text-emerald-600 focus:ring-emerald-500" /> Nam
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name="gender" value="female" className="text-emerald-600 focus:ring-emerald-500" /> Nữ
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Thông tin liên hệ */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Thông Tin Liên Hệ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Số Điện Thoại <span className="text-red-500">*</span></label>
                  <input type="tel" className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="090..." required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input type="email" className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="email@example.com" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Địa Chỉ Thường Trú <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Số nhà, Tên đường..." required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Địa Chỉ Tạm Trú</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nhập nếu khác với địa chỉ thường trú" />
                </div>
              </div>
            </div>

            {/* Thông tin ngân hàng */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b">Thông Tin Quản Lý Hệ Thống</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Phân Hạng Khách Hàng</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="standard">Standard (Tiêu chuẩn)</option>
                    <option value="gold">Gold (Vàng)</option>
                    <option value="platinum">Platinum (Bạch kim)</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Trạng Thái Hệ Thống</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="active">Đang hoạt động</option>
                    <option value="pending">Chờ xác thực</option>
                    <option value="inactive">Đã khóa</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Ghi chú thêm</label>
                  <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt..."></textarea>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-6 border-t flex items-center justify-end gap-4">
              <Link href="/customers" className="px-6 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors font-medium">
                Hủy
              </Link>
              <button type="button" className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium">
                <Save className="w-4 h-4" /> Lưu Hồ Sơ
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
