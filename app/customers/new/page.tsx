"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { createCustomer, fetchProfiles } from "@/lib/supabase/api"
import { useAuthStore } from "@/store/useAuthStore"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

type CustomerType = "INDIVIDUAL" | "ENTERPRISE"

const PRODUCT_FIELDS = [
  { key: "cif_moi", label: "CIF mới" },
  { key: "smart_banking", label: "BIDV Direct" },
  { key: "bao_hiem_nhan_tho", label: "Bảo hiểm nhân thọ" },
  { key: "bao_hiem_khoan_vay", label: "Bảo hiểm khoản vay" },
  { key: "the_tin_dung", label: "Thẻ tín dụng" },
  { key: "chuyen_tien_ngoai", label: "Chuyển tiền ngoại" },
  { key: "merchant_qr", label: "Merchant QR" },
]

export default function NewCustomerPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [customerType, setCustomerType] = useState<CustomerType>("INDIVIDUAL")
  const [profiles, setProfiles] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const canAssignManager = user?.role === "ADMIN_LEVEL_1" || user?.role === "ADMIN_LEVEL_2"

  const visibleProfiles = useMemo(() => {
    const specialists = profiles.filter((profile) => profile.role === "USER")
    if (user?.role === "ADMIN_LEVEL_2") {
      return specialists.filter((profile) => profile.department_id === user.department_id)
    }
    return specialists
  }, [profiles, user])

  useEffect(() => {
    if (!canAssignManager) return
    fetchProfiles()
      .then(setProfiles)
      .catch((error) => toast.error(`Không thể tải danh sách chuyên viên: ${error.message}`))
  }, [canAssignManager])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.id) {
      toast.error("Bạn cần đăng nhập để tạo khách hàng.")
      return
    }

    const form = new FormData(event.currentTarget)
    const isEnterprise = customerType === "ENTERPRISE"
    const businessName = String(form.get("business_name") || "").trim()
    const fullName = isEnterprise ? businessName : String(form.get("full_name") || "").trim()

    if (!fullName) {
      toast.error(isEnterprise ? "Vui lòng nhập tên doanh nghiệp." : "Vui lòng nhập họ tên khách hàng.")
      return
    }

    try {
      setSaving(true)
      const created = await createCustomer({
        customer_type: customerType,
        full_name: fullName,
        business_name: isEnterprise ? businessName : "",
        tax_code: isEnterprise ? String(form.get("tax_code") || "") : "",
        representative_name: isEnterprise ? String(form.get("representative_name") || "") : "",
        customer_segment: isEnterprise ? String(form.get("customer_segment") || "SME") : "",
        cif_code: String(form.get("cif_code") || "") || undefined,
        phone: String(form.get("phone") || "") || undefined,
        email: String(form.get("email") || "") || undefined,
        address: String(form.get("address") || "") || undefined,
        note: String(form.get("note") || "") || undefined,
        assigned_manager_id: String(form.get("assigned_manager_id") || "") || user.id,
        cif_moi: form.get("cif_moi") === "on",
        smart_banking: form.get("smart_banking") === "on",
        bao_hiem_nhan_tho: form.get("bao_hiem_nhan_tho") === "on",
        bao_hiem_khoan_vay: form.get("bao_hiem_khoan_vay") === "on",
        the_tin_dung: form.get("the_tin_dung") === "on",
        chuyen_tien_ngoai: form.get("chuyen_tien_ngoai") === "on",
        merchant_qr: form.get("merchant_qr") === "on",
      })

      toast.success("Đã tạo khách hàng mới.")
      router.push(`/customers/${created.id}`)
    } catch (error: any) {
      toast.error(`Tạo khách hàng thất bại: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Thêm Mới Khách Hàng">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link href="/customers" className="rounded-full p-2 transition-colors hover:bg-slate-200">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Tạo hồ sơ khách hàng mới</h2>
            <p className="mt-1 text-sm text-slate-500">Thông tin sẽ được lưu vào danh sách khách hàng và ghi audit log.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 rounded-xl border bg-white p-6 shadow-sm">
          <section>
            <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-slate-800">Thông Tin Cơ Bản</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Phân loại khách hàng</span>
                <select
                  value={customerType}
                  onChange={(event) => setCustomerType(event.target.value as CustomerType)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="INDIVIDUAL">Cá nhân</option>
                  <option value="ENTERPRISE">Doanh nghiệp</option>
                </select>
              </label>

              {customerType === "ENTERPRISE" ? (
                <>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Tên doanh nghiệp *</span>
                    <input name="business_name" required className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Công ty TNHH ABC" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Phân khúc</span>
                    <select name="customer_segment" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="SME">SME</option>
                      <option value="Hành chính sự nghiệp">Hành chính sự nghiệp</option>
                      <option value="Doanh nghiệp lớn">Doanh nghiệp lớn</option>
                      <option value="FDI">FDI</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Mã số thuế</span>
                    <input name="tax_code" className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Mã số thuế" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Người đại diện</span>
                    <input name="representative_name" className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Họ tên người đại diện" />
                  </label>
                </>
              ) : (
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Họ và tên *</span>
                  <input name="full_name" required className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nguyễn Văn A" />
                </label>
              )}

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Mã CIF</span>
                <input name="cif_code" className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nhập mã CIF nếu có" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Số điện thoại</span>
                <input name="phone" type="tel" className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0901234567" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input name="email" type="email" className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="email@example.com" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Địa chỉ</span>
                <input name="address" className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="123 Đường ABC, Quận XYZ" />
              </label>

              {canAssignManager && visibleProfiles.length > 0 && (
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Chuyên viên phụ trách</span>
                  <select name="assigned_manager_id" defaultValue={user?.id} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {visibleProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>{profile.full_name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-slate-800">Sản phẩm hiện có</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PRODUCT_FIELDS.map((product) => (
                <label key={product.key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input name={product.key} type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600" />
                  {product.label}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-4 border-b pb-2 text-lg font-semibold text-slate-800">Ghi chú</h3>
            <textarea name="note" rows={4} className="w-full rounded-md border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ghi chú thêm về khách hàng..." />
          </section>

          <div className="flex items-center justify-end gap-4 border-t pt-6">
            <Link href="/customers" className="rounded-md border border-slate-200 px-6 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50">
              Hủy
            </Link>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-md bg-emerald-600 px-6 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu Hồ Sơ
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
