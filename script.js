// ── CUSTOM CURSOR IMPLEMENTATION ─────────────────────────────────
(function initCustomCursor() {
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');
  if (!cursor || !ring) return;

  const isFinePointer = window.matchMedia('(pointer: fine)');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Enable custom cursor only on fine pointer (mouse/trackpad) devices
  if (!isFinePointer.matches) {
    return;
  }

  document.body.classList.add('has-custom-cursor');

  let mx = -100, my = -100;
  let rx = -100, ry = -100;
  let animId = null;
  let active = false;

  function updateCursorPos(e) {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top = my + 'px';

    if (!active) {
      active = true;
      document.body.classList.add('cursor-active');
      rx = mx;
      ry = my;
    }
  }

  function renderRing() {
    if (prefersReducedMotion.matches) {
      rx = mx;
      ry = my;
    } else {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
    }

    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';

    if (active && !document.hidden) {
      animId = requestAnimationFrame(renderRing);
    }
  }

  window.addEventListener('pointermove', e => {
    updateCursorPos(e);
    if (!animId) {
      animId = requestAnimationFrame(renderRing);
    }
  });

  document.addEventListener('pointerleave', () => {
    active = false;
    document.body.classList.remove('cursor-active');
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    } else if (active && !animId) {
      animId = requestAnimationFrame(renderRing);
    }
  });

  // Hover expansion for interactive elements
  const hoverSelectors = 'a, button, .pillar, .exp-card, .phase, .tool-card, .principle, .lang-toggle';

  document.querySelectorAll(hoverSelectors).forEach(el => {
    el.addEventListener('pointerenter', () => {
      cursor.style.width = '18px';
      cursor.style.height = '18px';
      ring.style.width = '52px';
      ring.style.height = '52px';
      ring.style.borderColor = 'var(--gold)';
      ring.style.opacity = '0.8';
    });
    el.addEventListener('pointerleave', () => {
      cursor.style.width = '10px';
      cursor.style.height = '10px';
      ring.style.width = '36px';
      ring.style.height = '36px';
      ring.style.borderColor = 'var(--gold)';
      ring.style.opacity = '0.5';
    });
  });
})();

// ── GLOBAL ATMOSPHERIC BACKGROUND CANVAS PARTICLES ────────────────
(function initGlobalParticles() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isFinePointer = window.matchMedia('(pointer: fine)');

  let particles = [];
  let width = 0;
  let height = 0;
  let animationFrameId = null;
  let lastTime = 0;
  let pointer = { x: -9999, y: -9999, active: false };

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    createParticles();
  }

  function createParticles() {
    // Density tuned: 220 to 360 particles within desktop viewport
    const area = width * height;
    const baseCount = Math.floor(area / 4200);
    const count = Math.min(360, Math.max(140, baseCount));

    particles = [];
    for (let i = 0; i < count; i++) {
      const randType = Math.random();
      let colorType = 'charcoal';
      if (randType < 0.35) colorType = 'gold';
      else if (randType < 0.55) colorType = 'ivory';

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        size: Math.random() * 2.2 + 0.8,
        baseAlpha: Math.random() * 0.4 + 0.2,
        colorType: colorType
      });
    }
  }

  function updateAndDraw(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    ctx.clearRect(0, 0, width, height);

    if (prefersReducedMotion.matches) {
      particles.forEach(p => drawParticle(p, p.baseAlpha));
      return;
    }

    const vortexRadius = 260;

    particles.forEach(p => {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;

      if (p.x < -15) p.x = width + 15;
      if (p.x > width + 15) p.x = -15;
      if (p.y < -15) p.y = height + 15;
      if (p.y > height + 15) p.y = -15;

      let currentAlpha = p.baseAlpha;

      if (pointer.active) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist > 0.001 && dist < vortexRadius) {
          const force = (1 - dist / vortexRadius);
          const nx = dx / dist;
          const ny = dy / dist;
          const tx = -ny;
          const ty = nx;

          p.x += (tx * force * 1.8 + nx * force * 0.6) * dt * 60;
          p.y += (ty * force * 1.8 + ny * force * 0.6) * dt * 60;

          currentAlpha = Math.min(1.0, p.baseAlpha + force * 0.55);
        }
      }

      drawParticle(p, currentAlpha);
    });

    if (!document.hidden) {
      animationFrameId = requestAnimationFrame(updateAndDraw);
    }
  }

  function drawParticle(p, alpha) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    if (p.colorType === 'gold') {
      ctx.fillStyle = `rgba(201, 168, 76, ${alpha})`;
    } else if (p.colorType === 'ivory') {
      ctx.fillStyle = `rgba(245, 240, 232, ${alpha * 0.85})`;
    } else {
      ctx.fillStyle = `rgba(200, 190, 168, ${alpha * 0.75})`;
    }
    ctx.fill();
  }

  function startAnimation() {
    if (!animationFrameId && !prefersReducedMotion.matches) {
      lastTime = 0;
      animationFrameId = requestAnimationFrame(updateAndDraw);
    } else if (prefersReducedMotion.matches) {
      updateAndDraw(0);
    }
  }

  function stopAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    if (prefersReducedMotion.matches) {
      updateAndDraw(0);
    }
  });

  if (isFinePointer.matches) {
    window.addEventListener('pointermove', e => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    });

    document.addEventListener('pointerleave', () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAnimation();
    } else {
      startAnimation();
    }
  });

  prefersReducedMotion.addEventListener('change', () => {
    stopAnimation();
    startAnimation();
  });

  resizeCanvas();
  startAnimation();
})();

// ── SCROLL PROGRESS ───────────────────────────────────────────────
const progress = document.getElementById('progress');
const nav = document.getElementById('nav');

window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = (scrolled / total * 100) + '%';

  if (scrolled > 60) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

// ── SCROLL REVEAL ─────────────────────────────────────────────────
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

reveals.forEach(el => observer.observe(el));

// ── PRINCIPLE NUMBER PARALLAX ─────────────────────────────────────
document.querySelectorAll('.principle-num').forEach(num => {
  const principle = num.parentElement;
  principle.addEventListener('mouseenter', () => {
    num.style.color = 'var(--gold)';
    num.style.opacity = '0.15';
  });
  principle.addEventListener('mouseleave', () => {
    num.style.color = 'var(--border)';
    num.style.opacity = '1';
  });
});

// ── TRANSLATION LOGIC ─────────────────────────────────────────────
const langToggle = document.getElementById('langToggle');
let currentLang = localStorage.getItem('lang') || 'en';

function applyTranslations(lang) {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });
  langToggle.textContent = lang === 'en' ? 'ES / EN' : 'EN / ES';
  document.documentElement.lang = lang;
}

// Apply initial translations
applyTranslations(currentLang);

langToggle.addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'es' : 'en';
  localStorage.setItem('lang', currentLang);
  applyTranslations(currentLang);
});
