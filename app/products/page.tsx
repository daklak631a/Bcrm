'use client'

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Plus, Search, Target, TrendingUp, PackageSearch, PenSquare, Trash2, Loader2 } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useState, useEffect, useCallback } from "react"
import clsx from "clsx"
import { fetchProducts, fetchProductSales, createProduct, deleteProduct, formatCurrency } from "@/lib/supabase/api"
import { Modal, FormField, FormInput, FormSelect, SubmitButton } from "@/components/ui/modal"
import { toast } from "sonner"

export default function ProductsPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [productsData, salesData] = await Promise.all([fetchProducts(), fetchProductSales()])
      setProducts(productsData)
      setSales(salesData)
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setMounted(true); loadData() }, [loadData])

  if (!mounted) return null

  const isAdmin = user?.role === 'ADMIN_LEVEL_1'

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      setFormLoading(true)
      await createProduct({
        name: form.get('name') as string,
        type: form.get('type') as string,
        target: Number(form.get('target')) || 0,
      })
      toast.success('Thêm sản phẩm thành công!')
      setShowAddModal(false)
      loadData()
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa sản phẩm này?')) return
    try {
      await deleteProduct(id)
      toast.success('Đã xóa sản phẩm!')
      loadData()
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message)
    }
  }

  const filteredProducts = searchQuery.trim()
    ? products.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : products

  const getSalesCount = (productId: string) => sales.filter((s: any) => s.product_id === productId).length

  return (
    <DashboardLayout title="Sản Phẩm Bán Chéo">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Tìm kiếm sản phẩm..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 w-full outline-none" />
          </div>
          {isAdmin && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm">
              <Plus className="w-4 h-4" /> Thêm Sản Phẩm
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /><span className="ml-2 text-slate-500">Đang tải...</span></div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            {searchQuery ? `Không tìm thấy sản phẩm "${searchQuery}"` : 'Chưa có sản phẩm nào. Bấm "Thêm Sản Phẩm" để bắt đầu.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product: any) => {
              const currentSales = getSalesCount(product.id)
              const percent = product.target > 0 ? Math.min(Math.round((currentSales / product.target) * 100), 100) : 0
              return (
                <div key={product.id} className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-6 flex flex-col relative group">
                  {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><PackageSearch className="w-5 h-5" /></div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{product.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{product.type}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Mục tiêu</p>
                      <p className="font-semibold text-slate-800">{product.target}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Đã bán</p>
                      <p className="font-semibold text-indigo-600">{currentSales}</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-slate-600">Tiến độ</span>
                      <span className="text-xs font-bold text-slate-800">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={clsx("h-1.5 rounded-full transition-all duration-500", percent >= 100 ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Thêm Sản Phẩm Bán Chéo">
        <form onSubmit={handleAddProduct} className="space-y-4">
          <FormField label="Tên sản phẩm" required>
            <FormInput name="name" required placeholder="VD: Thẻ BIDV Chip" />
          </FormField>
          <FormField label="Loại sản phẩm" required>
            <FormSelect name="type" required>
              <option value="Thẻ">Thẻ</option>
              <option value="Bảo hiểm">Bảo hiểm</option>
              <option value="Tài khoản">Tài khoản</option>
              <option value="SmartBanking">SmartBanking</option>
              <option value="Dịch vụ khác">Dịch vụ khác</option>
            </FormSelect>
          </FormField>
          <FormField label="Mục tiêu (số lượng)" required>
            <FormInput name="target" type="number" required placeholder="100" />
          </FormField>
          <SubmitButton loading={formLoading}>Thêm Sản Phẩm</SubmitButton>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
