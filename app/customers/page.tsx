"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Plus, Filter, MoreHorizontal, Download, Upload, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useAuthStore } from "@/store/useAuthStore"
import { useDataStore } from "@/store/useDataStore"
import { getFilteredData } from "@/lib/mockData"
import { useEffect, useState, useRef, useMemo } from "react"
import * as XLSX from "xlsx"
import clsx from "clsx"

const ITEMS_PER_PAGE = 10

export default function CustomersPage() {
  const { user } = useAuthStore()
  const { agents, customers: storeCustomers, addCustomers } = useDataStore()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { customers: allCustomers } = getFilteredData(user, agents, storeCustomers)

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return allCustomers
    const q = searchQuery.toLowerCase().trim()
    return allCustomers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.cccd.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    )
  }, [allCustomers, searchQuery])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE))
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)

  if (!mounted) return null;

  const handleDownloadSample = () => {
    const sampleData = [
      {
        id: "C006",
        name: "Lê Thị Sample",
        phone: "0900000000",
        email: "sample@email.com",
        cccd: "079000000000",
        tier: "Standard",
        status: "Active",
        agentId: "AGENT_1"
      }
    ]
    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "KhachHang")
    XLSX.writeFile(workbook, "mau_khach_hang.xlsx")
  }

  const handleExportData = () => {
    const exportData = filteredCustomers.map(c => ({
      "Mã KH": c.id,
      "Tên Khách Hàng": c.name,
      "Số điện thoại": c.phone,
      "Email": c.email,
      "CCCD": c.cccd,
      "Hạng": c.tier,
      "Trạng Thái": c.status,
      "Mã Nhân Viên QL": c.agentId,
      "Tên Nhân Viên QL": c.agentName
    }))
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachKhachHang")
    XLSX.writeFile(workbook, "danh_sach_khach_hang.xlsx")
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      if (typeof bstr !== 'string' && !(bstr instanceof ArrayBuffer)) return
      
      const workbook = XLSX.read(bstr, { type: 'binary' })
      const worksheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[worksheetName]
      const data = XLSX.utils.sheet_to_json(worksheet) as any[]

      const newCustomers = data.map(item => ({
        id: item.id || item["Mã KH"] || `C${Date.now()}${Math.floor(Math.random() * 1000)}`,
        name: item.name || item["Tên Khách Hàng"] || "Unknown",
        phone: item.phone || item["Số điện thoại"] || "",
        email: item.email || item["Email"] || "",
        cccd: item.cccd || item["CCCD"] || "",
        tier: item.tier || item["Hạng"] || "Standard",
        status: item.status || item["Trạng Thái"] || "Active",
        agentId: item.agentId || item["Mã Nhân Viên QL"] || "AGENT_1"
      }))

      addCustomers(newCustomers)
      alert(`Đã tải lên thành công ${newCustomers.length} khách hàng!`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsBinaryString(file)
  }

  const isAdmin = user?.role === 'admin_1' || user?.role === 'admin_2'

  return (
    <DashboardLayout title="Danh Sách Khách Hàng">
      <div className="flex flex-col gap-6">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm theo tên, SĐT, CCCD..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full" 
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium shrink-0">
              <Filter className="w-4 h-4" /> Lọc
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <div className="flex bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden divide-x divide-slate-200 text-slate-700">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-sm font-medium"
                    title="Upload dữ liệu nền"
                  >
                    <Upload className="w-4 h-4" /> Nhập
                  </button>
                  <button 
                    onClick={handleExportData}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-sm font-medium"
                    title="Download tải về"
                  >
                    <Download className="w-4 h-4" /> Xuất
                  </button>
                  <button 
                    onClick={handleDownloadSample}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-sm font-medium text-emerald-600"
                    title="Tải file mẫu .xlsx"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> File mẫu
                  </button>
                </div>
              </>
            )}
            <Link href="/customers/new" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shrink-0 shadow-sm">
              <Plus className="w-4 h-4" /> Thêm KH
            </Link>
          </div>
        </div>

        {/* Search results count */}
        {searchQuery && (
          <p className="text-sm text-slate-500">
            Tìm thấy <span className="font-semibold text-slate-700">{filteredCustomers.length}</span> kết quả 
            cho &ldquo;<span className="font-medium text-emerald-600">{searchQuery}</span>&rdquo;
          </p>
        )}

        {/* Table */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-sm text-slate-600 font-medium">
                  <th className="py-3 px-4 font-semibold pb-3">Mã KH</th>
                  <th className="py-3 px-4 font-semibold">Tên Khách Hàng</th>
                  <th className="py-3 px-4 font-semibold">Liên Hệ</th>
                  <th className="py-3 px-4 font-semibold">Phân Hạng</th>
                  <th className="py-3 px-4 font-semibold">Trạng Thái</th>
                  <th className="py-3 px-4 font-semibold">Chuyên Viên</th>
                  <th className="py-3 px-4 font-semibold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      <Link href={`/customers/${customer.id}`} className="hover:text-emerald-600 hover:underline">
                        {customer.id}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <Link href={`/customers/${customer.id}`} className="text-sm font-medium text-slate-800 hover:text-emerald-600">
                          {customer.name}
                        </Link>
                        <span className="text-xs text-slate-500">CCCD: {customer.cccd}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-700">{customer.phone}</span>
                        <span className="text-xs text-slate-500">{customer.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium inline-block",
                        customer.tier === "VIP" ? "bg-purple-100 text-purple-700 border border-purple-200" :
                        customer.tier === "Platinum" ? "bg-slate-200 text-slate-700 border border-slate-300" :
                        customer.tier === "Gold" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                        "bg-blue-50 text-blue-700 border border-blue-200"
                      )}>
                        {customer.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "flex items-center gap-1.5 text-sm",
                        customer.status === "Active" ? "text-emerald-600" :
                        customer.status === "Pending" ? "text-amber-600" :
                        "text-slate-500"
                      )}>
                        <div className={clsx(
                          "w-1.5 h-1.5 rounded-full",
                          customer.status === "Active" ? "bg-emerald-500" :
                          customer.status === "Pending" ? "bg-amber-500" :
                          "bg-slate-400"
                        )} />
                        {customer.status === "Active" ? "Đang hoạt động" : 
                         customer.status === "Pending" ? "Chờ duyệt" : "Không HĐ"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">{customer.agentName}</td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/customers/${customer.id}`} className="inline-flex p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      {searchQuery ? `Không tìm thấy khách hàng với từ khóa "${searchQuery}"` : "Chưa có khách hàng nào trong phạm vi quản lý."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Real Pagination */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
            <span>
              {filteredCustomers.length > 0 
                ? `Hiển thị ${startIndex} - ${endIndex} trong số ${filteredCustomers.length} khách hàng`
                : "Không có khách hàng"
              }
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={clsx(
                      "px-3 py-1 border rounded text-sm font-medium transition-colors",
                      page === currentPage 
                        ? "bg-emerald-600 text-white border-emerald-600" 
                        : "bg-white hover:bg-slate-50"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
