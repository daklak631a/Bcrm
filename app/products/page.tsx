'use client'

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Plus, Search, Tag, Target, TrendingUp, PackageSearch, PenSquare, Trash2 } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { formatCurrency, mockProducts } from "@/lib/mockData"
import { useState, useEffect } from "react"
import clsx from "clsx"

export default function ProductsPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null;

  return (
    <DashboardLayout title="Sản Phẩm Bán Chéo">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm sản phẩm..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full outline-none" 
            />
          </div>
          {user?.role === 'admin_1' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shrink-0 shadow-sm">
              <Plus className="w-4 h-4" /> Thêm Sản Phẩm
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProducts.map((product) => {
            const percent = Math.min(Math.round((product.currentSales / product.target) * 100), 100);
            return (
              <div key={product.id} className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)] p-6 overflow-hidden flex flex-col relative group">
                {user?.role === 'admin_1' && (
                  <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                      <PenSquare className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <PackageSearch className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{product.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{product.type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                     <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Target className="w-3 h-3"/> Mục tiêu mảng</p>
                     <p className="font-semibold text-slate-800">{product.target}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                     <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Đã hoàn thành</p>
                     <p className="font-semibold text-indigo-600">{product.currentSales}</p>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-600">Tiến độ chung</span>
                    <span className="text-xs font-bold text-slate-800">{percent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div 
                      className={clsx("h-1.5 rounded-full transition-all duration-500", percent >= 100 ? "bg-emerald-500" : "bg-indigo-500")} 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
