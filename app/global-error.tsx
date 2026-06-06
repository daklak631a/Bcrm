"use client"

import { useEffect } from "react"
import { getErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error(
      "[GlobalError] Unhandled application error",
      {
        error: getErrorMessage(error),
        digest: error.digest,
      },
      { production: true }
    )
  }, [error])

  return (
    <html lang="vi">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 font-sans text-slate-900">
          <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-semibold">Ứng dụng đang gặp sự cố</h1>
            <p className="mt-2 text-sm text-slate-600">
              Vui lòng thử lại. Nếu lỗi tiếp diễn, hãy tải lại trang.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 rounded-md bg-[#006b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005451]"
            >
              Thử lại
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}
