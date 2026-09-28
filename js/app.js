/**
 * APEX KINETICS | APPLICATION UI CONTROLLER
 * Handles interactive 3D controls, audio synthesizer, scrollspy, biometric calculator,
 * facility zone switches, program filtering, schedule modal, and inquiry submission.
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER (WEB AUDIO API) ---
  // Generates clean, futuristic UI acoustic feedback without external audio files
  class AudioFeedback {
    constructor() {
      this.enabled = false;
      this.ctx = null;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      if (this.enabled) {
        this.init();
        this.playSuccess();
      }
      return this.enabled;
    }

    playClick() {
      if (!this.enabled || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      } catch (e) {
        console.warn('Audio play error', e);
      }
    }

    playSwitch() {
      if (!this.enabled || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.09);
      } catch (e) {
        console.warn('Audio play error', e);
      }
    }

    playSuccess() {
      if (!this.enabled || !this.ctx) return;
      try {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime + (idx * 0.06));

          gain.gain.setValueAtTime(0.1, this.ctx.currentTime + (idx * 0.06));
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (idx * 0.06) + 0.25);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(this.ctx.currentTime + (idx * 0.06));
          osc.stop(this.ctx.currentTime + (idx * 0.06) + 0.28);
        });
      } catch (e) {
        console.warn('Audio play error', e);
      }
    }
  }

  const sfx = new AudioFeedback();

  // --- DOM READY CONTROLLER ---
  document.addEventListener('DOMContentLoaded', function () {
    setupHeaderAndNav();
    setupSoundToggle();
    setupCameraModeToggle();
    setupInteractive3DPanel();
    setupStatsCounter();
    setupTiltCards();
    setupProgramFiltering();
    setupFacilityTabs();
    setupBiometricCalculator();
    setupPricingToggle();
    setupInquiryForm();
    setupScheduleModal();
    setupGeneralBookButtons();
  });

  // --- 1. HEADER & NAVIGATION ---
  function setupHeaderAndNav() {
    const header = document.getElementById('site-header');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-drawer');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    // Header scroll background blur
    window.addEventListener('scroll', function () {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      // ScrollSpy active link tracking
      let currentSectionId = '';
      const scrollPos = window.scrollY + 200;

      sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          currentSectionId = section.getAttribute('id');
        }
      });

      if (currentSectionId) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + currentSectionId) {
            link.classList.add('active');
          }
        });
      }
    }, { passive: true });

    // Mobile Drawer Toggle
    if (mobileBtn && mobileDrawer) {
      mobileBtn.addEventListener('click', function () {
        sfx.playClick();
        const isOpen = mobileDrawer.classList.toggle('open');
        mobileBtn.classList.toggle('active', isOpen);
      });

      mobileLinks.forEach(link => {
        link.addEventListener('click', function () {
          mobileDrawer.classList.remove('open');
          mobileBtn.classList.remove('active');
        });
      });
    }
  }

  // --- 2. SOUND TOGGLE BUTTON ---
  function setupSoundToggle() {
    const btn = document.getElementById('sound-toggle-btn');
    if (!btn) return;

    const iconOff = btn.querySelector('.sound-off');
    const iconOn = btn.querySelector('.sound-on');
    const tooltip = btn.querySelector('.btn-tooltip');

    btn.addEventListener('click', function () {
      const isEnabled = sfx.toggle();
      if (isEnabled) {
        iconOff.classList.add('hidden');
        iconOn.classList.remove('hidden');
        tooltip.textContent = 'Sound: ON';
        btn.style.borderColor = 'var(--color-volt)';
      } else {
        iconOff.classList.remove('hidden');
        iconOn.classList.add('hidden');
        tooltip.textContent = 'Sound: OFF';
        btn.style.borderColor = 'var(--border-subtle)';
      }
    });
  }

  // --- 3. 3D CAMERA ORBIT MODE TOGGLE ---
  function setupCameraModeToggle() {
    const btn = document.getElementById('camera-mode-btn');
    if (!btn) return;
    const tooltip = btn.querySelector('.btn-tooltip');

    btn.addEventListener('click', function () {
      sfx.playClick();
      if (window.Apex3DEngine) {
        const isActive = window.Apex3DEngine.toggleOrbitControls();
        if (isActive) {
          btn.style.borderColor = 'var(--color-cyan)';
          btn.style.boxShadow = '0 0 15px var(--color-cyan-glow)';
          tooltip.textContent = 'Free Orbit: ON';
        } else {
          btn.style.borderColor = 'var(--border-subtle)';
          btn.style.boxShadow = 'none';
          tooltip.textContent = '3D Orbit';
          window.Apex3DEngine.resetCamera();
        }
      }
    });
  }

  // --- 4. INTERACTIVE 3D LAB CONTROLS ---
  function setupInteractive3DPanel() {
    // Model Selector Buttons
    const modelButtons = document.querySelectorAll('.model-btn');
    modelButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        sfx.playSwitch();
        modelButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const modelName = this.getAttribute('data-model');
        if (window.Apex3DEngine) {
          window.Apex3DEngine.showModel(modelName);
        }
      });
    });

    // Dumbbell Lift Action Button
    const liftDumbbellBtn = document.getElementById('btn-lift-dumbbell');
    if (liftDumbbellBtn) {
      liftDumbbellBtn.addEventListener('click', function () {
        sfx.playClick();
        if (window.Apex3DEngine && window.Apex3DEngine.toggleLiftDumbbell) {
          window.Apex3DEngine.toggleLiftDumbbell();
        }
      });
    }

    // Dumbbell Weight Selector Buttons (35, 50, 75, 100 lbs)
    const weightButtons = document.querySelectorAll('.weight-btn');
    weightButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        sfx.playClick();
        weightButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const weight = this.getAttribute('data-weight');
        if (window.Apex3DEngine && window.Apex3DEngine.setDumbbellWeight) {
          window.Apex3DEngine.setDumbbellWeight(weight);
        }
      });
    });

    // Explode Button
    const explodeBtn = document.getElementById('btn-explode');
    const explodeText = document.getElementById('explode-text');
    if (explodeBtn) {
      explodeBtn.addEventListener('click', function () {
        sfx.playClick();
        if (window.Apex3DEngine) {
          const isExploded = window.Apex3DEngine.toggleExplode();
          this.classList.toggle('active', isExploded);
          explodeText.textContent = isExploded ? 'Assemble Model' : 'Explode View';
        }
      });
    }

    // Auto-Rotate Button
    const autoRotateBtn = document.getElementById('btn-autorotate');
    const rotateText = document.getElementById('rotate-text');
    if (autoRotateBtn) {
      autoRotateBtn.addEventListener('click', function () {
        sfx.playClick();
        if (window.Apex3DEngine) {
          const isRotating = window.Apex3DEngine.toggleAutoRotate();
          this.classList.toggle('active', isRotating);
          rotateText.textContent = isRotating ? 'Auto Spin: ON' : 'Auto Spin: OFF';
        }
      });
    }

    // Reset Camera Button
    const resetCamBtn = document.getElementById('btn-reset-view');
    if (resetCamBtn) {
      resetCamBtn.addEventListener('click', function () {
        sfx.playClick();
        if (window.Apex3DEngine) {
          window.Apex3DEngine.resetCamera();
        }
      });
    }

    // Material Color Swatches
    const swatches = document.querySelectorAll('.swatch-btn');
    swatches.forEach(swatch => {
      swatch.addEventListener('click', function () {
        sfx.playClick();
        swatches.forEach(s => s.classList.remove('active'));
        this.classList.add('active');
        const colorName = this.getAttribute('data-color');
        if (window.Apex3DEngine) {
          window.Apex3DEngine.setMaterialFinish(colorName);
        }
      });
    });

    // Lighting Preset Buttons
    const lightButtons = document.querySelectorAll('.light-btn');
    lightButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        sfx.playClick();
        lightButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const lightName = this.getAttribute('data-lighting');
        if (window.Apex3DEngine) {
          window.Apex3DEngine.setLightingPreset(lightName);
        }
      });
    });
  }

  // --- 5. STATS ANIMATED COUNTER ---
  function setupStatsCounter() {
    const statCards = document.querySelectorAll('.stat-card');
    if (!statCards.length) return;

    let hasCounted = false;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasCounted) {
          hasCounted = true;
          statCards.forEach(card => {
            const numEl = card.querySelector('.stat-number');
            const target = parseInt(numEl.getAttribute('data-target'), 10);
            animateCount(numEl, 0, target, 2000);
          });
        }
      });
    }, { threshold: 0.4 });

    const statsContainer = document.querySelector('.hero-stats');
    if (statsContainer) observer.observe(statsContainer);

    function animateCount(el, start, end, duration) {
      const startTime = performance.now();
      function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (end - start) * ease);
        el.textContent = current.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = end.toLocaleString();
        }
      }
      requestAnimationFrame(update);
    }
  }

  // --- 6. 3D TILT EFFECT ON CARDS ---
  function setupTiltCards() {
    const tiltCards = document.querySelectorAll('.tilt-effect');

    tiltCards.forEach(card => {
      card.addEventListener('mousemove', function (e) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });

      card.addEventListener('mouseleave', function () {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
      });
    });
  }

  // --- 7. PROGRAMS FILTERING ---
  function setupProgramFiltering() {
    const filterButtons = document.querySelectorAll('#program-filters .pill-btn');
    const programCards = document.querySelectorAll('.program-card');

    filterButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        sfx.playClick();
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const filter = this.getAttribute('data-filter');

        programCards.forEach(card => {
          const category = card.getAttribute('data-category');
          if (filter === 'all' || category === filter) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      });
    });
  }

  // --- 8. FACILITIES INTERACTIVE ZONE TABS ---
  function setupFacilityTabs() {
    const tabs = document.querySelectorAll('#facility-tabs .facility-tab');
    const titleEl = document.getElementById('facility-title');
    const descEl = document.getElementById('facility-desc');
    const imgEl = document.getElementById('facility-img');
    const badgeEl = document.getElementById('facility-badge');
    const specsEl = document.getElementById('facility-specs');
    const refocusBtn = document.getElementById('btn-camera-zone-focus');

    const facilityData = {
      'power-hall': {
        title: 'Olympic Power Hall',
        badge: 'ZONE 01 • STRENGTH SANCTUM',
        img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1200&auto=format&fit=crop&q=80',
        desc: '12 fully-equipped competition Olympic weightlifting platforms constructed with solid oak centers and vibration-absorbing rubber tiles. Loaded exclusively with IWF-certified Eleiko competition barbells, calibrated discs, and squat racks.',
        specs: [
          { num: '12', text: 'Olympic Lifting Platforms' },
          { num: '15,000+ KG', text: 'Eleiko Calibrated Discs' },
          { num: 'Dumbbells', text: 'Pairs up to 200 LBS (90 KG)' },
          { num: 'Floor Acoustic', text: 'Regupol Sound Isolation' }
        ]
      },
      'cardio-deck': {
        title: 'Metabolic Mezzanine',
        badge: 'ZONE 02 • HIGH-SPEED METABOLIC',
        img: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1200&auto=format&fit=crop&q=80',
        desc: 'An elevated mezzanine equipped with top-tier conditioning ergometers: Woodway curved manual treadmills, Keiser M3i pneumatic indoor bikes, Concept2 rowers, and SkiErgs synced with live heart-rate displays.',
        specs: [
          { num: '24', text: 'Woodway Curved Treadmills' },
          { num: '16', text: 'Concept2 Rowers & SkiErgs' },
          { num: 'Live VO2', text: 'Telemetry Display Boards' },
          { num: 'Air Purity', text: 'Hospital HEPA Airflow (6x/hr)' }
        ]
      },
      'combat-ring': {
        title: 'Combat & Octagon Pit',
        badge: 'ZONE 03 • TACTICAL STRIKING',
        img: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&auto=format&fit=crop&q=80',
        desc: 'Regulation 24-foot combat cage octagon and elevated boxing ring. Equipped with Aqua-Bags filled with water for realistic cranial impact resistance and slip-lines for master pugilism technique.',
        specs: [
          { num: '24 FT', text: 'Regulation Octagon Cage' },
          { num: '18', text: 'Water-Core Aqua Punch Bags' },
          { num: 'Sensors', text: 'Punch Impact Speed Trackers' },
          { num: 'Mats', text: 'Fuji Seamless Pro Tatami' }
        ]
      },
      'recovery-spa': {
        title: 'Cryo & Thermal Recovery Spa',
        badge: 'ZONE 04 • CELLULAR REGENERATION',
        img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&auto=format&fit=crop&q=80',
        desc: 'Clinical-grade sports recovery sanctum. Features twin -110°C electric whole-body cryotherapy chambers, private Finnish cedar saunas, cold plunge immersion pools at 3°C, and NormaTec compression suites.',
        specs: [
          { num: '-110°C', text: 'Electric Cryo Chamber' },
          { num: '3°C & 40°C', text: 'Thermal Contrast Plunges' },
          { num: '10', text: 'NormaTec Compression Boots' },
          { num: 'Infrared', text: 'Full-Spectrum Light Pods' }
        ]
      },
      'turf-track': {
        title: '40m Sprint Turf Track',
        badge: 'ZONE 05 • VELOCITY & AGILITY',
        img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&auto=format&fit=crop&q=80',
        desc: 'Seamless indoor sprint and sled track lined with dual timing gates for precision 10m/40m sprint analysis, heavy Rogue power sleds, plyometric boxes, and resistance bungees.',
        specs: [
          { num: '40 Meters', text: 'Calibrated Sprint Lane' },
          { num: 'Brower', text: 'Wireless Timing Gates' },
          { num: '6', text: 'Rogue Dog Power Sleds' },
          { num: 'Shock Pad', text: 'Pro-Cushion Underlayment' }
        ]
      },
      'calisthenics-park': {
        title: 'Calisthenics & Street Rig Jungle',
        badge: 'ZONE 06 • GYMNASTIC & BODYWEIGHT',
        img: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1200&auto=format&fit=crop&q=80',
        desc: 'A dedicated 3,500 sq ft specialized calisthenics playground featuring competition-height powder-coated pull-up bars, multi-tier monkey bars, wood Olympic rings hung from reinforced steel I-beams, Swedish stall bars, and custom high & low parallettes over 50mm shock-absorbent fall mats.',
        specs: [
          { num: '8 Sets', text: 'Birch Olympic Gymnastic Rings' },
          { num: '14 Bays', text: 'Adjustable Calisthenics Rigs' },
          { num: 'Swedish', text: 'Solid Beech Stall Walls' },
          { num: 'Safety', text: '50mm High-Impact Landing Mats' }
        ]
      }
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', function () {
        sfx.playClick();
        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        const zoneKey = this.getAttribute('data-zone');
        const data = facilityData[zoneKey];
        if (!data) return;

        titleEl.textContent = data.title;
        badgeEl.textContent = data.badge;
        descEl.textContent = data.desc;
        imgEl.src = data.img;

        // Render Specs
        specsEl.innerHTML = data.specs.map(s => `
          <div class="spec-card">
            <span class="spec-num">${s.num}</span>
            <span class="spec-text">${s.text}</span>
          </div>
        `).join('');

        // 3D camera effect trigger
        if (window.Apex3DEngine) {
          window.Apex3DEngine.resetCamera();
        }
      });
    });

    if (refocusBtn) {
      refocusBtn.addEventListener('click', function () {
        sfx.playClick();
        if (window.Apex3DEngine) {
          window.Apex3DEngine.resetCamera();
        }
      });
    }
  }

  // --- 9. INTERACTIVE BIOMETRIC & CALORIE CALCULATOR ---
  function setupBiometricCalculator() {
    const goalButtons = document.querySelectorAll('#calc-goal-group .seg-btn');
    const weightSlider = document.getElementById('calc-weight-slider');
    const weightVal = document.getElementById('calc-weight-val');
    const daysSlider = document.getElementById('calc-days-slider');
    const daysVal = document.getElementById('calc-days-val');
    const genderSelect = document.getElementById('calc-gender');
    const expSelect = document.getElementById('calc-exp');

    // Outputs
    const calEl = document.getElementById('res-calories');
    const noteEl = document.getElementById('res-note');
    const proteinEl = document.getElementById('res-protein');
    const carbsEl = document.getElementById('res-carbs');
    const fatsEl = document.getElementById('res-fats');
    const barProtein = document.getElementById('bar-protein');
    const barCarbs = document.getElementById('bar-carbs');
    const barFats = document.getElementById('bar-fats');
    const trackEl = document.getElementById('res-track');

    let currentGoal = 'muscle';

    // Goal segment buttons
    goalButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        sfx.playClick();
        goalButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentGoal = this.getAttribute('data-goal');
        recalculate();
      });
    });

    // Slider inputs
    weightSlider.addEventListener('input', function () {
      const kg = parseInt(this.value, 10);
      const lbs = Math.round(kg * 2.20462);
      weightVal.textContent = `${kg} kg (${lbs} lbs)`;
      recalculate();
    });

    daysSlider.addEventListener('input', function () {
      daysVal.textContent = `${this.value} Days / Week`;
      recalculate();
    });

    genderSelect.addEventListener('change', recalculate);
    expSelect.addEventListener('change', recalculate);

    function recalculate() {
      const weight = parseInt(weightSlider.value, 10); // kg
      const days = parseInt(daysSlider.value, 10);
      const gender = genderSelect.value;

      // Basal Metabolic Rate (Mifflin-St Jeor formula approximation)
      let bmr = (10 * weight) + (6.25 * 178) - (5 * 28);
      if (gender === 'male') {
        bmr += 5;
      } else {
        bmr -= 161;
      }

      // Activity Multiplier based on weekly days
      let activityMult = 1.35 + (days * 0.08);
      let tdee = Math.round(bmr * activityMult);

      // Adjust based on goal
      let targetCalories = tdee;
      let proteinPct = 30;
      let carbsPct = 45;
      let fatsPct = 25;
      let recTrack = 'ANATOMY FORGE + TITAN HYBRID';
      let note = 'Calibrated for progressive lean tissue accretion with zero surplus fat.';

      if (currentGoal === 'muscle') {
        targetCalories = Math.round(tdee * 1.12);
        proteinPct = 30;
        carbsPct = 48;
        fatsPct = 22;
        recTrack = 'ANATOMY FORGE: HYPERTROPHY';
        note = 'Caloric surplus designed for hypertrophic myofibrillar synthesis.';
      } else if (currentGoal === 'calisthenics') {
        targetCalories = Math.round(tdee * 1.02);
        proteinPct = 34;
        carbsPct = 46;
        fatsPct = 20;
        recTrack = 'FORGE KINETIC: PURE CALISTHENICS & RINGS';
        note = 'Calibrated for maximum power-to-weight ratio, strict tendon strength, and straight-arm scapular leverage.';
      } else if (currentGoal === 'strength') {
        targetCalories = Math.round(tdee * 1.06);
        proteinPct = 32;
        carbsPct = 45;
        fatsPct = 23;
        recTrack = 'FORGE TITAN: OLYMPIC LIFTING';
        note = 'High glycogen replenishment prioritizing central nervous system force recruitment.';
      } else if (currentGoal === 'fatloss') {
        targetCalories = Math.round(tdee * 0.82);
        proteinPct = 38;
        carbsPct = 35;
        fatsPct = 27;
        recTrack = 'KINETIX PULSE: HYBRID METCON';
        note = 'Strategic caloric deficit maximizing fat oxidation while sparing contractile tissue.';
      }

      // Calculate Grams
      const proteinCalories = targetCalories * (proteinPct / 100);
      const carbsCalories = targetCalories * (carbsPct / 100);
      const fatsCalories = targetCalories * (fatsPct / 100);

      const proteinG = Math.round(proteinCalories / 4);
      const carbsG = Math.round(carbsCalories / 4);
      const fatsG = Math.round(fatsCalories / 9);

      // Render outputs
      calEl.textContent = targetCalories.toLocaleString();
      noteEl.textContent = note;
      proteinEl.textContent = `${proteinG}g`;
      carbsEl.textContent = `${carbsG}g`;
      fatsEl.textContent = `${fatsG}g`;
      trackEl.textContent = recTrack;

      // Update Bar Widths
      barProtein.style.width = `${proteinPct}%`;
      barCarbs.style.width = `${carbsPct}%`;
      barFats.style.width = `${fatsPct}%`;
    }

    recalculate();
  }

  // --- 10. PRICING MONTHLY / ANNUAL BILLING TOGGLE ---
  function setupPricingToggle() {
    const toggleBtn = document.getElementById('billing-toggle');
    const priceAmounts = document.querySelectorAll('.price-amount');
    const billedNotes = document.querySelectorAll('.billed-note');
    if (!toggleBtn) return;

    let isAnnual = true;

    toggleBtn.addEventListener('click', function () {
      sfx.playClick();
      isAnnual = !isAnnual;
      this.classList.toggle('active', isAnnual);

      priceAmounts.forEach(el => {
        const val = isAnnual ? el.getAttribute('data-annual') : el.getAttribute('data-monthly');
        el.textContent = val;
      });

      billedNotes.forEach(note => {
        note.style.opacity = isAnnual ? '1' : '0.35';
      });
    });

    // Select Plan Buttons trigger Inquiry form autofill
    const planButtons = document.querySelectorAll('.select-plan-btn');
    planButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        sfx.playClick();
        const planName = this.getAttribute('data-plan');
        const contactSection = document.getElementById('contact');
        const interestSelect = document.getElementById('contact-interest');
        const messageTextarea = document.getElementById('contact-message');

        if (interestSelect) {
          interestSelect.value = 'pro-performance';
        }
        if (messageTextarea) {
          messageTextarea.value = `I am interested in securing a membership for the ${planName} tier. Please contact me with registration details.`;
        }

        if (contactSection) {
          contactSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  // --- 11. INQUIRY FORM SUBMISSION & SUCCESS MODAL ---
  function setupInquiryForm() {
    const form = document.getElementById('inquiry-form');
    const submitBtn = document.getElementById('submit-inquiry-btn');
    const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
    const btnSpinner = submitBtn ? submitBtn.querySelector('.btn-spinner') : null;
    const btnIcon = submitBtn ? submitBtn.querySelector('.btn-icon') : null;

    const modal = document.getElementById('inquiry-success-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalFinishBtn = document.getElementById('modal-finish-btn');
    const modalUserName = document.getElementById('modal-user-name');
    const modalVoucherCode = document.getElementById('modal-voucher-code');

    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const nameInput = document.getElementById('contact-name');
      const emailInput = document.getElementById('contact-email');
      const messageInput = document.getElementById('contact-message');

      const nameError = document.getElementById('name-error');
      const emailError = document.getElementById('email-error');
      const messageError = document.getElementById('message-error');

      let isValid = true;

      // Validate Name
      if (!nameInput.value.trim()) {
        nameInput.classList.add('invalid');
        nameError.classList.add('visible');
        isValid = false;
      } else {
        nameInput.classList.remove('invalid');
        nameError.classList.remove('visible');
      }

      // Validate Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.value.trim())) {
        emailInput.classList.add('invalid');
        emailError.classList.add('visible');
        isValid = false;
      } else {
        emailInput.classList.remove('invalid');
        emailError.classList.remove('visible');
      }

      // Validate Message
      if (!messageInput.value.trim()) {
        messageInput.classList.add('invalid');
        messageError.classList.add('visible');
        isValid = false;
      } else {
        messageInput.classList.remove('invalid');
        messageError.classList.remove('visible');
      }

      if (!isValid) return;

      // Animated Loading State
      if (btnText) btnText.textContent = 'Processing VIP Pass...';
      if (btnSpinner) btnSpinner.classList.remove('hidden');
      // Real API submission to local SQLite backend
      const payload = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: (document.getElementById('contact-phone') ? document.getElementById('contact-phone').value : '').trim(),
        interest: document.getElementById('contact-interest') ? document.getElementById('contact-interest').value : 'vip-pass',
        message: messageInput.value.trim()
      };

      fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        sfx.playSuccess();
        if (btnText) btnText.textContent = 'Submit VIP Inquiry';
        if (btnSpinner) btnSpinner.classList.add('hidden');
        if (btnIcon) btnIcon.classList.remove('hidden');
        submitBtn.disabled = false;

        const voucher = (data && data.voucher_code) ? data.voucher_code : ('FORGE-VIP-' + Math.floor(10000 + Math.random() * 90000));
        if (modalVoucherCode) modalVoucherCode.textContent = voucher;
        if (modalUserName) modalUserName.textContent = payload.name;

        if (modal) modal.classList.remove('hidden');
        form.reset();
      })
      .catch(err => {
        console.warn('API submission error, using local fallback:', err);
        sfx.playSuccess();
        if (btnText) btnText.textContent = 'Submit VIP Inquiry';
        if (btnSpinner) btnSpinner.classList.add('hidden');
        if (btnIcon) btnIcon.classList.remove('hidden');
        submitBtn.disabled = false;

        const randCode = 'FORGE-VIP-' + Math.floor(10000 + Math.random() * 90000);
        if (modalVoucherCode) modalVoucherCode.textContent = randCode;
        if (modalUserName) modalUserName.textContent = payload.name;

        if (modal) modal.classList.remove('hidden');
        form.reset();
      });
    });

    // Close Modal Events
    function closeModal() {
      sfx.playClick();
      if (modal) modal.classList.add('hidden');
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalFinishBtn) modalFinishBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });
    }
  }

  // --- 12. INTERACTIVE SCHEDULE MODAL ---
  function setupScheduleModal() {
    const openBtn = document.getElementById('btn-open-schedule');
    const modal = document.getElementById('schedule-modal');
    const closeBtn = document.getElementById('schedule-close-btn');
    const dayTabs = document.querySelectorAll('#schedule-day-tabs .day-tab');
    const tbody = document.getElementById('schedule-tbody');

    if (!modal) return;

    const scheduleData = {
      mon: [
        { time: '06:00 - 07:15', session: 'FORGE Titan: Olympic Snatch Tech', zone: 'Olympic Power Hall', coach: 'Marcus Vance', cap: '3 Spots Left' },
        { time: '07:30 - 08:30', session: 'Forge Kinetic: Muscle-Up & Lever Prep', zone: 'Calisthenics Rig Jungle', coach: 'Viktor Kroll', cap: '4 Spots Left' },
        { time: '12:00 - 13:00', session: 'Anatomy Forge: Chest & Upper Back', zone: 'Power Hall Deck', coach: 'David Chen', cap: '6 Spots Left' },
        { time: '17:30 - 18:30', session: 'Tactical Striking & Octagon Power', zone: 'Combat Octagon', coach: 'Elena Rostova', cap: '2 Spots Left' },
        { time: '19:00 - 20:00', session: 'Kinetic Reset & FRC Joint Mobility', zone: 'Recovery Studio', coach: 'Dr. Maya Sterling', cap: '8 Spots Left' }
      ],
      tue: [
        { time: '06:00 - 07:15', session: 'Titan Clean & Jerk Velocity Lab', zone: 'Olympic Power Hall', coach: 'Marcus Vance', cap: '4 Spots Left' },
        { time: '07:30 - 08:30', session: 'Aerial Rings: False Grip & Iron Cross', zone: 'Calisthenics Rig Jungle', coach: 'Viktor Kroll', cap: '3 Spots Left' },
        { time: '08:30 - 09:30', session: 'Aerobic Power: 40m Sprint & Sled', zone: 'Sprint Turf Track', coach: 'Elena Rostova', cap: '5 Spots Left' },
        { time: '12:30 - 13:30', session: 'Anatomy Forge: Quads & Adductors', zone: 'Power Hall Deck', coach: 'David Chen', cap: '4 Spots Left' },
        { time: '18:00 - 19:15', session: 'FORGE Titan: Heavy Squat Cycle', zone: 'Olympic Power Hall', coach: 'Marcus Vance', cap: '1 Spot Left' }
      ],
      wed: [
        { time: '06:30 - 07:30', session: 'Streetlifting: Weighted Pull-ups & Dips', zone: 'Calisthenics Rig Jungle', coach: 'Viktor Kroll', cap: '5 Spots Left' },
        { time: '12:00 - 13:00', session: 'Anatomy Forge: Shoulders & Arms', zone: 'Power Hall Deck', coach: 'David Chen', cap: '5 Spots Left' },
        { time: '17:30 - 18:45', session: 'FORGE Titan: Pulling Derivatives', zone: 'Olympic Power Hall', coach: 'Marcus Vance', cap: '3 Spots Left' },
        { time: '19:00 - 20:00', session: 'FRC Hip Capsule & Spine Reset', zone: 'Recovery Studio', coach: 'David Chen', cap: '6 Spots Left' }
      ],
      thu: [
        { time: '06:00 - 07:15', session: 'Titan Barbell Overhead Stability', zone: 'Olympic Power Hall', coach: 'Marcus Vance', cap: '2 Spots Left' },
        { time: '08:00 - 09:00', session: 'Tactical Bag Work & Core Torque', zone: 'Combat Octagon', coach: 'Elena Rostova', cap: '4 Spots Left' },
        { time: '17:30 - 18:30', session: 'Kinetix Pulse: Lactate Threshold', zone: 'Metabolic Mezzanine', coach: 'Elena Rostova', cap: '3 Spots Left' },
        { time: '19:00 - 20:00', session: 'Thermal Infrared Recovery Pods', zone: 'Cryo Recovery Spa', coach: 'Dr. Maya Sterling', cap: 'FULL' }
      ],
      fri: [
        { time: '06:00 - 07:30', session: 'Titan Heavy Friday 1RM Test', zone: 'Olympic Power Hall', coach: 'Marcus Vance', cap: '1 Spot Left' },
        { time: '12:00 - 13:00', session: 'Anatomy Forge: Hamstrings & Glutes', zone: 'Power Hall Deck', coach: 'David Chen', cap: '6 Spots Left' },
        { time: '17:00 - 18:00', session: 'Sprint Mechanics & Brower Timers', zone: 'Sprint Turf Track', coach: 'Elena Rostova', cap: '4 Spots Left' },
        { time: '18:30 - 19:30', session: 'Full-Body Decompression & Sauna', zone: 'Cryo Recovery Spa', coach: 'Dr. Maya Sterling', cap: '9 Spots Left' }
      ],
      sat: [
        { time: '08:00 - 09:30', session: 'TITAN All-Campus Super Team MetCon', zone: 'Turf & Mezzanine', coach: 'Elena & Marcus', cap: '8 Spots Left' },
        { time: '10:00 - 11:30', session: 'Olympic Lifting Masterclass Lab', zone: 'Olympic Power Hall', coach: 'Marcus Vance', cap: 'FULL' },
        { time: '12:00 - 13:00', session: 'Boxer Sparring & Pad Work', zone: 'Combat Octagon', coach: 'Elena Rostova', cap: '4 Spots Left' },
        { time: '14:00 - 15:30', session: 'Masterclass: Endocrine Recovery', zone: 'Lecture Lounge', coach: 'Dr. Maya Sterling', cap: '12 Spots Left' }
      ]
    };

    function renderSchedule(dayKey) {
      const items = scheduleData[dayKey] || scheduleData.mon;
      tbody.innerHTML = items.map(item => `
        <tr>
          <td><strong>${item.time}</strong></td>
          <td><span class="text-white">${item.session}</span></td>
          <td>${item.zone}</td>
          <td>${item.coach}</td>
          <td><span class="${item.cap.includes('FULL') ? 'text-crimson' : 'text-volt'}">${item.cap}</span></td>
          <td>
            <button class="btn btn-outline btn-sm reserve-slot-btn" data-session="${item.session}">
              Reserve
            </button>
          </td>
        </tr>
      `).join('');

      // Add reserve slot listeners
      const reserveButtons = tbody.querySelectorAll('.reserve-slot-btn');
      reserveButtons.forEach(btn => {
        btn.addEventListener('click', function () {
          sfx.playClick();
          const sess = this.getAttribute('data-session');
          modal.classList.add('hidden');
          const contact = document.getElementById('contact');
          const msg = document.getElementById('contact-message');
          if (msg) msg.value = `I would like to reserve a guest trial spot in the session: "${sess}".`;
          if (contact) contact.scrollIntoView({ behavior: 'smooth' });
        });
      });
    }

    if (openBtn) {
      openBtn.addEventListener('click', function () {
        sfx.playClick();
        renderSchedule('mon');
        modal.classList.remove('hidden');
      });
    }

    dayTabs.forEach(tab => {
      tab.addEventListener('click', function () {
        sfx.playClick();
        dayTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const day = this.getAttribute('data-day');
        renderSchedule(day);
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        sfx.playClick();
        modal.classList.add('hidden');
      });
    }

    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  }

  // --- 13. BOOKING BUTTONS QUICK HOOKS ---
  function setupGeneralBookButtons() {
    // Program trial triggers
    const programTriggers = document.querySelectorAll('.book-class-trigger');
    programTriggers.forEach(btn => {
      btn.addEventListener('click', function () {
        sfx.playClick();
        const prog = this.getAttribute('data-program');
        const contact = document.getElementById('contact');
        const msg = document.getElementById('contact-message');
        const interest = document.getElementById('contact-interest');

        if (interest) interest.value = 'olympic-lifting';
        if (msg) msg.value = `I'd like to book a complimentary trial session for the "${prog}" track.`;
        if (contact) contact.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Trainer consultation triggers
    const trainerButtons = document.querySelectorAll('.trainer-book-btn');
    trainerButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        sfx.playClick();
        const trainer = this.getAttribute('data-trainer');
        const contact = document.getElementById('contact');
        const msg = document.getElementById('contact-message');
        const interest = document.getElementById('contact-interest');

        if (interest) interest.value = 'personal-coaching';
        if (msg) msg.value = `I would like to request an introductory 1-on-1 athletic consult with ${trainer}.`;
        if (contact) contact.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }
})();
