#!/usr/bin/env node

/**
 * RLS Policy Verification Script
 * Tests Row Level Security policies with different authentication contexts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

// Test results storage
const testResults = {
  structural: {},
  functional: {},
  performance: {},
  summary: {}
}

console.log('🔍 Starting RLS Policy Verification Tests...\n')

// ============================================================================
// STRUCTURAL CHECKS
// ============================================================================

console.log('📋 1️⃣ STRUCTURAL CHECKS')
console.log('=' * 50)

async function runStructuralChecks() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  try {
    // Check RLS status
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_rls_status')
    
    if (rlsError) {
      console.log('⚠️  Could not check RLS status via RPC, using direct query...')
      
      // Alternative: Check via direct SQL
      const { data: tables, error: tablesError } = await supabase
        .from('pg_class')
        .select('relname, relrowsecurity')
        .eq('relnamespace', 'public')
        .eq('relkind', 'r')
      
      if (tablesError) {
        console.log('❌ Could not query table RLS status')
        testResults.structural.rlsCheck = 'FAILED'
        return
      }
      
      const rlsEnabledTables = tables.filter(t => t.relrowsecurity)
      const rlsDisabledTables = tables.filter(t => !t.relrowsecurity)
      
      console.log(`✅ RLS Enabled Tables: ${rlsEnabledTables.length}`)
      console.log(`❌ RLS Disabled Tables: ${rlsDisabledTables.length}`)
      
      if (rlsDisabledTables.length > 0) {
        console.log('⚠️  Tables with RLS disabled:', rlsDisabledTables.map(t => t.relname))
        testResults.structural.rlsCheck = 'PARTIAL'
      } else {
        testResults.structural.rlsCheck = 'PASSED'
      }
    }
    
    // Check policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, cmd, qual')
      .eq('schemaname', 'public')
    
    if (policiesError) {
      console.log('❌ Could not query policies')
      testResults.structural.policiesCheck = 'FAILED'
      return
    }
    
    const policyCount = policies.length
    const authUidPolicies = policies.filter(p => p.qual && p.qual.includes('auth.uid()')).length
    const authRolePolicies = policies.filter(p => p.qual && p.qual.includes('auth.role()')).length
    const publicPolicies = policies.filter(p => p.qual && p.qual.includes('true')).length
    
    console.log(`✅ Total Policies: ${policyCount}`)
    console.log(`🔐 auth.uid() Policies: ${authUidPolicies}`)
    console.log(`🔑 auth.role() Policies: ${authRolePolicies}`)
    console.log(`🌐 Public Policies: ${publicPolicies}`)
    
    testResults.structural.policiesCheck = 'PASSED'
    testResults.structural.policyStats = {
      total: policyCount,
      authUid: authUidPolicies,
      authRole: authRolePolicies,
      public: publicPolicies
    }
    
  } catch (error) {
    console.log('❌ Structural checks failed:', error.message)
    testResults.structural.error = error.message
  }
}

// ============================================================================
// FUNCTIONAL TESTS
// ============================================================================

console.log('\n🧪 2️⃣ FUNCTIONAL TESTS')
console.log('=' * 50)

async function runFunctionalTests() {
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Test 1: Anonymous access to catalog tables
  console.log('\n📖 Testing Anonymous Access to Catalog Tables...')
  
  try {
    const { data: mtgCards, error: mtgError } = await supabaseAnon
      .from('MtgCard')
      .select('id, name')
      .limit(5)
    
    if (mtgError) {
      console.log(`❌ MtgCard SELECT failed: ${mtgError.message}`)
      testResults.functional.anonCatalogRead = 'FAILED'
    } else {
      console.log(`✅ MtgCard SELECT: ${mtgCards.length} rows`)
      testResults.functional.anonCatalogRead = 'PASSED'
    }
    
    const { data: sets, error: setsError } = await supabaseAnon
      .from('Set')
      .select('set_code, set_name')
      .limit(5)
    
    if (setsError) {
      console.log(`❌ Set SELECT failed: ${setsError.message}`)
    } else {
      console.log(`✅ Set SELECT: ${sets.length} rows`)
    }
    
    const { data: searchIndex, error: searchError } = await supabaseAnon
      .from('SearchIndex')
      .select('id, title')
      .limit(5)
    
    if (searchError) {
      console.log(`❌ SearchIndex SELECT failed: ${searchError.message}`)
    } else {
      console.log(`✅ SearchIndex SELECT: ${searchIndex.length} rows`)
    }
    
  } catch (error) {
    console.log('❌ Anonymous catalog access test failed:', error.message)
    testResults.functional.anonCatalogRead = 'FAILED'
  }
  
  // Test 2: Anonymous write attempts (should fail)
  console.log('\n🚫 Testing Anonymous Write Attempts...')
  
  try {
    const { data, error } = await supabaseAnon
      .from('MtgCard')
      .insert({
        scryfallId: 'test-card-123',
        name: 'Test Card',
        setCode: 'TEST',
        collectorNumber: '001'
      })
    
    if (error) {
      console.log(`✅ MtgCard INSERT blocked: ${error.message}`)
      testResults.functional.anonCatalogWrite = 'PASSED'
    } else {
      console.log('❌ MtgCard INSERT should have been blocked!')
      testResults.functional.anonCatalogWrite = 'FAILED'
    }
    
  } catch (error) {
    console.log(`✅ MtgCard INSERT blocked: ${error.message}`)
    testResults.functional.anonCatalogWrite = 'PASSED'
  }
  
  // Test 3: Anonymous access to user data (should fail or return empty)
  console.log('\n🔒 Testing Anonymous Access to User Data...')
  
  try {
    const { data: carts, error: cartError } = await supabaseAnon
      .from('Cart')
      .select('id, userId')
      .limit(5)
    
    if (cartError) {
      console.log(`✅ Cart SELECT blocked: ${cartError.message}`)
      testResults.functional.anonUserDataAccess = 'PASSED'
    } else if (carts.length === 0) {
      console.log('✅ Cart SELECT returned empty (no policies matched)')
      testResults.functional.anonUserDataAccess = 'PASSED'
    } else {
      console.log('❌ Cart SELECT should have been blocked or empty!')
      testResults.functional.anonUserDataAccess = 'FAILED'
    }
    
  } catch (error) {
    console.log(`✅ Cart SELECT blocked: ${error.message}`)
    testResults.functional.anonUserDataAccess = 'PASSED'
  }
  
  // Test 4: Create test users and test user isolation
  console.log('\n👥 Testing User Isolation...')
  
  try {
    // Create test user A
    const { data: userA, error: userAError } = await supabaseAnon.auth.signUp({
      email: 'test-user-a@example.com',
      password: 'testpassword123'
    })
    
    if (userAError) {
      console.log(`⚠️  Could not create test user A: ${userAError.message}`)
      testResults.functional.userIsolation = 'SKIPPED'
      return
    }
    
    console.log('✅ Test user A created')
    
    // Sign in as user A
    const { data: sessionA, error: sessionAError } = await supabaseAnon.auth.signInWithPassword({
      email: 'test-user-a@example.com',
      password: 'testpassword123'
    })
    
    if (sessionAError) {
      console.log(`⚠️  Could not sign in as user A: ${sessionAError.message}`)
      testResults.functional.userIsolation = 'SKIPPED'
      return
    }
    
    const supabaseUserA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${sessionA.session.access_token}`
        }
      }
    })
    
    // Create a cart for user A
    const { data: cartA, error: cartAError } = await supabaseUserA
      .from('Cart')
      .insert({
        userId: sessionA.user.id,
        token: 'test-cart-token-a'
      })
      .select()
      .single()
    
    if (cartAError) {
      console.log(`❌ Could not create cart for user A: ${cartAError.message}`)
      testResults.functional.userIsolation = 'FAILED'
      return
    }
    
    console.log('✅ Cart created for user A')
    
    // Test that user A can see their own cart
    const { data: userACarts, error: userACartsError } = await supabaseUserA
      .from('Cart')
      .select('id, userId')
      .eq('userId', sessionA.user.id)
    
    if (userACartsError) {
      console.log(`❌ User A could not see their own cart: ${userACartsError.message}`)
      testResults.functional.userIsolation = 'FAILED'
      return
    }
    
    if (userACarts.length > 0) {
      console.log('✅ User A can see their own cart')
    } else {
      console.log('❌ User A cannot see their own cart')
      testResults.functional.userIsolation = 'FAILED'
      return
    }
    
    // Create test user B
    const { data: userB, error: userBError } = await supabaseAnon.auth.signUp({
      email: 'test-user-b@example.com',
      password: 'testpassword123'
    })
    
    if (userBError) {
      console.log(`⚠️  Could not create test user B: ${userBError.message}`)
      testResults.functional.userIsolation = 'PARTIAL'
      return
    }
    
    // Sign in as user B
    const { data: sessionB, error: sessionBError } = await supabaseAnon.auth.signInWithPassword({
      email: 'test-user-b@example.com',
      password: 'testpassword123'
    })
    
    if (sessionBError) {
      console.log(`⚠️  Could not sign in as user B: ${sessionBError.message}`)
      testResults.functional.userIsolation = 'PARTIAL'
      return
    }
    
    const supabaseUserB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${sessionB.session.access_token}`
        }
      }
    })
    
    // Test that user B cannot see user A's cart
    const { data: userBCarts, error: userBCartsError } = await supabaseUserB
      .from('Cart')
      .select('id, userId')
      .eq('userId', sessionA.user.id)
    
    if (userBCartsError) {
      console.log(`✅ User B cannot see user A's cart: ${userBCartsError.message}`)
    } else if (userBCarts.length === 0) {
      console.log('✅ User B cannot see user A\'s cart (empty result)')
    } else {
      console.log('❌ User B can see user A\'s cart!')
      testResults.functional.userIsolation = 'FAILED'
      return
    }
    
    console.log('✅ User isolation test passed')
    testResults.functional.userIsolation = 'PASSED'
    
    // Cleanup: Delete test users
    await supabaseAnon.auth.admin.deleteUser(sessionA.user.id)
    await supabaseAnon.auth.admin.deleteUser(sessionB.user.id)
    console.log('🧹 Test users cleaned up')
    
  } catch (error) {
    console.log('❌ User isolation test failed:', error.message)
    testResults.functional.userIsolation = 'FAILED'
  }
}

// ============================================================================
// PERFORMANCE CHECKS
// ============================================================================

console.log('\n⚡ 3️⃣ PERFORMANCE CHECKS')
console.log('=' * 50)

async function runPerformanceChecks() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  try {
    // Check indexes
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('tablename, indexname')
      .eq('schemaname', 'public')
      .in('tablename', ['Cart', 'CartItem', 'Order', 'OrderItem', 'Address', 'Profile'])
    
    if (indexError) {
      console.log('❌ Could not query indexes')
      testResults.performance.indexCheck = 'FAILED'
      return
    }
    
    const requiredIndexes = [
      'Cart_userId_idx',
      'CartItem_cartId_idx', 
      'Order_userId_idx',
      'OrderItem_orderId_idx',
      'Address_userId_idx',
      'Profile_userId_key'
    ]
    
    const foundIndexes = indexes.map(i => i.indexname)
    const missingIndexes = requiredIndexes.filter(idx => !foundIndexes.includes(idx))
    
    console.log(`✅ Found Indexes: ${foundIndexes.length}`)
    console.log(`📋 Required Indexes: ${requiredIndexes.length}`)
    
    if (missingIndexes.length > 0) {
      console.log(`❌ Missing Indexes: ${missingIndexes.join(', ')}`)
      testResults.performance.indexCheck = 'FAILED'
    } else {
      console.log('✅ All required indexes present')
      testResults.performance.indexCheck = 'PASSED'
    }
    
    testResults.performance.foundIndexes = foundIndexes
    testResults.performance.missingIndexes = missingIndexes
    
  } catch (error) {
    console.log('❌ Performance checks failed:', error.message)
    testResults.performance.error = error.message
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  await runStructuralChecks()
  await runFunctionalTests()
  await runPerformanceChecks()
  
  // Generate summary report
  console.log('\n📊 QA REPORT SUMMARY')
  console.log('=' * 50)
  
  const structuralPassed = testResults.structural.rlsCheck === 'PASSED' && 
                           testResults.structural.policiesCheck === 'PASSED'
  const functionalPassed = testResults.functional.anonCatalogRead === 'PASSED' &&
                           testResults.functional.anonCatalogWrite === 'PASSED' &&
                           testResults.functional.anonUserDataAccess === 'PASSED' &&
                           testResults.functional.userIsolation === 'PASSED'
  const performancePassed = testResults.performance.indexCheck === 'PASSED'
  
  console.log(`✅ Structural Checks: ${structuralPassed ? 'PASSED' : 'FAILED'}`)
  console.log(`✅ Functional Tests: ${functionalPassed ? 'PASSED' : 'FAILED'}`)
  console.log(`✅ Performance Checks: ${performancePassed ? 'PASSED' : 'FAILED'}`)
  
  const overallPassed = structuralPassed && functionalPassed && performancePassed
  console.log(`\n🎯 Overall Result: ${overallPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:')
  console.log(JSON.stringify(testResults, null, 2))
}

main().catch(console.error)
