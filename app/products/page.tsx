'use client'

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Plus, Search, Target, TrendingUp, PackageSearch, PenSquare, Trash2, Loader2, Check, UserPlus, ShoppingCart, Building2, User, X } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { Suspense, useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import clsx from "clsx"
import { formatMetricValue, getProductMetricDefinition, getProductMetricValue } from "@/lib/product-metrics"
import { fetchProducts, fetchProductSales, createProduct, deleteProduct, fetchCustomers, fetchProfiles, createProductSale, getCustomerFullName, createCustomer, fetchPlans, fetchPlanAssignments } from "@/lib/supabase/api"
import { Modal, FormField, FormInput, FormSelect, SubmitButton } from "@/components/ui/modal"
import { toast } from "sonner"
import { ProductMetricType } from "@/types/models"
import { KPI_CATEGORY_VALUES, KPI_CATEGORY_LABELS, OTHER_PRODUCTS_ID, classifyKpiProduct, classifyKpiProductByName } from "@/lib/kpi/classify"
import { filterAgentRecordsByAccess, filterCustomersByAccess } from "@/lib/access-control"
import { getErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"

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
  const [profiles, setProfiles] = useState<any[]>([])
  const [planAssignments, setPlanAssignments] = useState<any[]>([])

  // Map sản phẩm -> cột target_* qua nhóm KPI (nguồn chung lib/kpi/classify),
  // thay cho string-match riêng. SP nhóm "khác" trả null (dùng product.target).
  const getProductTargetField = (product: { name?: string | null; type?: string | null; kpi_category?: string | null }): string | null => {
    const category = classifyKpiProduct(product)
    return category === OTHER_PRODUCTS_ID ? null : `target_${category}`
  }

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
  const [newProductName, setNewProductName] = useState("")
  const [newProductShortName, setNewProductShortName] = useState("")
  const [newProductKpiCategory, setNewProductKpiCategory] = useState<string>(OTHER_PRODUCTS_ID)
  const [kpiCategoryTouched, setKpiCategoryTouched] = useState(false)
  const [newProductType, setNewProductType] = useState("Thẻ")
  const [newProductMetricType, setNewProductMetricType] = useState<ProductMetricType>("QUANTITY")
  const [newProductUnitLabel, setNewProductUnitLabel] = useState("SL")
  const [productMetricTouched, setProductMetricTouched] = useState(false)

  const filteredCustomers = useMemo(() => {
    const scopedCustomers = filterCustomersByAccess(customers, profiles, user)
    if (!customerSearch.trim()) return scopedCustomers
    const qText = customerSearch.toLowerCase().trim()
    const qPhone = customerSearch.replace(/\D/g, '')

    return scopedCustomers.filter(c => {
      const nameMatch = getCustomerFullName(c).toLowerCase().includes(qText)
      if (nameMatch) return true

      if (qPhone) {
        const cPhoneNormalized = c.phone ? c.phone.replace(/\D/g, '') : ''
        return cPhoneNormalized.includes(qPhone)
      }
      return false
    })
  }, [customers, customerSearch, profiles, user])

  const selectedCustomer = useMemo(() => {
    return filterCustomersByAccess(customers, profiles, user).find(c => c.id === selectedCustomerId)
  }, [customers, profiles, selectedCustomerId, user])

  const selectedProductMetric = useMemo(() => {
    return getProductMetricDefinition(selectedProduct)
  }, [selectedProduct])

  const loadData = useCallback(async () => {
    if (user?.role === 'USER') {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [productsData, salesData, customersData, profilesData, plansData] = await Promise.all([
        fetchProducts(),
        fetchProductSales(),
        fetchCustomers(),
        fetchProfiles(),
        fetchPlans()
      ])
      setProducts(productsData)
      setSales(salesData)
      setCustomers(customersData)
      setProfiles(profilesData)

      if (plansData && plansData.length > 0) {
        const latestPlan = plansData[0]
        try {
          const assignmentsData = await fetchPlanAssignments(latestPlan.id)
          setPlanAssignments(assignmentsData)
        } catch (assignErr) {
          logger.warn("[Products] Failed to load KPI assignments", {
            error: getErrorMessage(assignErr),
          })
          toast.warning("Không thể tải chỉ tiêu KPI mới nhất.")
        }
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      logger.error("[Products] Failed to load products data", { error: message })
      toast.error('Lỗi tải dữ liệu: ' + message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { setMounted(true); loadData() }, [loadData])

  useEffect(() => {
    const scopedCustomers = filterCustomersByAccess(customers, profiles, user)
    if (!customerIdParam || scopedCustomers.length === 0) return
    const customer = scopedCustomers.find(c => c.id === customerIdParam)
    if (!customer) return
    setSelectedCustomerId(customer.id)
    setCustomerSearch(getCustomerFullName(customer))
  }, [customerIdParam, customers, profiles, user])

  useEffect(() => {
    if (productMetricTouched) return
    const defaults = getProductMetricDefinition({ name: newProductName, type: newProductType })
    setNewProductMetricType(defaults.metricType)
    setNewProductUnitLabel(defaults.unitLabel)
  }, [newProductName, newProductType, productMetricTouched])

  // Tự gợi ý nhóm KPI theo tên/loại cho tới khi người dùng tự chọn.
  useEffect(() => {
    if (kpiCategoryTouched) return
    setNewProductKpiCategory(classifyKpiProductByName({ name: newProductName, type: newProductType }))
  }, [newProductName, newProductType, kpiCategoryTouched])

  const productPerformanceMap = useMemo(() => {
    const performanceMap = new Map<string, { metricValue: number; completedCount: number }>()

    filterAgentRecordsByAccess(sales, profiles, user).forEach((sale: any) => {
      if (!sale.product_id || String(sale.status || '').toUpperCase() !== 'COMPLETED') return

      const current = performanceMap.get(sale.product_id) || { metricValue: 0, completedCount: 0 }
      current.metricValue += getProductMetricValue(sale, sale.cross_sell_products)
      current.completedCount += 1
      performanceMap.set(sale.product_id, current)
    })

    return performanceMap
  }, [profiles, sales, user])

  const getProductTarget = useCallback((product: any) => {
    const targetField = getProductTargetField(product)
    if (!targetField || planAssignments.length === 0) {
      return Number(product.target || 0)
    }

    if (user?.role === "USER") {
      const personalAssignment = planAssignments.find(a => a.user_id === user.id)
      return personalAssignment ? Number(personalAssignment[targetField] || 0) : Number(product.target || 0)
    }

    if (user?.role === "ADMIN_LEVEL_2") {
      const deptAssignments = planAssignments.filter(a => a.profiles?.department_id === user.department_id)
      if (deptAssignments.length === 0) return Number(product.target || 0)
      return deptAssignments.reduce((sum, a) => sum + Number(a[targetField] || 0), 0)
    }

    if (user?.role === "ADMIN_LEVEL_1") {
      return planAssignments.reduce((sum, a) => sum + Number(a[targetField] || 0), 0)
    }

    return Number(product.target || 0)
  }, [planAssignments, user])

  if (!mounted) return null

  if (user?.role === 'USER') {
    return (
      <DashboardLayout title="Danh Mục Sản Phẩm">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <PackageSearch className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">Không có quyền truy cập</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Danh mục sản phẩm được ẩn với tài khoản chuyên viên. Bạn vẫn có thể ghi nhận bán hàng tại Bảng Bán Hàng.
          </p>
          <Link href="/sales" className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#006b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005451]">
            Mở Bảng Bán Hàng
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const isAdmin = user?.role === 'ADMIN_LEVEL_1'

  const openAddProductModal = () => {
    const defaults = getProductMetricDefinition({ name: '', type: 'Thẻ' })
    setNewProductName('')
    setNewProductShortName('')
    setNewProductKpiCategory(OTHER_PRODUCTS_ID)
    setKpiCategoryTouched(false)
    setNewProductType('Thẻ')
    setNewProductMetricType(defaults.metricType)
    setNewProductUnitLabel(defaults.unitLabel)
    setProductMetricTouched(false)
    setShowAddModal(true)
  }

  const openQuickSaleModal = (product: any) => {
    setSelectedProduct(product)
    if (customerIdParam) {
      const presetCustomer = filterCustomersByAccess(customers, profiles, user).find(c => c.id === customerIdParam)
      if (presetCustomer) {
        setSelectedCustomerId(presetCustomer.id)
        setCustomerSearch(getCustomerFullName(presetCustomer))
      } else {
        setSelectedCustomerId("")
        setCustomerSearch("")
      }
    } else {
      setSelectedCustomerId("")
      setCustomerSearch("")
    }
    setShowSaleModal(true)
  }

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const normalizedName = newProductName.trim()
    const normalizedUnitLabel = newProductUnitLabel.trim()

    if (!normalizedName) {
      toast.error('Vui lòng nhập tên sản phẩm')
      return
    }

    if (!normalizedUnitLabel) {
      toast.error('Vui lòng nhập đơn vị tính')
      return
    }

    try {
      setFormLoading(true)
      await createProduct({
        name: normalizedName,
        short_name: newProductShortName.trim() || undefined,
        kpi_category: newProductKpiCategory,
        type: newProductType,
        target: Number(form.get('target')) || 0,
        metric_type: newProductMetricType,
        unit_label: normalizedUnitLabel,
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
    if (!selectedCustomer) {
      toast.error('Không thể ghi nhận cho khách hàng ngoài phạm vi quản lý')
      return
    }
    const form = new FormData(e.currentTarget)
    const resultValue = Number(form.get('result_value') || 0)

    if (resultValue <= 0) {
      toast.error(`Vui lòng nhập kết quả (${selectedProductMetric.unitLabel})`)
      return
    }

    try {
      setFormLoading(true)
      await createProductSale({
        product_id: selectedProduct.id,
        customer_id: selectedCustomerId,
        agent_id: user!.id,
        status: form.get('status') as string || 'COMPLETED',
        sale_date: form.get('sale_date') as string || new Date().toISOString(),
        note: form.get('note') as string,
        result_value: resultValue,
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

  const getCreateSaleHref = (productId: string) => {
    const params = new URLSearchParams({ create: '1', type: 'PRODUCT', productId })
    if (customerIdParam) params.set('customerId', customerIdParam)
    return `/sales?${params.toString()}`
  }

  return (
    <DashboardLayout title="Danh Mục Sản Phẩm">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Tìm kiếm sản phẩm..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 w-full outline-none" />
          </div>
          {isAdmin && (
            <button onClick={openAddProductModal} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm">
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
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Sản phẩm</th>
                    <th className="py-4 px-4 text-center">Đơn vị</th>
                    <th className="py-4 px-4 text-right">Mục tiêu</th>
                    <th className="py-4 px-4 text-right">Thực tế</th>
                    <th className="py-4 px-6 min-w-[200px]">Tiến độ</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product: any, idx: number) => {
                    const metricDefinition = getProductMetricDefinition(product)
                    const performance = productPerformanceMap.get(product.id) || { metricValue: 0, completedCount: 0 }
                    const currentMetricValue = performance.metricValue
                    const resolvedTarget = getProductTarget(product)
                    const percent = resolvedTarget > 0 ? Math.min(Math.round((currentMetricValue / resolvedTarget) * 100), 100) : 0
                    
                    return (
                      <tr key={product.id} className={clsx("hover:bg-slate-50/80 transition-colors group", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#006b68] border border-teal-100/50 flex items-center justify-center shrink-0">
                              <PackageSearch className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-[14px] truncate">{product.name}</p>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{product.type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            {metricDefinition.unitLabel}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-semibold text-slate-700">
                          {formatMetricValue(resolvedTarget, metricDefinition.unitLabel)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <p className="font-bold text-[#006b68]">{formatMetricValue(currentMetricValue, metricDefinition.unitLabel)}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{performance.completedCount} giao dịch</p>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div 
                                  className={clsx("h-2 rounded-full transition-all duration-500", percent >= 100 ? "bg-emerald-500" : "bg-[#006b68]")} 
                                  style={{ width: `${percent}%` }} 
                                />
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-700 shrink-0 w-8 text-right">{percent}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openQuickSaleModal(product)}
                              className="px-3 py-1.5 bg-teal-50 text-[#006b68] hover:bg-teal-100/50 border border-teal-200/50 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" /> Ghi nhanh
                            </button>

                            <Link
                              href={getCreateSaleHref(product.id)}
                              className="px-3 py-1.5 bg-[#006b68] hover:bg-[#005451] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" /> Bán hàng
                            </Link>

                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                                title="Xóa sản phẩm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: card list */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredProducts.map((product: any) => {
                const metricDefinition = getProductMetricDefinition(product)
                const performance = productPerformanceMap.get(product.id) || { metricValue: 0, completedCount: 0 }
                const currentMetricValue = performance.metricValue
                const resolvedTarget = getProductTarget(product)
                const percent = resolvedTarget > 0 ? Math.min(Math.round((currentMetricValue / resolvedTarget) * 100), 100) : 0
                return (
                  <article key={product.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#006b68] border border-teal-100/50 flex items-center justify-center shrink-0">
                        <PackageSearch className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-sm break-words">{product.short_name || product.name}</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{product.type} • {metricDefinition.unitLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Mục tiêu: <span className="font-semibold text-slate-700">{formatMetricValue(resolvedTarget, metricDefinition.unitLabel)}</span></span>
                      <span className="text-slate-500">Thực tế: <span className="font-bold text-[#006b68]">{formatMetricValue(currentMetricValue, metricDefinition.unitLabel)}</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className={clsx("h-2 rounded-full transition-all duration-500", percent >= 100 ? "bg-emerald-500" : "bg-[#006b68]")} style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 shrink-0 w-9 text-right">{percent}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openQuickSaleModal(product)}
                        className="flex-1 min-h-[40px] bg-teal-50 text-[#006b68] hover:bg-teal-100/50 border border-teal-200/50 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-4 h-4" /> Ghi nhanh
                      </button>
                      <Link
                        href={getCreateSaleHref(product.id)}
                        className="flex-1 min-h-[40px] bg-[#006b68] hover:bg-[#005451] text-white rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-4 h-4" /> Bán hàng
                      </Link>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Thêm Sản Phẩm Bán Chéo">
        <form onSubmit={handleAddProduct} className="space-y-4">
          <FormField label="Tên sản phẩm" required>
            <FormInput value={newProductName} onChange={(e) => setNewProductName(e.target.value)} required placeholder="VD: DƯ NỢ TÍN DỤNG TĂNG RÒNG (Ngắn hạn)" />
          </FormField>
          <FormField label="Tên rút gọn (hiển thị trên nút mobile)">
            <FormInput value={newProductShortName} onChange={(e) => setNewProductShortName(e.target.value)} placeholder="VD: DN Ngắn hạn" />
          </FormField>
          <FormField label="Nhóm KPI" required>
            <FormSelect
              value={newProductKpiCategory}
              onChange={(e) => {
                setKpiCategoryTouched(true)
                setNewProductKpiCategory(e.target.value)
              }}
              required
            >
              {KPI_CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>{KPI_CATEGORY_LABELS[value]}</option>
              ))}
            </FormSelect>
          </FormField>
          <FormField label="Loại sản phẩm" required>
            <FormSelect value={newProductType} onChange={(e) => setNewProductType(e.target.value)} required>
              <option value="Thẻ">Thẻ</option>
              <option value="Bảo hiểm">Bảo hiểm</option>
              <option value="Tài khoản">Tài khoản</option>
              <option value="SmartBanking">SmartBanking</option>
              <option value="Huy động vốn">Huy động vốn</option>
              <option value="Tín dụng">Tín dụng</option>
              <option value="Dịch vụ khác">Dịch vụ khác</option>
            </FormSelect>
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Kiểu kết quả" required>
              <FormSelect value={newProductMetricType} onChange={(e) => {
                setProductMetricTouched(true)
                setNewProductMetricType(e.target.value as ProductMetricType)
              }} required>
                <option value="QUANTITY">Theo số lượng</option>
                <option value="AMOUNT">Theo giá trị</option>
              </FormSelect>
            </FormField>
            <FormField label="Đơn vị tính" required>
              <FormInput value={newProductUnitLabel} onChange={(e) => {
                setProductMetricTouched(true)
                setNewProductUnitLabel(e.target.value)
              }} required placeholder="VD: KH, Triệu đồng, Tỷ đồng" />
            </FormField>
          </div>
          <FormField label={`Mục tiêu (${newProductUnitLabel || 'đơn vị'})`} required>
            <FormInput name="target" type="number" step="0.01" required placeholder="100" />
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

          {selectedProduct && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={`Kết quả (${selectedProductMetric.unitLabel})`} required>
                <FormInput name="result_value" type="number" step="0.01" min="0" required placeholder={selectedProductMetric.metricType === 'AMOUNT' ? '50' : '1'} defaultValue={selectedProductMetric.metricType === 'QUANTITY' ? '1' : undefined} />
              </FormField>
              <FormField label="Kiểu ghi nhận">
                <FormInput value={selectedProductMetric.metricType === 'AMOUNT' ? 'Theo giá trị' : 'Theo số lượng'} disabled readOnly />
              </FormField>
            </div>
          )}
          
          <FormField label="Trạng thái">
            <FormSelect name="status">
              <option value="COMPLETED">Thành công (Đã bán)</option>
              <option value="INTERESTED">Khách quan tâm</option>
              <option value="PENDING">Đang xử lý</option>
            </FormSelect>
          </FormField>
          
          <FormField label="Ngày bán">
            <FormInput name="sale_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
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
