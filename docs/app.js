/* ── RunPort Website JS ── */

// ─── Nav scroll state ───────────────────────────────────────
const nav = document.getElementById('nav');
const onScroll = () => {
  if (nav) {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ─── Mobile menu ────────────────────────────────────────────
const mobileBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileBtn && mobileMenu) {
  mobileBtn.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('hidden') === false;
    mobileBtn.setAttribute('aria-expanded', String(isOpen));
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      mobileBtn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
      mobileMenu.classList.add('hidden');
      mobileBtn.setAttribute('aria-expanded', 'false');
      mobileBtn.focus();
    }
  });
}

// ─── Enhanced Direction-Aware Reveal on Scroll ───────────────
const animSelector = '.reveal, .slide-in-left, .slide-in-right, .slide-in-up, .scale-in';
const revealElements = document.querySelectorAll(animSelector);

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
  );

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });
} else {
  // Fallback for older browsers
  revealElements.forEach(el => el.classList.add('visible'));
}

// ─── 3D Perspective Tilt on Hero Mockup ──────────────────────
const heroContainer = document.querySelector('.hero-perspective-container');
const heroCard = document.querySelector('.hero-tilt-card');

if (heroContainer && heroCard && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let bounds;

  function updateBounds() {
    bounds = heroContainer.getBoundingClientRect();
  }

  window.addEventListener('resize', updateBounds);
  updateBounds();

  heroContainer.addEventListener('mouseenter', updateBounds);

  heroContainer.addEventListener('mousemove', (e) => {
    if (!bounds) updateBounds();
    const mouseX = e.clientX - bounds.left;
    const mouseY = e.clientY - bounds.top;

    const xPct = (mouseX / bounds.width) - 0.5;
    const yPct = (mouseY / bounds.height) - 0.5;

    // Max 10 degrees tilt
    const rotateX = -yPct * 10;
    const rotateY = xPct * 10;

    heroCard.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
  });

  heroContainer.addEventListener('mouseleave', () => {
    heroCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  });
}

// ─── Counter animation ───────────────────────────────────────
function animateCount(el, target, duration = 800) {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const counterElements = document.querySelectorAll('[data-count]');
if (counterElements.length > 0 && 'IntersectionObserver' in window) {
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.dataset.count, 10);
          if (!isNaN(target)) animateCount(entry.target, target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counterElements.forEach(el => counterObserver.observe(el));
}

// ─── Smooth scroll for anchor links ─────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const navHeight = nav ? nav.offsetHeight : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
    window.scrollTo({ top, behavior: 'smooth' });
    history.pushState(null, '', href);
    const heading = target.querySelector('h1, h2, h3');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  });
});

// ─── Interactive Live Simulator Demo Logic ───────────────────
const simProjects = [
  {
    id: 'nextjs-app',
    name: 'ecommerce-storefront',
    framework: 'NEXT.JS',
    port: 3000,
    branch: 'main',
    running: true,
    uptime: 142,
    command: 'npm run dev',
    logs: [
      '[SYSTEM] Launching dev server in C:\\Projects\\ecommerce-storefront',
      '[SYSTEM] Command: npm run dev -- --port 3000',
      '▲ Next.js 15.1.0 ready in 1240 ms',
      '➜ Local:   http://localhost:3000',
      '➜ Network: http://192.168.1.45:3000',
      '✓ Compiled / (app) in 320ms (482 modules)'
    ]
  },
  {
    id: 'vite-dashboard',
    name: 'analytics-dashboard',
    framework: 'VITE',
    port: 5174,
    branch: 'feat/charts',
    running: false,
    uptime: 0,
    command: 'pnpm dev',
    logs: [
      '[SYSTEM] Server idle. Click Start to launch dev process.'
    ]
  },
  {
    id: 'express-api',
    name: 'auth-microservice',
    framework: 'EXPRESS',
    port: 8080,
    branch: 'develop',
    running: true,
    uptime: 890,
    command: 'yarn start:dev',
    logs: [
      '[SYSTEM] Launching Node.js process with nodemon',
      '[AUTH] Database connection pool established (PostgreSQL)',
      '[SERVER] Auth Service listening on port 8080',
      '[INFO] JWT secret keys loaded. Ready for auth requests.'
    ]
  }
];

let selectedSimIndex = 0;

function formatUptime(seconds) {
  if (seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function renderSimulator() {
  const listEl = document.getElementById('sim-project-list');
  const detailTitleEl = document.getElementById('sim-detail-title');
  const detailTagEl = document.getElementById('sim-detail-tag');
  const detailBranchEl = document.getElementById('sim-detail-branch');
  const detailStatusEl = document.getElementById('sim-detail-status');
  const detailUrlEl = document.getElementById('sim-detail-url');
  const detailLogsEl = document.getElementById('sim-detail-logs');
  const detailActionBtn = document.getElementById('sim-detail-action-btn');

  if (!listEl) return;

  const current = simProjects[selectedSimIndex];

  // Render project list
  listEl.innerHTML = simProjects.map((p, idx) => {
    const isSelected = idx === selectedSimIndex;
    const statusDotClass = p.running ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-white/20';
    const statusText = p.running ? `${p.port}` : `${p.port}`;
    const selectedBg = isSelected ? 'bg-white/10 border-brand-500/50' : 'bg-transparent border-transparent hover:bg-white/5';

    return `
      <button type="button" class="w-full text-left px-3.5 py-2.5 rounded-xl border transition-all duration-200 flex items-center justify-between group ${selectedBg}"
              onclick="selectSimProject(${idx})">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-2 h-2 rounded-full shrink-0 ${statusDotClass}"></span>
          <span class="text-sm font-medium text-white truncate group-hover:text-brand-300 transition-colors">${p.name}</span>
        </div>
        <span class="font-mono text-xs text-white/40 group-hover:text-white/60 transition-colors tabular-nums">${statusText}</span>
      </button>
    `;
  }).join('');

  // Render detail view
  if (detailTitleEl) detailTitleEl.textContent = current.name;
  if (detailTagEl) detailTagEl.textContent = current.framework;
  if (detailBranchEl) detailBranchEl.textContent = current.branch;

  if (detailStatusEl) {
    if (current.running) {
      detailStatusEl.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse mr-1.5"></span><span class="text-green-400 font-medium">${formatUptime(current.uptime)}</span>`;
    } else {
      detailStatusEl.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-white/30 mr-1.5"></span><span class="text-white/40">Stopped</span>`;
    }
  }

  if (detailUrlEl) {
    if (current.running) {
      detailUrlEl.innerHTML = `<a href="http://localhost:${current.port}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:underline font-mono text-xs flex items-center gap-1">http://localhost:${current.port} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg></a>`;
    } else {
      detailUrlEl.innerHTML = `<span class="text-white/30 font-mono text-xs">http://localhost:${current.port}</span>`;
    }
  }

  if (detailActionBtn) {
    if (current.running) {
      detailActionBtn.className = 'px-3.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5';
      detailActionBtn.innerHTML = `<span class="w-1.5 h-1.5 rounded-sm bg-red-400"></span> Stop`;
    } else {
      detailActionBtn.className = 'px-3.5 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5';
      detailActionBtn.innerHTML = `<span class="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-green-400"></span> Start`;
    }
  }

  if (detailLogsEl) {
    detailLogsEl.innerHTML = current.logs.map(log => {
      let colorClass = 'text-white/70';
      if (log.includes('Local:') || log.includes('ready in') || log.includes('listening')) colorClass = 'text-green-400';
      if (log.includes('[SYSTEM]')) colorClass = 'text-brand-400';
      if (log.includes('▲ Next.js')) colorClass = 'text-white font-bold';
      return `<div class="${colorClass}">${escapeHtml(log)}</div>`;
    }).join('') + '<div class="mt-1"><span class="terminal-cursor"></span></div>';
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.selectSimProject = function(index) {
  selectedSimIndex = index;
  renderSimulator();
};

window.toggleSimProject = function() {
  const current = simProjects[selectedSimIndex];
  current.running = !current.running;
  if (current.running) {
    current.uptime = 1;
    current.logs = [
      `[SYSTEM] Launching dev server in C:\\Projects\\${current.name}`,
      `[SYSTEM] Command: ${current.command} -- --port ${current.port}`,
      `[INFO] Dev server listening on http://localhost:${current.port}`,
      `✓ Process ready in 840ms. Watching for file changes...`
    ];
  } else {
    current.uptime = 0;
    current.logs = [
      `[SYSTEM] Sending SIGTERM to process group on port ${current.port}`,
      `[SYSTEM] Server gracefully stopped.`
    ];
  }
  renderSimulator();
};

window.simStartAll = function() {
  simProjects.forEach(p => {
    p.running = true;
    p.uptime = 1;
  });
  renderSimulator();
};

window.simStopAll = function() {
  simProjects.forEach(p => {
    p.running = false;
    p.uptime = 0;
  });
  renderSimulator();
};

// Initial simulator render
if (document.getElementById('sim-project-list')) {
  renderSimulator();
  // Live simulated uptime ticker
  setInterval(() => {
    let updated = false;
    simProjects.forEach(p => {
      if (p.running) {
        p.uptime += 1;
        updated = true;
      }
    });
    if (updated) renderSimulator();
  }, 1000);
}

// ─── Dynamic GitHub Releases Direct Download Resolver ───────
async function initDirectDownloads() {
  const repoOwner = 'Ayush-Antiwal';
  const repoName = 'RunPort';
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) return;
    const release = await res.json();
    const tagName = release.tag_name || 'v1.0.0';
    const assets = release.assets || [];

    let installerUrl = null;
    let portableUrl = null;
    let installerSize = null;

    assets.forEach(asset => {
      const name = asset.name || '';
      if (name.endsWith('.exe')) {
        if (name.toLowerCase().includes('setup')) {
          installerUrl = asset.browser_download_url;
          if (asset.size) {
            installerSize = `${Math.round(asset.size / (1024 * 1024))}MB`;
          }
        } else {
          portableUrl = asset.browser_download_url;
        }
      }
    });

    if (!installerUrl && assets.length > 0) {
      const firstExe = assets.find(a => (a.name || '').endsWith('.exe'));
      if (firstExe) installerUrl = firstExe.browser_download_url;
    }

    if (installerUrl) {
      document.querySelectorAll('.direct-installer-link').forEach(link => {
        link.href = installerUrl;
      });
      const heroText = document.getElementById('hero-download-text');
      if (heroText) {
        heroText.textContent = `Download ${tagName} for Windows (.exe)${installerSize ? ` · ${installerSize}` : ''}`;
      }
      const footerText = document.getElementById('footer-download-text');
      if (footerText) {
        footerText.textContent = `Download ${tagName} for Windows (.exe)`;
      }
      const navBtn = document.getElementById('nav-download-btn');
      if (navBtn) {
        navBtn.textContent = `Download ${tagName}`;
      }
    }

    if (portableUrl) {
      document.querySelectorAll('.direct-portable-link').forEach(link => {
        link.href = portableUrl;
      });
    }
  } catch (e) {
    console.debug('GitHub release lookup deferred to static fallback URLs', e);
  }
}

initDirectDownloads();

