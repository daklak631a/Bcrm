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
    'duplicate key value violates unique constraint "customers_cif_code_key"',
    'null value in column "full_name" violates not-null constraint',
    'column "foo" does not exist',
    "permission denied for table customers",
    "PGRST116: no rows returned",
    "connect ECONNREFUSED 127.0.0.1:5432",
    "Error\n    at handler (/app/route.ts:12:34)",
  ])("hides technical details: %s", (message) => {
    expect(toPublicErrorMessage(new Error(message), "Không thể xử lý yêu cầu.")).toBe(
      "Không thể xử lý yêu cầu."
    )
  })

  it("keeps Vietnamese business-rule messages", () => {
    expect(toPublicErrorMessage(new Error("Khách hàng đã tồn tại trong hệ thống."))).toBe(
      "Khách hàng đã tồn tại trong hệ thống."
    )
    expect(toPublicErrorMessage(new Error("Vui lòng nhập số điện thoại hợp lệ."))).toBe(
      "Vui lòng nhập số điện thoại hợp lệ."
    )
  })
})
