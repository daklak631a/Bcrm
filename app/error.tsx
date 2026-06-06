"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { getErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error(
      "[RouteError] Unhandled route error",
      {
        error: getErrorMessage(error),
        digest: error.digest,
      },
      { production: true }
    )
  }, [error])

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Trang này đang gặp sự cố</h1>
        <p className="mt-2 text-sm text-slate-600">
          Dữ liệu của bạn không bị thay đổi. Hãy thử tải lại nội dung.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#006b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005451]"
        >
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </button>
      </section>
    </main>
  )
}
