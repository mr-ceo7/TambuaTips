# How to Migrate Domains for TambuaTips

This guide provides a step-by-step walkthrough on how to switch domains or shift a staging site (like `v2`) to your main production domain using Nginx on your Ubuntu server.

## Overview
When migrating a site, you generally want to:
1. Preserve the old application (e.g., move the old `tambuatips.com` to `old.tambuatips.com`).
2. Point the main domain (`tambuatips.com`) to the new application directory (`/var/www/v2.tambuatips.com/dist`).
3. Point the backend routes and webhooks correctly.
4. Setup a 301 Redirect for the old staging domain (`v2.tambuatips.com` -> `tambuatips.com`) to preserve SEO.
5. Setup SSL certificates for all new domain endpoints.

---

## Step 1: DNS Setup
Before touching the server, make sure you configure your DNS records (A Records) in your domain registrar or Cloudflare:
- `tambuatips.com` -> `161.35.100.156`
- `www.tambuatips.com` -> `161.35.100.156`
- `old.tambuatips.com` -> `161.35.100.156`
- `v2.tambuatips.com` -> `161.35.100.156`

## Step 2: Backup Old Configuration
SSH into your server and make a copy of the existing configuration for the old site so you can deploy it to the backup domain.

```bash
cd /etc/nginx/sites-available/
cp tambuatips.com old.tambuatips.com
```

Now edit `old.tambuatips.com`:
```bash
nano old.tambuatips.com
```
Change `server_name tambuatips.com www.tambuatips.com;` to `server_name old.tambuatips.com;`. 
Remove the SSL blocks (`listen 443 ssl`, certificate paths, etc.) for now so Certbot can generate fresh ones for the `old` subdomain.

Enable the old site:
```bash
ln -s /etc/nginx/sites-available/old.tambuatips.com /etc/nginx/sites-enabled/
```

## Step 3: Switch the Main Domain Configuration
Now edit the main configuration to point to the **new** platform (V2).

```bash
nano tambuatips.com
```
Replace the PHP-specific setup with your static React build and backend proxy logic. Make sure it looks like this:

```nginx
server {
    server_name tambuatips.com www.tambuatips.com;
    
    # Point this to your new V2 folder!
    root /var/www/v2.tambuatips.com/dist;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Dashboard
    location /_deploy/ {
        auth_basic "TambuaTips Deploy";
        auth_basic_user_file /etc/nginx/.deploy_htpasswd;
        alias /var/www/v2.tambuatips.com/deploy-dashboard/;
        index index.html;
    }

    # Webhook
    location /webhook/ {
        proxy_pass http://127.0.0.1:9000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Core FastAPI Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Your existing SSL cert paths...
    listen 443 ssl;
    # ...
}

# The HTTP to HTTPS redirect block
server {
    if ($host = www.tambuatips.com) { return 301 https://$host$request_uri; }
    if ($host = tambuatips.com) { return 301 https://$host$request_uri; }
    server_name tambuatips.com www.tambuatips.com;
    listen 80;
    return 404;
}
```

## Step 4: Setup V2 to Redirect to the Main Domain
You don't want Google indexing `v2.tambuatips.com` anymore. You want a permanent 301 redirect.

```bash
nano /etc/nginx/sites-available/v2.tambuatips.com
```
Replace the content with:
```nginx
server {
    server_name v2.tambuatips.com;
    
    # 301 Permanent Redirect to the new main domain
    return 301 https://tambuatips.com$request_uri;

    listen 443 ssl; # existing certbot ssl
    # ... your existing ssl paths ...
}

server {
    # HTTP redirect
    if ($host = v2.tambuatips.com) { return 301 https://tambuatips.com$request_uri; }
    server_name v2.tambuatips.com;
    listen 80;
    return 404;
}
```

## Step 5: Protect with Let's Encrypt (Certbot)
Now that Nginx configs are updated, you need an SSL certificate for `old.tambuatips.com`.

```bash
# Restart Nginx first
systemctl restart nginx

# Request certificate
certbot --nginx -d old.tambuatips.com
```

## Step 6: Update Environment Variables
You MUST update the `.env` file of the backend so authentication callbacks (like Google OAuth), CORS, and Webhooks know where the primary domain is.

```bash
nano /var/www/v2.tambuatips.com/backend/.env
```
Update these fields:
```env
FRONTEND_URL=https://tambuatips.com
# For CORS, comma separate them:
CORS_ORIGINS=https://tambuatips.com,https://www.tambuatips.com,http://localhost:5173
```
Then restart your API:
```bash
systemctl restart tambuatips-api
```

## Step 7: Update Codebase
If any hardcoded URLs exist in your codebase (like `index.html` SEO tags or Python alert templates), you should replace them locally, commit the changes, and deploy them.

```bash
# Wait for github hook, or deploy manually:
cd /var/www/v2.tambuatips.com
./deploy.sh
```

**MIGRATION COMPLETE!**
