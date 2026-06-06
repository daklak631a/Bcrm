"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { RefreshCw, RotateCcw } from "lucide-react"
import { getErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(
      "[ErrorBoundary] Unhandled render error",
      {
        error: getErrorMessage(error),
        componentStack: info.componentStack,
      },
      { production: true }
    )
  }

  private reset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Không thể hiển thị nội dung</h1>
          <p className="mt-2 text-sm text-slate-600">
            Ứng dụng gặp lỗi khi xử lý màn hình này. Bạn có thể thử lại hoặc tải lại trang.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center gap-2 rounded-md bg-[#006b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005451]"
            >
              <RotateCcw className="h-4 w-4" />
              Thử lại
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại trang
            </button>
          </div>
        </section>
      </main>
    )
  }
}
