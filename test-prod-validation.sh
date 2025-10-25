#!/bin/bash

# PROD Validation Test Script
# Run this script after setting environment variables and deploying

# Configuration - UPDATE THESE VALUES
export CRON_SECRET="your-actual-cron-secret-here"
export VERCEL_APP_URL="https://your-app.vercel.app"

echo "🚀 Starting PROD Validation Tests..."
echo "App URL: $VERCEL_APP_URL"
echo "Timestamp: $(date)"
echo ""

# Function to test a route and validate response
test_route() {
    local route_name="$1"
    local endpoint="$2"
    local validation_func="$3"
    
    echo "=== Testing $route_name ==="
    echo "Endpoint: $endpoint"
    
    # Make the request
    response=$(curl -s "$VERCEL_APP_URL$endpoint?token=$CRON_SECRET")
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to connect to $route_name"
        return 1
    fi
    
    # Check if response is valid JSON
    if ! echo "$response" | jq . >/dev/null 2>&1; then
        echo "❌ Invalid JSON response from $route_name"
        echo "Response: $response"
        return 1
    fi
    
    # Print formatted JSON
    echo "Response:"
    echo "$response" | jq .
    
    # Run validation
    echo ""
    echo "Validation:"
    eval "$validation_func"
    
    echo ""
    echo "---"
    echo ""
}

# Validation functions
validate_stage() {
    local response="$1"
    
    # Extract values
    local paperOnly=$(echo "$response" | jq -r '.paperOnly // "null"')
    local parseMode=$(echo "$response" | jq -r '.parseMode // "null"')
    local allowed=$(echo "$response" | jq -r '.allowed // "null"')
    local consistencyRatio=$(echo "$response" | jq -r '.consistencyRatio // "null"')
    local ok=$(echo "$response" | jq -r '.ok // "null"')
    local skipped=$(echo "$response" | jq -r '.skipped // "null"')
    
    echo "paperOnly: $paperOnly (expected: true)"
    echo "parseMode: $parseMode (expected: stream or buffer)"
    echo "allowed: $allowed (expected: true)"
    echo "consistencyRatio: $consistencyRatio (expected: 0.95-1.05)"
    echo "ok: $ok (expected: true)"
    echo "skipped: $skipped (expected: false)"
    
    # Validation checks
    local errors=0
    
    if [ "$paperOnly" != "true" ]; then
        echo "❌ paperOnly should be true"
        errors=$((errors + 1))
    else
        echo "✅ paperOnly is correct"
    fi
    
    if [ "$parseMode" != "stream" ] && [ "$parseMode" != "buffer" ]; then
        echo "❌ parseMode should be stream or buffer"
        errors=$((errors + 1))
    else
        echo "✅ parseMode is correct"
    fi
    
    if [ "$allowed" != "true" ]; then
        echo "❌ allowed should be true"
        errors=$((errors + 1))
    else
        echo "✅ allowed is correct"
    fi
    
    if [ "$consistencyRatio" != "null" ]; then
        local ratio=$(echo "$consistencyRatio" | bc -l)
        if (( $(echo "$ratio < 0.95" | bc -l) )) || (( $(echo "$ratio > 1.05" | bc -l) )); then
            echo "❌ consistencyRatio $ratio should be between 0.95 and 1.05"
            errors=$((errors + 1))
        else
            echo "✅ consistencyRatio is correct"
        fi
    else
        echo "❌ consistencyRatio is missing"
        errors=$((errors + 1))
    fi
    
    if [ "$ok" != "true" ]; then
        echo "❌ ok should be true"
        errors=$((errors + 1))
    else
        echo "✅ ok is correct"
    fi
    
    if [ "$skipped" != "false" ]; then
        echo "❌ skipped should be false"
        errors=$((errors + 1))
    else
        echo "✅ skipped is correct"
    fi
    
    if [ $errors -eq 0 ]; then
        echo "🎉 Stage validation PASSED"
        return 0
    else
        echo "💥 Stage validation FAILED ($errors errors)"
        return 1
    fi
}

validate_update() {
    local response="$1"
    
    # Extract values
    local skipped=$(echo "$response" | jq -r '.update.skipped // "null"')
    local cardsMatched=$(echo "$response" | jq -r '.update.cardsMatched // "null"')
    local rowsStaged=$(echo "$response" | jq -r '.update.rowsStaged // "null"')
    local ok=$(echo "$response" | jq -r '.update.ok // "null"')
    
    echo "skipped: $skipped (expected: false)"
    echo "cardsMatched: $cardsMatched"
    echo "rowsStaged: $rowsStaged"
    echo "ok: $ok (expected: true)"
    
    # Validation checks
    local errors=0
    
    if [ "$skipped" != "false" ]; then
        echo "❌ skipped should be false"
        errors=$((errors + 1))
    else
        echo "✅ skipped is correct"
    fi
    
    if [ "$ok" != "true" ]; then
        echo "❌ ok should be true"
        errors=$((errors + 1))
    else
        echo "✅ ok is correct"
    fi
    
    if [ "$cardsMatched" != "null" ] && [ "$rowsStaged" != "null" ]; then
        local ratio=$(echo "scale=3; $cardsMatched / $rowsStaged" | bc -l)
        if (( $(echo "$ratio < 0.95" | bc -l) )); then
            echo "❌ cardsMatched/rowsStaged ratio $ratio should be ≥ 0.95"
            errors=$((errors + 1))
        else
            echo "✅ cardsMatched/rowsStaged ratio is correct"
        fi
    else
        echo "⚠️  Could not calculate cardsMatched/rowsStaged ratio"
    fi
    
    if [ $errors -eq 0 ]; then
        echo "🎉 Update validation PASSED"
        return 0
    else
        echo "💥 Update validation FAILED ($errors errors)"
        return 1
    fi
}

validate_history() {
    local response="$1"
    
    # Extract values
    local skipped=$(echo "$response" | jq -r '.skipped // "null"')
    local upsertsPerRow=$(echo "$response" | jq -r '.upsertsPerRow // "null"')
    local historyUpserts=$(echo "$response" | jq -r '.historyUpserts // "null"')
    local rowsStagedToday=$(echo "$response" | jq -r '.rowsStagedToday // "null"')
    local ok=$(echo "$response" | jq -r '.ok // "null"')
    
    echo "skipped: $skipped (expected: false)"
    echo "upsertsPerRow: $upsertsPerRow (expected: 1-3)"
    echo "historyUpserts: $historyUpserts"
    echo "rowsStagedToday: $rowsStagedToday"
    echo "ok: $ok (expected: true)"
    
    # Validation checks
    local errors=0
    
    if [ "$skipped" != "false" ]; then
        echo "❌ skipped should be false"
        errors=$((errors + 1))
    else
        echo "✅ skipped is correct"
    fi
    
    if [ "$ok" != "true" ]; then
        echo "❌ ok should be true"
        errors=$((errors + 1))
    else
        echo "✅ ok is correct"
    fi
    
    if [ "$upsertsPerRow" != "null" ]; then
        if (( $(echo "$upsertsPerRow < 1" | bc -l) )) || (( $(echo "$upsertsPerRow > 3" | bc -l) )); then
            echo "❌ upsertsPerRow $upsertsPerRow should be between 1 and 3"
            errors=$((errors + 1))
        else
            echo "✅ upsertsPerRow is correct"
        fi
    else
        echo "⚠️  upsertsPerRow is missing"
    fi
    
    if [ "$historyUpserts" != "null" ] && [ "$rowsStagedToday" != "null" ]; then
        local maxExpected=$(echo "scale=0; $rowsStagedToday * 3" | bc -l)
        if (( $(echo "$historyUpserts > $maxExpected" | bc -l) )); then
            echo "❌ historyUpserts $historyUpserts should be ≤ 3×rowsStagedToday ($maxExpected)"
            errors=$((errors + 1))
        else
            echo "✅ historyUpserts is correct"
        fi
    else
        echo "⚠️  Could not validate historyUpserts against rowsStagedToday"
    fi
    
    if [ $errors -eq 0 ]; then
        echo "🎉 History validation PASSED"
        return 0
    else
        echo "💥 History validation FAILED ($errors errors)"
        return 1
    fi
}

# Main test execution
echo "Starting tests..."

# Test Stage route
test_route "STAGE" "/api/cron/ingest-stage" "validate_stage '$response'"
stage_result=$?

# Test Update route
test_route "UPDATE" "/api/cron/ingest-update" "validate_update '$response'"
update_result=$?

# Test History route
test_route "HISTORY" "/api/cron/ingest-history" "validate_history '$response'"
history_result=$?

# Summary
echo "🏁 VALIDATION SUMMARY"
echo "====================="
echo "Stage: $([ $stage_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "Update: $([ $update_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "History: $([ $history_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"

total_errors=$((stage_result + update_result + history_result))
if [ $total_errors -eq 0 ]; then
    echo ""
    echo "🎉 ALL VALIDATIONS PASSED!"
    echo "Paper-only mode with stream/buffer fallback is working correctly."
else
    echo ""
    echo "💥 $total_errors VALIDATION(S) FAILED"
    echo "Check the errors above and review the implementation."
fi

echo ""
echo "Test completed at: $(date)"
