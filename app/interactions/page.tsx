"use client"

import clsx from "clsx"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Plus, MessageSquare, PhoneCall, CalendarDays, Mail, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { Suspense, useEffect, useState, useMemo, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { fetchInteractions, createInteraction, fetchCustomers, fetchProfiles, getCustomerFullName, createCustomer } from "@/lib/supabase/api"
import { Modal, FormField, FormInput, FormSelect, FormTextarea, SubmitButton } from "@/components/ui/modal"
import { toast } from "sonner"
import { Check } from "lucide-react"
import { getActiveOptions } from "@/lib/workflow-config"

const ITEMS_PER_PAGE = 10

function InteractionsPageContent() {
  const { user } = useAuthStore()
  const canEdit = user?.role !== 'ADVISOR'
  const searchParams = useSearchParams()
  const customerIdParam = searchParams.get('customerId')
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [interactions, setInteractions] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  // Customer Search & Quick Add State
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false)
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const [customerType, setCustomerType] = useState("INDIVIDUAL")
  const [interactionType, setInteractionType] = useState("CALL")
  const [interactionPurpose, setInteractionPurpose] = useState("")
  const [interactionResult, setInteractionResult] = useState("PENDING")
  const [otherInteractionType, setOtherInteractionType] = useState("")
  const [otherPurpose, setOtherPurpose] = useState("")
  const [otherResult, setOtherResult] = useState("")
  const interactionTypeOptions = useMemo(() => [...getActiveOptions("interactionTypes"), { id: "it-other", label: "Khác", value: "OTHER", active: true }], [])
  const interactionPurposeOptions = useMemo(() => [...getActiveOptions("interactionPurposes"), { id: "ip-other", label: "Khác", value: "OTHER", active: true }], [])
  const interactionResultOptions = useMemo(() => [...getActiveOptions("interactionResults"), { id: "ir-other", label: "Khác", value: "OTHER", active: true }], [])

  const visibleProfiles = useMemo(() => {
    if (user?.role === "ADMIN_LEVEL_0" || user?.role === "ADMIN_LEVEL_1" || user?.role === "ADVISOR") return profiles
    if (user?.role === "ADMIN_LEVEL_2") return profiles.filter((profile: any) => profile.department_id === user.department_id)
    return profiles.filter((profile: any) => profile.id === user?.id)
  }, [profiles, user?.department_id, user?.id, user?.role])

  const visibleProfileIds = useMemo(() => new Set(visibleProfiles.map((profile: any) => profile.id)), [visibleProfiles])
  const visibleCustomers = useMemo(() => customers.filter((customer: any) => visibleProfileIds.has(customer.assigned_manager_id)), [customers, visibleProfileIds])
  const visibleInteractions = useMemo(() => interactions.filter((interaction: any) => visibleProfileIds.has(interaction.manager_id)), [interactions, visibleProfileIds])

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return visibleCustomers
    const q = customerSearch.toLowerCase()
    return visibleCustomers.filter(c => getCustomerFullName(c).toLowerCase().includes(q))
  }, [visibleCustomers, customerSearch])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [interactionsData, customersData, profilesData] = await Promise.all([fetchInteractions(), fetchCustomers(), fetchProfiles()])
      setInteractions(interactionsData)
      setCustomers(customersData)
      setProfiles(profilesData)
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setMounted(true); loadData() }, [loadData])

  useEffect(() => {
    if (!customerIdParam || visibleCustomers.length === 0) return
    const customer = visibleCustomers.find(c => c.id === customerIdParam)
    if (!customer) return
    setSelectedCustomerId(customer.id)
    setCustomerSearch(getCustomerFullName(customer))
    setSearchQuery(getCustomerFullName(customer))
  }, [customerIdParam, visibleCustomers])

  const getIcon = (type: string) => {
    switch (type) {
      case "CALL": return <PhoneCall className="w-4 h-4" />
      case "MEETING": return <CalendarDays className="w-4 h-4" />
      case "EMAIL": return <Mail className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "CALL": return "Gọi điện"
      case "MEETING": return "Gặp mặt"
      case "EMAIL": return "Email"
      case "SMS": return "SMS"
      case "VISIT": return "Thăm KH"
      default: return type
    }
  }

  const getResultLabel = (result: string) => {
    switch (result) {
      case "SUCCESS": return { label: "Thành công", color: "bg-emerald-100 text-emerald-700" }
      case "NO_ANSWER": return { label: "Không nghe máy", color: "bg-slate-100 text-slate-700" }
      case "FOLLOW_UP": return { label: "Theo dõi", color: "bg-teal-50 text-[#006b68] border border-teal-200/50" }
      case "NOT_INTERESTED": return { label: "Không quan tâm", color: "bg-rose-100 text-rose-700" }
      case "PENDING": return { label: "Đang chờ", color: "bg-amber-100 text-amber-700" }
      default: return { label: result, color: "bg-slate-100 text-slate-700" }
    }
  }

  const filteredInteractions = useMemo(() => {
    if (!searchQuery.trim()) return visibleInteractions
    const q = searchQuery.toLowerCase().trim()
    return visibleInteractions.filter((i: any) => {
      const name = i.customers ? getCustomerFullName(i.customers) : ''
      return name.toLowerCase().includes(q) || (i.purpose || '').toLowerCase().includes(q)
    })
  }, [visibleInteractions, searchQuery])

  useEffect(() => { setCurrentPage(1) }, [searchQuery])
  const totalPages = Math.max(1, Math.ceil(filteredInteractions.length / ITEMS_PER_PAGE))
  const paginatedInteractions = filteredInteractions.slice((currentPage-1)*ITEMS_PER_PAGE, currentPage*ITEMS_PER_PAGE)

  // Stats
  const callCount = visibleInteractions.filter((i: any) => i.type === 'CALL').length
  const meetingCount = visibleInteractions.filter((i: any) => i.type === 'MEETING').length
  const pendingCount = visibleInteractions.filter((i: any) => i.result === 'PENDING').length

  if (!mounted) return null

  const handleAddInteraction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedCustomerId) {
      toast.error('Vui lòng chọn khách hàng')
      return
    }
    const finalType = interactionType === "OTHER" ? otherInteractionType.trim() : interactionType
    const finalPurpose = interactionPurpose === "OTHER" ? otherPurpose.trim() : interactionPurpose
    const finalResult = interactionResult === "OTHER" ? otherResult.trim() : interactionResult
    if (!finalType || !finalPurpose || !finalResult) {
      toast.error("Vui lòng nhập đầy đủ lựa chọn Khác")
      return
    }
    const form = new FormData(e.currentTarget)
    try {
      setFormLoading(true)
      await createInteraction({
        customer_id: selectedCustomerId,
        manager_id: user!.id,
        type: finalType,
        purpose: finalPurpose,
        result: finalResult,
        notes: form.get('notes') as string || undefined,
        interaction_date: form.get('interaction_date') as string || undefined,
        follow_up_date: form.get('follow_up_date') as string || undefined,
      })
      toast.success('Thêm tương tác thành công!')
      setShowAddModal(false)
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
      const cifCode = (form.get('cif_code') as string || '').trim() || null

      const newCustomer = await createCustomer({
        customer_type: customerType,
        cif_code: cifCode,
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

  return (
    <DashboardLayout title="Quản Lý Tương Tác">
      <div className="flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="hidden">
          <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm flex items-center justify-between">
            <div><p className="text-xs md:text-sm font-medium text-slate-500 mb-1">Tổng Tương Tác</p><h3 className="text-xl md:text-2xl font-bold text-slate-800">{interactions.length}</h3></div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><MessageSquare className="w-5 h-5 md:w-6 md:h-6" /></div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm flex items-center justify-between">
            <div><p className="text-xs md:text-sm font-medium text-slate-500 mb-1">Cuộc Gọi</p><h3 className="text-xl md:text-2xl font-bold text-slate-800">{callCount}</h3></div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-teal-50 text-[#006b68] border border-teal-100 flex items-center justify-center shrink-0"><PhoneCall className="w-5 h-5 md:w-6 md:h-6" /></div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm flex items-center justify-between">
            <div><p className="text-xs md:text-sm font-medium text-slate-500 mb-1">Gặp Mặt</p><h3 className="text-xl md:text-2xl font-bold text-slate-800">{meetingCount}</h3></div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><CalendarDays className="w-5 h-5 md:w-6 md:h-6" /></div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl border shadow-sm flex items-center justify-between">
            <div><p className="text-xs md:text-sm font-medium text-slate-500 mb-1">Đang Chờ</p><h3 className="text-xl md:text-2xl font-bold text-slate-800">{pendingCount}</h3></div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><CalendarDays className="w-5 h-5 md:w-6 md:h-6" /></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Tìm kiếm khách hàng, nội dung..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 w-full outline-none" />
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm Tương Tác
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /><span className="ml-2 text-slate-500">Đang tải...</span></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-sm text-slate-600 font-medium">
                      <th className="py-3 px-4 font-semibold w-12">Loại</th>
                      <th className="py-3 px-4 font-semibold">Khách Hàng</th>
                      <th className="py-3 px-4 font-semibold">Mục đích</th>
                      <th className="py-3 px-4 font-semibold">Thời Gian</th>
                      <th className="py-3 px-4 font-semibold">Chuyên Viên</th>
                      <th className="py-3 px-4 font-semibold">Kết Quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedInteractions.map((interaction: any) => {
                      const result = getResultLabel(interaction.result)
                      return (
                        <tr key={interaction.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center" title={getTypeLabel(interaction.type)}>
                              {getIcon(interaction.type)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-800">
                            {interaction.customers ? getCustomerFullName(interaction.customers) : '—'}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700 max-w-[250px] truncate">{interaction.purpose}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">{new Date(interaction.interaction_date).toLocaleDateString('vi-VN')}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">{interaction.profiles?.full_name || '—'}</td>
                          <td className="py-3 px-4"><span className={clsx("px-2.5 py-1 rounded-full text-xs font-medium", result.color)}>{result.label}</span></td>
                        </tr>
                      )
                    })}
                    {filteredInteractions.length === 0 && (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-500">Chưa có tương tác nào.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
                <span>{filteredInteractions.length > 0 ? `${(currentPage-1)*ITEMS_PER_PAGE+1} - ${Math.min(currentPage*ITEMS_PER_PAGE, filteredInteractions.length)} / ${filteredInteractions.length}` : "Không có dữ liệu"}</span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                    {Array.from({length: Math.min(totalPages,5)},(_,i)=>i+1).map(p => (
                      <button key={p} onClick={() => setCurrentPage(p)} className={clsx("px-3 py-1 border rounded text-sm font-medium", p===currentPage?"bg-emerald-600 text-white border-emerald-600":"bg-white hover:bg-slate-50")}>{p}</button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Interaction Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Thêm Tương Tác Mới">
        <form onSubmit={handleAddInteraction} className="space-y-4">
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
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              {showCustomerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => (
                      <div 
                        key={c.id} 
                        className={clsx("px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 flex items-center justify-between", selectedCustomerId === c.id && "bg-emerald-50 text-emerald-700")}
                        onClick={() => {
                          setSelectedCustomerId(c.id)
                          setCustomerSearch(getCustomerFullName(c))
                          setShowCustomerDropdown(false)
                        }}
                      >
                        <span>{getCustomerFullName(c)} {c.phone ? `- ${c.phone}` : ''}</span>
                        {selectedCustomerId === c.id && <Check className="w-4 h-4" />}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-center text-slate-500 flex flex-col items-center gap-2">
                      <p>Không tìm thấy khách hàng.</p>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowCustomerDropdown(false)
                          setShowQuickAddCustomer(true)
                        }}
                        className="text-emerald-600 font-medium hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Thêm nhanh KH mới
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Overlay to close dropdown */}
            {showCustomerDropdown && <div className="fixed inset-0 z-0" onClick={() => setShowCustomerDropdown(false)}></div>}
          </div>
          <FormField label="Loại tương tác" required>
            <FormSelect value={interactionType} onChange={(e) => setInteractionType(e.target.value)} required>
              {interactionTypeOptions.map((option) => (
                <option key={option.id} value={option.value}>{option.label}</option>
              ))}
            </FormSelect>
          </FormField>
          {interactionType === "OTHER" && (
            <FormField label="Loại tương tác khác" required>
              <FormInput value={otherInteractionType} onChange={(e) => setOtherInteractionType(e.target.value)} required placeholder="Nhập loại tương tác khác" />
            </FormField>
          )}
          <FormField label="Mục đích" required>
            <FormSelect value={interactionPurpose} onChange={(e) => setInteractionPurpose(e.target.value)} required>
              <option value="">Chọn mục đích</option>
              {interactionPurposeOptions.map((option) => (
                <option key={option.id} value={option.value}>{option.label}</option>
              ))}
            </FormSelect>
          </FormField>
          {interactionPurpose === "OTHER" && (
            <FormField label="Mục đích khác" required>
              <FormInput value={otherPurpose} onChange={(e) => setOtherPurpose(e.target.value)} required placeholder="Nhập mục đích khác" />
            </FormField>
          )}
          <FormField label="Kết quả">
            <FormSelect value={interactionResult} onChange={(e) => setInteractionResult(e.target.value)}>
              {interactionResultOptions.map((option) => (
                <option key={option.id} value={option.value}>{option.label}</option>
              ))}
            </FormSelect>
          </FormField>
          {interactionResult === "OTHER" && (
            <FormField label="Kết quả khác" required>
              <FormInput value={otherResult} onChange={(e) => setOtherResult(e.target.value)} required placeholder="Nhập kết quả khác" />
            </FormField>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Ngày tương tác">
              <FormInput name="interaction_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </FormField>
            <FormField label="Ngày hẹn lại">
              <FormInput name="follow_up_date" type="date" />
            </FormField>
          </div>
          <FormField label="Ghi chú">
            <FormTextarea name="notes" placeholder="Ghi chú thêm..." />
          </FormField>
          <SubmitButton loading={formLoading}>Thêm Tương Tác</SubmitButton>
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
                <FormInput name="business_name" required placeholder="VD: Công ty TNHH ABC" />
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
              <FormInput name="full_name" required placeholder="Nguyễn Văn An" />
            </FormField>
          )}

          <FormField label="Mã CIF (Tùy chọn)">
            <FormInput name="cif_code" placeholder="Nhập mã CIF nếu có" />
          </FormField>

          <FormField label="Số điện thoại" required>
            <FormInput name="phone" required placeholder="09xxxxxxx" />
          </FormField>
          
          <SubmitButton loading={quickAddLoading}>Thêm Khách Hàng</SubmitButton>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

export default function InteractionsPage() {
  return (
    <Suspense fallback={null}>
      <InteractionsPageContent />
    </Suspense>
  )
}
