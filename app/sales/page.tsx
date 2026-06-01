"use client"

import clsx from "clsx"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Briefcase, Filter, Loader2, Package, PiggyBank, Plus, Search, TrendingUp, ArrowRight, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Modal, FormField, FormInput, FormSelect, SubmitButton } from "@/components/ui/modal"
import { formatMetricValue, getProductMetricDefinition, getRecordMetricValue, getRecordUnitLabel } from "@/lib/product-metrics"
import { createSalesRecord, createBatchSale, fetchCustomers, fetchProducts, fetchProfiles, fetchSalesRecords, fetchSalesRecordsByCustomer, formatCurrency, getCustomerFullName, updateProductSale } from "@/lib/supabase/api"
import { useAuthStore } from "@/store/useAuthStore"
import { SalesRecord } from "@/types/models"

const ITEMS_PER_PAGE = 12

const LOAN_OPTIONS = [
  "Vay bổ sung vốn lưu động",
  "Vay đầu tư dự án",
  "Cấp mới hạn mức tín dụng",
  "Thấu chi tài khoản Doanh nghiệp",
  "Cho vay tài trợ thương mại",
  "Vay tiêu dùng",
  "Vay mua nhà",
  "Vay sản xuất kinh doanh",
  "Vay tín chấp",
  "Vay mua ô tô",
]

const DEPOSIT_OPTIONS = [
  "Tiết kiệm thường",
  "Tiết kiệm có kỳ hạn",
  "Tiết kiệm không kỳ hạn",
  "Tiền gửi thanh toán",
]

function SalesPageContent() {
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  const customerIdParam = searchParams.get("customerId")
  const createParam = searchParams.get("create")
  const typeParam = searchParams.get("type")
  const productIdParam = searchParams.get("productId")
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [records, setRecords] = useState<SalesRecord[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<"ALL" | SalesRecord["source_type"]>("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saleType, setSaleType] = useState<SalesRecord["source_type"]>("LOAN")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [routePresetApplied, setRoutePresetApplied] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchCustomerId, setBatchCustomerId] = useState("")
  const [batchCustomerSearch, setBatchCustomerSearch] = useState("")
  const [showBatchCustomerDropdown, setShowBatchCustomerDropdown] = useState(false)
  const [batchSaleDate, setBatchSaleDate] = useState(new Date().toISOString().slice(0, 10))
  const [batchProductValues, setBatchProductValues] = useState<Record<string, number>>({})
  const [batchProductNotes, setBatchProductNotes] = useState<Record<string, string>>({})
  const [isBatchMode, setIsBatchMode] = useState(false) // true = không cần KH
  const [batchEntryNote, setBatchEntryNote] = useState("")
  const [isSingleBatchMode, setIsSingleBatchMode] = useState(false)

  const handleOpenBatchModal = () => {
    setBatchCustomerId("")
    setBatchCustomerSearch("")
    setShowBatchCustomerDropdown(false)
    setBatchSaleDate(new Date().toISOString().slice(0, 10))
    setBatchProductValues({})
    setIsBatchMode(false)
    setBatchEntryNote("")
    setShowBatchModal(true)
  }

  const handleSaveBatchSales = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate: nếu không phải batch mode, phải có KH
    if (!isBatchMode && !batchCustomerId) {
      toast.error("Vui lòng chọn khách hàng hoặc chọn 'Cập nhật theo lô'")
      return
    }

    const salesToCreate = Object.entries(batchProductValues)
      .filter(([_, val]) => val > 0)
      .map(([productId, val]) => ({
        product_id: productId,
        customer_id: isBatchMode ? null : batchCustomerId,
        agent_id: user?.id || "",
        status: "COMPLETED",
        sale_date: batchSaleDate,
        result_value: val,
      }))

    if (salesToCreate.length === 0) {
      toast.error("Vui lòng nhập kết quả (> 0) cho ít nhất một sản phẩm")
      return
    }

    try {
      setBatchLoading(true)
      if (isBatchMode) {
        // Ghi theo lô — không cần KH, lưu is_batch_entry = true
        const promises = salesToCreate.map((sale) =>
          createBatchSale({
            product_id: sale.product_id,
            agent_id: sale.agent_id,
            status: sale.status,
            sale_date: sale.sale_date,
            result_value: sale.result_value,
            batch_note: batchEntryNote || undefined,
          })
        )
        await Promise.all(promises)
        toast.success(`Đã ghi lô ${salesToCreate.length} sản phẩm. Vào "Phân bổ lô" để gán vào từng KH sau.`)
      } else {
        // Ghi theo KH cụ thể
        const promises = salesToCreate.map((sale) => createSalesRecord({
          source_type: "PRODUCT",
          customer_id: sale.customer_id!,
          agent_id: sale.agent_id,
          status: sale.status,
          sale_date: sale.sale_date,
          product_id: sale.product_id,
          result_value: sale.result_value,
        }))
        await Promise.all(promises)
        toast.success(`Đã ghi nhận thành công ${salesToCreate.length} sản phẩm bán chéo cho khách hàng!`)
      }
      setShowBatchModal(false)
      loadData()
    } catch (err: any) {
      toast.error("Lỗi ghi nhận theo lô: " + err.message)
    } finally {
      setBatchLoading(false)
    }
  }

  const presetSaleType = useMemo(() => {
    const normalized = typeParam?.toUpperCase()
    if (normalized === "LOAN" || normalized === "DEPOSIT" || normalized === "PRODUCT") {
      return normalized as SalesRecord["source_type"]
    }
    return null
  }, [typeParam])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [salesData, customersData, productsData, profilesData] = await Promise.all([
        customerIdParam ? fetchSalesRecordsByCustomer(customerIdParam) : fetchSalesRecords(),
        fetchCustomers(),
        fetchProducts(),
        fetchProfiles(),
      ])
      setRecords(salesData)
      setCustomers(customersData)
      setProducts(productsData)
      setProfiles(profilesData)
    } catch (err: any) {
      toast.error("Lỗi tải dữ liệu: " + err.message)
    } finally {
      setLoading(false)
    }
  }, [customerIdParam])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  const visibleProfiles = useMemo(() => {
    if (user?.role === "ADMIN_LEVEL_1") return profiles
    if (user?.role === "ADMIN_LEVEL_2") return profiles.filter((profile: any) => profile.department_id === user.department_id)
    return profiles.filter((profile: any) => profile.id === user?.id)
  }, [profiles, user?.department_id, user?.id, user?.role])

  const visibleProfileIds = useMemo(() => new Set(visibleProfiles.map((profile: any) => profile.id)), [visibleProfiles])
  const visibleCustomers = useMemo(() => {
    return customers.filter((customer: any) => visibleProfileIds.has(customer.assigned_manager_id))
  }, [customers, visibleProfileIds])
  const visibleRecords = useMemo(() => {
    return records.filter((record) => record.agent_id && visibleProfileIds.has(record.agent_id))
  }, [records, visibleProfileIds])

  const filteredBatchCustomers = useMemo(() => {
    if (!batchCustomerSearch.trim()) return visibleCustomers
    const qText = batchCustomerSearch.toLowerCase().trim()
    const qPhone = batchCustomerSearch.replace(/\D/g, "")

    return visibleCustomers.filter((customer) => {
      const nameMatch = getCustomerFullName(customer).toLowerCase().includes(qText)
      if (nameMatch) return true
      if (!qPhone) return false
      const normalizedPhone = customer.phone ? customer.phone.replace(/\D/g, "") : ""
      return normalizedPhone.includes(qPhone)
    })
  }, [visibleCustomers, batchCustomerSearch])

  useEffect(() => {
    if (!customerIdParam || visibleCustomers.length === 0) return
    const customer = visibleCustomers.find((c) => c.id === customerIdParam)
    if (!customer) return
    setSelectedCustomerId(customer.id)
    setCustomerSearch(getCustomerFullName(customer))
    setSearchQuery(getCustomerFullName(customer))
  }, [customerIdParam, visibleCustomers])

  useEffect(() => {
    if (!mounted || routePresetApplied) return

    if (presetSaleType) {
      setSaleType(presetSaleType)
      setTypeFilter(presetSaleType)
    }

    if (productIdParam) {
      setSelectedProductId(productIdParam)
    }

    if (createParam === "1" || createParam === "true") {
      setShowAddModal(true)
    }

    setRoutePresetApplied(true)
  }, [mounted, routePresetApplied, presetSaleType, productIdParam, createParam])

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return visibleCustomers
    const qText = customerSearch.toLowerCase().trim()
    const qPhone = customerSearch.replace(/\D/g, "")

    return visibleCustomers.filter((customer) => {
      const nameMatch = getCustomerFullName(customer).toLowerCase().includes(qText)
      if (nameMatch) return true
      if (!qPhone) return false
      const normalizedPhone = customer.phone ? customer.phone.replace(/\D/g, "") : ""
      return normalizedPhone.includes(qPhone)
    })
  }, [visibleCustomers, customerSearch])

  const selectedProduct = useMemo(() => {
    return products.find((product) => product.id === selectedProductId) || null
  }, [products, selectedProductId])

  const selectedProductMetric = useMemo(() => {
    return getProductMetricDefinition(selectedProduct)
  }, [selectedProduct])

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return visibleRecords.filter((record) => {
      const matchesType = typeFilter === "ALL" || record.source_type === typeFilter
      if (!matchesType) return false
      if (!q) return true
      return [
        record.customer_name,
        record.title,
        record.category,
        record.status,
        record.account_number || "",
      ].some((value) => value.toLowerCase().includes(q))
    })
  }, [visibleRecords, searchQuery, typeFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE))
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const stats = useMemo(() => {
    const loans = visibleRecords.filter((record) => record.source_type === "LOAN")
    const deposits = visibleRecords.filter((record) => record.source_type === "DEPOSIT")
    const productTransactions = visibleRecords.filter((record) => record.source_type === "PRODUCT").length

    return {
      totalCount: visibleRecords.length,
      loanAmount: loans.reduce((sum, record) => sum + Number(record.amount || 0), 0),
      depositAmount: deposits.reduce((sum, record) => sum + Number(record.amount || 0), 0),
      productTransactions,
    }
  }, [visibleRecords])

  if (!mounted) return null

  const getSourceMeta = (sourceType: SalesRecord["source_type"]) => {
    switch (sourceType) {
      case "LOAN":
        return { label: "Khoản vay", icon: Briefcase, color: "bg-teal-100 text-teal-700" }
      case "DEPOSIT":
        return { label: "Tiền gửi", icon: PiggyBank, color: "bg-emerald-100 text-emerald-700" }
      default:
        return { label: "Sản phẩm", icon: Package, color: "bg-amber-100 text-amber-700" }
    }
  }

  const getStatusLabel = (record: SalesRecord) => {
    if (record.source_type === "PRODUCT" && record.raw?.is_batch_entry === true && !record.raw?.is_allocated) {
      return "Chưa phân bổ theo KH"
    }
    switch (record.status) {
      case "ACTIVE":
        return "Đang hoạt động"
      case "PENDING":
        return "Chờ xử lý"
      case "MATURED":
        return "Đến hạn"
      case "CLOSED":
        return "Đã tất toán"
      case "COMPLETED":
        return "Thành công"
      case "INTERESTED":
        return "Quan tâm"
      default:
        return record.status
    }
  }

  const resetModalState = () => {
    setSaleType(presetSaleType || "LOAN")
    setSelectedProductId(productIdParam || "")
    if (!customerIdParam) {
      setSelectedCustomerId("")
      setCustomerSearch("")
    }
    setShowCustomerDropdown(false)
    setIsSingleBatchMode(false)
  }

  const handleCreateRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isSingleBatchMode && !selectedCustomerId) {
      toast.error("Vui lòng chọn khách hàng")
      return
    }

    const form = new FormData(e.currentTarget)
    const resultValue = Number(form.get("result_value") || 0)

    if (saleType === "PRODUCT" && resultValue <= 0) {
      toast.error(`Vui lòng nhập kết quả (${selectedProductMetric.unitLabel})`)
      return
    }

    try {
      setFormLoading(true)
      if (saleType === "PRODUCT" && isSingleBatchMode) {
        await createBatchSale({
          product_id: selectedProductId || (form.get("product_id") as string),
          agent_id: user?.id || "",
          status: form.get("status") as string,
          sale_date: form.get("sale_date") as string,
          result_value: resultValue,
          batch_note: (form.get("note") as string) || undefined,
        })
      } else {
        await createSalesRecord({
          source_type: saleType,
          customer_id: selectedCustomerId,
          agent_id: user?.id || "",
          title: saleType === "PRODUCT" ? undefined : (form.get("title") as string),
          amount: saleType === "PRODUCT" ? 0 : Number(form.get("amount") || 0),
          result_value: saleType === "PRODUCT" ? resultValue : undefined,
          account_number: (form.get("account_number") as string) || undefined,
          sale_date: form.get("sale_date") as string,
          due_date: saleType === "LOAN" ? (form.get("due_date") as string) : undefined,
          maturity_date: saleType === "DEPOSIT" ? (form.get("maturity_date") as string) : undefined,
          status: form.get("status") as string,
          note: (form.get("note") as string) || undefined,
          product_id: saleType === "PRODUCT" ? (selectedProductId || (form.get("product_id") as string)) : undefined,
        })
      }
      toast.success("Đã ghi nhận bán hàng")
      setShowAddModal(false)
      resetModalState()
      loadData()
    } catch (err: any) {
      toast.error("Lỗi: " + err.message)
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <DashboardLayout title="Bảng Bán Hàng">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng giao dịch bán</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{stats.totalCount}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-1">Doanh số khoản vay</p>
            <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-800 truncate" title={formatCurrency(stats.loanAmount)}>{formatCurrency(stats.loanAmount)}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-1">Doanh số huy động</p>
            <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-800 truncate" title={formatCurrency(stats.depositAmount)}>{formatCurrency(stats.depositAmount)}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-1">Giao dịch sản phẩm</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{stats.productTransactions}</h3>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo khách hàng, loại bán, số TK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 w-full outline-none"
              />
            </div>
            <div className="relative sm:w-56">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "ALL" | SalesRecord["source_type"])}
                className="w-full appearance-none pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="ALL">Tất cả nhóm bán</option>
                <option value="LOAN">Khoản vay</option>
                <option value="DEPOSIT">Tiền gửi</option>
                <option value="PRODUCT">Sản phẩm khác</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sales/batch-allocate"
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors text-sm font-medium border border-slate-200"
              title="Phân bổ lô cuối ngày vào KH cụ thể"
            >
              <ArrowRight className="w-4 h-4" /> Phân bổ lô
            </Link>
            <button
              onClick={handleOpenBatchModal}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors text-sm font-medium shadow-sm"
              title="Cập nhật nhanh kết quả cho các giao dịch bán chéo sản phẩm"
            >
              <TrendingUp className="w-4 h-4" /> Cập nhật cuối ngày
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" /> Ghi nhận bán hàng
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl ring-1 ring-slate-900/5 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-slate-500">Đang tải...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[920px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-sm text-slate-600 font-medium">
                      <th className="py-3 px-4 font-semibold">Ngày</th>
                      <th className="py-3 px-4 font-semibold">Khách hàng</th>
                      <th className="py-3 px-4 font-semibold">Nhóm bán</th>
                      <th className="py-3 px-4 font-semibold">Nội dung</th>
                      <th className="py-3 px-4 font-semibold">Giá trị</th>
                      <th className="py-3 px-4 font-semibold">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecords.map((record) => {
                      const sourceMeta = getSourceMeta(record.source_type)
                      const Icon = sourceMeta.icon
                      const metricValue = getRecordMetricValue(record)
                      const unitLabel = getRecordUnitLabel(record)
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-slate-600">{new Date(record.sale_date).toLocaleDateString("vi-VN")}</td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-800">{record.customer_name}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">
                            <span className={clsx("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium", sourceMeta.color)}>
                              <Icon className="w-3.5 h-3.5" /> {sourceMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">
                            <div className="font-medium text-slate-800">{record.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{record.category}{record.account_number ? ` • ${record.account_number}` : ""}{record.source_type === "PRODUCT" ? ` • ${unitLabel}` : ""}</div>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-800">
                            {record.source_type === "PRODUCT"
                              ? formatMetricValue(metricValue, unitLabel)
                              : formatCurrency(Number(record.amount || 0))}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{getStatusLabel(record)}</td>
                        </tr>
                      )
                    })}
                    {filteredRecords.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">Chưa có giao dịch bán hàng nào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
                <span>{filteredRecords.length > 0 ? `Hiển thị ${(currentPage - 1) * ITEMS_PER_PAGE + 1} - ${Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)} / ${filteredRecords.length}` : "Không có dữ liệu"}</span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="px-3 py-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40">Trước</button>
                    <span className="px-2">{currentPage}/{totalPages}</span>
                    <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40">Sau</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          resetModalState()
        }}
        title="Ghi nhận bán hàng"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4">
          <FormField label="Nhóm bán hàng" required>
            <FormSelect value={saleType} onChange={(e) => setSaleType(e.target.value as SalesRecord["source_type"])}>
              <option value="LOAN">Khoản vay</option>
              <option value="DEPOSIT">Tiền gửi</option>
              <option value="PRODUCT">Sản phẩm khác</option>
            </FormSelect>
          </FormField>

          {saleType === "PRODUCT" && (
            <div className="flex items-center gap-2 p-2 bg-amber-50/50 border border-amber-200 rounded-xl">
              <input
                type="checkbox"
                id="single-batch-mode-toggle"
                checked={isSingleBatchMode}
                onChange={(e) => {
                  setIsSingleBatchMode(e.target.checked)
                  if (e.target.checked) {
                    setSelectedCustomerId("BATCH")
                    setCustomerSearch("Cập nhật theo lô cuối ngày")
                  } else {
                    setSelectedCustomerId("")
                    setCustomerSearch("")
                  }
                }}
                className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="single-batch-mode-toggle" className="text-xs font-semibold text-amber-800 cursor-pointer">
                Cập nhật theo lô cuối ngày (không cần chọn KH cụ thể)
              </label>
            </div>
          )}

          {!isSingleBatchMode && (
            <div className="space-y-1 relative">
              <label className="text-sm font-medium text-slate-700">Khách hàng <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerDropdown(true)
                    if (selectedCustomerId) setSelectedCustomerId("")
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Tìm kiếm tên hoặc SĐT..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-[#006b68] outline-none"
                />
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className={clsx("px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 flex items-center justify-between", selectedCustomerId === customer.id && "bg-teal-50 text-[#006b68]")}
                          onClick={() => {
                            setSelectedCustomerId(customer.id)
                            setCustomerSearch(getCustomerFullName(customer))
                            setShowCustomerDropdown(false)
                          }}
                        >
                          <span>{getCustomerFullName(customer)} {customer.phone ? `- ${customer.phone}` : ""}</span>
                          {selectedCustomerId === customer.id && <span className="text-xs font-medium text-[#006b68]">Đã chọn</span>}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-center text-slate-500">Không tìm thấy khách hàng.</div>
                    )}
                  </div>
                )}
              </div>
              {showCustomerDropdown && <div className="fixed inset-0 z-0" onClick={() => setShowCustomerDropdown(false)}></div>}
            </div>
          )}

          {saleType === "PRODUCT" ? (
            <>
              <FormField label="Sản phẩm" required>
                <FormSelect name="product_id" required value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                  <option value="">Chọn sản phẩm</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </FormSelect>
              </FormField>
              {selectedProduct && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label={`Kết quả (${selectedProductMetric.unitLabel})`} required>
                    <FormInput name="result_value" type="number" step="0.01" min="0" required placeholder={selectedProductMetric.metricType === "AMOUNT" ? "50" : "1"} defaultValue={selectedProductMetric.metricType === "QUANTITY" ? "1" : undefined} />
                  </FormField>
                  <FormField label="Kiểu ghi nhận">
                    <FormInput value={selectedProductMetric.metricType === "AMOUNT" ? "Theo giá trị" : "Theo số lượng"} disabled readOnly />
                  </FormField>
                </div>
              )}
            </>
          ) : (
            <>
              <FormField label={saleType === "LOAN" ? "Loại khoản vay" : "Loại tiền gửi"} required>
                <FormSelect name="title" required>
                  {(saleType === "LOAN" ? LOAN_OPTIONS : DEPOSIT_OPTIONS).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </FormSelect>
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Số tiền" required>
                  <FormInput name="amount" type="number" required placeholder="100000000" />
                </FormField>
                <FormField label="Số tài khoản">
                  <FormInput name="account_number" placeholder="Để trống sẽ tự sinh" />
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {saleType === "LOAN" ? (
                  <FormField label="Ngày đáo hạn (Tùy chọn)">
                    <FormInput name="due_date" type="date" />
                  </FormField>
                ) : (
                  <FormField label="Ngày đáo hạn" required>
                    <FormInput name="maturity_date" type="date" required />
                  </FormField>
                )}
                <div></div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Ngày giao dịch" required>
              <FormInput name="sale_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </FormField>
            <FormField label="Trạng thái" required>
              <FormSelect name="status" required>
                {saleType === "PRODUCT" ? (
                  <>
                    <option value="COMPLETED">Thành công</option>
                    <option value="INTERESTED">Quan tâm</option>
                    <option value="PENDING">Đang xử lý</option>
                  </>
                ) : (
                  <>
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="PENDING">Chờ xử lý</option>
                  </>
                )}
              </FormSelect>
            </FormField>
          </div>

          <FormField label="Ghi chú">
            <FormInput name="note" placeholder="Nội dung thêm nếu cần" />
          </FormField>

          <SubmitButton loading={formLoading}>Lưu giao dịch</SubmitButton>
        </form>
      </Modal>

      {/* Batch Create Modal */}
      <Modal isOpen={showBatchModal} onClose={() => setShowBatchModal(false)} title="Ghi nhận nhanh kết quả bán chéo cuối ngày" maxWidth="max-w-4xl">
        <form onSubmit={handleSaveBatchSales} className="space-y-4">
          {/* Batch mode toggle */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <input
              type="checkbox"
              id="batch-mode-toggle"
              checked={isBatchMode}
              onChange={(e) => setIsBatchMode(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="batch-mode-toggle" className="cursor-pointer">
              <p className="text-sm font-semibold text-amber-800">Cập nhật theo lô cuối ngày (không cần chọn KH cụ thể)</p>
              <p className="text-xs text-amber-600 mt-0.5">Dùng khi cần ghi nhanh cho nhiều người. Sau đó phân bổ lại vào từng KH tại trang Phân bổ lô.</p>
            </label>
          </div>

          {isBatchMode ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Ghi chú lô <span className="text-slate-400 font-normal">(Tùy chọn)</span></label>
              <input
                type="text"
                placeholder="VD: Lô cuối ngày 30/05 - Nhóm KHDN1..."
                value={batchEntryNote}
                onChange={(e) => setBatchEntryNote(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Select Autocomplete */}
              <div className="space-y-1.5 relative">
                <label className="text-sm font-medium text-slate-700">Khách hàng <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Gõ tên hoặc SĐT khách hàng..."
                    value={batchCustomerSearch}
                    onChange={(e) => {
                      setBatchCustomerSearch(e.target.value)
                      setBatchCustomerId("")
                      setShowBatchCustomerDropdown(true)
                    }}
                    onFocus={() => setShowBatchCustomerDropdown(true)}
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-amber-500 w-full outline-none"
                  />
                </div>
                {showBatchCustomerDropdown && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                    {filteredBatchCustomers.length > 0 ? (
                      filteredBatchCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setBatchCustomerId(customer.id)
                            setBatchCustomerSearch(getCustomerFullName(customer))
                            setShowBatchCustomerDropdown(false)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between"
                        >
                          <span className="font-medium text-slate-800">{getCustomerFullName(customer)}</span>
                          {customer.phone && <span className="text-xs text-slate-400 font-mono">{customer.phone}</span>}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-center text-slate-500">Không tìm thấy khách hàng.</div>
                    )}
                  </div>
                )}
                {showBatchCustomerDropdown && <div className="fixed inset-0 z-0" onClick={() => setShowBatchCustomerDropdown(false)}></div>}
              </div>

              {/* Sale Date Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Ngày giao dịch <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  value={batchSaleDate}
                  onChange={(e) => setBatchSaleDate(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-amber-500 w-full outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* Date for batch mode */}
          {isBatchMode && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Ngày giao dịch <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={batchSaleDate}
                onChange={(e) => setBatchSaleDate(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-amber-500 w-64 outline-none"
                required
              />
            </div>
          )}

          {/* Products Grid Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[45vh] overflow-y-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-slate-600 font-medium">
                  <th className="py-2.5 px-3">Sản phẩm</th>
                  <th className="py-2.5 px-3">Nhóm</th>
                  <th className="py-2.5 px-3 w-48">Kết quả bán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {products.map((product) => {
                  const metricDefinition = getProductMetricDefinition(product)
                  const value = batchProductValues[product.id] || ""
                  const hasValue = Number(value) > 0

                  return (
                    <tr key={product.id} className={clsx("transition-colors", hasValue ? "bg-amber-50/40 hover:bg-amber-50/60" : "hover:bg-slate-50/50")}>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-800">{product.name}</div>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-500">{product.type}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={value}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value) || 0
                              setBatchProductValues({
                                ...batchProductValues,
                                [product.id]: val,
                              })
                            }}
                            className={clsx(
                              "flex-1 min-w-0 px-2 py-1 border rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none text-right font-mono transition-all",
                              hasValue ? "border-amber-400 font-bold bg-white text-amber-900" : "border-slate-200 bg-slate-50/30 text-slate-700"
                            )}
                          />
                          <span className={clsx(
                            "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border pointer-events-none truncate max-w-[80px]",
                            hasValue ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"
                          )} title={metricDefinition.unitLabel}>
                            {metricDefinition.unitLabel}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBatchModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={batchLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors text-sm font-semibold shadow-sm disabled:opacity-75"
            >
              {batchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ghi nhận kết quả"}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

export default function SalesPage() {
  return (
    <Suspense fallback={null}>
      <SalesPageContent />
    </Suspense>
  )
}
