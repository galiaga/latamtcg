#!/usr/bin/env tsx

/**
 * Apply the item_popularity_mv migration directly
 * This bypasses Prisma's shadow database validation
 */

import { prisma } from '@/lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

async function main() {
  console.log('🔄 Applying item_popularity_mv migration...')
  
  try {
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'prisma', 'migrations', '20251104120000_add_item_popularity_mv', 'migration.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    // Remove single-line comments (-- style)
    const cleanedSQL = migrationSQL
      .split('\n')
      .map(line => {
        const commentIndex = line.indexOf('--')
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex).trim()
        }
        return line.trim()
      })
      .filter(line => line.length > 0)
      .join('\n')
    
    // Split by semicolons (but keep multi-line statements intact)
    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^\s*$/) && !s.match(/^--/))
    
    // Execute each statement separately
    console.log(`📝 Executing ${statements.length} SQL statements...`)
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (stmt.trim()) {
        console.log(`  Executing statement ${i + 1}/${statements.length}...`)
        // Add semicolon back for execution
        await prisma.$executeRawUnsafe(stmt + ';')
      }
    }
    
    console.log('✅ Migration applied successfully!')
    
    // Verify the materialized view exists
    const checkResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM pg_matviews
      WHERE schemaname = 'public' AND matviewname = 'item_popularity_mv'
    `
    
    if (Number(checkResult[0]?.count || 0) > 0) {
      console.log('✅ Materialized view verified!')
      
      // Get row count
      const stats = await prisma.$queryRaw<Array<{ row_count: bigint }>>`
        SELECT COUNT(*)::bigint AS row_count
        FROM public.item_popularity_mv
      `
      
      console.log(`📊 Materialized view has ${Number(stats[0]?.row_count || 0)} rows`)
    } else {
      console.warn('⚠️  Materialized view not found after migration')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

