#!/bin/bash
# Exit immediately on failure
set -e

# Setup Logging Directories
DB_FILE="/var/www/v2.tambuatips.com/deploy-dashboard/deployments.json"
LOG_DIR="/var/www/v2.tambuatips.com/deploy-dashboard/logs"
mkdir -p "$LOG_DIR"
if [ ! -f "$DB_FILE" ]; then echo "[]" > "$DB_FILE"; chown www-data:www-data "$DB_FILE"; fi

echo "Starting Deployment..."

cd /var/www/v2.tambuatips.com
git checkout .
git pull origin main

COMMIT=$(git rev-parse --short HEAD)
LOG_FILE="$LOG_DIR/$COMMIT.txt"
TIMESTAMP=$(date +%s)

# Record "building" state
python3 -c "
import json
db_file = '$DB_FILE'
try:
    with open(db_file, 'r') as f: data = json.load(f)
except:
    data = []
data = [d for d in data if d.get('id') != '$COMMIT']
data.append({'id': '$COMMIT', 'status': 'building', 'timestamp': int('$TIMESTAMP')})
with open(db_file, 'w') as f: json.dump(data, f)
"

# Run the actual build wrapped in a block to pipe output natively
{
  echo "--- Build Log for Commit: $COMMIT ---"
  date
  echo "-----------------------------------"
  
  # Update UI
  npm install
  npm run build

  # Update Backend
  cd backend
  source venv/bin/activate || true
  pip install -r requirements.txt || true
  pipenv install || true
  pipenv run alembic upgrade head || true
  cd ..

  # Restart Services
  systemctl restart tambuatips-api
  systemctl restart tambuatips-webhook

  echo "-----------------------------------"
  echo "Deployment Successful!"
} > "$LOG_FILE" 2>&1

# Update status to success
python3 -c "
import json
db_file = '$DB_FILE'
try:
    with open(db_file, 'r') as f: data = json.load(f)
    for d in data:
        if d.get('id') == '$COMMIT':
            d['status'] = 'success'
    with open(db_file, 'w') as f: json.dump(data, f)
except: pass
"
pipenv install || true
pipenv run alembic upgrade head || true
cd ..

systemctl restart tambuatips-api
systemctl restart tambuatips-webhook

echo "Deployment Successful!"
