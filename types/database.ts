/**
 * Database types — sinh từ DB Supabase thật qua PostgREST OpenAPI.
 * Chạy `npm run gen:types` sau khi đổi schema/migration.
 */
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from './database.generated'
