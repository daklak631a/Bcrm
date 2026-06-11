#!/usr/bin/env node
/**
 * Sinh types/database.generated.ts từ schema PostgREST của Supabase (DB thật).
 * Cần NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY trong .env.local
 *
 * Chạy: npm run gen:types
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(root, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local')
  process.exit(1)
}

const AUTO_OPTIONAL_FIELDS = new Set(['id', 'created_at', 'updated_at', 'deleted_at'])

function tsTypeFromProperty(prop) {
  if (prop.enum?.length) {
    return prop.enum.map((v) => `'${v}'`).join(' | ')
  }
  if (prop.type === 'integer' || prop.type === 'number') return 'number'
  if (prop.type === 'boolean') return 'boolean'
  if (prop.type === 'object' || prop.format === 'json' || prop.format === 'jsonb') return 'Json'
  return 'string'
}

function isInsertOptional(name, prop, required) {
  if (AUTO_OPTIONAL_FIELDS.has(name)) return true
  if (prop.default !== undefined) return true
  if (!required.includes(name)) return true
  return false
}

function buildObjectType(properties, required, mode) {
  const req = required || []
  const lines = []

  for (const [name, prop] of Object.entries(properties || {})) {
    const tsType = tsTypeFromProperty(prop)
    const optional =
      mode === 'Update' ||
      (mode === 'Insert' && isInsertOptional(name, prop, req)) ||
      (mode === 'Row' && !req.includes(name))

    lines.push(`          ${name}${optional ? '?' : ''}: ${tsType}`)
  }

  return lines.join('\n')
}

function collectEnums(definitions) {
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

async function fetchOpenApi() {
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

function generateSource(definitions) {
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
        Relationships: []
      }`
    })
    .join('\n')

  return `/**
 * AUTO-GENERATED — không sửa tay.
 * Sinh từ schema PostgREST (DB Supabase thật).
 * Chạy lại: npm run gen:types
 * Generated at: ${new Date().toISOString()}
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

async function main() {
  const openapi = await fetchOpenApi()
  const definitions = openapi.definitions || {}

  if (Object.keys(definitions).length === 0) {
    throw new Error('OpenAPI schema không có definitions.')
  }

  const outputPath = path.join(root, 'types', 'database.generated.ts')
  const source = generateSource(definitions)
  fs.writeFileSync(outputPath, source, 'utf8')

  console.log(`Đã sinh ${Object.keys(definitions).length} bảng → types/database.generated.ts`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
