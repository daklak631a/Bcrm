import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"

export function internalServerError(
  error: unknown,
  context: string,
  fallback = "Đã xảy ra lỗi. Vui lòng thử lại."
) {
  logger.error(
    context,
    { error: getErrorMessage(error) },
    { production: true }
  )

  return NextResponse.json({ error: fallback }, { status: 500 })
}
