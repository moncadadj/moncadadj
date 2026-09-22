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

// ── HERO ATMOSPHERIC CANVAS PARTICLES ────────────────────────────
(function initHeroParticles() {
  const canvas = document.getElementById('heroCanvas');
  const heroSection = document.getElementById('hero');
  if (!canvas || !heroSection) return;

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
  let isHeroVisible = true;

  function resizeCanvas() {
    const rect = heroSection.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    createParticles();
  }

  function createParticles() {
    // Bound particle count by hero area (80 to 140 particles max)
    const area = width * height;
    const count = Math.min(140, Math.max(70, Math.floor(area / 10000)));

    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.8 + 0.6,
        baseAlpha: Math.random() * 0.35 + 0.15,
        colorType: Math.random() < 0.25 ? 'gold' : 'charcoal'
      });
    }
  }

  function updateAndDraw(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // Cap delta time
    lastTime = timestamp;

    ctx.clearRect(0, 0, width, height);

    if (prefersReducedMotion.matches) {
      // Draw static particles frame without animation
      particles.forEach(p => drawParticle(p, p.baseAlpha));
      return;
    }

    const vortexRadius = 220;

    particles.forEach(p => {
      // Gentle drift physics
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;

      // Wrap around edges
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      let currentAlpha = p.baseAlpha;

      // Pointer vortex interaction when pointer is active
      if (pointer.active) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist > 0.001 && dist < vortexRadius) {
          const force = (1 - dist / vortexRadius);
          // Tangential vortex rotation + gentle inward pull
          const nx = dx / dist;
          const ny = dy / dist;
          const tx = -ny;
          const ty = nx;

          p.x += (tx * force * 1.2 + nx * force * 0.4) * dt * 60;
          p.y += (ty * force * 1.2 + ny * force * 0.4) * dt * 60;

          currentAlpha = Math.min(1.0, p.baseAlpha + force * 0.5);
        }
      }

      drawParticle(p, currentAlpha);
    });

    if (isHeroVisible && !document.hidden) {
      animationFrameId = requestAnimationFrame(updateAndDraw);
    }
  }

  function drawParticle(p, alpha) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    if (p.colorType === 'gold') {
      ctx.fillStyle = `rgba(201, 168, 76, ${alpha})`;
    } else {
      ctx.fillStyle = `rgba(200, 190, 168, ${alpha * 0.7})`;
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

  // Event Listeners
  window.addEventListener('resize', () => {
    resizeCanvas();
    if (prefersReducedMotion.matches) {
      updateAndDraw(0);
    }
  });

  if (isFinePointer.matches) {
    heroSection.addEventListener('pointermove', e => {
      const rect = heroSection.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    });

    heroSection.addEventListener('pointerleave', () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    });
  }

  // Intersection Observer for pausing off-screen hero animation
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      isHeroVisible = entry.isIntersecting;
      if (isHeroVisible) {
        startAnimation();
      } else {
        stopAnimation();
      }
    });
  }, { threshold: 0.05 });

  observer.observe(heroSection);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAnimation();
    } else if (isHeroVisible) {
      startAnimation();
    }
  });

  prefersReducedMotion.addEventListener('change', () => {
    stopAnimation();
    startAnimation();
  });

  // Initial setup
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
