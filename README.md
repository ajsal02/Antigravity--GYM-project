# FORGE | Elite 3D Athletic Performance & Calisthenics Lab

An ultra-modern, production-ready 3D web experience built from scratch using **Three.js** and vanilla web technologies.

---

## 🌐 Live Public Showcase Links

- 🚀 **Live Global Website**: [**https://ajsal02.github.io/Antigravity--GYM-project/**](https://ajsal02.github.io/Antigravity--GYM-project/)
- 🏋️ **3D Interactive Equipment Lab**: [**https://ajsal02.github.io/Antigravity--GYM-project/#interactive-3d**](https://ajsal02.github.io/Antigravity--GYM-project/#interactive-3d)
- 📦 **GitHub Repository**: [**https://github.com/ajsal02/Antigravity--GYM-project**](https://github.com/ajsal02/Antigravity--GYM-project)

---

## ☁️ 1-Click Cloud Deployment (Render.com)

Deploy the complete full-stack web application (Python server + SQLite CRM + AI Chatbot) 24/7 in the cloud:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ajsal02/Antigravity--GYM-project)

👉 **Instant Deploy URL**: [https://render.com/deploy?repo=https://github.com/ajsal02/Antigravity--GYM-project](https://render.com/deploy?repo=https://github.com/ajsal02/Antigravity--GYM-project)

---

## 🚀 Instant Quickstart (Runs immediately in any browser)

The website is completely self-contained. All 3D libraries (`three.min.js`, `OrbitControls.js`) are bundled locally under `vendor/`—no external build step or npm installation required.

### 🌟 Running with SQLite Backend & Admin Dashboard (Recommended)
Launch the local backend engine with SQLite database and REST API:
```bash
python3 server.py
```
- **Main 3D Website**: [**http://localhost:8080/index.html**](http://localhost:8080/index.html)
- **Athlete CRM / Admin Dashboard**: [**http://localhost:8080/admin.html**](http://localhost:8080/admin.html)
- **Local SQLite Database**: `data/forge.db`

---

## 🏛️ Gym Branding & Philosophy
- **Name**: **FORGE** (FORGE Athletic Labs)
- **Slogan**: *Engineer Your Ultimate Physique*
- **Aesthetic**: Luxury cyberpunk athletic true black mode (`#000000`, `#0a0b0f`, neon volt `#d4ff00`, electric cyan `#00f5ff`, and brushed titanium)
- **Mission**: Disassembling generic commercial fitness by combining Olympic weightlifting, bodyweight gymnastics & calisthenics, spatial biomechanics, and sports longevity.

---

## 📊 Local SQLite Database & Admin CRM Dashboard
- **Database Engine**: Local SQLite (`data/forge.db`), initialized automatically with zero dependencies.
- **REST API Endpoints**:
  - `POST /api/inquiries`: Stores incoming inquiries, generates official voucher codes.
  - `GET /api/inquiries`: Retrieves inquiries with search, status filtering, and category sorting.
  - `POST /api/inquiries/<id>/status`: Real-time status updates (Pending → Contacted → Enrolled → Archived).
  - `POST /api/inquiries/<id>/delete`: Deletes inquiry records with audit safety.
  - `GET /api/stats`: Real-time metrics (Total Leads, Pending, Contacted, Enrolled, by Interest).
  - `GET /api/export`: Instant CSV spreadsheet export of all athlete inquiries.
- **Admin Dashboard Features (`admin.html`)**:
  - Live metric KPI cards.
  - Instant debounced search by name, email, phone, or voucher.
  - Live status dropdown with instant AJAX persistence to SQLite.
  - CSV export button to download all submissions directly.

---

## 🏋️ 3D WebGL Features & Interactive Systems

1. **Procedural 3D Gym Equipment**:
   - **FORGE IWF Competition Barbell**: Knurled chrome bar, dual rotation sleeves, calibrated competition bumper plates (25kg Red, 20kg Blue, 15kg Yellow), and gold locking collars.
   - **Commercial Hex Dumbbell Station**: Heavy-duty dual saddle rack, matching companion dumbbell, and primary interactive dumbbell with dynamic weight selection (35, 50, 75, 100 LBS), raycast click pickup/rack animation, and exploded view.
   - **Olympic Gymnastic Rings Rig**: Birch rings with heavy-duty nylon straps, steel cam buckles, and quick-release lever pins.
   - **FORGE Competition Kettlebell**: Cast-iron hollow core body with curved horn grip.
   - **Biomechanical Anatomy Core**: Pulsing icosahedral wireframe lattice, kinetic energy core, and interactive muscle orbital nodes.
   - **Authentic Gym Arena Environment**: Vulcanized rubber tile flooring with EPDM flecks and chalk markings, overhead steel cross-trusses, and dual stadium spotlights.

2. **3D Interactive Controls**:
   - 🏋️ **Interactive Lift & Inspection**: Click the dumbbell on the 3D canvas or click the lift action button to smoothly inspect it in 3D with acoustic clink sounds.
   - ⚖️ **Dynamic Weight Scaling**: Choose between 35 LBS, 50 LBS, 75 LBS, and 100 LBS to scale the dumbbell heads and embossed badges in real time.
   - 💥 **Exploded View**: Watch competition plates, sleeve collars, and dumbbell components separate along their axial vectors in real time.
   - 🔄 **360° Auto-Spin**: Smooth continuous model rotation.
   - 🎨 **Material Finish Switcher**: Instant switching between *Titanium Chrome*, *Matte Obsidian*, *Electric Volt*, and *Cyber Cyan*.
   - 💡 **Studio Lighting Presets**: Switch between *Neon Cyber*, *Studio Clean*, and *Forge Ember*.
   - 🌐 **Free Orbit Controls**: Interactive mouse dragging to rotate, right-click to pan, and wheel to zoom into any model.

3. **Scroll-Driven Parallax Choreography**:
   - The 3D scene responds dynamically as the user navigates through sections (Hero → 3D Lab → About → Programs → Facilities → Trainers → Calculator → Pricing → Contact), re-orienting camera perspective and depth.

4. **Dynamic Specular Lighting**:
   - Real-time mouse tracking point light that reflects off metal plates, knurling, and equipment surfaces as your cursor glides across the screen.

---

## 📱 Complete Website Sections

1. **Header & Navigation**:
   - Animated SVG brand logo, sticky blur header, active scrollspy tracking, mobile drawer menu.
   - **Web Audio API Sound Synthesizer**: Procedural acoustic clicks and victory chimes (with mute/unmute toggle in header).
   - 3D Free Orbit mode button.
2. **Hero Section**:
   - Fullscreen 3D Olympic barbell presentation, dynamic headline, animated stats counter (28,000 SQ FT, 100% Eleiko, 34+ Coaches, 99.4% Goal Success), and interactive 3D hint.
3. **3D Interactive Lab**:
   - Interactive equipment switcher, explode mechanism, live specs readout table, and material finishes.
4. **About & Philosophy**:
   - Brand origin story, 4 core pillars (Biomechanical Precision, Hypertrophy Protocols, Cryo Recovery, Elite Culture), founder quote from Marcus Vance (CSCS), and visual collage.
5. **Services & Training Disciplines**:
   - 6 signature programs: *Apex Titan (Olympic Lifting)*, *Kinetix Pulse (Hybrid MetCon)*, *Anatomy Forge (Hypertrophy)*, *Tactical Combat*, *Kinetic Reset*, and *CryoSpa Lab*.
   - Interactive category filter pills (*All, Strength & Power, High-Metabolic, Recovery & Longevity*).
   - "Book Free Trial" triggers connected directly to the inquiry form.
6. **Campus Facilities**:
   - Interactive zone tab switcher (*Olympic Power Hall, Metabolic Mezzanine, Combat Octagon, Cryo & Thermal Spa, 40m Sprint Turf Track*).
   - Zone specs, equipment inventories, and photography.
7. **Team & Master Coaches**:
   - Real athletic profiles and credentials:
     - **Marcus Vance** (M.Sc. Biomechanics, Senior CSCS)
     - **Elena Rostova** (Ex-National Athlete, Metabolic Systems)
     - **David Chen** (Doctor of Physical Therapy, Hypertrophy)
     - **Dr. Maya Sterling** (Ph.D. Sports Nutrition, Cryo Science)
8. **Interactive Biometric & Macro Calculator**:
   - Real-time metabolic calculations (BMR & TDEE) based on bodyweight slider, weekly training days, biological sex, and primary goal (Hypertrophy, Strength, Fat Loss).
   - Visual macronutrient breakdown bars (Protein, Carbohydrates, Fats) and customized track recommendation.
9. **Pricing & Membership Tiers**:
   - Monthly vs. Annual toggle with **Save 20%** live price updates.
   - 3 Tiers: *Core Athlete* ($79/mo), *Pro Performance* ($135/mo - Most Popular), and *Apex VIP Elite* ($215/mo).
10. **Inquiry & VIP Pass Contact Form**:
    - Full client-side validation for Name, Email, Phone, Interest, and Message.
    - Animated submit button with loading spinner.
    - **VIP Pass Confirmation Modal**: Generates a digital pass voucher ticket (e.g. `FORGE-VIP-84920`) with audio confirmation.
    - Stylized radar simulation facility map, direct coordinates, and concierge contacts.
11. **Interactive Weekly Class Timetable Modal**:
    - Day-by-day timetable (Monday through Saturday) with coach assignments, arena zones, live capacity indicators, and instant reservation buttons.
12. **🤖 FORGE AI Concierge (OpenAI ChatGPT Chatbot)**:
    - Floating bottom-right chat launcher with glowing volt pulsing aura.
    - Powered by OpenAI `gpt-4o-mini` (or configurable to `gpt-4o` in `.env`).
    - Trained with full context on FORGE coaches, calisthenics programs, facilities, and memberships.
    - Features smart action deep-links (e.g. "Claim Pass" scrolls to form, "Open Timetable" triggers schedule modal).
    - Quick starter suggestion chips, markdown rendering, message timestamps, and sound effects.

---

## 🤖 OpenAI Chatbot Configuration (`.env`)

To connect live GPT-4 intelligence to the website's AI Concierge:

1. Open the [`.env`](file:///Users/apple1/Downloads/cusror%20project/gym1/.env) file located in the project root:
   ```env
   # Paste your OpenAI API Key below (e.g. sk-proj-... or sk-...)
   OPENAI_API_KEY=your_actual_openai_key_here
   
   # Model selection (default: gpt-4o-mini)
   OPENAI_MODEL=gpt-4o-mini
   ```
2. Save the file.
3. The server dynamically reloads the key **instantly** without needing a restart!
4. *(Note: If no key is set yet, the chatbot automatically uses its built-in fallback knowledge engine to assist athletes with memberships, schedules, and calisthenics info).*

---

## 📂 File Architecture

```
gym1/
├── index.html            # Main semantic HTML5 document with 3D canvas & AI Chatbot
├── admin.html            # Athlete CRM & inquiry dashboard with live SQLite sync
├── company.md            # Comprehensive company reference manual & operations guide
├── server.py             # Python HTTP backend, REST API & OpenAI/Groq proxy
├── .env                  # AI API Key & server environment variables
├── .env.example          # Environment variable template
├── README.md             # Project documentation & launch guide
├── data/
│   └── forge.db          # Local SQLite database (auto-initialized)
├── css/
│   └── style.css         # High-contrast black theme, glassmorphism, chatbot styles
├── js/
│   ├── three-scene.js    # Three.js 3D engine, procedural models, lighting & particles
│   ├── app.js            # UI interactions, Web Audio, calculator, modals & forms
│   └── chatbot.js        # FORGE AI Concierge controller & chat widget engine
└── vendor/
    ├── three.min.js      # Three.js r128 (local offline bundle)
    └── OrbitControls.js  # Three.js OrbitControls (local offline bundle)
```

---

*Engineered with precision for FORGE Athletic Labs.*

