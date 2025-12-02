#!/bin/bash

# Database Initialization Script
# 数据库初始化脚本

echo "=== Cloudflare D1 Database Initialization ==="
echo ""

# Step 1: Create local development database
echo "Step 1: Creating local development database..."
echo "Run: wrangler d1 create mailsend-db"
echo ""

# Step 2: Execute schema migration locally
echo "Step 2: Executing schema migration (local)..."
echo "Run: wrangler d1 execute mailsend-db --local --file=./schema.sql"
echo ""

# Step 3: Create production database (manual)
echo "Step 3: Create production database in Cloudflare Dashboard"
echo "1. Go to https://dash.cloudflare.com"
echo "2. Navigate to Workers & Pages > D1"
echo "3. Click 'Create database'"
echo "4. Name it: mailsend-db"
echo "5. Copy the database ID"
echo "6. Update wrangler.jsonc with the database_id"
echo ""

# Step 4: Execute schema migration in production
echo "Step 4: Executing schema migration (production)..."
echo "Run: wrangler d1 execute mailsend-db --remote --file=./schema.sql"
echo ""

echo "=== Initialization Complete ==="
echo ""
echo "Next steps:"
echo "1. Run the commands above in order"
echo "2. Test locally with: npm run dev"
echo "3. Deploy to production with: npm run deploy"
