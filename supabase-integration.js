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

  // 1. Fetch Profile & Update Hero / Bio / Stats / Skills
  try {
    const { data: profile } = await supabase.from('profile').select('*').limit(1).single();
if (profile) {
      // 1.1 Hero Title (Greeting & Name)
      if (profile.hero_title) {
        const raw = profile.hero_title.trim();
        const greetingMatch = raw.match(/^(hi|hello|hey|welcome)[,\s]+i['’]m\s+(.+)$/i);
        const greetingEl = document.querySelector('.left-copy .greeting');
        const nameEl = document.querySelector('.left-copy .name');

        if (greetingMatch) {
          if (greetingEl) greetingEl.textContent = `${cap(greetingMatch[1])}, I'm`;
          if (nameEl) nameEl.innerHTML = escapeHtml(greetingMatch[2]).replace(/\s+/, '<br />');
        } else if (nameEl) {
          nameEl.innerHTML = escapeHtml(raw).replace(/\s+/, '<br />');
        }
      }

      // 1.2 Job Title (Top bar role & sub)
      if (profile.job_title) {
        const lines = profile.job_title.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
        const roleEl = document.querySelector('.topbar .role');
        const subEl = document.querySelector('.topbar .sub');
        if (roleEl && lines[0]) roleEl.textContent = lines[0];
        // Sub-role is optional; clear it when the admin only provided one line.
        if (subEl) subEl.textContent = lines[1] || '';
      }

      // 1.3 Job Title 2 (Under Name)
      if (profile.job_title_2) {
        const roleLine = document.querySelector('.left-copy .role-line');
        if (roleLine) {
          roleLine.innerHTML = escapeHtml(profile.job_title_2).replace(/\n/g, '<br />');
        }
      }

      // 1.4 About Paragraph (Hero paragraph)
      if (profile.about_paragraph || profile.bio) {
        const descEl = document.querySelector('.left-copy .desc');
        if (descEl) descEl.textContent = profile.about_paragraph || profile.bio;
      }

      // 1.5 Experience & Statistics
      const statEls = document.querySelectorAll('.stats .stat');
      if (statEls.length >= 3) {
        const updatedStatNumbers = [];
        // Stat 1: Years Experience
        if (profile.years_exp_value) {
          const num = statEls[0].querySelector('.num');
          if (num) {
            num.innerHTML = formatStatNum(profile.years_exp_value);
            updatedStatNumbers.push(num);
          }
        }
        if (profile.years_exp_label) {
          const label = statEls[0].querySelector('.label');
          if (label) label.innerHTML = escapeHtml(profile.years_exp_label).replace(/\s+/, '<br />');
        }

        // Stat 2: Projects Completed
        if (profile.projects_val_value) {
          const num = statEls[1].querySelector('.num');
          if (num) {
            num.innerHTML = formatStatNum(profile.projects_val_value);
            updatedStatNumbers.push(num);
          }
        }
        if (profile.projects_val_label) {
          const label = statEls[1].querySelector('.label');
          if (label) label.innerHTML = escapeHtml(profile.projects_val_label).replace(/\s+/, '<br />');
        }

        // Stat 3: Happy Clients
        if (profile.clients_val_value) {
          const num = statEls[2].querySelector('.num');
          if (num) {
            num.innerHTML = formatStatNum(profile.clients_val_value);
            updatedStatNumbers.push(num);
          }
        }
        if (profile.clients_val_label) {
          const label = statEls[2].querySelector('.label');
          if (label) label.innerHTML = escapeHtml(profile.clients_val_label).replace(/\s+/, '<br />');
        }

        if (updatedStatNumbers.length) {
          window.dispatchEvent(new CustomEvent('portfolio:stats-updated', {
            detail: { statNumbers: updatedStatNumbers },
          }));
        }
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
          const num = p.project_number ? String(p.project_number) : String(idx + 1).padStart(2, '0');
          const photo1 = normalizeAssetPath(p.image_url);
          const photo2 = normalizeAssetPath(p.image_url_2);
          const hasPhoto1 = Boolean(photo1);
          const hasPhoto2 = Boolean(photo2);
          const pdfLink = normalizeAssetPath(p.pdf_url || p.demo_url || '');

          const isSinglePhoto = (hasPhoto1 && !hasPhoto2) || (!hasPhoto1 && hasPhoto2);

          let photosHtml = '';
          if (hasPhoto1 || hasPhoto2) {
            photosHtml = `
              <div class="project-photos ${isSinglePhoto ? 'single' : ''}">
                ${hasPhoto1 ? `
                  <div>
                    <img src="${escapeHtml(photo1)}" alt="${escapeHtml(p.title)} — photo 1" loading="lazy" decoding="async"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="img-fallback"><span class="ico">🖼️</span><strong>Cover photo</strong><span>${escapeHtml(p.title)}</span></div>
                  </div>
                ` : ''}
                ${hasPhoto2 ? `
                  <div>
                    <img src="${escapeHtml(photo2)}" alt="${escapeHtml(p.title)} — photo 2" loading="lazy" decoding="async"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="img-fallback"><span class="ico">🖼️</span><strong>Photo 2</strong><span>${escapeHtml(p.title)}</span></div>
                  </div>
                ` : ''}
              </div>
            `;
          } else {
            photosHtml = `
              <div class="project-photos single">
                <div>
                  <div class="img-fallback" style="display:flex;"><span class="ico">📁</span><strong>${escapeHtml(p.title)}</strong></div>
                </div>
              </div>
            `;
          }

          html += `
            <article class="project-card reveal is-in">
              ${photosHtml}
              <div class="project-body">
                <div class="project-index">${escapeHtml(num)}</div>
                <div class="project-title">${escapeHtml(p.title)}</div>
                <p class="project-desc">${escapeHtml(p.description || p.long_description || '')}</p>
                ${pdfLink ? `<a class="btn-solid" href="${escapeHtml(pdfLink)}" target="_blank" rel="noopener">View Details</a>` : ''}
              </div>
            </article>
          `;
        });
        grid.innerHTML = html;
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
      .order('created_at', { ascending: true })
      .order('title', { ascending: true });

    if (!certError && certs && certs.length > 0) {
      const certGrid = document.getElementById('certGrid');
      if (certGrid) {
        let html = '';
        certs.forEach((c, idx) => {
          const num = String(idx + 1).padStart(3, '0');
          const imageUrl = normalizeAssetPath(c.image_url) || `Certificates/${num}.jpg`;
          const title = c.title || `Certificate ${idx + 1}`;

          html += `
            <button type="button" class="cert-card reveal is-in" data-cert-id="${escapeHtml(c.id)}" data-caption="${escapeHtml(title)}" aria-label="Open certificate ${escapeHtml(title)}">
              <span class="cert-photo">
                ${imageUrl ? `
                  <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy"
                       onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                  <span class="img-fallback"><span class="ico">🏅</span><strong>${escapeHtml(title)}</strong></span>
                ` : `
                  <span class="img-fallback" style="display:flex;"><span class="ico">🏅</span><strong>${escapeHtml(title)}</strong></span>
                `}
              </span>
              <span class="cert-body">
                <span class="cert-title">${escapeHtml(title)}</span>
                ${c.description ? `<span class="cert-desc">${escapeHtml(c.description)}</span>` : ''}
              </span>
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

  // 4. Fetch Volunteering Activities & Render
  try {
    const { data: volunteerItems, error: volError } = await supabase
      .from('volunteering')
      .select('*')
      .order('created_at', { ascending: false });

    if (!volError && volunteerItems && volunteerItems.length > 0) {
      const volGrid = document.querySelector('.volunteer-grid');
      if (volGrid) {
        let html = '';
volunteerItems.forEach((v) => {
          const photo1 = normalizeAssetPath(v.image_url);
          const photo2 = normalizeAssetPath(v.image_url_2);
          const hasPhoto1 = Boolean(photo1);
          const hasPhoto2 = Boolean(photo2);
          const isTwo = hasPhoto1 && hasPhoto2;

          let photosHtml = '';
          if (hasPhoto1 || hasPhoto2) {
            photosHtml = `
              <div class="volunteer-photos ${isTwo ? 'two' : 'single'}">
                ${hasPhoto1 ? `
                  <div>
                    <img src="${escapeHtml(photo1)}" alt="${escapeHtml(v.title)} — photo 1" loading="lazy" decoding="async"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="img-fallback"><span class="ico">🤝</span><strong>Photo 1</strong><span>${escapeHtml(v.title)}</span></div>
                  </div>
                ` : ''}
                ${hasPhoto2 ? `
                  <div>
                    <img src="${escapeHtml(photo2)}" alt="${escapeHtml(v.title)} — photo 2" loading="lazy" decoding="async"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="img-fallback"><span class="ico">🤝</span><strong>Photo 2</strong><span>${escapeHtml(v.title)}</span></div>
                  </div>
                ` : ''}
              </div>
            `;
          }

          html += `
            <div class="volunteer-card reveal is-in">
              ${photosHtml}
              <div class="volunteer-title">${escapeHtml(v.title)}</div>
              <p class="volunteer-desc">${escapeHtml(v.description || '')}</p>
            </div>
          `;
        });
        volGrid.innerHTML = html;
      }
    }
  } catch (err) {
    console.warn('[Supabase] Error loading volunteering:', err);
  }

  // 5. Fetch Research Papers & Render
  try {
    const { data: papers, error: papersError } = await supabase
      .from('research_papers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!papersError && papers && papers.length > 0) {
      const researchGrid = document.querySelector('.research-grid');
      if (researchGrid) {
        let html = '';
papers.forEach((p) => {
          const coverUrl = normalizeAssetPath(p.image_url);
          const hasCover = Boolean(coverUrl);
          const category = p.category || 'RESEARCH PAPER';
          const pdfLink = normalizeAssetPath(p.pdf_url || '');

          html += `
            <article class="research-card reveal is-in">
              <div class="research-cover">
                ${hasCover ? `
                  <img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(p.title)} cover" loading="lazy" decoding="async"
                       onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                  <div class="img-fallback"><span class="ico">📄</span><strong>Cover</strong></div>
                ` : `
                  <div class="img-fallback" style="display:flex;"><span class="ico">📄</span><strong>Cover</strong></div>
                `}
              </div>
              <div class="research-content">
                <div class="research-venue">${escapeHtml(category)}</div>
                <div class="research-title">${escapeHtml(p.title)}</div>
                <p class="research-desc">${escapeHtml(p.description || '')}</p>
                ${pdfLink ? `<a class="btn-outline" href="${escapeHtml(pdfLink)}" target="_blank" rel="noopener">Read Paper</a>` : ''}
              </div>
            </article>
          `;
        });
        researchGrid.innerHTML = html;
      }
    }
  } catch (err) {
    console.warn('[Supabase] Error loading research papers:', err);
  }

  function cap(str) {
    const s = String(str || '').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  // Resolve stale stored paths (e.g. `Pojects/Project 1/photo.jpg`) to the
  // actual files (space-free names after the asset cleanup). Leaves absolute /
  // external URLs untouched.
  function normalizeAssetPath(path) {
    if (!path) return '';
    const p = String(path).trim();
    if (/^(https?:|data:|blob:|\/\/)/i.test(p)) return p;
    return p.replace(/\s+/g, '_');
  }

  function formatStatNum(val) {
    const str = String(val).trim();
    if (str.endsWith('+')) {
      return escapeHtml(str.slice(0, -1)) + '<span>+</span>';
    }
    return escapeHtml(str);
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
