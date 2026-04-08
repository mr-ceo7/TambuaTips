#!/bin/bash
set -e
echo "Starting Deployment..."

cd /var/www/v2.tambuatips.com
git checkout .
git pull origin main

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

systemctl restart tambuatips-api
systemctl restart tambuatips-webhook

echo "Deployment Successful!"
