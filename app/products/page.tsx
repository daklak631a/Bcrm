'use client'

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Plus, Search, Target, TrendingUp, PackageSearch, PenSquare, Trash2, Loader2, Check, UserPlus, ShoppingCart, Building2, User, X } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { Suspense, useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import clsx from "clsx"
import { fetchProducts, fetchProductSales, createProduct, deleteProduct, formatCurrency, fetchCustomers, createProductSale, getCustomerFullName, createCustomer } from "@/lib/supabase/api"
import { Modal, FormField, FormInput, FormSelect, SubmitButton } from "@/components/ui/modal"
import { toast } from "sonner"

function ProductsPageContent() {
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  const customerIdParam = searchParams.get('customerId')
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])

  // Sale Modal state
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  
  // Customer Search & Quick Add State
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false)
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const [customerType, setCustomerType] = useState("INDIVIDUAL")
  const [preFilledSearch, setPreFilledSearch] = useState("")

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers
    const qText = customerSearch.toLowerCase().trim()
    const qPhone = customerSearch.replace(/\D/g, '')

    return customers.filter(c => {
      const nameMatch = getCustomerFullName(c).toLowerCase().includes(qText)
      if (nameMatch) return true

      if (qPhone) {
        const cPhoneNormalized = c.phone ? c.phone.replace(/\D/g, '') : ''
        return cPhoneNormalized.includes(qPhone)
      }
      return false
    })
  }, [customers, customerSearch])

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId)
  }, [customers, selectedCustomerId])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [productsData, salesData, customersData] = await Promise.all([fetchProducts(), fetchProductSales(), fetchCustomers()])
      setProducts(productsData)
      setSales(salesData)
      setCustomers(customersData)
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setMounted(true); loadData() }, [loadData])

  useEffect(() => {
    if (!customerIdParam || customers.length === 0) return
    const customer = customers.find(c => c.id === customerIdParam)
    if (!customer) return
    setSelectedCustomerId(customer.id)
    setCustomerSearch(getCustomerFullName(customer))
  }, [customerIdParam, customers])

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

  const handleAddSale = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedCustomerId || !selectedProduct) {
      toast.error('Vui lòng chọn khách hàng và sản phẩm')
      return
    }
    const form = new FormData(e.currentTarget)
    try {
      setFormLoading(true)
      await createProductSale({
        product_id: selectedProduct.id,
        customer_id: selectedCustomerId,
        agent_id: user!.id,
        status: form.get('status') as string || 'COMPLETED',
        sale_date: form.get('sale_date') as string || new Date().toISOString(),
        note: form.get('note') as string,
      })
      toast.success('Ghi nhận bán chéo thành công!')
      setShowSaleModal(false)
      loadData()
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleQuickAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      setQuickAddLoading(true)
      const isEnt = customerType === 'ENTERPRISE'
      const bName = (form.get('business_name') as string || '').trim()
      const repName = (form.get('representative_name') as string || '').trim()
      const fName = isEnt ? bName : (form.get('full_name') as string || '').trim()

      const newCustomer = await createCustomer({
        customer_type: customerType,
        full_name: fName,
        business_name: isEnt ? bName : '',
        tax_code: isEnt ? (form.get('tax_code') as string || '') : '',
        representative_name: isEnt ? repName : '',
        phone: form.get('phone') as string || '',
        assigned_manager_id: user!.id,
      })
      toast.success('Thêm khách hàng thành công!')
      setCustomers(prev => [newCustomer, ...prev])
      setSelectedCustomerId(newCustomer.id)
      setCustomerSearch(getCustomerFullName(newCustomer))
      setShowQuickAddCustomer(false)
    } catch (err: any) {
      toast.error('Lỗi thêm KH: ' + err.message)
    } finally {
      setQuickAddLoading(false)
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
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
                      <div className={clsx("h-1.5 rounded-full transition-all duration-500", percent >= 100 ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${percent}%` }} />
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedProduct(product)
                        setSelectedCustomerId("")
                        setCustomerSearch("")
                        setShowSaleModal(true)
                      }}
                      className="w-full mt-2 py-2 flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" /> Bán Sản Phẩm
                    </button>
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
              <option value="Huy động vốn">Huy động vốn</option>
              <option value="Tín dụng">Tín dụng</option>
              <option value="Dịch vụ khác">Dịch vụ khác</option>
            </FormSelect>
          </FormField>
          <FormField label="Mục tiêu (số lượng)" required>
            <FormInput name="target" type="number" required placeholder="100" />
          </FormField>
          <SubmitButton loading={formLoading}>Thêm Sản Phẩm</SubmitButton>
        </form>
      </Modal>

      {/* Add Sale Modal */}
      <Modal isOpen={showSaleModal} onClose={() => setShowSaleModal(false)} title={`Bán chéo: ${selectedProduct?.name}`}>
        <form onSubmit={handleAddSale} className="space-y-4">
          <div className="space-y-1.5 relative">
            <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
              <span>Khách hàng <span className="text-rose-500">*</span></span>
              {selectedCustomer && (
                <span className={clsx(
                  "text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border",
                  selectedCustomer.customer_type === 'ENTERPRISE' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-sky-50 text-sky-700 border-sky-200"
                )}>
                  {selectedCustomer.customer_type === 'ENTERPRISE' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {selectedCustomer.customer_type === 'ENTERPRISE' ? "Doanh nghiệp (B2B)" : "Cá nhân"}
                </span>
              )}
            </label>
            
            <div className="relative">
              {/* Left Search Icon */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              
              {/* Main Search Input */}
              <input 
                type="text" 
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setShowCustomerDropdown(true)
                  if (selectedCustomerId) {
                    setSelectedCustomerId("")
                  }
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Tìm kiếm theo tên hoặc SĐT..." 
                className={clsx(
                  "w-full pl-9 pr-28 py-2 bg-white border rounded-lg text-sm outline-none transition-all",
                  selectedCustomerId 
                    ? "border-emerald-500 ring-2 ring-emerald-500/10 font-medium text-slate-800" 
                    : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                )}
              />

              {/* Right Action Icons Group */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearch("")
                      setSelectedCustomerId("")
                      setShowCustomerDropdown(false)
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerDropdown(false)
                    const query = customerSearch.trim()
                    if (query) {
                      const lowerQ = query.toLowerCase()
                      const isEnt = lowerQ.includes("công ty") || lowerQ.includes("tnhh") || lowerQ.includes("doanh nghiệp") || lowerQ.includes("b2b") || lowerQ.includes("coop") || lowerQ.includes("group") || lowerQ.includes("cp")
                      if (isEnt) {
                        setCustomerType("ENTERPRISE")
                      } else {
                        setCustomerType("INDIVIDUAL")
                      }
                      setPreFilledSearch(query)
                    } else {
                      setPreFilledSearch("")
                    }
                    setShowQuickAddCustomer(true)
                  }}
                  className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 rounded-md transition-colors flex items-center gap-1 shadow-sm"
                  title="Thêm nhanh khách hàng"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm nhanh
                </button>
              </div>

              {/* Dropdown Menu */}
              {showCustomerDropdown && (
                <div className="absolute z-50 w-full mt-1.5 top-full left-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => {
                      const isEnt = c.customer_type === 'ENTERPRISE'
                      const isSel = selectedCustomerId === c.id
                      return (
                        <div 
                          key={c.id} 
                          className={clsx(
                            "px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-all duration-100",
                            isSel 
                              ? "bg-emerald-50 text-emerald-800 font-medium" 
                              : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                          )}
                          onClick={() => {
                            setSelectedCustomerId(c.id)
                            setCustomerSearch(getCustomerFullName(c))
                            setShowCustomerDropdown(false)
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={clsx(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                              isEnt 
                                ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                                : "bg-sky-50 border-sky-100 text-sky-600"
                            )}>
                              {isEnt ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-slate-800 text-[13px]">
                                {getCustomerFullName(c)}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-slate-500 font-normal">
                                {c.phone && <span>{c.phone}</span>}
                                {c.phone && c.profiles?.full_name && <span className="text-slate-300">•</span>}
                                {c.profiles?.full_name && (
                                  <span>QL: {c.profiles.full_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={clsx(
                              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase",
                              isEnt ? "bg-emerald-100/70 text-emerald-800" : "bg-sky-100/70 text-sky-800"
                            )}>
                              {isEnt ? "B2B" : "Cá nhân"}
                            </span>
                            {isSel && <Check className="w-4 h-4 text-emerald-600" />}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="px-4 py-5 text-sm text-center text-slate-500 flex flex-col items-center gap-2">
                      <p className="font-medium text-slate-600">Không tìm thấy khách hàng &quot;{customerSearch}&quot;</p>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowCustomerDropdown(false)
                          const query = customerSearch.trim()
                          if (query) {
                            const lowerQ = query.toLowerCase()
                            const isEnt = lowerQ.includes("công ty") || lowerQ.includes("tnhh") || lowerQ.includes("doanh nghiệp") || lowerQ.includes("b2b") || lowerQ.includes("coop") || lowerQ.includes("group") || lowerQ.includes("cp")
                            if (isEnt) {
                              setCustomerType("ENTERPRISE")
                            } else {
                              setCustomerType("INDIVIDUAL")
                            }
                            setPreFilledSearch(query)
                          }
                          setShowQuickAddCustomer(true)
                        }}
                        className="mt-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Thêm nhanh khách hàng này
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Overlay to close dropdown */}
            {showCustomerDropdown && <div className="fixed inset-0 z-0" onClick={() => setShowCustomerDropdown(false)}></div>}
          </div>
          
          <FormField label="Trạng thái">
            <FormSelect name="status">
              <option value="COMPLETED">Thành công (Đã bán)</option>
              <option value="INTERESTED">Khách quan tâm</option>
              <option value="PENDING">Đang xử lý</option>
            </FormSelect>
          </FormField>
          
          <FormField label="Ngày bán">
            <FormInput name="sale_date" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} />
          </FormField>
          
          <FormField label="Ghi chú">
            <FormInput name="note" placeholder="Ghi chú thêm về việc bán chéo..." />
          </FormField>
          
          <SubmitButton loading={formLoading}>Ghi Nhận</SubmitButton>
        </form>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal isOpen={showQuickAddCustomer} onClose={() => setShowQuickAddCustomer(false)} title="Thêm Nhanh Khách Hàng">
        <form onSubmit={handleQuickAddCustomer} className="space-y-4">
          <FormField label="Loại Khách Hàng">
            <FormSelect value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
              <option value="INDIVIDUAL">Cá Nhân</option>
              <option value="ENTERPRISE">Doanh Nghiệp (B2B)</option>
            </FormSelect>
          </FormField>

          {customerType === 'ENTERPRISE' ? (
            <>
              <FormField label="Tên Doanh Nghiệp" required>
                <FormInput name="business_name" required defaultValue={preFilledSearch} placeholder="VD: Công ty TNHH ABC" />
              </FormField>
              <FormField label="Mã Số Thuế">
                <FormInput name="tax_code" placeholder="Mã số thuế" />
              </FormField>
              <FormField label="Người đại diện" required>
                <FormInput name="representative_name" required placeholder="Họ và tên người đại diện" />
              </FormField>
            </>
          ) : (
            <FormField label="Tên KH" required>
              <FormInput name="full_name" required defaultValue={preFilledSearch} placeholder="Nguyễn Văn An" />
            </FormField>
          )}

          <FormField label="Số điện thoại" required>
            <FormInput name="phone" required placeholder="09xxxxxxx" />
          </FormField>
          
          <SubmitButton loading={quickAddLoading}>Thêm Khách Hàng</SubmitButton>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsPageContent />
    </Suspense>
  )
}
