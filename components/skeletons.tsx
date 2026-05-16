"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { DashboardLayout } from "@/components/layout/DashboardLayout"

export function DashboardSkeleton() {
  return (
    <DashboardLayout title="Trang Tổng Quan CRM">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5">
            <Skeleton className="h-4 w-32 mb-3 bg-slate-200" />
            <Skeleton className="h-9 w-24 bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Table + Sidebar Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl ring-1 ring-slate-900/5 p-6">
          <Skeleton className="h-6 w-48 mb-4 bg-slate-200" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32 bg-slate-200" />
                <Skeleton className="h-5 w-16 rounded-full bg-slate-200" />
                <Skeleton className="h-5 w-16 rounded-full bg-slate-200" />
                <Skeleton className="h-4 w-24 bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 p-6">
          <Skeleton className="h-6 w-36 mb-4 bg-slate-200" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <Skeleton className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full bg-slate-200" />
                  <Skeleton className="h-3 w-2/3 bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Sales Skeleton */}
      <div className="mt-6 bg-white rounded-2xl ring-1 ring-slate-900/5 p-6">
        <Skeleton className="h-6 w-48 mb-4 bg-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border border-slate-100 rounded-xl bg-slate-50">
              <Skeleton className="h-4 w-16 rounded-full mb-2 bg-slate-200" />
              <Skeleton className="h-4 w-full mb-1 bg-slate-200" />
              <Skeleton className="h-3 w-2/3 mb-2 bg-slate-200" />
              <Skeleton className="h-3 w-1/3 bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

export function TableSkeleton({ columns = 6, rows = 8, title = "Đang tải..." }: { columns?: number; rows?: number; title?: string }) {
  return (
    <DashboardLayout title={title}>
      <div className="flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5">
              <Skeleton className="w-10 h-10 rounded-full mb-4 bg-slate-200" />
              <Skeleton className="h-4 w-32 mb-2 bg-slate-200" />
              <Skeleton className="h-8 w-24 bg-slate-200" />
            </div>
          ))}
        </div>

        {/* Actions bar */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-80 rounded-md bg-slate-200" />
            <Skeleton className="h-9 w-20 rounded-md bg-slate-200" />
          </div>
          <Skeleton className="h-9 w-36 rounded-md bg-slate-200" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl ring-1 ring-slate-900/5 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1 bg-slate-200" />
            ))}
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex gap-4">
                {Array.from({ length: columns }).map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1 bg-slate-200" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
