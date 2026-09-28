#!/usr/bin/env python3
"""
FORGE ATHLETICS | LOCAL BACKEND SERVER & DATABASE ENGINE
Handles static file serving, SQLite persistence for athlete inquiries, and REST API for the Admin Dashboard.
Zero external dependencies (uses standard library: http.server, sqlite3, json, os).
"""

import http.server
import socketserver
import sqlite3
import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime
import random

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'forge.db')
ENV_PATH = os.path.join(BASE_DIR, '.env')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def get_env_config():
    """Reads .env dynamically so user updates take effect immediately without restart."""
    config = {
        'OPENAI_API_KEY': os.environ.get('OPENAI_API_KEY', '').strip(),
        'OPENAI_MODEL': os.environ.get('OPENAI_MODEL', 'gpt-4o-mini').strip() or 'gpt-4o-mini'
    }
    if os.path.exists(ENV_PATH):
        try:
            with open(ENV_PATH, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        k, v = line.split('=', 1)
                        k = k.strip()
                        v = v.strip().strip('"\'')
                        if k:
                            config[k] = v
        except Exception as e:
            print(f"[ENV] Error reading .env: {e}")
    return config

def save_env_config(api_key=None, model=None):
    """Saves the manually added API key and model to .env file and updates environment."""
    current_config = get_env_config()
    if api_key is not None:
        current_config['OPENAI_API_KEY'] = api_key.strip()
    if model:
        current_config['OPENAI_MODEL'] = model.strip()

    # Write cleanly to .env
    lines = [
        "# ==============================================================================",
        "# FORGE ATHLETICS | OPENAI CHATBOT CONFIGURATION",
        "# ==============================================================================",
        f"OPENAI_API_KEY={current_config.get('OPENAI_API_KEY', '')}",
        f"OPENAI_MODEL={current_config.get('OPENAI_MODEL', 'gpt-4o-mini')}",
        "PORT=8080"
    ]
    try:
        with open(ENV_PATH, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines) + '\n')
        # Update process env
        if api_key is not None:
            os.environ['OPENAI_API_KEY'] = current_config['OPENAI_API_KEY']
        if model:
            os.environ['OPENAI_MODEL'] = current_config['OPENAI_MODEL']
        return True, "Configuration successfully saved."
    except Exception as e:
        return False, str(e)

FORGE_SYSTEM_PROMPT = """You are "FORGE AI Concierge", the official high-performance AI assistant for FORGE Athletics, an elite gym specializing in Calisthenics Mastery, Olympic Weightlifting, and Biomechanical Recovery.

STRICT DOMAIN BOUNDARY (MANDATORY RULE):
- You ONLY answer questions directly related to FORGE Athletics, our gym facilities, training zones, calisthenics & Olympic lifting programs, recovery spa, pricing & memberships, class schedules, master coaches, and physical fitness services.
- You MUST DECLINE all outer, unrelated, or non-gym questions (such as software coding, computer science, general history, homework, politics, non-fitness cooking, movies, gaming, random facts, math puzzles, general internet trivia, etc.).
- When an outer/unrelated question is asked, respond with a polite apology and clearly explain your scope:
  "I apologize, but as the FORGE AI Concierge, I am strictly dedicated to assisting with inquiries about FORGE Athletics—including our calisthenics academy, Olympic lifting platforms, recovery suites, membership options, and class schedules.
  
  Please let me know how I can assist you with your athletic journey or facility visits at FORGE!"
- NEVER answer outer questions, write code, or fulfill non-gym prompts, even if the user insists. Always pivot back warmly to FORGE Athletics.

Gym Knowledge:
- Name: FORGE (Motto: "Forged in Discipline, Built for Mastery")
- Address: 450 Ironworks Boulevard, District 7 (Close to central transit, dedicated athlete parking).
- Opening Hours:
  * Monday - Friday: 05:00 - 23:00
  * Saturday - Sunday: 06:00 - 21:00
- 4 Core Training Zones:
  1. Zone 01 - Olympic Weightlifting Platforms: Eleiko competition bars, IWF-calibrated steel & bumper plates, chalk stands, laser bar-path replay.
  2. Zone 02 - Rig Jungle: Modular structural steel calisthenics rigs, competition wooden rings, parallel bars, stall bars, dip belts up to 100kg.
  3. Zone 03 - Biomechanics Studio: Dual force plates, optical velocity sensors, 3D movement analysis.
  4. Zone 04 - Cryo & Hyper-Recovery: -110°C electric whole-body cryotherapy chamber, NormaTec dynamic air compression boots, infrared saunas, contrast plunge pools.
- Master Coaches:
  * Viktor Kroll: Head of Calisthenics & Bodyweight Acrobatics. Former national gymnast specializing in strict muscle-up progressions, Iron Cross conditioning, planche, and front lever.
  * Marcus Vance: Head of Olympic Weightlifting & Strength. Specializing in bar path kinematics, snatch, and clean-and-jerk.
  * Elena Rostova: Head of Biomechanics & High-Performance Conditioning. Movement screening & injury prevention.
- Calisthenics Courses:
  * Calisthenics Foundations: Strict pull-ups, ring dips, core compression, hollow body holds.
  * Ring Mastery: Dedicated Olympic rings apparatus training (false grip mechanics, strict ring muscle-ups, Maltese prep, Iron Cross).
  * Planche & Lever Lab: Elite straight-arm isometric conditioning (tuck, advanced tuck, straddle, full planche, and front lever).
- Membership Pricing:
  * Core Black: $89/month (Full gym floor access, biometric scan, locker room & sauna access).
  * Calisthenics Master: $139/month (Full gym floor + unlimited Rig Jungle access, coach Viktor Kroll's weekly clinics, ring workshops, open gym).
  * Pro Performance: $179/month (All-access pass, daily coached platform sessions, unlimited whole-body cryotherapy, monthly InBody scan & personalized nutrition review).
- Free Offer:
  * 7-Day Free VIP Access Pass: Prospective athletes can claim an instant pass on the website form to test the facility and take their first coached session free.

Persona:
- Athletic, motivating, disciplined, sharp, professional, concise, and helpful.
- Keep answers structured with short bullet points when listing pricing or features.
- If an athlete is interested in joining or trying the gym, invite them to claim their 7-Day Free VIP Pass right on the website!
"""

def generate_offline_fallback(query):
    """Provides instant helpful gym info if OPENAI_API_KEY is not yet populated in .env."""
    q = query.lower()
    if any(w in q for w in ['price', 'cost', 'membership', 'tier', 'plan', 'fee']):
        return (
            "**FORGE Membership Tiers:**\n\n"
            "• **Core Black ($89/mo)**: Full gym floor access, biometric scan, locker rooms & sauna.\n"
            "• **Calisthenics Master ($139/mo)**: Unlimited Zone 02 Rig Jungle access, Coach Viktor Kroll's weekly clinics, and open gym.\n"
            "• **Pro Performance ($179/mo)**: Complete all-access pass, daily coaching, unlimited -110°C cryotherapy, and InBody reviews.\n\n"
            "👉 You can also claim a **7-Day Free VIP Access Pass** using the form on this page!"
        )
    elif any(w in q for w in ['calisthenic', 'ring', 'planche', 'lever', 'muscle-up', 'kroll', 'viktor']):
        return (
            "**FORGE Calisthenics & Bodyweight Acrobatics:**\n\n"
            "Led by Master Coach **Viktor Kroll**, our calisthenics academy operates in the **Zone 02 Rig Jungle** equipped with competition wooden rings, parallel bars, and stall bars.\n\n"
            "• **Calisthenics Foundations**: Hollow body mechanics, strict pull-ups, and ring dip stability.\n"
            "• **Ring Mastery**: False grip technique, strict ring muscle-ups, and Iron Cross preparation.\n"
            "• **Planche & Lever Lab**: Advanced straight-arm isometric conditioning.\n\n"
            "Interested? Book a session or claim your free 7-day pass on the homepage!"
        )
    elif any(w in q for w in ['hour', 'time', 'open', 'schedule', 'location', 'where', 'address']):
        return (
            "**FORGE Location & Operating Hours:**\n\n"
            "📍 **Address**: 450 Ironworks Boulevard, District 7 (Complimentary athlete parking on-site)\n\n"
            "⏰ **Hours of Operation**:\n"
            "• **Monday – Friday**: 05:00 – 23:00\n"
            "• **Saturday – Sunday**: 06:00 – 21:00\n\n"
            "Check our interactive timetable in the **Schedule** section to view daily class times!"
        )
    elif any(w in q for w in ['pass', 'free', 'trial', 'voucher', '7 day', '7-day']):
        return (
            "**Claim Your 7-Day VIP Access Pass:**\n\n"
            "We offer a complimentary **7-Day VIP Access Pass** for new athletes! It includes:\n"
            "• 7 days of full facility access\n"
            "• 1 complimentary coached technique clinic with Viktor Kroll or Marcus Vance\n"
            "• 1 biometric baseline scan\n\n"
            "Just scroll down to the **Claim Your Access Pass** section, fill in your details, and your official VIP ticket voucher will be generated instantly."
        )
    elif any(w in q for w in ['coach', 'trainer', 'staff', 'marcus', 'elena']):
        return (
            "**FORGE Master Coaching Staff:**\n\n"
            "• **Viktor Kroll**: Head of Calisthenics & Bodyweight Acrobatics (Former national gymnast, ring specialist).\n"
            "• **Marcus Vance**: Head of Olympic Weightlifting & Strength (IWF-certified, snatch & clean-and-jerk kinematics).\n"
            "• **Elena Rostova**: Head of Biomechanics & Conditioning (Movement screening, force plate diagnostics, metabolic conditioning).\n\n"
            "All coaches are available for 1-on-1 private programming and platform clinics."
        )
    elif any(w in q for w in ['recovery', 'cryo', 'sauna', 'injury']):
        return (
            "**FORGE Zone 04 - Cryo & Hyper-Recovery Suite:**\n\n"
            "• **-110°C Electric Cryo Chamber**: Whole-body systemic inflammation reduction and nervous system reset.\n"
            "• **NormaTec 3 Compression Suites**: Dynamic air compression for accelerated lymphatic drainage.\n"
            "• **Infrared Sauna & Contrast Plunge**: Rapid muscle tissue recovery and circulation boost."
        )
    elif any(w in q for w in ['hi', 'hello', 'hey', 'greetings', 'help']):
        return (
            "Welcome to **FORGE**! I am your AI Concierge. I can assist you exclusively with:\n\n"
            "• 🦾 **Calisthenics Courses & Rig Jungle** (Coached by Viktor Kroll)\n"
            "• 🏋️ **Olympic Weightlifting & Biomechanics**\n"
            "• 💰 **Membership Tiers & Pricing** ($89 – $179/mo)\n"
            "• 🎟️ **Claiming your 7-Day Free VIP Pass**\n"
            "• ⏰ **Facility Hours & Location** (District 7)\n\n"
            "What would you like to explore regarding FORGE Athletics today?"
        )
    else:
        return (
            "I apologize, but as the FORGE AI Concierge, I can only assist with questions directly related to **FORGE Athletics**, our training programs, calisthenics and Olympic lifting facilities, membership options, and coaching schedules.\n\n"
            "Please let me know if you have any questions regarding our gym floor, classes with Coach Viktor Kroll or Marcus Vance, or claiming your complimentary 7-Day VIP Pass!"
        )


def init_db():
    """Initializes the SQLite database with required tables and indexes."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            interest TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()

    # Check if empty; if so, populate initial seed data for demo
    cursor.execute('SELECT COUNT(*) FROM inquiries')
    count = cursor.fetchone()[0]
    if count == 0:
        sample_inquiries = [
            (
                'FORGE-VIP-91823',
                'Alexander Hayes',
                'alexander.hayes@example.com',
                '+1 (555) 234-5678',
                'olympic-lifting',
                'Looking to transition from CrossFit to specialized Olympic weightlifting. Interested in Marcus Vance\'s platform coaching and bar velocity diagnostics.',
                'Pending',
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ),
            (
                'FORGE-VIP-74910',
                'Marcus Thorne',
                'm.thorne@kineticflow.io',
                '+1 (555) 891-2345',
                'calisthenics',
                'Working on front lever and full planche progressions. Want to tour Zone 06 Rig Jungle and test out Viktor Kroll\'s streetlifting program.',
                'Contacted',
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ),
            (
                'FORGE-VIP-38291',
                'Sarah Jenkins',
                'sarah.j@fitpeak.com',
                '+1 (555) 456-7890',
                'cryo-recovery',
                'Marathon competitor suffering from persistent patellar tendinitis. Need weekly access to the -110°C electric cryo chamber and NormaTec compression suites.',
                'Enrolled',
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ),
            (
                'FORGE-VIP-62045',
                'David Kowalski',
                'david.kowalski@horizon.org',
                '+1 (555) 678-1234',
                'pro-performance',
                'Interested in joining the Pro Performance tier with unlimited group coaching classes and monthly InBody body composition reviews.',
                'Pending',
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            )
        ]
        cursor.executemany('''
            INSERT INTO inquiries (voucher_code, name, email, phone, interest, message, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', sample_inquiries)
        conn.commit()
    conn.close()

class ForgeRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP handler supporting static files + REST API endpoints."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS for local development flexibility
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # API: Get all inquiries
        if path == '/api/inquiries':
            try:
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()

                sql = 'SELECT * FROM inquiries WHERE 1=1'
                params = []

                if 'status' in query and query['status'][0] and query['status'][0] != 'all':
                    sql += ' AND status = ?'
                    params.append(query['status'][0])

                if 'interest' in query and query['interest'][0] and query['interest'][0] != 'all':
                    sql += ' AND interest = ?'
                    params.append(query['interest'][0])

                if 'search' in query and query['search'][0]:
                    term = f"%{query['search'][0]}%"
                    sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR voucher_code LIKE ?)'
                    params.extend([term, term, term, term])

                sql += ' ORDER BY id DESC'
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                inquiries = [dict(row) for row in rows]
                conn.close()

                self.send_json(200, {'success': True, 'count': len(inquiries), 'inquiries': inquiries})
            except Exception as e:
                self.send_json(500, {'success': False, 'error': str(e)})
            return

        # API: Get statistics overview
        elif path == '/api/stats':
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute('SELECT COUNT(*) FROM inquiries')
                total = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM inquiries WHERE status = 'Pending'")
                pending = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM inquiries WHERE status = 'Contacted'")
                contacted = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM inquiries WHERE status = 'Enrolled'")
                enrolled = cursor.fetchone()[0]

                cursor.execute("SELECT interest, COUNT(*) FROM inquiries GROUP BY interest")
                by_interest = dict(cursor.fetchall())
                conn.close()

                self.send_json(200, {
                    'success': True,
                    'total': total,
                    'pending': pending,
                    'contacted': contacted,
                    'enrolled': enrolled,
                    'by_interest': by_interest
                })
            except Exception as e:
                self.send_json(500, {'success': False, 'error': str(e)})
            return

        # API: CSV Export
        elif path == '/api/export':
            try:
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM inquiries ORDER BY id DESC')
                rows = cursor.fetchall()
                conn.close()

                # Generate CSV string
                headers = ['ID', 'Voucher Code', 'Name', 'Email', 'Phone', 'Interest', 'Message', 'Status', 'Date']
                csv_lines = [','.join(headers)]
                for r in rows:
                    row_vals = [
                        str(r['id']),
                        f'"{r["voucher_code"]}"',
                        f'"{r["name"]}"',
                        f'"{r["email"]}"',
                        f'"{r["phone"] or ""}"',
                        f'"{r["interest"]}"',
                        f'"{r["message"].replace(chr(10), " ")}"',
                        f'"{r["status"]}"',
                        f'"{r["created_at"]}"'
                    ]
                    csv_lines.append(','.join(row_vals))

                csv_data = '\n'.join(csv_lines).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'text/csv')
                self.send_header('Content-Disposition', 'attachment; filename="forge_inquiries.csv"')
                self.end_headers()
                self.wfile.write(csv_data)
            except Exception as e:
                self.send_json(500, {'success': False, 'error': str(e)})
            return

        # API: Chatbot Configuration Status
        elif path == '/api/chat/status':
            cfg = get_env_config()
            key = cfg.get('OPENAI_API_KEY', '').strip()
            has_key = bool(key and not key.startswith('your_') and len(key) > 8)
            masked_key = ""
            if has_key:
                if len(key) > 12:
                    masked_key = f"{key[:6]}...{key[-4:]}"
                else:
                    masked_key = "sk-..."
            self.send_json(200, {
                'success': True,
                'configured': has_key,
                'model': cfg.get('OPENAI_MODEL', 'gpt-4o-mini'),
                'masked_key': masked_key
            })
            return

        # Otherwise serve static files
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # API: Manually Set/Update OpenAI API Key
        if path == '/api/chat/set-key':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len)
                payload = json.loads(post_body.decode('utf-8'))

                api_key = payload.get('api_key', '').strip()
                model = payload.get('model', 'gpt-4o-mini').strip() or 'gpt-4o-mini'

                if not api_key:
                    self.send_json(400, {'success': False, 'error': 'API key cannot be empty.'})
                    return

                if not (api_key.startswith('sk-') or api_key.startswith('gsk_') or len(api_key) > 15):
                    self.send_json(400, {'success': False, 'error': 'Invalid key format. Please provide a valid OpenAI (sk-...) or Groq (gsk_...) API key.'})
                    return

                is_groq = api_key.startswith('gsk_')
                if is_groq and (model.startswith('gpt') or not model):
                    model = 'llama-3.3-70b-versatile'

                ok, msg = save_env_config(api_key=api_key, model=model)
                if ok:
                    masked_key = f"{api_key[:6]}...{api_key[-4:]}" if len(api_key) > 10 else "Key Active"
                    provider_label = "Groq" if is_groq else "OpenAI"
                    self.send_json(200, {
                        'success': True,
                        'message': f'{provider_label} API key saved & activated successfully!',
                        'configured': True,
                        'masked_key': masked_key,
                        'model': model
                    })
                else:
                    self.send_json(500, {'success': False, 'error': msg})
            except Exception as e:
                self.send_json(500, {'success': False, 'error': str(e)})
            return

        # API: Clear OpenAI API Key
        elif path == '/api/chat/clear-key':
            try:
                ok, msg = save_env_config(api_key='', model='gpt-4o-mini')
                if ok:
                    self.send_json(200, {
                        'success': True,
                        'message': 'API Key successfully removed.',
                        'configured': False
                    })
                else:
                    self.send_json(500, {'success': False, 'error': msg})
            except Exception as e:
                self.send_json(500, {'success': False, 'error': str(e)})
            return

        # API: AI Chatbot Endpoint (OpenAI ChatGPT integration)
        elif path == '/api/chat':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len)
                payload = json.loads(post_body.decode('utf-8'))

                user_message = payload.get('message', '').strip()
                history = payload.get('history', [])

                if not user_message:
                    self.send_json(400, {'success': False, 'error': 'Message is required.'})
                    return

                cfg = get_env_config()
                api_key = cfg.get('OPENAI_API_KEY', '').strip()
                model = cfg.get('OPENAI_MODEL', 'gpt-4o-mini').strip() or 'gpt-4o-mini'

                # If no OpenAI API Key configured, return the fallback intelligence + guidance
                if not api_key or api_key.startswith('your_') or len(api_key) < 10:
                    offline_reply = generate_offline_fallback(user_message)
                    guidance = (
                        f"{offline_reply}\n\n"
                        "──────────────────────\n"
                        "🔑 *OpenAI Setup Note*: To activate live GPT-4 responses, paste your API key in the `.env` file (`OPENAI_API_KEY=sk-...`). It will connect instantly without needing to restart the server!"
                    )
                    self.send_json(200, {
                        'success': True,
                        'configured': False,
                        'model': 'FORGE Local Engine',
                        'reply': guidance,
                        'setup_needed': True
                    })
                    return

                # Detect provider from API key format (Groq: gsk_..., OpenAI: sk-...)
                is_groq = api_key.startswith('gsk_')
                endpoint = "https://api.groq.com/openai/v1/chat/completions" if is_groq else "https://api.openai.com/v1/chat/completions"
                provider_name = "Groq (GPT OSS 120B)" if is_groq else "OpenAI (GPT-4o Mini)"

                if is_groq and (not model or model.startswith('gpt-4') or 'llama' in model):
                    model = "openai/gpt-oss-120b"
                elif not is_groq and (not model or 'oss' in model or 'llama' in model):
                    model = "gpt-4o-mini"

                # Build messages list
                messages = [
                    {"role": "system", "content": FORGE_SYSTEM_PROMPT}
                ]
                # Include sanitized recent conversation history (up to last 6 messages)
                if isinstance(history, list):
                    for msg in history[-6:]:
                        if isinstance(msg, dict) and msg.get('role') in ('user', 'assistant') and msg.get('content'):
                            messages.append({
                                "role": msg['role'],
                                "content": str(msg['content'])[:1500]
                            })
                messages.append({"role": "user", "content": user_message[:2000]})

                req_body = json.dumps({
                    "model": model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 800
                }).encode('utf-8')

                req = urllib.request.Request(
                    endpoint,
                    data=req_body,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "User-Agent": "ForgeAthletics/1.0"
                    }
                )

                try:
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        res_data = json.loads(resp.read().decode('utf-8'))
                        choice_msg = res_data['choices'][0]['message']
                        reply_content = choice_msg.get('content') or choice_msg.get('reasoning') or 'Hello! How can I help you today at FORGE?'
                        self.send_json(200, {
                            'success': True,
                            'configured': True,
                            'model': model,
                            'provider': provider_name,
                            'reply': reply_content
                        })
                except urllib.error.HTTPError as he:
                    error_body = ""
                    try:
                        error_body = he.read().decode('utf-8')
                        err_json = json.loads(error_body)
                        err_msg = err_json.get('error', {}).get('message', str(he))
                    except Exception:
                        err_msg = str(he)

                    provider_label = "Groq" if is_groq else "OpenAI"
                    self.send_json(200, {
                        'success': False,
                        'configured': True,
                        'model': model,
                        'reply': f"⚠️ **{provider_label} API Error ({he.code})**: {err_msg}\n\nPlease check or update your API key in settings.",
                        'error': err_msg
                    })
                except Exception as net_err:
                    self.send_json(200, {
                        'success': False,
                        'configured': True,
                        'model': model,
                        'reply': f"⚠️ **Connection Error**: Could not reach OpenAI API ({str(net_err)}). Please verify internet connection.",
                        'error': str(net_err)
                    })

            except Exception as e:
                self.send_json(500, {'success': False, 'error': str(e)})
            return

        # API: Submit new inquiry
        elif path == '/api/inquiries':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len)
                payload = json.loads(post_body.decode('utf-8'))

                name = payload.get('name', '').strip()
                email = payload.get('email', '').strip()
                phone = payload.get('phone', '').strip()
                interest = payload.get('interest', 'vip-pass')
                message = payload.get('message', '').strip()

                if not name or not email:
                    self.send_json(400, {'success': False, 'error': 'Name and Email are required.'})
                    return

                # Generate official FORGE voucher code
                voucher_code = f"FORGE-VIP-{random.randint(10000, 99999)}"
                created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO inquiries (voucher_code, name, email, phone, interest, message, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
                ''', (voucher_code, name, email, phone, interest, message, created_at))
                new_id = cursor.lastrowid
                conn.commit()
                conn.close()

                self.send_json(201, {
                    'success': True,
                    'id': new_id,
                    'voucher_code': voucher_code,
                    'created_at': created_at,
                    'status': 'Pending',
                    'message': 'VIP Inquiry successfully stored in database.'
                })
            except Exception as e:
                self.send_json(500, {'success': False, 'error': str(e)})
            return

        # API: Update inquiry status (POST /api/inquiries/<id>/status)
        elif path.startswith('/api/inquiries/') and path.endswith('/status'):
            try:
                parts = path.strip('/').split('/')
                inquiry_id = int(parts[2])

                content_len = int(self.headers.get('Content-Length', 0))
                post_body = self.rfile.read(content_len)
                payload = json.loads(post_body.decode('utf-8'))
                new_status = payload.get('status', 'Pending')

                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute('UPDATE inquiries SET status = ? WHERE id = ?', (new_status, inquiry_id))
                conn.commit()
                conn.close()

                self.send_json(200, {'success': True, 'id': inquiry_id, 'status': new_status})
            except Exception as e:
                self.send_json(500, {'success': False, 'error': str(e)})
            return

        # API: Delete inquiry (POST /api/inquiries/<id>/delete)
        elif path.startswith('/api/inquiries/') and path.endswith('/delete'):
            try:
                parts = path.strip('/').split('/')
                inquiry_id = int(parts[2])

                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute('DELETE FROM inquiries WHERE id = ?', (inquiry_id,))
                conn.commit()
                conn.close()

                self.send_json(200, {'success': True, 'id': inquiry_id})
            except Exception as e:
                self.send_json(500, {'success': False, 'error': str(e)})
            return

        # Unknown endpoint
        self.send_json(404, {'success': False, 'error': 'Endpoint not found'})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # API: Delete inquiry via REST DELETE (DELETE /api/inquiries/<id>)
        if path.startswith('/api/inquiries/'):
            try:
                parts = path.strip('/').split('/')
                inquiry_id = int(parts[2])

                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute('DELETE FROM inquiries WHERE id = ?', (inquiry_id,))
                conn.commit()
                conn.close()

                self.send_json(200, {'success': True, 'id': inquiry_id, 'message': f'Record #{inquiry_id} deleted successfully.'})
            except Exception as e:
                self.send_json(500, {'success': False, 'error': str(e)})
            return

        self.send_json(404, {'success': False, 'error': 'Endpoint not found'})

def run_server():
    init_db()
    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT), ForgeRequestHandler) as httpd:
        print(f"🔥 FORGE Backend Server running at http://localhost:{PORT}")
        print(f"📊 SQLite Database initialized at: {DB_PATH}")
        print(f"👑 Admin Dashboard available at: http://localhost:{PORT}/admin.html")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.server_close()

if __name__ == '__main__':
    run_server()
