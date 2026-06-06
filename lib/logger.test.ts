import { afterEach, describe, expect, it, vi } from "vitest"
import { logger } from "@/lib/logger"

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("writes a plain message to the matching console level", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined)

    logger.info("Application started")

    expect(spy).toHaveBeenCalledWith("Application started")
  })

  it("includes structured metadata when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined)

    logger.error("Request failed", { status: 500, route: "/api/report" })

    expect(spy).toHaveBeenCalledWith("Request failed", {
      status: 500,
      route: "/api/report",
    })
  })

  it("omits empty metadata objects", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    logger.warn("Fallback used", {})

    expect(spy).toHaveBeenCalledWith("Fallback used")
  })
})
