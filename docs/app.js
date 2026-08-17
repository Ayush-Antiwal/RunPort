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

// ─── Interactive Live Simulator Demo Logic (Exact Replica of dashboard.jpg) ──
const simProjects = [
  {
    id: 'dashboard-template',
    name: 'dashboard-template',
    framework: 'VITE',
    port: 5174,
    branch: 'ayu-bug-fix',
    path: 'C:\\Lattice Projects\\v2cp-web',
    running: true,
    uptime: 2,
    command: 'npm run dev',
    logs: [
      { time: '6:27:39 pm', type: 'system', text: '[SYSTEM] Launching dev server in C:\\Lattice Projects\\v2cp-web (Dynamic RAM cap: 2048 MB)' },
      { time: '6:27:39 pm', type: 'system', text: '[SYSTEM] Command: npm run dev -- --port 5174' },
      { time: '6:27:40 pm', type: 'cmd', text: '> dashboard-template@0.0.0 dev' },
      { time: '6:27:40 pm', type: 'cmd', text: '> vite --port 5174' },
      { time: '6:27:45 pm', type: 'ready', text: '  VITE v6.3.5  ready in 4540 ms' },
      { time: '6:27:45 pm', type: 'url', text: '  ➜  Local:   http://localhost:5174/' },
      { time: '6:27:45 pm', type: 'network', text: '  ➜  Network: use --host to expose' }
    ]
  },
  {
    id: 'portfolio-v4',
    name: 'portfolio-v4',
    framework: 'NEXT',
    port: 4000,
    branch: 'main',
    path: 'C:\\Lattice Projects\\portfolio-v4',
    running: false,
    uptime: 0,
    command: 'npm run dev',
    logs: [
      { time: '11:15:02 am', type: 'system', text: '[SYSTEM] Server idle. Click Start to launch dev process.' }
    ]
  },
  {
    id: 'layout-v2',
    name: 'layout-v2',
    framework: 'VITE',
    port: 4281,
    branch: 'feat/grid-system',
    path: 'C:\\Lattice Projects\\layout-v2',
    running: false,
    uptime: 0,
    command: 'pnpm dev',
    logs: [
      { time: '2:40:18 pm', type: 'system', text: '[SYSTEM] Server idle. Click Start to launch dev process.' }
    ]
  }
];

let selectedSimIndex = 0;
let currentSimFilter = 'all';
let currentSimSearchQuery = '';
let currentSimLogFilterQuery = '';

function formatUptime(seconds) {
  if (seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function showSimToast(msg) {
  const toast = document.getElementById('sim-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}
window.showSimToast = showSimToast;

function renderSimulator() {
  const listEl = document.getElementById('sim-project-list');
  const detailTitleEl = document.getElementById('sim-detail-title');
  const detailTagEl = document.getElementById('sim-detail-tag');
  const detailHeaderDotEl = document.getElementById('sim-header-dot');
  const detailHeaderBranchEl = document.getElementById('sim-header-branch');
  const detailPathEl = document.getElementById('sim-detail-path');
  const detailStatusEl = document.getElementById('sim-detail-status');
  const detailUrlEl = document.getElementById('sim-detail-url');
  const detailBranchSelectEl = document.getElementById('sim-detail-branch-select');
  const terminalCmdEl = document.getElementById('sim-terminal-cmd');
  const terminalLinesEl = document.getElementById('sim-terminal-lines');
  const terminalBodyEl = document.getElementById('sim-terminal-body');
  const detailActionBtn = document.getElementById('sim-detail-action-btn');
  const filterTabsEl = document.getElementById('sim-filter-tabs');

  if (!listEl) return;

  const current = simProjects[selectedSimIndex];

  // Update Filter Tabs counts
  const totalCount = simProjects.length;
  const runningCount = simProjects.filter(p => p.running).length;
  const idleCount = totalCount - runningCount;

  if (filterTabsEl) {
    filterTabsEl.innerHTML = `
      <button type="button" class="sim-filter-btn ${currentSimFilter === 'all' ? 'active' : ''}" onclick="setSimFilter('all')">All (${totalCount})</button>
      <button type="button" class="sim-filter-btn ${currentSimFilter === 'running' ? 'active' : ''}" onclick="setSimFilter('running')">Running (${runningCount})</button>
      <button type="button" class="sim-filter-btn ${currentSimFilter === 'idle' ? 'active' : ''}" onclick="setSimFilter('idle')">Idle (${idleCount})</button>
    `;
  }

  // Filter projects by tab + search query
  const filteredProjects = simProjects.map((p, originalIdx) => ({ p, originalIdx })).filter(({ p }) => {
    if (currentSimFilter === 'running' && !p.running) return false;
    if (currentSimFilter === 'idle' && p.running) return false;
    if (currentSimSearchQuery && !p.name.toLowerCase().includes(currentSimSearchQuery.toLowerCase())) return false;
    return true;
  });

  // Render project list
  if (filteredProjects.length === 0) {
    listEl.innerHTML = `<div class="py-6 text-center text-xs text-white/30 font-mono">No matching projects</div>`;
  } else {
    listEl.innerHTML = filteredProjects.map(({ p, originalIdx }) => {
      const isSelected = originalIdx === selectedSimIndex;
      const dotColor = p.running ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-white/20';
      const portColor = p.running ? 'text-green-400/90 font-semibold' : 'text-white/40';

      return `
        <div class="sim-project-item ${isSelected ? 'active' : ''}" onclick="selectSimProject(${originalIdx})">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-2 h-2 rounded-full shrink-0 ${dotColor}"></span>
            <span class="truncate font-mono text-xs ${isSelected ? 'text-white font-medium' : 'text-white/70'}">${p.name}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
            <span class="text-white/20">•</span>
            <span class="${portColor} tabular-nums">${p.port}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render detail view
  if (detailTitleEl) detailTitleEl.textContent = current.name;
  if (detailTagEl) detailTagEl.textContent = current.framework;
  if (detailHeaderBranchEl) detailHeaderBranchEl.textContent = current.branch;
  if (detailPathEl) detailPathEl.innerHTML = `<span>📁</span> ${current.path}`;

  if (detailHeaderDotEl) {
    detailHeaderDotEl.className = current.running
      ? 'w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]'
      : 'w-2.5 h-2.5 rounded-full bg-white/30';
  }

  if (detailStatusEl) {
    if (current.running) {
      detailStatusEl.className = 'mt-1 flex items-center gap-1.5 font-medium text-green-400';
      detailStatusEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span><span>${formatUptime(current.uptime)}</span>`;
    } else {
      detailStatusEl.className = 'mt-1 flex items-center gap-1.5 font-medium text-white/40';
      detailStatusEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-white/20"></span><span>Idle</span>`;
    }
  }

  if (detailUrlEl) {
    if (current.running) {
      detailUrlEl.href = `http://localhost:${current.port}`;
      detailUrlEl.innerHTML = `http://localhost:${current.port} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>`;
    } else {
      detailUrlEl.href = `javascript:void(0)`;
      detailUrlEl.innerHTML = `http://localhost:${current.port} <span class="text-white/30 text-[10px]">(stopped)</span>`;
    }
  }

  if (detailBranchSelectEl) {
    detailBranchSelectEl.value = current.branch;
  }

  if (detailActionBtn) {
    if (current.running) {
      detailActionBtn.className = 'px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-red-600/30 flex items-center gap-1.5';
      detailActionBtn.innerHTML = `<span class="w-2 h-2 rounded-sm bg-white"></span> Stop`;
    } else {
      detailActionBtn.className = 'px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-green-600/30 flex items-center gap-1.5';
      detailActionBtn.innerHTML = `<span class="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-white"></span> Start`;
    }
  }

  if (terminalCmdEl) terminalCmdEl.textContent = current.command;

  // Filter terminal logs by current filter query
  const rawLogs = current.logs;
  const filteredLogs = currentSimLogFilterQuery
    ? rawLogs.filter(l => (typeof l === 'string' ? l : l.text).toLowerCase().includes(currentSimLogFilterQuery.toLowerCase()))
    : rawLogs;

  if (terminalLinesEl) terminalLinesEl.textContent = `${filteredLogs.length} lines`;

  if (terminalBodyEl) {
    if (filteredLogs.length === 0) {
      terminalBodyEl.innerHTML = `<div class="text-white/30 py-4 text-center">No logs matching "${escapeHtml(currentSimLogFilterQuery)}"</div>`;
    } else {
      terminalBodyEl.innerHTML = filteredLogs.map(log => {
        const time = typeof log === 'object' ? log.time : '6:27:39 pm';
        const type = typeof log === 'object' ? log.type : 'system';
        const text = typeof log === 'object' ? log.text : log;

        let contentHtml = escapeHtml(text);

        // Syntax highlighting exact to dashboard.jpg
        if (text.includes('[SYSTEM]')) {
          contentHtml = `<span class="text-white/40">[${time}]</span> <span class="text-blue-400 font-semibold">[SYSTEM]</span> <span class="text-white/80">${escapeHtml(text.replace(/\[\d+:\d+:\d+\s+[ap]m\]\s*/i, '').replace('[SYSTEM]', '').trim())}</span>`;
        } else if (text.includes('ready in') || text.includes('VITE')) {
          contentHtml = `<span class="text-white/40">[${time}]</span> <span class="text-green-400 font-semibold">${escapeHtml(text.replace(/\[\d+:\d+:\d+\s+[ap]m\]\s*/i, '').trim())}</span>`;
        } else if (text.includes('Local:') || text.includes('Network:')) {
          contentHtml = `<span class="text-white/40">[${time}]</span> <span class="text-green-400">${escapeHtml(text.replace(/\[\d+:\d+:\d+\s+[ap]m\]\s*/i, '').trim())}</span>`;
        } else if (text.startsWith('>')) {
          contentHtml = `<span class="text-white/40">[${time}]</span> <span class="text-white/60">${escapeHtml(text.replace(/\[\d+:\d+:\d+\s+[ap]m\]\s*/i, '').trim())}</span>`;
        } else {
          contentHtml = `<span class="text-white/40">[${time}]</span> <span class="text-white/70">${contentHtml}</span>`;
        }

        return `<div class="hover:bg-white/[0.03] px-1 py-0.5 rounded transition-colors whitespace-pre-wrap">${contentHtml}</div>`;
      }).join('');
    }
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.selectSimProject = function(index) {
  selectedSimIndex = index;
  renderSimulator();
};

window.setSimFilter = function(filter) {
  currentSimFilter = filter;
  renderSimulator();
};

window.handleSimProjectSearch = function(query) {
  currentSimSearchQuery = query;
  renderSimulator();
};

window.handleSimLogFilter = function(query) {
  currentSimLogFilterQuery = query;
  renderSimulator();
};

window.handleSimBranchChange = function(newBranch) {
  simProjects[selectedSimIndex].branch = newBranch;
  showSimToast(`Switched branch to ${newBranch}`);
  renderSimulator();
};

window.copySimUrl = function() {
  const current = simProjects[selectedSimIndex];
  const url = `http://localhost:${current.port}`;
  navigator.clipboard.writeText(url).catch(() => {});
  showSimToast(`Copied ${url} to clipboard!`);
};

window.copySimLogs = function() {
  const current = simProjects[selectedSimIndex];
  const text = current.logs.map(l => (typeof l === 'object' ? l.text : l)).join('\n');
  navigator.clipboard.writeText(text).catch(() => {});
  showSimToast(`Copied ${current.logs.length} log lines to clipboard!`);
};

window.clearSimLogs = function() {
  const current = simProjects[selectedSimIndex];
  current.logs = [
    { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'system', text: '[SYSTEM] Log buffer cleared by user.' }
  ];
  showSimToast('Terminal buffer cleared');
  renderSimulator();
};

window.simAddNewProjectPrompt = function() {
  const newName = prompt('Enter a new sample project name:', 'backend-microservice');
  if (newName) {
    simProjects.push({
      id: newName.toLowerCase().replace(/\s+/g, '-'),
      name: newName.trim(),
      framework: 'EXPRESS',
      port: 8080,
      branch: 'main',
      path: `C:\\Lattice Projects\\${newName.trim()}`,
      running: true,
      uptime: 1,
      command: 'npm run dev',
      logs: [
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'system', text: `[SYSTEM] Added project ${newName.trim()}` },
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'ready', text: `  Express server ready on http://localhost:8080` }
      ]
    });
    selectedSimIndex = simProjects.length - 1;
    showSimToast(`Added & started project: ${newName.trim()}`);
    renderSimulator();
  }
};

window.toggleSimProject = function() {
  const current = simProjects[selectedSimIndex];
  current.running = !current.running;
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (current.running) {
    current.uptime = 1;
    current.logs = [
      { time: now, type: 'system', text: `[SYSTEM] Launching dev server in ${current.path} (Dynamic RAM cap: 2048 MB)` },
      { time: now, type: 'system', text: `[SYSTEM] Command: ${current.command} -- --port ${current.port}` },
      { time: now, type: 'ready', text: `  VITE ready in 1420 ms` },
      { time: now, type: 'url', text: `  ➜  Local:   http://localhost:${current.port}/` },
      { time: now, type: 'network', text: `  ➜  Network: use --host to expose` }
    ];
    showSimToast(`Started ${current.name} on port ${current.port}`);
  } else {
    current.uptime = 0;
    current.logs = [
      { time: now, type: 'system', text: `[SYSTEM] Sending SIGTERM to process group on port ${current.port}` },
      { time: now, type: 'system', text: `[SYSTEM] Server gracefully stopped.` }
    ];
    showSimToast(`Stopped ${current.name}`);
  }
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
    let installerName = 'RunPort-Setup-1.0.0.exe';
    let portableUrl = null;
    let portableName = 'RunPort-1.0.0.exe';
    let installerSize = null;

    assets.forEach(asset => {
      const name = asset.name || '';
      if (name.endsWith('.exe')) {
        if (name.toLowerCase().includes('setup')) {
          installerUrl = asset.browser_download_url;
          installerName = asset.name;
          if (asset.size) {
            installerSize = `${Math.round(asset.size / (1024 * 1024))}MB`;
          }
        } else {
          portableUrl = asset.browser_download_url;
          portableName = asset.name;
        }
      }
    });

    if (!installerUrl && assets.length > 0) {
      const firstExe = assets.find(a => (a.name || '').endsWith('.exe'));
      if (firstExe) {
        installerUrl = firstExe.browser_download_url;
        installerName = firstExe.name;
      }
    }

    if (installerUrl) {
      document.querySelectorAll('.direct-installer-link').forEach(link => {
        link.href = installerUrl;
        link.setAttribute('download', installerName);
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
        link.setAttribute('download', portableName);
      });
    }
  } catch (e) {
    console.debug('GitHub release lookup deferred to static fallback URLs', e);
  }
}

initDirectDownloads();

