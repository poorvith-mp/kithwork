export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Row = Record<string, unknown>
type Table = { Row: Row; Insert: Row; Update: Row; Relationships: [] }

export interface Database {
  public: {
    Tables: Record<string, Table>
    Views: Record<string, never>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
