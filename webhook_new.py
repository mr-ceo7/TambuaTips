#!/usr/bin/env python3
import hashlib, hmac, json, subprocess, os, re, shutil, time, threading, requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

WEBHOOK_SECRET = 'tambuatips-deploy-secret-2026'
SYSTEM_ALERT_SECRET = 'tambuatips-internal-guard-2026'
DEPLOY_SCRIPT = '/var/www/v2.tambuatips.com/deploy.sh'
ROLLBACK_SCRIPT = '/var/www/v2.tambuatips.com/deploy-dashboard/rollback.sh'
DEPLOY_DB = '/var/www/v2.tambuatips.com/deploy-dashboard/deployments.json'
LOG_DIR = '/var/www/v2.tambuatips.com/deploy-dashboard/logs'
PROJECT_DIR = '/var/www/v2.tambuatips.com'
BE_ENV = '/var/www/v2.tambuatips.com/backend/.env'
INTERNAL_ALERT_URL = 'http://127.0.0.1:8002/api/internal/system-alert'

# AI Setup
GEMINI_API_KEYS_STR = os.environ.get('GEMINI_API_KEYS', '')
GEMINI_API_KEYS = [k.strip() for k in GEMINI_API_KEYS_STR.split(',')] if GEMINI_API_KEYS_STR else []

# Anti-Spam state
last_alerts = {}

def send_alert(title, message, level="ERROR"):
    global last_alerts
    now = time.time()
    # Throttling: 1 hour for same title
    if title in last_alerts and now - last_alerts[title] < 3600:
        return
    
    last_alerts[title] = now
    try:
        requests.post(INTERNAL_ALERT_URL, json={
            "title": title,
            "message": message,
            "level": level,
            "secret": SYSTEM_ALERT_SECRET
        }, headers={"X-Internal-Secret": SYSTEM_ALERT_SECRET}, timeout=5)
    except Exception as e:
        print(f"Failed to dispatch alert to backend: {e}")

def monitor_disk():
    while True:
        try:
            # 1. Total Disk Check
            usage = shutil.disk_usage("/")
            # 5GB in bytes = 5,368,709,122
            GB5 = 5 * 1024 * 1024 * 1024
            
            # Check deployment logs folder specifically
            log_size = sum(os.path.getsize(os.path.join(LOG_DIR, f)) for f in os.listdir(LOG_DIR) if os.path.isfile(os.path.join(LOG_DIR, f)))
            
            if log_size > GB5:
                send_alert("Disk Usage Critical (Logs)", f"Deployment logs folder reached {log_size/1e9:.2f} GB. Performing emergency cleanup.", "CRITICAL")
                # Emergency cleanup: delete logs older than 7 days
                subprocess.run(f"find {LOG_DIR} -name '*.log' -mtime +7 -delete", shell=True)
            
            # 2. General Disk check
            if usage.free < GB5:
                send_alert("Low Disk Space", f"Server free space is below 5GB: {usage.free/1e9:.2f} GB left.", "CRITICAL")
        except Exception as e:
            print(f"Disk monitor error: {e}")
        time.sleep(1800) # Every 30 mins

def monitor_logs():
    # Watch for Tracebacks or Fatal Errors in real-time
    cmd = ["journalctl", "-u", "tambuatips-api", "-f", "-n", "0"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    
    while True:
        line = proc.stdout.readline()
        if not line: break
        
        lower_line = line.lower()
        if "traceback" in lower_line or "stack trace" in lower_line or "error:" in lower_line or "import" in lower_line:
            # 1. Dispatch instantaneous Raw Alert
            send_alert("API Runtime Error", f"Detecting crash footprint:\n{line.strip()}", "ERROR")
            
            # 2. Wait 2 seconds to allow the rest of the traceback to be written to journalctl natively
            time.sleep(2)
            
            # 3. Pull the last 50 lines contextually
            try:
                context_out = subprocess.run(["journalctl", "-u", "tambuatips-api", "-n", "50", "--no-pager"], capture_output=True, text=True).stdout
                
                # 4. Request Gemini Analysis
                if HAS_GEMINI and GEMINI_API_KEYS:
                    ai_text = ""
                    for api_key in GEMINI_API_KEYS:
                        try:
                            genai.configure(api_key=api_key)
                            model = genai.GenerativeModel("gemini-2.5-flash")
                            prompt = f"Analyze this server traceback. Reply with ONLY plain text, no markdown, no bold, no backticks, no bullet points. Explain what caused the crash and how to fix it in exactly 2 short sentences under 200 characters total. This will be sent as an SMS.\n\n{context_out}"
                            response = model.generate_content(prompt)
                            ai_text = response.text.strip()
                            if ai_text:
                                break # Successful inference!
                        except Exception as ai_e:
                            print(f"Gemini API key {api_key[:10]}... failed: {ai_e}")
                            continue
                            
                    if ai_text:
                        send_alert("AI Crash Analysis", f"{ai_text}", "WARNING")
            except Exception as e:
                print(f"Failed AI log analysis framework: {e}")

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        cl = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(cl) if cl else b''
        if self.path == '/deploy':
            sig = self.headers.get('X-Hub-Signature-256', '')
            exp = 'sha256=' + hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(sig, exp):
                self._respond(403, 'Invalid signature')
                return
            try:
                p = json.loads(body)
                if p.get('ref','') != 'refs/heads/main':
                    self._respond(200, 'Ignored: not main')
                    return
            except: pass
            subprocess.Popen([DEPLOY_SCRIPT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self._respond(200, 'Deploy triggered')
        elif self.path == '/api/rollback':
            try:
                data = json.loads(body)
                sha = data.get('commit_sha','')
                if not re.match(r'^[a-f0-9]{6,40}$', sha):
                    self._respond(400, 'Invalid commit SHA')
                    return
                subprocess.Popen([ROLLBACK_SCRIPT, sha], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                self._respond(200, json.dumps({'status':'rollback_started','commit':sha}))
            except Exception as e:
                self._respond(500, str(e))
        elif self.path == '/api/redeploy':
            subprocess.Popen([DEPLOY_SCRIPT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self._respond(200, '{"status":"redeploy_started"}')
        elif self.path == '/api/env/backend':
            try:
                data = json.loads(body)
                lines = []
                for k,v in data.items():
                    lines.append(f'{k}={v}')
                with open(BE_ENV, 'w') as f:
                    f.write('\n'.join(lines) + '\n')
                subprocess.run(['systemctl', 'restart', 'tambuatips-api'])
                self._respond(200, '{"status":"saved","restarted":true}')
            except Exception as e:
                self._respond(500, str(e))
        else:
            self._respond(404, 'Not found')

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query = parse_qs(parsed_path.query)

        if path == '/api/deployments':
            self._serve_file(DEPLOY_DB, 'application/json', b'[]')
        elif path.startswith('/api/logs/'):
            did = path.split('/')[-1]
            lp = os.path.join(LOG_DIR, did + '.log')
            self._serve_file(lp, 'text/plain') if os.path.exists(lp) else self._respond(404, 'No log')
        elif path == '/api/env/backend':
            self._serve_env(BE_ENV)
        elif path == '/api/status':
            self._serve_status()
        elif path == '/api/live-logs':
            since = query.get('since', ['1h'])[0]
            self._serve_live_logs(since)
        else:
            self._respond(404, 'Not found')

    def _serve_live_logs(self, since):
        # Map shorthand to journalctl format
        mapping = {
            'live': '2 minutes ago',
            '5m': '5 minutes ago',
            '1h': '1 hour ago',
            '12h': '12 hours ago',
            '24h': '24 hours ago',
            '7d': '7 days ago'
        }
        since_full = mapping.get(since, '1 hour ago')
        
        try:
            # For live tail, we only want the absolute latest to keep it snappy
            lines = "50" if since == "live" else "1000"
            cmd = ["journalctl", "-u", "tambuatips-api", "--since", since_full, "--no-pager", "-n", lines]
            out = subprocess.run(cmd, capture_output=True, text=True).stdout
            self._respond(200, out)
        except Exception as e:
            self._respond(500, str(e))

    def _respond(self, code, msg):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json' if msg.startswith('{') else 'text/plain')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(msg.encode() if isinstance(msg, str) else msg)

    def _serve_file(self, path, ctype, fallback=None):
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        if os.path.exists(path):
            with open(path, 'rb') as f:
                self.wfile.write(f.read())
        elif fallback:
            self.wfile.write(fallback)

    def _serve_env(self, path):
        env = {}
        if os.path.exists(path):
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        env[k.strip()] = v.strip()
        self._respond(200, json.dumps(env))

    def _serve_status(self):
        api = subprocess.run(['systemctl', 'is-active', 'tambuatips-api'], capture_output=True, text=True).stdout.strip()
        wh = subprocess.run(['systemctl', 'is-active', 'tambuatips-webhook'], capture_output=True, text=True).stdout.strip()
        disk = subprocess.run(['df', '-h', '/'], capture_output=True, text=True).stdout
        uptime = subprocess.run(['uptime', '-p'], capture_output=True, text=True).stdout.strip()
        cur = subprocess.run(['git', '-C', PROJECT_DIR, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
        branch = subprocess.run(['git', '-C', PROJECT_DIR, 'rev-parse', '--abbrev-ref', 'HEAD'], capture_output=True, text=True).stdout.strip()
        msg = subprocess.run(['git', '-C', PROJECT_DIR, 'log', '-1', '--pretty=%s'], capture_output=True, text=True).stdout.strip()
        self._respond(200, json.dumps({
            'api_service': api, 'webhook_service': wh,
            'disk': disk, 'uptime': uptime,
            'current_commit': cur, 'branch': branch, 'commit_msg': msg
        }))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, fmt, *args):
        pass

if __name__ == "__main__":
    # Start monitor threads
    threading.Thread(target=monitor_disk, daemon=True).start()
    threading.Thread(target=monitor_logs, daemon=True).start()
    
    server = HTTPServer(('127.0.0.1', 9000), WebhookHandler)
    print('Webhook + Smart Monitor on port 9000')
    server.serve_forever()
