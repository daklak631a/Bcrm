import { describe, expect, it } from "vitest"
import {
  tsTypeFor,
  isNullable,
  isInsertOptional,
  buildObjectType,
  parseRelationships,
  collectEnums,
  generateSource,
} from "./gen-supabase-types.mjs"

// Mock một bảng kiểu PostgREST OpenAPI: id (PK, default), name (NOT NULL),
// short_name (nullable), status (enum NOT NULL), customer_id (FK nullable).
const customers = {
  required: ["id", "name", "status"],
  properties: {
    id: { type: "string", format: "uuid", default: "gen_random_uuid()", description: "Note:\nThis is a Primary Key.<pk/>" },
    name: { type: "string", format: "text" },
    short_name: { type: "string", format: "text" },
    status: { type: "string", format: "public.customer_status", enum: ["ACTIVE", "CLOSED"] },
    customer_id: {
      type: "string",
      format: "uuid",
      description: "Note:\nThis is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>",
    },
    score: { type: "integer", format: "integer" },
  },
}

const definitions = { customers }

describe("isNullable", () => {
  it("treats columns absent from required as nullable", () => {
    expect(isNullable("short_name", customers.required)).toBe(true)
    expect(isNullable("name", customers.required)).toBe(false)
  })
})

describe("tsTypeFor", () => {
  it("appends | null to nullable columns, not to NOT NULL ones", () => {
    expect(tsTypeFor("name", customers.properties.name, customers.required)).toBe("string")
    expect(tsTypeFor("short_name", customers.properties.short_name, customers.required)).toBe("string | null")
    expect(tsTypeFor("score", customers.properties.score, customers.required)).toBe("number | null")
  })

  it("renders enums as a union", () => {
    expect(tsTypeFor("status", customers.properties.status, customers.required)).toBe("'ACTIVE' | 'CLOSED'")
  })
})

describe("isInsertOptional", () => {
  it("makes default/nullable/non-required columns optional, keeps required ones mandatory", () => {
    expect(isInsertOptional("id", customers.properties.id, customers.required)).toBe(true) // has default
    expect(isInsertOptional("short_name", customers.properties.short_name, customers.required)).toBe(true) // nullable
    expect(isInsertOptional("name", customers.properties.name, customers.required)).toBe(false) // NOT NULL, no default
    expect(isInsertOptional("status", customers.properties.status, customers.required)).toBe(false)
  })
})

describe("buildObjectType", () => {
  it("Row keeps every column present (nullable via | null, never optional)", () => {
    const row = buildObjectType(customers.properties, customers.required, "Row")
    expect(row).toContain("name: string")
    expect(row).toContain("short_name: string | null")
    expect(row).not.toContain("short_name?:")
  })

  it("Update marks every column optional", () => {
    const update = buildObjectType(customers.properties, customers.required, "Update")
    expect(update).toContain("name?: string")
    expect(update).toContain("short_name?: string | null")
  })
})

describe("parseRelationships", () => {
  it("extracts foreign keys from PostgREST descriptions", () => {
    const rels = parseRelationships("customers", customers.properties)
    expect(rels).toHaveLength(1)
    expect(rels[0]).toMatchObject({
      foreignKeyName: "customers_customer_id_fkey",
      columns: ["customer_id"],
      referencedRelation: "profiles",
      referencedColumns: ["id"],
      isOneToOne: false,
    })
  })
})

describe("collectEnums", () => {
  it("collects enum types referenced via public.<enum> format", () => {
    const enums = collectEnums(definitions)
    expect(enums.get("customer_status")).toEqual(["ACTIVE", "CLOSED"])
  })
})

describe("generateSource", () => {
  it("emits a Database interface with nullable Row fields and a Relationships array", () => {
    const src = generateSource(definitions, "2026-06-15T00:00:00.000Z")
    expect(src).toContain("export interface Database")
    expect(src).toContain("short_name: string | null")
    expect(src).toContain("referencedRelation: \"profiles\"")
    expect(src).toContain("customer_status: 'ACTIVE' | 'CLOSED'")
  })
})
