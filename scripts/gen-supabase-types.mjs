#!/usr/bin/env node
/**
 * Sinh types/database.generated.ts từ schema PostgREST của Supabase (DB thật).
 * Cần NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY trong .env.local
 *
 * Chạy: npm run gen:types
 *
 * Lưu ý về kiểu sinh ra (khớp chuẩn @supabase/supabase-js):
 * - PostgREST đánh dấu cột NOT NULL trong mảng `required`. Cột KHÔNG nằm trong
 *   `required` là nullable -> sinh `T | null` (không phải optional `?`).
 * - Row: mọi cột đều hiện diện; cột nullable thêm `| null`.
 * - Insert: optional nếu có default / nullable / không required.
 * - Update: mọi cột optional.
 * - Relationships: parse khóa ngoại từ mô tả PostgREST (`<fk table='..' column='..'/>`).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const AUTO_OPTIONAL_FIELDS = new Set(['id', 'created_at', 'updated_at', 'deleted_at'])

export function tsBaseType(prop) {
  if (prop.enum?.length) {
    return prop.enum.map((v) => `'${v}'`).join(' | ')
  }
  if (prop.type === 'integer' || prop.type === 'number') return 'number'
  if (prop.type === 'boolean') return 'boolean'
  if (prop.type === 'object' || prop.format === 'json' || prop.format === 'jsonb') return 'Json'
  if (prop.type === 'array') return 'Json'
  return 'string'
}

/** PostgREST: cột NOT NULL nằm trong `required`. Ngoài ra coi như nullable. */
export function isNullable(name, required) {
  return !required.includes(name)
}

export function isInsertOptional(name, prop, required) {
  if (AUTO_OPTIONAL_FIELDS.has(name)) return true
  if (prop.default !== undefined) return true
  if (isNullable(name, required)) return true
  if (!required.includes(name)) return true
  return false
}

export function tsTypeFor(name, prop, required) {
  const base = tsBaseType(prop)
  return isNullable(name, required) ? `${base} | null` : base
}

export function buildObjectType(properties, required, mode) {
  const req = required || []
  const lines = []

  for (const [name, prop] of Object.entries(properties || {})) {
    const tsType = tsTypeFor(name, prop, req)
    const optional =
      mode === 'Update' || (mode === 'Insert' && isInsertOptional(name, prop, req))

    lines.push(`          ${name}${optional ? '?' : ''}: ${tsType}`)
  }

  return lines.join('\n')
}

/**
 * Parse khóa ngoại từ mô tả cột PostgREST.
 * PostgREST nhúng: "...This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>"
 */
export function parseRelationships(tableName, properties) {
  const rels = []
  const fkRegex = /<fk\s+table=['"]([^'"]+)['"]\s+column=['"]([^'"]+)['"]\s*\/>/

  for (const [name, prop] of Object.entries(properties || {})) {
    const description = typeof prop.description === 'string' ? prop.description : ''
    const match = description.match(fkRegex)
    if (!match) continue
    const [, refTable, refColumn] = match
    rels.push({
      foreignKeyName: `${tableName}_${name}_fkey`,
      columns: [name],
      isOneToOne: false,
      referencedRelation: refTable,
      referencedColumns: [refColumn],
    })
  }

  return rels
}

function renderRelationships(rels) {
  if (!rels.length) return '        Relationships: []'
  const entries = rels
    .map(
      (r) => `          {
            foreignKeyName: ${JSON.stringify(r.foreignKeyName)}
            columns: ${JSON.stringify(r.columns)}
            isOneToOne: ${r.isOneToOne}
            referencedRelation: ${JSON.stringify(r.referencedRelation)}
            referencedColumns: ${JSON.stringify(r.referencedColumns)}
          }`
    )
    .join(',\n')
  return `        Relationships: [\n${entries}\n        ]`
}

export function collectEnums(definitions) {
  const enums = new Map()

  for (const def of Object.values(definitions)) {
    for (const prop of Object.values(def.properties || {})) {
      if (!prop.format?.startsWith('public.')) continue
      const enumName = prop.format.replace('public.', '')
      if (!enums.has(enumName) && prop.enum?.length) {
        enums.set(enumName, prop.enum)
      }
    }
  }

  return enums
}

export function generateSource(definitions, generatedAt = new Date().toISOString()) {
  const tableNames = Object.keys(definitions).sort()
  const enums = collectEnums(definitions)

  const enumBlocks = [...enums.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, values]) => `      ${name}: ${values.map((v) => `'${v}'`).join(' | ')}`)
    .join('\n')

  const tableBlocks = tableNames
    .map((tableName) => {
      const def = definitions[tableName]
      const required = def.required || []
      const relationships = parseRelationships(tableName, def.properties)

      return `      ${tableName}: {
        Row: {
${buildObjectType(def.properties, required, 'Row')}
        }
        Insert: {
${buildObjectType(def.properties, required, 'Insert')}
        }
        Update: {
${buildObjectType(def.properties, required, 'Update')}
        }
${renderRelationships(relationships)}
      }`
    })
    .join('\n')

  return `/**
 * AUTO-GENERATED — không sửa tay.
 * Sinh từ schema PostgREST (DB Supabase thật).
 * Chạy lại: npm run gen:types
 * Generated at: ${generatedAt}
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
${tableBlocks}
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
${enumBlocks || '      [_ in never]: never'}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
`
}

async function fetchOpenApi(supabaseUrl, serviceRoleKey) {
  const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceRoleKey}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Không lấy được OpenAPI schema: HTTP ${response.status}`)
  }

  return response.json()
}

async function main() {
  dotenv.config({ path: path.join(root, '.env.local') })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local')
    process.exit(1)
  }

  const openapi = await fetchOpenApi(supabaseUrl, serviceRoleKey)
  const definitions = openapi.definitions || {}

  if (Object.keys(definitions).length === 0) {
    throw new Error('OpenAPI schema không có definitions.')
  }

  const outputPath = path.join(root, 'types', 'database.generated.ts')
  const source = generateSource(definitions)
  fs.writeFileSync(outputPath, source, 'utf8')

  console.log(`Đã sinh ${Object.keys(definitions).length} bảng → types/database.generated.ts`)
}

// Chỉ chạy fetch khi gọi trực tiếp (không khi import trong test).
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
