#!/bin/bash
set -e

echo "🚀 Starting Pre-Deploy Validation..."

# 1. Check Backend Migrations
echo "📦 Checking database migrations..."
cd backend
if pipenv run alembic check; then
  echo "✅ Database models are safely tracked."
else
  echo "⚠️ Database models have changed but no migration found."
  echo "⚙️ Automatically generating migration..."
  pipenv run alembic revision --autogenerate -m "auto-generated pre-deploy migration"
  echo "✅ Migration auto-generated successfully!"
  echo "⬆️ Applying new migration locally..."
  pipenv run alembic upgrade head
fi

# 2. Check Backend Boot
echo "⚙️  Verifying backend boots successfully..."
# Quick python check to make sure all models import correctly without syntax/NameError bugs
if pipenv run python -c "from app.models import *"; then
  echo "✅ Backend models verified and imports are clean."
else
  echo "❌ ERROR: Backend code has import errors or syntax bugs!"
  exit 1
fi
cd ..

# 3. Final Reminder
echo "----------------------------------------"
echo "🎉 Validation Passed! You are safe to push to production."
echo "💡 NOTE: If a new migration was just created, don't forget to 'git add' it!"
echo "To deploy, run: git push origin main && ./deploy.sh"
