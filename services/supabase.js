import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jntpdgglqsjydtllutzy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudHBkZ2dscXNqeWR0bGx1dHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTY1NjQsImV4cCI6MjA5MTEzMjU2NH0.Ncy3zkbx8TlTQ2tgIMdYkj2zYAKeBvo9FrNTKmi4RVo'

export const supabase = createClient(supabaseUrl, supabaseKey)