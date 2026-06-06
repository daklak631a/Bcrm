import { describe, expect, it } from "vitest"
import { getErrorMessage, toPublicErrorMessage } from "@/lib/errors"

describe("getErrorMessage", () => {
  it("extracts messages from Error, string, and error-like objects", () => {
    expect(getErrorMessage(new Error("Network failed"))).toBe("Network failed")
    expect(getErrorMessage("Request failed")).toBe("Request failed")
    expect(getErrorMessage({ message: "Database failed" })).toBe("Database failed")
  })

  it("uses the fallback for unsupported or empty values", () => {
    expect(getErrorMessage(null, "Fallback")).toBe("Fallback")
    expect(getErrorMessage("", "Fallback")).toBe("Fallback")
    expect(getErrorMessage({ message: "" }, "Fallback")).toBe("Fallback")
  })
})

describe("toPublicErrorMessage", () => {
  it("keeps safe messages that users can act on", () => {
    expect(toPublicErrorMessage(new Error("Không tìm thấy báo cáo"))).toBe("Không tìm thấy báo cáo")
  })

  it.each([
    "Supabase connection failed",
    "JWT token expired",
    "violates row-level security policy",
    "service_role key is missing",
    "Schema cache is stale",
  ])("hides technical details: %s", (message) => {
    expect(toPublicErrorMessage(new Error(message), "Không thể xử lý yêu cầu.")).toBe(
      "Không thể xử lý yêu cầu."
    )
  })
})
