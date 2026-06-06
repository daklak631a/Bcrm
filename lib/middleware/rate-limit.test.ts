import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  checkRateLimit,
  getClientIp,
  resetRateLimitStore,
} from "@/lib/middleware/rate-limit"

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-06T00:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
    resetRateLimitStore()
  })

  it("enforces the write tier independently per route and IP", () => {
    for (let requestNumber = 1; requestNumber <= 30; requestNumber += 1) {
      expect(checkRateLimit("10.0.0.1", "/write", "write").allowed).toBe(true)
    }

    expect(checkRateLimit("10.0.0.1", "/write", "write").allowed).toBe(false)
    expect(checkRateLimit("10.0.0.2", "/write", "write").allowed).toBe(true)
    expect(checkRateLimit("10.0.0.1", "/other-write", "write").allowed).toBe(true)
  })

  it("resets the counter after the one-minute window", () => {
    for (let requestNumber = 1; requestNumber <= 10; requestNumber += 1) {
      checkRateLimit("10.0.0.1", "/auth", "auth")
    }
    expect(checkRateLimit("10.0.0.1", "/auth", "auth").allowed).toBe(false)

    vi.advanceTimersByTime(60_001)

    expect(checkRateLimit("10.0.0.1", "/auth", "auth").allowed).toBe(true)
  })
})

describe("getClientIp", () => {
  it("prefers the first forwarded IP, then the real IP", () => {
    expect(
      getClientIp(new Request("https://example.test", {
        headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1", "x-real-ip": "198.51.100.4" },
      }))
    ).toBe("203.0.113.10")

    expect(
      getClientIp(new Request("https://example.test", {
        headers: { "x-real-ip": "198.51.100.4" },
      }))
    ).toBe("198.51.100.4")
  })

  it("uses a stable fallback when proxy headers are absent", () => {
    expect(getClientIp(new Request("https://example.test"))).toBe("unknown")
  })
})
