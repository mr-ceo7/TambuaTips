# 🚀 TambuaTips V2 Deployment & Server Management Guide

This document explains the architecture of the TambuaTips V2 platform on your DigitalOcean Droplet. It is designed for beginners to understand how the site works, where files are located, and how to maintain it.

---

## 🏗 High-Level Architecture

When a user visits `v2.tambuatips.com`, here is what happens:

1.  **Nginx (The Gatekeeper)**: Nginx is the web server that receives all incoming traffic. It handles SSL (HTTPS) and decides where to send the request:
    *   **Static Files**: If the user asks for a page (like `/tips` or `/profile`), Nginx serves the pre-built React frontend.
    *   **API Requests**: If the request starts with `/api/`, Nginx proxies it to your Python backend.
    *   **Deployment Webhooks**: If GitHub sends a "Push" notification to `/webhook/`, Nginx sends it to the deployment listener.

2.  **FastAPI (The Brain)**: Your Python backend runs as a background service. It connects to the MySQL database to store users, tips, and payments.

3.  **MySQL (The Memory)**: All your persistent data lives here.

---

## 📁 Important File Locations

| Component | Path on Server | Description |
| :--- | :--- | :--- |
| **Root Folder** | `/var/www/v2.tambuatips.com` | The main project directory. |
| **Frontend (Build)** | `/var/www/v2.tambuatips.com/dist` | The compiled HTML/JS/CSS served to users. |
| **Backend Code** | `/var/www/v2.tambuatips.com/backend` | The Python FastAPI source code. |
| **Env Variables** | `/var/www/v2.tambuatips.com/backend/.env` | **CRITICAL**: Where API keys (PayPal, M-Pesa) are stored. |
| **Deployment Script** | `/var/www/v2.tambuatips.com/deploy.sh` | The script that updates the site. |
| **Nginx Config** | `/etc/nginx/sites-available/v2.tambuatips.com` | Directions for how traffic flows. |

---

## 🔄 Automated Deployment (How it updates)

We have set up a "CI/CD" pipeline. You don't need to manually upload files via FTP.

1.  You **Push** code to your GitHub repository.
2.  GitHub sends a notification to your server's **Webhook Listener** (running on port 9000).
3.  The listener executes the `/var/www/v2.tambuatips.com/deploy.sh` script.
4.  The script performs these steps automatically:
    *   `git pull`: Gets latest code.
    *   `npm install` & `npm run build`: Rebuilds the frontend.
    *   `systemctl restart tambuatips-api`: Restarts the backend to apply changes.

---

## 🛠 Common Maintenance Commands

You will run these commands while logged into your server via SSH.

### 1. Check if the Backend is Running
If the site shows "502 Bad Gateway", the backend might be crashed.
```bash
systemctl status tambuatips-api
```

### 2. View Real-time Logs (Debugging)
To see errors happening in the backend right now:
```bash
journalctl -u tambuatips-api -f
```

### 3. Manually Restart Everything
If you change the `.env` file, you MUST restart the service:
```bash
systemctl restart tambuatips-api
```

### 4. Manually Trigger a Deployment
If the automatic update fails, you can run the script yourself:
```bash
cd /var/www/v2.tambuatips.com
./deploy.sh
```

---

## 🔐 Managing Environment Variables

If you need to change your PayPal keys, M-Pesa password, or any other secret:

1.  Edit the file: `nano /var/www/v2.tambuatips.com/backend/.env`
2.  Change the values.
3.  Press `Ctrl + O` then `Enter` to save, and `Ctrl + X` to exit.
4.  **Important**: Restart the backend: `systemctl restart tambuatips-api`

---

## 🌍 Domain & SSL
*   **Domain**: Configured via DigitalOcean Networking (Pointing to your IP).
*   **SSL**: Provided by **Certbot (Let's Encrypt)**. It auto-renews. If you ever need to renew manually: `certbot renew`.

---

> [!TIP]
> **Safety First**: Always keep a backup of your `.env` file locally. If you delete the Droplet, that file is gone forever!
