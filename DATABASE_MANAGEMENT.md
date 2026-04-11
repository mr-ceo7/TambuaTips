# TambuaTips Terminal-Ready Database Commands

These commands are formatted to be copied and pasted directly into your terminal for quick database management.

> [!IMPORTANT]
> - These commands use the database **`tambuatips_v2_db`**.
> - Replace placeholders like `[EMAIL]`, `[ID]`, and `[TIER]` with actual values.

---
## 1. Create User & Activate Subscription
This single command creates Joseph's account, assigns him the auto-generated email, sets his tier to premium, and gives him 28 days of access.

```bash
mysql -u root -p'$DB_PASS' -e "USE tambuatips_v2_db; INSERT INTO users (name, email, password, subscription_tier, subscription_expires_at, created_at, updated_at) VALUES ('steward-Omwenga', 'phone_254721857014@tambuatips.local', 'manual_registration', 'tier_4plus', DATE_ADD(NOW(), INTERVAL 28 DAY), NOW(), NOW());"
```
## 2. Log the Payment
Now that his account exists, this command will successfully log his KES 640 M-Pesa payment and attach it to his new

```bash
mysql -u root -p'$DB_PASS' -e "USE tambuatips_v2_db; INSERT INTO payments (user_id, amount, currency, method, status, reference, transaction_id, item_type, item_id, created_at, updated_at) VALUES ((SELECT id FROM users WHERE email = 'phone_254721857014@tambuatips.local' LIMIT 1), 640, 'KES', 'mpesa', 'completed', 'MANUAL-PAY', 'TXN-$(date +%s)', 'subscription', 'tier_4plus', NOW(), NOW());"
```

## ── User & Subscription Management ─────────────────────────────

### 🔎 Search User by Email
```bash
mysql -u root -p'$DB_PASS' -e "USE tambuatips_v2_db; SELECT id, name, email, subscription_tier, subscription_expires_at FROM users WHERE email LIKE '%[phone_254720053143@tambuatips.local]%';"
```

### 🗓️ Check Subscription Expiry
```bash
mysql -u root -p'$DB_PASS' -e "USE tambuatips_v2_db; SELECT email, subscription_tier, subscription_expires_at, IF(subscription_expires_at > NOW(), 'ACTIVE', 'EXPIRED') AS status FROM users WHERE email = '[EMAIL]';"
```

### 🚀 Grant/Extend Subscription (14 Days)
```bash
mysql -u root -p'$DB_PASS' -e "USE tambuatips_v2_db; UPDATE users SET subscription_tier = '[premium/standard/basic]', subscription_expires_at = DATE_ADD(IFNULL(subscription_expires_at, NOW()), INTERVAL 14 DAY) WHERE email = '[EMAIL]';"
```

---

## ── Payment Logging ─────────────────────────────────────────────

### ✍️ Add a Manual Payment Record
Use this to log a successful M-Pesa payment if the callback failed.
```bash
mysql -u root -p'$DB_PASS' -e "USE tambuatips_v2_db; INSERT INTO payments (user_id, amount, currency, method, status, reference, transaction_id, item_type, item_id, created_at, updated_at) VALUES ((SELECT id FROM users WHERE email = '[EMAIL]'), 800, 'KES', 'mpesa', 'completed', 'MANUAL-PAY', 'TXN-$(date +%s)', 'subscription', '[premium/standard/basic]', NOW(), NOW());"
```

### 🕒 List 10 Most Recent Pending Payments
```bash
mysql -u root -p'$DB_PASS' -e "USE tambuatips_v2_db; SELECT p.id, u.email, p.amount, p.method, p.created_at FROM payments p JOIN users u ON p.user_id = u.id WHERE p.status = 'pending' ORDER BY p.created_at DESC LIMIT 10;"
```

### ✅ Mark a Payment as Completed
```bash
mysql -u root -p'$DB_PASS' -e "USE tambuatips_v2_db; UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = [PAYMENT_ID];"
```

---

## ── Site & Jackpot Management ──────────────────────────────────

### 🏆 List Upcoming Jackpots
```bash
mysql -u root -p'$DB_PASS' -e "USE tambuatips_v2_db; SELECT id, title, country, deadline FROM jackpots WHERE deadline > NOW() ORDER BY deadline ASC;"
```

### 👥 Check Jackpot Buyers
```bash
mysql -u root -p'$DB_PASS' -e "USE tambuatips_v2_db; SELECT u.name, u.email, jp.created_at FROM jackpot_purchases jp JOIN users u ON jp.user_id = u.id WHERE jp.jackpot_id = [JACKPOT_ID];"
```

---

## ── Maintenance ─────────────────────────────────────────────────

### 📊 Check Table Sizes
```bash
mysql -u root -p'$DB_PASS' -e "SELECT table_name AS 'Table', ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)' FROM information_schema.TABLES WHERE table_schema = 'tambuatips_v2_db' ORDER BY (data_length + index_length) DESC;"
```
