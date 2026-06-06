import { afterEach, describe, expect, it, vi } from "vitest"
import { internalServerError } from "@/lib/api-errors"

describe("internalServerError", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("logs the technical error but returns only the public fallback", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)

    const response = internalServerError(
      new Error("Supabase schema cache failed"),
      "[Test API] Request failed",
      "Không thể xử lý yêu cầu."
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Không thể xử lý yêu cầu." })
    expect(consoleError).toHaveBeenCalledWith(
      "[Test API] Request failed",
      { error: "Supabase schema cache failed" }
    )
  })
})
