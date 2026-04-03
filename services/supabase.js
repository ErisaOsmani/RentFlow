import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kebdtbisknuvipannfdb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlYmR0Ymlza251dmlwYW5uZmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNzgxNjMsImV4cCI6MjA5MDc1NDE2M30.rUU8a5fYuI2RXlh4_kHAbF4fkKEVe0vPlJkne8BQOlE'

export const supabase = createClient(supabaseUrl, supabaseKey)