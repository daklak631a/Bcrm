"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { SalesSupportKanban } from "@/components/sales-support/SalesSupportKanban"

export default function SalesSupportPage() {
  return (
    <DashboardLayout title="Kanban Hỗ Trợ Bán Hàng">
      <SalesSupportKanban />
    </DashboardLayout>
  )
}
