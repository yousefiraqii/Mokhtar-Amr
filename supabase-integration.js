// Supabase dynamic integration for Mokhtar Amr Portfolio
(async function initSupabasePortfolio() {
  const config = window.SUPABASE_CONFIG || {};
  if (!config.url || !config.anonKey || config.url.includes('YOUR_SUPABASE_PROJECT_ID')) {
    console.log('[Supabase] Config not provided or placeholder used. Using static fallback content.');
    return;
  }

  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.warn('[Supabase] Supabase JS library is not loaded.');
    return;
  }

  const supabase = window.supabase.createClient(config.url, config.anonKey);

  // 1. Fetch Profile & Update Hero / Bio / Skills
  try {
    const { data: profile } = await supabase.from('profile').select('*').limit(1).single();
    if (profile) {
      if (profile.hero_title) {
        const roleLine = document.querySelector('.role-line');
        if (roleLine) roleLine.textContent = profile.hero_title;
      }
      if (profile.bio) {
        const descEl = document.querySelector('.left-copy .desc');
        if (descEl) descEl.textContent = profile.bio;
      }
    }
  } catch (err) {
    console.warn('[Supabase] Error loading profile:', err);
  }

  // 2. Fetch Projects & Render
  try {
    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!projError && projects && projects.length > 0) {
      const grid = document.querySelector('.projects-grid');
      if (grid) {
        let html = '';
        projects.forEach((p, idx) => {
          const indexStr = String(idx + 1).padStart(2, '0');
          const imageUrl = p.image_url || '';
          const hasImage = Boolean(imageUrl);
          
          let tagsHtml = '';
          if (p.tags && Array.isArray(p.tags) && p.tags.length > 0) {
            tagsHtml = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:12px 0;">' + 
              p.tags.map(t => '<span style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.06);border:1px solid var(--line);border-radius:4px;color:var(--grey);">' + escapeHtml(t) + '</span>').join('') + 
              '</div>';
          }

          let actionsHtml = '<div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;">';
          if (p.demo_url) {
            actionsHtml += '<a class="btn-solid" href="' + escapeHtml(p.demo_url) + '" target="_blank" rel="noopener">Live Demo</a>';
          }
          if (p.github_url) {
            actionsHtml += '<a class="btn-outline" href="' + escapeHtml(p.github_url) + '" target="_blank" rel="noopener">GitHub</a>';
          }
          if (!p.demo_url && !p.github_url) {
            actionsHtml += '<span class="btn-outline" style="cursor:default;opacity:0.6;">Featured Project</span>';
          }
          actionsHtml += '</div>';

          html += `
            <article class="project-card reveal is-in">
              <div class="project-photos ${hasImage ? 'single' : ''}">
                ${hasImage ? `
                  <div>
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(p.title)}" loading="lazy" decoding="async"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="img-fallback"><span class="ico">🖼️</span><strong>Cover photo</strong><span>${escapeHtml(p.title)}</span></div>
                  </div>
                ` : `
                  <div>
                    <div class="img-fallback" style="display:flex;"><span class="ico">📁</span><strong>${escapeHtml(p.title)}</strong></div>
                  </div>
                `}
              </div>
              <div class="project-body">
                <div class="project-index">${indexStr}</div>
                <div class="project-title">${escapeHtml(p.title)}</div>
                <p class="project-desc">${escapeHtml(p.description || p.long_description || '')}</p>
                ${tagsHtml}
                ${actionsHtml}
              </div>
            </article>
          `;
        });
        grid.innerHTML = html;

        // Update project count in stats
        const projectStatNum = document.querySelectorAll('.stat .num')[1];
        if (projectStatNum) {
          projectStatNum.innerHTML = projects.length + '<span>+</span>';
        }
      }
    }
  } catch (err) {
    console.warn('[Supabase] Error loading projects:', err);
  }

  // 3. Fetch Certificates & Render
  try {
    const { data: certs, error: certError } = await supabase
      .from('certificates')
      .select('*')
      .order('issue_date', { ascending: false });

    if (!certError && certs && certs.length > 0) {
      const certGrid = document.getElementById('certGrid');
      if (certGrid) {
        let html = '';
        certs.forEach((c, idx) => {
          const num = String(idx + 1).padStart(3, '0');
          const imageUrl = c.image_url || `Certificates/${num}.jpg`;
          const title = c.title || `Certificate ${idx + 1}`;
          const org = c.issuing_organization ? ` — ${c.issuing_organization}` : '';

          html += `
            <button type="button" class="cert-card reveal is-in" data-index="${idx + 1}" data-caption="${escapeHtml(title + org)}" aria-label="Open certificate ${escapeHtml(title)}">
              <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="img-fallback"><span class="ico">🏅</span><strong>${escapeHtml(title)}</strong><span>${escapeHtml(c.issuing_organization || '')}</span></div>
              <span class="cert-num">${num}</span>
            </button>
          `;
        });
        certGrid.innerHTML = html;

        // Update certificate section eyebrow
        const certEyebrow = document.querySelector('#certificates .eyebrow');
        if (certEyebrow) {
          certEyebrow.textContent = `${certs.length} & Counting`;
        }
      }
    }
  } catch (err) {
    console.warn('[Supabase] Error loading certificates:', err);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
