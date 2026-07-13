/* ════════════════════════════════════════════
   FRAMEWORK MAGAZINE — Template Editor
   ════════════════════════════════════════════ */

let state = {
  pages: [],
  folders: [],
  selectedPageId: null,
  imageTarget: null,      // { pageId, field }
  targetFolderId: null    // folder to assign next added page into
};

// ── UTILITIES ──────────────────────────────────────────────

function uid() {
  return 'p' + Date.now() + Math.floor(Math.random() * 100000);
}

function mkEl(tag, cls, text) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (text !== undefined) d.textContent = text;
  return d;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast toast-${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 2500);
}

// ── BOOT ───────────────────────────────────────────────────

async function boot() {
  try {
    const [pRes, fRes] = await Promise.all([fetch('/api/pages'), fetch('/api/folders')]);
    state.pages   = await pRes.json();
    state.folders = await fRes.json();
    renderAll();
    bindUI();
    // Restore last viewed page
    const lastId = localStorage.getItem('forage_last_page');
    if (lastId) setTimeout(() => scrollToPage(lastId), 150);
    // Track current page via IntersectionObserver
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) localStorage.setItem('forage_last_page', e.target.dataset.pageId); });
    }, { threshold: 0.5 });
    document.querySelectorAll('.page-wrapper[data-page-id]').forEach(el => observer.observe(el));
  } catch (e) {
    showToast('Failed to load. Is the server running?', 'error');
  }
}

async function saveFolders() {
  try {
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.folders)
    });
  } catch (e) {}
}

function createFolder() {
  const name = prompt('Folder name (e.g. Agency Name):');
  if (!name || !name.trim()) return;
  state.folders.push({ id: uid(), name: name.trim(), collapsed: false });
  saveFolders();
  renderSidebar();
  showToast('Folder created');
}

function showMoveFolderMenu(page, anchor) {
  document.querySelectorAll('.sb-move-dropdown').forEach(d => d.remove());
  if (state.folders.length === 0) {
    showToast('Create a folder first', 'error'); return;
  }
  const dropdown = mkEl('div', 'sb-move-dropdown');
  state.folders.forEach(folder => {
    const opt = mkEl('div', 'sb-move-opt', folder.name);
    if (page.folderId === folder.id) opt.classList.add('is-active');
    opt.onclick = () => {
      page.folderId = folder.id;
      savePages(true); dropdown.remove(); renderSidebar();
      showToast(`Moved to "${folder.name}"`);
    };
    dropdown.appendChild(opt);
  });
  if (page.folderId) {
    dropdown.appendChild(mkEl('div', 'sb-move-sep'));
    const rem = mkEl('div', 'sb-move-opt sb-move-remove', 'Remove from folder');
    rem.onclick = () => {
      delete page.folderId;
      savePages(true); dropdown.remove(); renderSidebar();
      showToast('Removed from folder');
    };
    dropdown.appendChild(rem);
  }
  document.body.appendChild(dropdown);
  const rect = anchor.getBoundingClientRect();
  dropdown.style.top  = `${rect.bottom + 4}px`;
  dropdown.style.left = `${Math.min(rect.left, window.innerWidth - 180)}px`;
  setTimeout(() => {
    document.addEventListener('click', function close() {
      dropdown.remove();
      document.removeEventListener('click', close);
    });
  }, 0);
}

// ── PERSIST ────────────────────────────────────────────────

let _saveTimer = null;
async function savePages(silent = false) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.pages)
      });
      if (!silent) showToast('Saved');
    } catch (e) {
      showToast('Save failed', 'error');
    }
  }, 800);
}

// ── RENDER ─────────────────────────────────────────────────

function renderAll() {
  renderSidebar();
  renderCanvas();
}

// ── SIDEBAR ────────────────────────────────────────────────

const TYPE_META = {
  cover:     { label: 'Cover Page', color: '#0B0F14' },
  coverCollage: { label: 'Cover Page Collage', color: '#0B0F14' },
  article:   { label: 'Int Page- Temp 1', color: '#2a2a2a' },
  vision:    { label: 'Int Page- Temp 2', color: '#1a0d00' },
  profile:   { label: 'Int Page- Temp 3', color: '#0a1a0a' },
  interview: { label: 'Int Page- Temp 4', color: '#0a0a2a' },
  stats:     { label: 'Int Page- Temp 5', color: '#0d0d0d' },
  gallery:   { label: 'Int Page- Temp 6', color: '#1a0a0a' },
  showcase:  { label: 'Int Page- Temp 7', color: '#1a0a1a' },
  spotlight:  { label: 'Int Page- Temp 8', color: '#0B0F14' },
  editorial:  { label: 'Int Page- Temp 9', color: '#ffffff' },
  duo:        { label: 'Int Page- Temp 10', color: '#ffffff' },
  team:       { label: 'Int Page- Temp 11', color: '#ffffff' },
  person:     { label: 'Int Page- Temp 12', color: '#ffffff' },
  feature:    { label: 'Int Page- Temp 13', color: '#0B0F14' },
  impact:     { label: 'Int Page- Temp 14', color: '#ffffff' },
  widetext:   { label: 'Int Page- Temp 15', color: '#ffffff' },
  showcase2:  { label: 'Int Page- Temp 16', color: '#1a0a1a' },
  twocol:     { label: 'Int Page- Temp 17', color: '#ffffff' },
  impact2:    { label: 'Int Page- Temp 18', color: '#ffffff' },
  stats2:     { label: 'Int Page- Temp 19', color: '#ffffff' },
  sidebar:    { label: 'Int Page- Temp 20', color: '#ffffff' },
  stats3:     { label: 'Int Page- Temp 21', color: '#ffffff' }
};

function getTypeMeta(type) {
  return TYPE_META[type] || { label: type.toUpperCase(), color: '#333' };
}

function getPageTitle(page) {
  return page.agency || page.personName || page.articleHeadline || getTypeMeta(page.type).label;
}

function buildSbPageItem(page, globalIdx) {
  const meta   = getTypeMeta(page.type);
  const accent = page.accentColor || '#E4022D';

  const item = mkEl('div', 'sb-item');
  item.dataset.pageId = page.id;

  const left = mkEl('div', 'sb-item-left');
  left.appendChild(mkEl('span', 'sb-num', String(globalIdx + 1).padStart(2, '0')));
  const badge = mkEl('span', 'sb-type-badge', meta.label);
  badge.style.cssText = `background:${accent};color:#000;`;
  left.appendChild(badge);
  left.appendChild(mkEl('span', 'sb-item-name', getPageTitle(page)));
  left.onclick = () => scrollToPage(page.id);

  const actions = mkEl('div', 'sb-item-actions');
  const editBtn = mkEl('button', 'sb-btn sb-btn-edit', '✏');
  const dupBtn  = mkEl('button', 'sb-btn sb-btn-dup',  '⧉');
  const moveBtn = mkEl('button', 'sb-btn sb-btn-move', '📁');
  const delBtn  = mkEl('button', 'sb-btn sb-btn-del',  '✕');
  editBtn.title = 'Edit';  dupBtn.title  = 'Duplicate';
  moveBtn.title = 'Move to folder'; delBtn.title = 'Delete';
  editBtn.onclick = (e) => { e.stopPropagation(); openEditPanel(page.id); };
  dupBtn.onclick  = (e) => { e.stopPropagation(); duplicatePage(page.id); };
  moveBtn.onclick = (e) => { e.stopPropagation(); showMoveFolderMenu(page, moveBtn); };
  delBtn.onclick  = (e) => { e.stopPropagation(); deletePage(page.id); };
  actions.appendChild(editBtn);
  actions.appendChild(dupBtn);
  actions.appendChild(moveBtn);
  actions.appendChild(delBtn);

  item.appendChild(left);
  item.appendChild(actions);
  return item;
}

function renderSidebar() {
  const list = document.getElementById('sidebarList');
  list.innerHTML = '';

  // Map pageId → global index
  const idxMap = {};
  state.pages.forEach((p, i) => { idxMap[p.id] = i; });

  // ── Folders ──
  state.folders.forEach(folder => {
    const folderPages = state.pages.filter(p => p.folderId === folder.id);

    const folderEl = mkEl('div', 'sb-folder');

    const hdr = mkEl('div', 'sb-folder-header');
    const toggle = mkEl('span', 'sb-folder-toggle', folder.collapsed ? '▶' : '▼');
    const nameEl = mkEl('span', 'sb-folder-name', folder.name);
    const fActs  = mkEl('div', 'sb-folder-actions');
    const renBtn = mkEl('button', 'sb-btn', '✏');
    const delBtn = mkEl('button', 'sb-btn sb-folder-del', '✕');
    renBtn.title = 'Rename'; delBtn.title = 'Delete folder';

    renBtn.onclick = (e) => {
      e.stopPropagation();
      const n = prompt('Rename folder:', folder.name);
      if (n && n.trim()) { folder.name = n.trim(); saveFolders(); renderSidebar(); }
    };
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (!confirm(`Delete folder "${folder.name}"?\nPages will become unassigned.`)) return;
      state.pages.forEach(p => { if (p.folderId === folder.id) delete p.folderId; });
      state.folders = state.folders.filter(f => f.id !== folder.id);
      saveFolders(); savePages(true); renderAll();
    };

    const addBtn = mkEl('button', 'sb-btn sb-folder-add', '+');
    addBtn.title = 'Add page to this folder';
    addBtn.onclick = (e) => { e.stopPropagation(); openAddMenu(folder.id); };

    fActs.appendChild(addBtn);
    fActs.appendChild(renBtn);
    fActs.appendChild(delBtn);
    hdr.appendChild(toggle);
    hdr.appendChild(nameEl);
    hdr.appendChild(fActs);
    hdr.onclick = () => { folder.collapsed = !folder.collapsed; saveFolders(); renderSidebar(); };

    folderEl.appendChild(hdr);

    if (!folder.collapsed) {
      const pagesWrap = mkEl('div', 'sb-folder-pages');
      if (folderPages.length === 0) {
        pagesWrap.appendChild(mkEl('div', 'sb-folder-empty', 'No pages yet — use 📁 to assign'));
      } else {
        folderPages.forEach(page => pagesWrap.appendChild(buildSbPageItem(page, idxMap[page.id])));
      }
      folderEl.appendChild(pagesWrap);
    }

    list.appendChild(folderEl);
  });

  // ── Unassigned pages ──
  const unassigned = state.pages.filter(p => !p.folderId || !state.folders.find(f => f.id === p.folderId));
  if (unassigned.length > 0) {
    if (state.folders.length > 0) {
      list.appendChild(mkEl('div', 'sb-unassigned-label', 'UNASSIGNED'));
    }
    unassigned.forEach(page => list.appendChild(buildSbPageItem(page, idxMap[page.id])));
  }
}

// ── CANVAS ─────────────────────────────────────────────────

function renderCanvas() {
  const container = document.getElementById('pagesContainer');
  container.innerHTML = '';

  state.pages.forEach((page, i) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'page-wrapper';
    wrapper.dataset.pageId = page.id;

    const label = mkEl('div', 'page-wrapper-label no-print',
      `${getTypeMeta(page.type).label} — PAGE ${i + 1} OF ${state.pages.length}`);
    wrapper.appendChild(label);

    wrapper.appendChild(buildPage(page, i));

    const controls = mkEl('div', 'page-controls no-print');
    const editBtn = mkEl('button', 'pc-btn pc-edit', '✏ EDIT');
    const dupBtn  = mkEl('button', 'pc-btn pc-dup',  '⧉ DUPLICATE');
    const delBtn  = mkEl('button', 'pc-btn pc-del',  '✕ DELETE');
    editBtn.onclick = () => openEditPanel(page.id);
    dupBtn.onclick  = () => duplicatePage(page.id);
    delBtn.onclick  = () => deletePage(page.id);

    // Download dropdown
    const dlWrap = mkEl('div', 'pc-dl-wrap');
    const dlBtn  = mkEl('button', 'pc-btn pc-dl', '⬇ DOWNLOAD ▾');
    const dlMenu = mkEl('div', 'pc-dl-menu');
    ['PNG', 'PDF', 'HTML', 'SVG'].forEach(fmt => {
      const item = mkEl('button', 'pc-dl-item', fmt);
      item.onclick = (e) => {
        e.stopPropagation();
        dlMenu.classList.remove('open');
        exportPage(page.id, i + 1, fmt.toLowerCase());
      };
      dlMenu.appendChild(item);
    });
    dlBtn.onclick = (e) => {
      e.stopPropagation();
      // close any other open menus
      document.querySelectorAll('.pc-dl-menu.open').forEach(m => { if (m !== dlMenu) m.classList.remove('open'); });
      dlMenu.classList.toggle('open');
    };
    dlWrap.appendChild(dlBtn);
    dlWrap.appendChild(dlMenu);

    controls.appendChild(editBtn);
    controls.appendChild(dupBtn);
    controls.appendChild(dlWrap);
    controls.appendChild(delBtn);
    wrapper.appendChild(controls);

    container.appendChild(wrapper);
  });
}

function scrollToPage(id) {
  const el = document.querySelector(`.page-wrapper[data-page-id="${id}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── PAGE FACTORY ───────────────────────────────────────────

function buildPage(page, index) {
  switch (page.type) {
    case 'cover':     return buildCoverPage(page, index);
    case 'coverCollage': return buildCoverCollagePage(page, index);
    case 'article':   return buildArticlePage(page, index);
    case 'vision':    return buildVisionPage(page, index);
    case 'vision2':   return buildVision2Page(page, index);
    case 'profile':   return buildProfilePage(page, index);
    case 'interview': return buildInterviewPage(page, index);
    case 'stats':     return buildStatsPage(page, index);
    case 'gallery':   return buildGalleryPage(page, index);
    case 'showcase':  return buildShowcasePage(page, index);
    case 'spotlight': return buildSpotlightPage(page, index);
    case 'editorial': return buildEditorialPage(page, index);
    case 'duo':       return buildDuoPage(page, index);
    case 'team':      return buildTeamPage(page, index);
    case 'feature':   return buildFeaturePage(page, index);
    case 'impact':    return buildImpactPage(page, index);
    case 'widetext':  return buildWidetextPage(page, index);
    case 'showcase2': return buildShowcase2Page(page, index);
    case 'twocol':    return buildTwocolPage(page, index);
    case 'impact2':   return buildImpact2Page(page, index);
    case 'statsBanner': return buildStatsBannerPage(page, index);
    case 'stats2':    return buildStats2Page(page, index);
    case 'sidebar':   return buildSidebarPage(page, index);
    case 'stats3':    return buildStats3Page(page, index);
    default:          return buildArticlePage(page, index);
  }
}

// ── COVER PAGE ─────────────────────────────────────────────

function buildCoverPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-agency-cover');
  div.dataset.pageId = page.id;
  div.style.cssText = `--cbw-accent:${accent};--cover-fear-size:${page.coverFearSize != null ? page.coverFearSize : 16}px;--cover-name-gap:${page.coverNameGap != null ? page.coverNameGap : 12}px;--cover-name-x:${page.coverNameX != null ? page.coverNameX : 0}px;--badge-x:${page.badgePosX != null ? page.badgePosX : 0}px;--badge-y:${page.badgePosY != null ? page.badgePosY : 0}px;--desig-x:${page.desigPosX != null ? page.desigPosX : 0}px;--desig-y:${page.desigPosY != null ? page.desigPosY : 0}px;--extra-line-size:${page.extraLineSize != null ? page.extraLineSize : 13}px;--extra-line-x:${page.extraLineX != null ? page.extraLineX : 0}px;--extra-line-y:${page.extraLineY != null ? page.extraLineY : 0}px;`;

  // ── FULL-BLEED PHOTO ──
  const photo = mkEl('div', 'cbw-photo');
  photo.appendChild(buildImgLayer(page, 'coverImage', 'coverImageX', 'coverImageY', 'coverImageZoom', 'bgsize'));
  photo.appendChild(mkEl('div', 'cbw-photo-overlay'));

  // ── MASTHEAD OVERLAY (top of photo) ──
  const header = mkEl('div', 'cbw-masthead');
  header.appendChild(mkEl('div', 'cbw-agency-feature-label', 'AGENCY FEATURE'));
  const titleWrap = mkEl('div', 'cbw-title-wrap');
  const titleEl = mkEl('div', 'cbw-title');
  titleEl.appendChild(mkEl('span', '', 'FRAME'));
  titleEl.appendChild(mkEl('span', 'cbw-title-accent', 'WORK'));
  titleWrap.appendChild(titleEl);
  header.appendChild(titleWrap);
  const taglineRow = mkEl('div', 'cbw-tagline-row');
  taglineRow.appendChild(inlineEditable('span', 'cbw-tagline',
    page.coverHeadline || 'Scaling agencies in 2026', page, 'coverHeadline'));
  taglineRow.appendChild(inlineEditable('span', 'cbw-by', page.coverIssue || 'ISSUE #004', page, 'coverIssue'));
  header.appendChild(taglineRow);
  photo.appendChild(header);

  if (!page.simpleCover) {
    // Mid row: badge (left) + designation (right) — same horizontal line
    const midRow = mkEl('div', 'cbw-mid-row');

    const badge = mkEl('div', 'cbw-badge');
    badge.appendChild(inlineEditable('div', 'cbw-badge-script',
      page.badgeScript || 'Elite', page, 'badgeScript'));
    badge.appendChild(inlineEditable('div', 'cbw-badge-bold',
      page.badgeBold || 'Business Minds', page, 'badgeBold'));
    badge.appendChild(inlineEditable('div', 'cbw-badge-year',
      page.badgeYear || '2026', page, 'badgeYear'));
    midRow.appendChild(badge);

    const desig = mkEl('div', 'cbw-designation');
    desig.appendChild(inlineEditable('div', 'cbw-desig-title',
      page.personTitle || 'Designation', page, 'personTitle'));
    desig.appendChild(inlineEditable('div', 'cbw-desig-company',
      page.agency || 'Company Name', page, 'agency'));
    midRow.appendChild(desig);

    photo.appendChild(midRow);
  }

  // Bottom section
  const bottom = mkEl('div', 'cbw-bottom');
  const inner = mkEl('div', 'cbw-bottom-inner');
  const btmLeft = mkEl('div', 'cbw-bottom-left');

  if (page.simpleCover) {
    // Badge sits in the footer for the simple cover variant
    const badge = mkEl('div', 'cbw-badge');
    badge.appendChild(inlineEditable('div', 'cbw-badge-script',
      page.badgeScript || 'Elite', page, 'badgeScript'));
    badge.appendChild(inlineEditable('div', 'cbw-badge-bold',
      page.badgeBold || 'Business Minds', page, 'badgeBold'));
    badge.appendChild(inlineEditable('div', 'cbw-badge-year',
      page.badgeYear || '2026', page, 'badgeYear'));
    btmLeft.appendChild(badge);
  } else {
    // Logo above name
    const logoWrap = mkEl('div', 'cbw-agency-logo-wrap');
    if (page.agencyLogoUrl) {
      const logo = mkEl('img', 'cbw-agency-logo-img');
      logo.src = page.agencyLogoUrl;
      logo.alt = page.agency || '';
      logoWrap.appendChild(logo);
    }
    logoWrap.appendChild(buildImgOverlay(page.id, 'agencyLogoUrl', 'Agency Logo'));
    btmLeft.appendChild(logoWrap);

    // Name + red divider + fear text inline below logo
    const nameRow = mkEl('div', 'cbw-name-row');
    const nameEl = mkEl('div', 'cbw-person-name');
    nameEl.contentEditable = 'true';
    nameEl.innerHTML = (page.personName || 'Full Name').replace(/\n/g, '<br>');
    nameEl.addEventListener('blur', () => { page.personName = nameEl.innerText; savePages(true); });
    nameRow.appendChild(nameEl);
    nameRow.appendChild(mkEl('div', 'cbw-name-divider'));
    nameRow.appendChild(inlineEditable('div', 'cbw-fear-text',
      page.fearText || 'Fear Of Missing Out', page, 'fearText'));
    btmLeft.appendChild(nameRow);

    if (page.coverExtraLine) {
      btmLeft.appendChild(inlineEditable('div', 'cbw-extra-line',
        page.coverExtraText || 'Add your text here', page, 'coverExtraText'));
    }
  }

  inner.appendChild(btmLeft);
  bottom.appendChild(inner);
  photo.appendChild(bottom);
  photo.appendChild(buildImgOverlay(page.id, 'coverImage', 'Cover Photo'));
  div.appendChild(photo);

  return div;
}

// ── COVER COLLAGE PAGE ─────────────────────────────────────

function buildCoverCollagePage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-cover-collage');
  div.dataset.pageId = page.id;
  div.style.cssText = `--cbw-accent:${accent};`;

  // ── COLLAGE GRID (10 image cells) ──
  const grid = mkEl('div', 'cc-grid');
  const images = page.ccImages && page.ccImages.length ? page.ccImages : Array(10).fill({ url: '', x: 50, y: 50, zoom: 100 });

  images.forEach((img, i) => {
    const cell = mkEl('div', 'cc-cell');
    // Build image layer manually for per-slot images
    const layer = mkEl('div', 'cc-img-layer');
    if (img.url) {
      layer.style.backgroundImage = `url('${img.url}')`;
      layer.style.backgroundSize = `${img.zoom || 100}%`;
      layer.style.backgroundPosition = `${img.x || 50}% ${img.y || 50}%`;
    }
    cell.appendChild(layer);
    // Upload overlay
    const ov = mkEl('div', 'img-upload-overlay');
    const btn = mkEl('button', 'img-upload-btn', '+ Photo');
    btn.dataset.pageId = page.id;
    btn.dataset.imgKey = `ccImg_${i}`;
    btn.onclick = (e) => {
      e.stopPropagation();
      state.imageTarget = { pageId: page.id, field: `ccImg_${i}` };
      openImageModal();
    };
    cell.appendChild(ov);
    ov.appendChild(btn);
    grid.appendChild(cell);
  });

  div.appendChild(grid);

  // ── TEXT OVERLAY ──
  if (page.ccShowText !== false) {
    const overlay = mkEl('div', 'cc-text-overlay');

    // Masthead top: Framework title + tagline row only
    const header = mkEl('div', 'cbw-masthead');
    const titleWrap = mkEl('div', 'cbw-title-wrap');
    const titleEl = mkEl('div', 'cbw-title');
    titleEl.appendChild(mkEl('span', '', 'FRAME'));
    titleEl.appendChild(mkEl('span', 'cbw-title-accent', 'WORK'));
    titleWrap.appendChild(titleEl);
    header.appendChild(titleWrap);
    const taglineRow = mkEl('div', 'cbw-tagline-row');
    taglineRow.appendChild(inlineEditable('span', 'cbw-tagline',
      page.coverHeadline || 'Scaling agencies in 2026', page, 'coverHeadline'));
    taglineRow.appendChild(inlineEditable('span', 'cbw-by', page.coverIssue || 'ISSUE #004', page, 'coverIssue'));
    header.appendChild(taglineRow);
    overlay.appendChild(header);

    // Bottom: badge only — Elite Business Minds 2026
    const bottom = mkEl('div', 'cbw-bottom');
    const inner = mkEl('div', 'cbw-bottom-inner');
    const btmLeft = mkEl('div', 'cbw-bottom-left');
    const badge = mkEl('div', 'cbw-badge');
    badge.appendChild(inlineEditable('div', 'cbw-badge-script', page.badgeScript || 'Elite', page, 'badgeScript'));
    badge.appendChild(inlineEditable('div', 'cbw-badge-bold', page.badgeBold || 'Business Minds', page, 'badgeBold'));
    badge.appendChild(inlineEditable('div', 'cbw-badge-year', page.badgeYear || '2026', page, 'badgeYear'));
    btmLeft.appendChild(badge);
    inner.appendChild(btmLeft);
    bottom.appendChild(inner);
    overlay.appendChild(bottom);

    div.appendChild(overlay);
  }

  return div;
}

function buildCoverCollageFields(body, page) {
  // ── TEXT OVERLAY TOGGLE ──
  addSectionTitle(body, 'TEXT OVERLAY');
  const ccTToggleWrap = mkEl('div', 'field-group');
  const ccTToggleLabel = mkEl('label', 'toggle-label');
  const ccTChk = document.createElement('input');
  ccTChk.type = 'checkbox'; ccTChk.dataset.field = 'ccShowText';
  ccTChk.checked = page.ccShowText !== false;
  ccTToggleLabel.appendChild(ccTChk);
  ccTToggleLabel.appendChild(document.createTextNode(' Show Text Overlay'));
  ccTToggleWrap.appendChild(ccTToggleLabel);
  body.appendChild(ccTToggleWrap);

  addSectionTitle(body, 'EDITION BADGE');
  addField(body, 'Badge Script (line 1)', 'badgeScript', page.badgeScript || 'Elite');
  addField(body, 'Badge Bold (line 2)', 'badgeBold', page.badgeBold || 'Business Minds');
  addField(body, 'Badge Year (line 3)', 'badgeYear', page.badgeYear || '2026');

  addSectionTitle(body, 'CONTENT');
  addField(body, 'Tagline', 'coverHeadline', page.coverHeadline || 'Scaling agencies in 2026');
  addField(body, 'Issue Label', 'coverIssue', page.coverIssue || 'ISSUE #004');

  // ── COLLAGE IMAGES ──
  addSectionTitle(body, 'COLLAGE IMAGES');
  const ccImages = page.ccImages && page.ccImages.length ? page.ccImages : Array(10).fill(null).map(() => ({ url: '', x: 50, y: 50, zoom: 100 }));

  const ccContainer = mkEl('div', 'vision-paras-container');

  function addCCImageField(i, img) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Image ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => {
      wrap.remove();
      ccContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => {
        w.querySelector('label').textContent = `Image ${j + 1}`;
      });
    };
    lr.appendChild(rb); wrap.appendChild(lr);

    // Upload button
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'btn-upload-field';
    uploadBtn.textContent = img && img.url ? '✓ Photo uploaded' : '+ Upload Photo';
    uploadBtn.dataset.pageId = page.id;
    uploadBtn.dataset.imgKey = `ccImg_${i}`;
    uploadBtn.addEventListener('click', () => {
      state.imageTarget = { pageId: page.id, field: `ccImg_${i}` };
      openImageModal();
    });
    wrap.appendChild(uploadBtn);

    // Position sliders
    const xSlider = addSliderField(wrap, 'Left / Right', `ccImg_${i}_x`, img ? img.x : 50);
    const ySlider = addSliderField(wrap, 'Up / Down', `ccImg_${i}_y`, img ? img.y : 50);
    const zSlider = addSliderField(wrap, 'Zoom', `ccImg_${i}_z`, img ? img.zoom : 100, 80, 200);

    xSlider.addEventListener('input', () => updateCCImage(page, i, 'x', parseFloat(xSlider.value)));
    ySlider.addEventListener('input', () => updateCCImage(page, i, 'y', parseFloat(ySlider.value)));
    zSlider.addEventListener('input', () => updateCCImage(page, i, 'zoom', parseFloat(zSlider.value)));

    ccContainer.appendChild(wrap);
  }

  function updateCCImage(page, i, prop, val) {
    if (!page.ccImages) page.ccImages = [];
    if (!page.ccImages[i]) page.ccImages[i] = { url: '', x: 50, y: 50, zoom: 100 };
    page.ccImages[i][prop] = val;
    // Live update the cell
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) {
      const layer = pageEl.querySelectorAll('.cc-img-layer')[i];
      if (layer) {
        layer.style.backgroundPosition = `${page.ccImages[i].x}% ${page.ccImages[i].y}%`;
        layer.style.backgroundSize = `${page.ccImages[i].zoom}%`;
      }
    }
    savePages(true);
  }

  ccImages.forEach((img, i) => addCCImageField(i, img));
  body.appendChild(ccContainer);

  const addImgBtn = mkEl('button', 'btn-add-para', '+ Add Image Slot'); addImgBtn.type = 'button';
  addImgBtn.onclick = () => {
    const idx = ccContainer.querySelectorAll('.vision-para-wrap').length;
    if (!page.ccImages) page.ccImages = [];
    page.ccImages.push({ url: '', x: 50, y: 50, zoom: 100 });
    addCCImageField(idx, { url: '', x: 50, y: 50, zoom: 100 });
  };
  body.appendChild(addImgBtn);
}

// ── ARTICLE PAGE ───────────────────────────────────────────

function buildArticlePage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const accentBg = hexToRgba(accent, 0.06);
  const div = mkEl('div', 'mag-page page-article');
  div.dataset.pageId = page.id;
  const artImgColW = page.artImgColWidth != null ? page.artImgColWidth : 44;
  div.style.cssText = `--art-accent:${accent};--art-accent-bg:${accentBg};--art-img-height:${page.artImgHeight != null ? page.artImgHeight : 610}px;--art-img-col-width:${artImgColW}%;--art-para-gap:${page.artParaGap != null ? page.artParaGap : 8}px;--art-head-sub-gap:${page.artHeadSubGap != null ? page.artHeadSubGap : 8}px;--art-sub-rule-gap:${page.artSubRuleGap != null ? page.artSubRuleGap : 9}px;--art-rule-para-gap:${page.artRuleParaGap != null ? page.artRuleParaGap : 7}px;`;

  // Running header
  const header = mkEl('div', 'art-run-header');
  header.appendChild(mkEl('div', 'art-rh-bar-thick'));
  const rhMeta = mkEl('div', 'art-rh-meta');
  rhMeta.appendChild(inlineEditable('span', 'art-rh-section', page.edLabel || 'AGENCY FEATURE', page, 'edLabel'));
  rhMeta.appendChild(inlineEditable('span', 'art-rh-date', page.edDate || 'APRIL 2026', page, 'edDate'));
  header.appendChild(rhMeta);
  header.appendChild(mkEl('div', 'art-rh-bar-thin'));
  div.appendChild(header);

  const cols = mkEl('div', 'art-columns');

  // Left column
  const left = mkEl('div', 'art-col-left');
  left.appendChild(inlineEditable('h2', 'art-headline', page.articleHeadline || 'ARTICLE HEADLINE', page, 'articleHeadline'));
  left.appendChild(inlineEditable('p', 'art-subheadline', page.articleSubheadline || 'Supporting subheadline text', page, 'articleSubheadline'));
  left.appendChild(mkEl('div', 'art-divider-rule'));

  const body = page.articleBody && page.articleBody.length ? page.articleBody : ['First paragraph…', 'Second paragraph…'];
  body.forEach((para, pi) => {
    const cls = pi === 0 ? 'art-para art-para-dropcap' : 'art-para';
    left.appendChild(inlineEditable('p', cls, para, page, `articleBody_${pi}`));
  });

  const extraPara = mkEl('div', 'art-left-extra');
  extraPara.appendChild(inlineEditable('h3', 'art-left-extra-heading',
    page.articleExtraHeading || 'Section Heading', page, 'articleExtraHeading'));
  const extraParas = page.articleExtraParas && page.articleExtraParas.length
    ? page.articleExtraParas
    : [page.articleExtraPara || 'Add supplementary content here.'];
  extraParas.forEach((para, i) => {
    const p = mkEl('p', 'art-left-extra-text');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.articleExtraParas) page.articleExtraParas = [...extraParas];
      page.articleExtraParas[i] = p.innerHTML;
      savePages(true);
    });
    extraPara.appendChild(p);
  });
  left.appendChild(extraPara);

  cols.appendChild(left);

  // Right column
  const right = mkEl('div', 'art-col-right');

  const imgBox = mkEl('div', 'art-img-box');
  imgBox.appendChild(buildImgLayer(page, 'articleImage', 'articleImageX', 'articleImageY', 'articleImageZoom'));
  imgBox.appendChild(buildImgOverlay(page.id, 'articleImage', 'Feature Image'));
  right.appendChild(imgBox);

  const pq = mkEl('div', 'art-pullquote');
  pq.appendChild(inlineEditable('p', 'art-pq-text', page.pullQuote || 'Pull quote here…', page, 'pullQuote'));
  right.appendChild(pq);


  if (page.highlights && page.highlights.length) {
    const statBox = mkEl('div', 'art-stat-box');
    page.highlights.forEach(h => {
      const row = mkEl('div', 'art-stat-row');
      row.appendChild(mkEl('span', 'art-stat-val', h.value));
      row.appendChild(mkEl('span', 'art-stat-lbl', h.label));
      statBox.appendChild(row);
    });
    right.appendChild(statBox);
  }

  cols.appendChild(right);
  div.appendChild(cols);

  // Running footer
  div.appendChild(buildRunFooter(page, index));
  return div;
}

// ── VISION / QUOTE PAGE ────────────────────────────────────

function buildVisionPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-vision');
  div.dataset.pageId = page.id;
  div.style.cssText = `--vs-accent:${accent};`;

  // ── TOP: hero banner image ──
  const hero = mkEl('div', 'vs-hero');
  hero.appendChild(buildImgLayer(page, 'heroImage', 'heroImageX', 'heroImageY', 'heroImageZoom'));
  if (page.vsHeroOverlay !== false) hero.appendChild(mkEl('div', 'vs-hero-overlay'));
  hero.appendChild(buildImgOverlay(page.id, 'heroImage', 'Hero Banner Image'));
  div.appendChild(hero);

  // ── BOTTOM: 2-column layout ──
  const bottom = mkEl('div', 'vs-bottom');

  // Left: portrait image (40%)
  const leftCol = mkEl('div', 'vs-left');
  const portrait = mkEl('div', 'vs-portrait');
  portrait.appendChild(buildImgLayer(page, 'articleImage', 'articleImageX', 'articleImageY', 'articleImageZoom'));
  portrait.appendChild(buildImgOverlay(page.id, 'articleImage', 'Portrait Image'));
  leftCol.appendChild(portrait);
  bottom.appendChild(leftCol);

  // Right: article content (60%)
  const rightCol = mkEl('div', 'vs-right');

  // Running label
  const label = mkEl('div', 'vs-run-label');
  label.appendChild(mkEl('span', 'vs-run-line'));
  const runText = mkEl('span', 'vs-run-text');
  runText.appendChild(inlineEditable('span', '', page.edLabel || 'AGENCY FEATURE', page, 'edLabel'));
  runText.appendChild(document.createTextNode('  ·  '));
  runText.appendChild(inlineEditable('span', '', page.edDate || 'APRIL 2026', page, 'edDate'));
  label.appendChild(runText);
  rightCol.appendChild(label);

  // Bold headline
  rightCol.appendChild(inlineEditable('div', 'vs-headline',
    page.articleHeadline || 'A Bold Headline That Commands Attention', page, 'articleHeadline'));

  // Paragraphs
  (page.visionParas || ['Paragraph one goes here.', 'Paragraph two goes here.']).forEach((para, i) => {
    const p = mkEl('div', 'vs-para');
    p.contentEditable = 'true';
    p.textContent = para;
    p.addEventListener('blur', () => {
      if (!page.visionParas) page.visionParas = [];
      page.visionParas[i] = p.textContent;
      savePages(true);
    });
    rightCol.appendChild(p);
  });

  // Quote box — toggleable
  if (page.vsShowQuote !== false) {
    const qBox = mkEl('div', 'vs-quote-box');
    qBox.appendChild(mkEl('div', 'vs-qmark', '”'));
    qBox.appendChild(inlineEditable('p', 'vs-quote-text',
      page.pullQuote || 'An inspiring quote that captures the vision.', page, 'pullQuote'));
    rightCol.appendChild(qBox);
  }

  bottom.appendChild(rightCol);
  div.appendChild(bottom);
  div.appendChild(buildRunFooter(page, index));

  return div;
}

// ── VISION 2 / DUAL-IMAGE TOP PAGE ────────────────────────

function buildVision2Page(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-vision2');
  div.dataset.pageId = page.id;
  const portraitH = page.vs2PortraitHeight != null ? page.vs2PortraitHeight : (page.vs2ShowLeftQuote ? 65 : 100);
  div.style.cssText = `--vs-accent:${accent};--vs2-top-height:${page.vs2TopHeight != null ? page.vs2TopHeight : 30}%;--vs2-portrait-height:${portraitH}%;--vs2-para-gap:${page.vs2ParaGap != null ? page.vs2ParaGap : 8}px;--vs2-quote-size:${page.vs2QuoteSize != null ? page.vs2QuoteSize : 9.5}px;--vs2-label-head-gap:${page.vs2LabelHeadGap != null ? page.vs2LabelHeadGap : 10}px;--vs2-quote-box-height:${page.vs2QuoteBoxHeight != null ? page.vs2QuoteBoxHeight : 35}%;`;

  // ── TOP: two side-by-side images ──
  const topImages = mkEl('div', 'vs2-top-images');

  const img1 = mkEl('div', 'vs2-img-box');
  img1.appendChild(buildImgLayer(page, 'vision2Image1', 'vision2Image1X', 'vision2Image1Y', 'vision2Image1Zoom'));
  img1.appendChild(buildImgOverlay(page.id, 'vision2Image1', 'Top Image 1 (Left)'));
  topImages.appendChild(img1);

  const img2 = mkEl('div', 'vs2-img-box');
  img2.appendChild(buildImgLayer(page, 'vision2Image2', 'vision2Image2X', 'vision2Image2Y', 'vision2Image2Zoom'));
  img2.appendChild(buildImgOverlay(page.id, 'vision2Image2', 'Top Image 2 (Right)'));
  topImages.appendChild(img2);

  div.appendChild(topImages);

  // ── BOTTOM: 2-column layout (same as Temp 2) ──
  const bottom = mkEl('div', 'vs-bottom');

  // Left: portrait image (40%)
  const leftCol = mkEl('div', 'vs-left');
  const portrait = mkEl('div', 'vs-portrait');
  portrait.appendChild(buildImgLayer(page, 'articleImage', 'articleImageX', 'articleImageY', 'articleImageZoom'));
  portrait.appendChild(buildImgOverlay(page.id, 'articleImage', 'Portrait Image'));
  leftCol.appendChild(portrait);

  // Optional quote box below portrait
  if (page.vs2ShowLeftQuote) {
    const lqBox = mkEl('div', 'vs2-left-quote-box');
    lqBox.appendChild(inlineEditable('p', 'vs-quote-text',
      page.vs2LeftQuote || 'An inspiring quote that captures the story.', page, 'vs2LeftQuote'));
    leftCol.appendChild(lqBox);
  }

  bottom.appendChild(leftCol);

  // Right: article content (60%)
  const rightCol = mkEl('div', 'vs-right');

  // Running label
  const label = mkEl('div', 'vs-run-label');
  label.appendChild(mkEl('span', 'vs-run-line'));
  const runText = mkEl('span', 'vs-run-text');
  runText.appendChild(inlineEditable('span', '', page.edLabel || 'AGENCY FEATURE', page, 'edLabel'));
  runText.appendChild(document.createTextNode('  ·  '));
  runText.appendChild(inlineEditable('span', '', page.edDate || 'APRIL 2026', page, 'edDate'));
  label.appendChild(runText);
  rightCol.appendChild(label);

  // Bold headline
  rightCol.appendChild(inlineEditable('div', 'vs-headline',
    page.articleHeadline || 'A Bold Headline That Commands Attention', page, 'articleHeadline'));

  // Paragraphs
  (page.visionParas || ['Paragraph one goes here.', 'Paragraph two goes here.']).forEach((para, i) => {
    const p = mkEl('div', 'vs-para');
    p.contentEditable = 'true';
    p.textContent = para;
    p.addEventListener('blur', () => {
      if (!page.visionParas) page.visionParas = [];
      page.visionParas[i] = p.textContent;
      savePages(true);
    });
    rightCol.appendChild(p);
  });

  // Quote box — toggleable
  if (page.vsShowQuote !== false) {
    const qBox = mkEl('div', 'vs-quote-box');
    qBox.appendChild(mkEl('div', 'vs-qmark', '"'));
    qBox.appendChild(inlineEditable('p', 'vs-quote-text',
      page.pullQuote || 'An inspiring quote that captures the vision.', page, 'pullQuote'));
    rightCol.appendChild(qBox);
  }

  bottom.appendChild(rightCol);
  div.appendChild(bottom);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

// ── PROFILE PAGE ───────────────────────────────────────────

function buildProfilePage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-profile');
  div.dataset.pageId = page.id;
  const prHeadingLh = page.prHeadingLh != null ? page.prHeadingLh / 10 : 1.0;
  div.style.cssText = `--pr-accent:${accent}; --pr-para-gap:${page.prParaGap != null ? page.prParaGap : 10}px; --pr-heading-lh:${prHeadingLh};`;

  // ── TOP: large headline section ──
  const topSection = mkEl('div', 'pr-top');
  const topLabel = mkEl('div', 'pr-top-label');
  topLabel.appendChild(mkEl('span', 'pr-top-rule'));
  const prRunText = mkEl('span', 'pr-top-tag');
  prRunText.appendChild(inlineEditable('span', '', page.edLabel || 'AGENCY FEATURE', page, 'edLabel'));
  prRunText.appendChild(document.createTextNode('  ·  '));
  prRunText.appendChild(inlineEditable('span', '', page.edDate || 'APRIL 2026', page, 'edDate'));
  topLabel.appendChild(prRunText);
  topSection.appendChild(topLabel);
  topSection.appendChild(inlineEditable('div', 'pr-headline',
    page.articleHeadline || 'A DEFINING\nSTORY OF\nGROWTH', page, 'articleHeadline'));
  div.appendChild(topSection);

  // ── MIDDLE: 2-column layout ──
  const mid = mkEl('div', 'pr-mid');

  // Left: paragraphs (60%)
  const rightCol = mkEl('div', 'pr-mid-right');
  const profileParas = page.profileParas && page.profileParas.length
    ? page.profileParas
    : [page.coverBlurb || 'Your agency story goes here.'];
  profileParas.forEach((para, i) => {
    const p = mkEl('p', 'pr-body-text');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.profileParas) page.profileParas = [...profileParas];
      page.profileParas[i] = p.innerHTML;
      savePages(true);
    });
    rightCol.appendChild(p);
  });

  // Quote box removed

  mid.appendChild(rightCol);

  // Right: tall image (40%)
  const leftCol = mkEl('div', 'pr-mid-left');
  const imgBox = mkEl('div', 'pr-fashion-img');
  imgBox.appendChild(buildImgLayer(page, 'articleImage', 'articleImageX', 'articleImageY', 'articleImageZoom'));
  imgBox.appendChild(buildImgOverlay(page.id, 'articleImage', 'Right Image'));
  leftCol.appendChild(imgBox);
  mid.appendChild(leftCol);

  div.appendChild(mid);
  div.appendChild(buildRunFooter(page, index));

  return div;
}

// ── INTERVIEW / Q&A PAGE ───────────────────────────────────

function buildInterviewPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-interview');
  div.dataset.pageId = page.id;
  div.style.cssText = `--iv-accent:${accent}; --iv-para-gap:${page.ivParaGap != null ? page.ivParaGap : 0}px; --iv-title-size:${page.ivTitleSize != null ? page.ivTitleSize : 20}px; --iv-title-lh:${page.ivTitleLh != null ? page.ivTitleLh / 10 : 1.05}; --iv-subheading-lh:${page.ivSubheadingLh != null ? page.ivSubheadingLh / 10 : 1.2};`;

  // ── TOP: big title + red banner ──
  const top = mkEl('div', 'iv-top');
  top.appendChild(inlineEditable('div', 'iv-title',
    page.articleHeadline || 'Q&A', page, 'articleHeadline'));
  const banner = mkEl('div', 'iv-banner');
  banner.appendChild(inlineEditable('span', 'iv-banner-label',
    page.ivBannerLabel || 'WITH', page, 'ivBannerLabel'));
  banner.appendChild(inlineEditable('span', 'iv-banner-name',
    page.personName || 'FULL NAME', page, 'personName'));
  banner.appendChild(mkEl('span', 'iv-banner-arrow', '→'));
  top.appendChild(banner);
  div.appendChild(top);

  // ── BODY: 2 columns ──
  const body = mkEl('div', 'iv-body');

  // Left column: intro + thoughts
  const left = mkEl('div', 'iv-left');
  left.appendChild(inlineEditable('p', 'iv-intro',
    page.articleSubheadline || 'Intro paragraph about the person and context.', page, 'articleSubheadline'));

  const leftThoughts = (page.ivLeftThoughts || [
    { heading: 'Thought 1', paras: ['First insight goes here.'] },
    { heading: 'Thought 2', paras: ['Second insight goes here.'] },
    { heading: 'Thought 3', paras: ['Third insight goes here.'] }
  ]);
  leftThoughts.forEach((t, i) => {
    const block = mkEl('div', 'iv-thought');
    const h = mkEl('div', 'iv-thought-heading'); h.contentEditable = 'true'; h.innerHTML = t.heading || '';
    h.addEventListener('blur', () => { if (!page.ivLeftThoughts) page.ivLeftThoughts = [...leftThoughts]; page.ivLeftThoughts[i].heading = h.innerHTML; savePages(true); });
    block.appendChild(h);
    // Support both old `body` string and new `paras` array
    const paras = t.paras || (t.body ? [t.body] : ['']);
    paras.forEach((paraText, pi) => {
      const p = mkEl('p', 'iv-thought-body'); p.contentEditable = 'true'; p.innerHTML = paraText;
      p.addEventListener('blur', () => {
        if (!page.ivLeftThoughts) page.ivLeftThoughts = [...leftThoughts];
        if (!page.ivLeftThoughts[i].paras) page.ivLeftThoughts[i].paras = [];
        page.ivLeftThoughts[i].paras[pi] = p.innerHTML;
        savePages(true);
      });
      block.appendChild(p);
    });
    left.appendChild(block);
  });
  body.appendChild(left);

  // Right column: portrait + thoughts
  const right = mkEl('div', 'iv-right');
  const photoBox = mkEl('div', 'iv-photo');
  photoBox.appendChild(buildImgLayer(page, 'articleImage', 'articleImageX', 'articleImageY', 'articleImageZoom'));
  photoBox.appendChild(buildImgOverlay(page.id, 'articleImage', 'Portrait Photo'));
  right.appendChild(photoBox);

  body.appendChild(right);

  div.appendChild(body);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

// ── STATS / DATA PAGE ──────────────────────────────────────

function buildStatsPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-stats');
  div.dataset.pageId = page.id;
  const stParaGap = page.stParaGap != null ? page.stParaGap : 0;
  const stQuoteTop = page.stQuoteTop != null ? `${page.stQuoteTop}px` : 'auto';
  const stQuotePad = page.stQuotePad != null ? page.stQuotePad : 10;
  div.style.cssText = `--st-accent:${accent}; --st-para-gap:${stParaGap}px; --st-quote-top:${stQuoteTop}; --st-quote-pad:${stQuotePad}px;`;

  // ── TOP: two images side by side ──
  const topImages = mkEl('div', 'st-top-images');

  const img1 = mkEl('div', 'st-img-box');
  img1.appendChild(buildImgLayer(page, 'statsImage1', 'statsImage1X', 'statsImage1Y', 'statsImage1Zoom'));
  img1.appendChild(buildImgOverlay(page.id, 'statsImage1', 'Image 1'));
  topImages.appendChild(img1);

  const img2 = mkEl('div', 'st-img-box');
  img2.appendChild(buildImgLayer(page, 'statsImage2', 'statsImage2X', 'statsImage2Y', 'statsImage2Zoom'));
  img2.appendChild(buildImgOverlay(page.id, 'statsImage2', 'Image 2'));
  topImages.appendChild(img2);

  div.appendChild(topImages);

  // ── BOTTOM: 2-column layout ──
  const bottom = mkEl('div', 'st-bottom');

  // Left: heading + paragraphs
  const leftCol = mkEl('div', 'st-left');
  leftCol.appendChild(inlineEditable('div', 'st-heading',
    page.articleHeadline || 'A BOLD HEADING', page, 'articleHeadline'));
  (page.statsLeftParas || ['Left column paragraph goes here.']).forEach((para, i) => {
    const p = mkEl('p', 'st-body-text');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.statsLeftParas) page.statsLeftParas = [];
      page.statsLeftParas[i] = p.innerHTML;
      savePages(true);
    });
    leftCol.appendChild(p);
  });
  bottom.appendChild(leftCol);

  // Right: paragraph + quote box
  const rightCol = mkEl('div', 'st-right');
  (page.statsRightParas || ['Right column paragraph goes here.']).forEach((para, i) => {
    const p = mkEl('p', 'st-body-text');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.statsRightParas) page.statsRightParas = [];
      page.statsRightParas[i] = p.innerHTML;
      savePages(true);
    });
    rightCol.appendChild(p);
  });

  if (page.stShowQuote !== false) {
    const qBox = mkEl('div', 'st-quote-box');
    qBox.appendChild(mkEl('span', 'st-qmark', '"'));
    qBox.appendChild(inlineEditable('p', 'st-quote-text',
      page.pullQuote || 'An inspiring quote goes here.', page, 'pullQuote'));
    rightCol.appendChild(qBox);
  }

  bottom.appendChild(rightCol);
  div.appendChild(bottom);
  div.appendChild(buildRunFooter(page, index));

  return div;
}

// ── SHOWCASE PAGE ──────────────────────────────────────────

function buildShowcasePage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-showcase');
  div.dataset.pageId = page.id;
  div.style.cssText = `--sc-accent:${accent};`;

  // Top: full-width image (height adjustable)
  const topImg = mkEl('div', 'sc-top-image');
  const scHeight = page.scTopImageHeight != null ? page.scTopImageHeight : 46;
  topImg.style.flex = `0 0 ${scHeight}%`;
  topImg.appendChild(buildImgLayer(page, 'articleImage', 'articleImageX', 'articleImageY', 'articleImageZoom'));
  topImg.appendChild(buildImgOverlay(page.id, 'articleImage', 'Feature Image'));
  div.appendChild(topImg);

  // Bottom: 2 columns
  const bottom = mkEl('div', 'sc-bottom');

  // Left: heading + paragraphs
  const left = mkEl('div', 'sc-left');
  left.appendChild(inlineEditable('div', 'sc-heading',
    page.articleHeadline || 'A BOLD HEADING', page, 'articleHeadline'));

  (page.showcaseParas || ['Paragraph text goes here.', 'Second paragraph continues the story.']).forEach((para, i) => {
    const p = mkEl('p', 'sc-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.showcaseParas) page.showcaseParas = [];
      page.showcaseParas[i] = p.innerHTML;
      savePages(true);
    });
    left.appendChild(p);
  });
  bottom.appendChild(left);

  // Right: optional quote box + second image (width adjustable)
  const right = mkEl('div', 'sc-right');
  const scRightW = page.scRightWidth != null ? page.scRightWidth : 42;
  right.style.flex = `0 0 ${scRightW}%`;
  if (page.scShowQuote !== false && page.scShowQuote !== 'false') {
    const qBox = mkEl('div', 'sc-quote-box');
    qBox.appendChild(inlineEditable('p', 'sc-quote-text',
      page.pullQuote || 'An inspiring quote that captures the essence of the story.', page, 'pullQuote'));
    right.appendChild(qBox);
  }

  // Second image below quote box
  const sc2Img = mkEl('div', 'sc-second-image');
  sc2Img.appendChild(buildImgLayer(page, 'articleImage2', 'articleImage2X', 'articleImage2Y', 'articleImage2Zoom'));
  sc2Img.appendChild(buildImgOverlay(page.id, 'articleImage2', 'Second Image'));
  right.appendChild(sc2Img);

  bottom.appendChild(right);

  div.appendChild(bottom);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

// ── SHOWCASE2 PAGE (Int Page – Temp 16) ────────────────────
// Like Temp 7 but no second image; smaller default feature image height.

function buildShowcase2Page(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-showcase');
  div.dataset.pageId = page.id;
  div.style.cssText = `--sc-accent:${accent}; --sc2-para-gap:${page.sc2ParaGap != null ? page.sc2ParaGap : 7}px;`;

  // Top: full-width image (height adjustable)
  const topImg = mkEl('div', 'sc-top-image');
  const scHeight = page.scTopImageHeight != null ? page.scTopImageHeight : 70;
  topImg.style.flex = `0 0 ${scHeight}%`;
  topImg.appendChild(buildImgLayer(page, 'articleImage', 'articleImageX', 'articleImageY', 'articleImageZoom'));
  topImg.appendChild(buildImgOverlay(page.id, 'articleImage', 'Feature Image'));
  div.appendChild(topImg);

  const paras = page.showcaseParas && page.showcaseParas.length
    ? page.showcaseParas
    : ['Paragraph text goes here.', 'Second paragraph continues the story.'];

  // Mid row: heading + para 1 (left) | quote box (right, absolutely positioned
  // so it does NOT affect sc-bottom's height — this keeps para spacing uniform)
  const scRightW = page.scRightWidth != null ? page.scRightWidth : 42;
  const bottom = mkEl('div', 'sc-bottom');
  bottom.style.flex = '0 0 auto';
  bottom.style.position = 'relative';

  const left = mkEl('div', 'sc-left');
  left.style.overflow = 'visible';
  left.style.paddingBottom = '0';
  left.style.flex = 'none';
  left.style.width = (100 - scRightW) + '%';
  left.appendChild(inlineEditable('div', 'sc-heading',
    page.articleHeadline || 'A BOLD HEADING', page, 'articleHeadline'));

  // Only para 0 goes in the left column
  if (paras[0] !== undefined) {
    const p = mkEl('p', 'sc-para');
    p.contentEditable = 'true';
    p.innerHTML = paras[0];
    p.addEventListener('blur', () => {
      if (!page.showcaseParas) page.showcaseParas = [...paras];
      page.showcaseParas[0] = p.innerHTML;
      savePages(true);
    });
    left.appendChild(p);
  }
  bottom.appendChild(left);

  // Right: quote box — absolutely positioned so it doesn't stretch sc-bottom height
  const right = mkEl('div', 'sc-right');
  right.style.position = 'absolute';
  right.style.right = '0';
  right.style.top = '0';
  right.style.width = scRightW + '%';
  right.style.flex = 'none';
  if (page.scShowQuote !== false && page.scShowQuote !== 'false') {
    const qBox = mkEl('div', 'sc-quote-box');
    qBox.appendChild(inlineEditable('p', 'sc-quote-text',
      page.pullQuote || 'An inspiring quote that captures the essence of the story.', page, 'pullQuote'));
    right.appendChild(qBox);
  }
  bottom.appendChild(right);
  div.appendChild(bottom);

  // Full-width paras: para 2 onwards span across the entire page width
  if (paras.length > 1) {
    const extraWrap = mkEl('div', 'sc2-extra-paras');
    const sc2Gap = page.sc2ParaGap != null ? page.sc2ParaGap : 7;
    extraWrap.style.paddingTop = sc2Gap + 'px';
    paras.slice(1).forEach((para, j) => {
      const i = j + 1;
      const p = mkEl('p', 'sc-para');
      p.contentEditable = 'true';
      p.innerHTML = para;
      p.addEventListener('blur', () => {
        if (!page.showcaseParas) page.showcaseParas = [...paras];
        page.showcaseParas[i] = p.innerHTML;
        savePages(true);
      });
      extraWrap.appendChild(p);
    });
    div.appendChild(extraWrap);
  }

  div.appendChild(buildRunFooter(page, index));
  return div;
}

function buildShowcase2Fields(body, page) {
  const d = PAGE_DEFAULTS.showcase2;

  addSectionTitle(body, 'PARAGRAPH SPACING');
  const sc2GapSlider = addSliderField(body, 'Space Between Paragraphs', 'sc2ParaGap', page.sc2ParaGap != null ? page.sc2ParaGap : 7, 0, 40);
  sc2GapSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) {
      pageEl.style.setProperty('--sc2-para-gap', `${sc2GapSlider.value}px`);
      const extraWrap = pageEl.querySelector('.sc2-extra-paras');
      if (extraWrap) extraWrap.style.paddingTop = sc2GapSlider.value + 'px';
    }
  });

  addSectionTitle(body, 'CONTENT');
  addField(body, 'Heading', 'articleHeadline', page.articleHeadline || d.articleHeadline);

  const showcaseParas = page.showcaseParas && page.showcaseParas.length ? page.showcaseParas : d.showcaseParas;
  const container = mkEl('div', 'vision-paras-container');

  function addScParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.remove(); container.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `showcasePara${j}`; }); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `showcasePara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    container.appendChild(wrap);
  }

  showcaseParas.forEach((v, i) => addScParaField(i, v));
  body.appendChild(container);
  const addBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addBtn.type = 'button';
  addBtn.onclick = () => addScParaField(container.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addBtn);

  addSectionTitle(body, 'QUOTE BOX');
  const qToggleWrap = mkEl('div', 'field-group');
  const qToggleLabel = mkEl('label', 'toggle-label');
  const qToggleCb = document.createElement('input');
  qToggleCb.type = 'checkbox';
  qToggleCb.dataset.field = 'scShowQuote';
  qToggleCb.checked = page.scShowQuote !== false && page.scShowQuote !== 'false';
  qToggleLabel.appendChild(qToggleCb);
  qToggleLabel.appendChild(document.createTextNode(' Show Quote Box'));
  qToggleWrap.appendChild(qToggleLabel);
  body.appendChild(qToggleWrap);
  const pqTa = addField(body, 'Quote Text', 'pullQuote', page.pullQuote || d.pullQuote, 'textarea'); pqTa.rows = 4;

  addSectionTitle(body, 'FEATURE IMAGE');
  addSliderField(body, 'Height (%)', 'scTopImageHeight', page.scTopImageHeight != null ? page.scTopImageHeight : 70, 15, 80);
  addSliderField(body, 'Right Column Width (%)', 'scRightWidth', page.scRightWidth != null ? page.scRightWidth : d.scRightWidth, 20, 65);
  addImageFieldBtn(body, page.id, 'articleImage', 'Feature Image');
  const sc1XS = addSliderField(body, 'Position: Left / Right', 'articleImageX', page.articleImageX != null ? page.articleImageX : 50);
  const sc1YS = addSliderField(body, 'Position: Up / Down',   'articleImageY', page.articleImageY != null ? page.articleImageY : 50);
  const sc1ZS = addSliderField(body, 'Zoom', 'articleImageZoom', page.articleImageZoom != null ? page.articleImageZoom : 100, 80, 200);
  bindImgSliders(page, 'articleImage', sc1XS, sc1YS, sc1ZS);
}

// ── GALLERY PAGE ───────────────────────────────────────────

function buildGalleryPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-gallery');
  div.dataset.pageId = page.id;
  div.style.cssText = `--gl-accent:${accent};--gl-color:${page.coverColor || '#0B0F14'};`;

  const bg = mkEl('div', 'gl-bg');
  bg.appendChild(buildImgLayer(page, 'articleImage', 'articleImageX', 'articleImageY', 'articleImageZoom'));
  div.appendChild(bg);
  div.appendChild(mkEl('div', 'gl-overlay'));

  // Bottom content
  const bottom = mkEl('div', 'gl-bottom');
  const bottomInner = mkEl('div', 'gl-bottom-inner');
  bottomInner.appendChild(inlineEditable('div', 'gl-title', page.articleHeadline || 'A Glimpse Into The Agency', page, 'articleHeadline'));
  bottomInner.appendChild(inlineEditable('div', 'gl-agency-name', page.agency || 'AGENCY NAME', page, 'agency'));
  bottomInner.appendChild(inlineEditable('div', 'gl-location', page.personLocation || 'City, Country', page, 'personLocation'));

  // Footer: Kilowott logo + page number
  const glFooter = mkEl('div', 'gl-footer');
  const glLogo = mkEl('img', 'gl-rf-logo');
  glLogo.src = '/images/kilowott logo.png';
  glLogo.alt = 'Kilowott';
  glFooter.appendChild(glLogo);
  const pgDefault = `PAGE ${String(index + 1).padStart(2, '0')}`;
  glFooter.appendChild(inlineEditable('span', 'gl-pg-label', page.pageLabel || pgDefault, page, 'pageLabel'));
  bottomInner.appendChild(glFooter);

  bottom.appendChild(bottomInner);
  div.appendChild(bottom);

  div.appendChild(buildImgOverlay(page.id, 'articleImage', 'Gallery Image'));
  return div;
}

// ── EDITORIAL PAGE (Int Page – Temp 9) ─────────────────────

function buildEditorialPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-editorial');
  div.dataset.pageId = page.id;
  const paraGap = page.paragraphSpacing != null ? page.paragraphSpacing : 7;
  div.style.cssText = `--ed-accent:${accent}; --ed-para-gap:${paraGap}px;`;

  // ── TOP: horizontal banner image ──
  const banner = mkEl('div', 'ed-banner');
  const edBannerH = page.edBannerHeight != null ? page.edBannerHeight : 272;
  banner.style.height = `${edBannerH}px`;
  banner.appendChild(buildImgLayer(page, 'bannerImage', 'bannerImageX', 'bannerImageY', 'bannerImageZoom'));
  banner.appendChild(mkEl('div', 'ed-banner-overlay'));
  banner.appendChild(buildImgOverlay(page.id, 'bannerImage', 'Banner Image'));
  div.appendChild(banner);

  // ── Running header strip ──
  const rh = mkEl('div', 'ed-run-header');
  rh.appendChild(mkEl('div', 'ed-rh-thick'));
  const rhMeta = mkEl('div', 'ed-rh-meta');
  rhMeta.appendChild(inlineEditable('span', '', page.edLabel || 'AGENCY FEATURE', page, 'edLabel'));
  rhMeta.appendChild(mkEl('span', '', '·'));
  rhMeta.appendChild(inlineEditable('span', 'ed-rh-date', page.edDate || 'APRIL 2026', page, 'edDate'));
  rh.appendChild(rhMeta);
  div.appendChild(rh);

  // ── BODY: two columns ──
  const body = mkEl('div', 'ed-body');

  // ── LEFT column ──
  const left = mkEl('div', 'ed-left');

  left.appendChild(inlineEditable('div', 'ed-left-heading',
    page.leftHeading || 'Building a Bold Headline That Draws the Reader In', page, 'leftHeading'));

  const leftParas = page.leftParas && page.leftParas.length
    ? page.leftParas
    : ['Opening paragraph with a drop cap. Set the scene with strong, vivid language that draws the reader into the story.', 'Second paragraph continues the narrative with context and detail about the agency and its mission.', 'Third paragraph provides specific examples or notable achievements that reinforce the story.'];
  leftParas.forEach((para, i) => {
    const p = mkEl('p', 'ed-left-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.leftParas) page.leftParas = [...leftParas];
      page.leftParas[i] = p.innerHTML;
      savePages(true);
    });
    left.appendChild(p);
  });

  body.appendChild(left);

  // ── RIGHT column ──
  const right = mkEl('div', 'ed-right');

  // ── QUOTE BOX (above heading) — toggleable ──
  if (page.edShowQuote !== false) {
    const qBox = mkEl('div', 'ed-right-quote');
    qBox.appendChild(inlineEditable('span', 'ed-right-quote-text',
      page.pullQuote || '"The right environment can fundamentally change how people work and build what comes next."',
      page, 'pullQuote'));
    right.appendChild(qBox);
  }

  right.appendChild(inlineEditable('div', 'ed-right-heading',
    page.rightHeading || 'Is It Time to Rethink the Traditional Approach Entirely?', page, 'rightHeading'));

  const rightParas = page.rightParas && page.rightParas.length
    ? page.rightParas
    : ['Opening paragraph for the right column. Continue the story with a complementary angle or deeper analysis.', 'Second paragraph. Expand on the theme with additional insight, a different perspective, or supporting evidence.', 'Third paragraph. This section builds on the left column narrative, adding depth and forward momentum.', 'Fourth paragraph. Close with a compelling statement that connects back to the overarching theme of the page.'];
  rightParas.forEach((para, i) => {
    const p = mkEl('p', 'ed-right-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.rightParas) page.rightParas = [...rightParas];
      page.rightParas[i] = p.innerHTML;
      savePages(true);
    });
    right.appendChild(p);
  });

  body.appendChild(right);
  div.appendChild(body);

  // ── Footer ──
  div.appendChild(buildRunFooter(page, index));

  return div;
}

// ── DUO PAGE (Int Page – Temp 10) ─────────────────────────

function buildDuoPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-duo');
  div.dataset.pageId = page.id;
  div.style.cssText = `--duo-accent:${accent};`;

  // ── TOP: Two images side by side ──
  const top = mkEl('div', 'duo-top');

  const img1 = mkEl('div', 'duo-top-img');
  img1.appendChild(buildImgLayer(page, 'topImg1', 'topImg1X', 'topImg1Y', 'topImg1Zoom'));
  img1.appendChild(buildImgOverlay(page.id, 'topImg1', 'Top Left Image'));
  top.appendChild(img1);

  const img2 = mkEl('div', 'duo-top-img');
  img2.appendChild(buildImgLayer(page, 'topImg2', 'topImg2X', 'topImg2Y', 'topImg2Zoom'));
  img2.appendChild(buildImgOverlay(page.id, 'topImg2', 'Top Right Image'));
  top.appendChild(img2);

  div.appendChild(top);

  // ── BOTTOM: Left text + Right image ──
  const bottom = mkEl('div', 'duo-bottom');

  // Left: heading + paragraphs
  const left = mkEl('div', 'duo-left');

  left.appendChild(inlineEditable('div', 'duo-heading',
    page.duoHeading || 'Building a High-Demand Workplace Ecosystem That Scaled to 75,000 m²',
    page, 'duoHeading'));

  const duoParas = page.duoParas && page.duoParas.length ? page.duoParas :
    ['Opening paragraph. Tell the story with clarity and conviction.',
     'Second paragraph. Expand on the impact and what makes this unique.',
     'Third paragraph. Add more depth and supporting detail.',
     'Fourth paragraph. Close with a forward-looking statement.'];

  duoParas.forEach((para, i) => {
    const p = mkEl('p', 'duo-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.duoParas) page.duoParas = [...duoParas];
      page.duoParas[i] = p.innerHTML;
      savePages(true);
    });
    left.appendChild(p);
  });

  bottom.appendChild(left);

  // Right: tall side image
  const rightImg = mkEl('div', 'duo-right-img');
  rightImg.appendChild(buildImgLayer(page, 'sideImg', 'sideImgX', 'sideImgY', 'sideImgZoom'));
  rightImg.appendChild(buildImgOverlay(page.id, 'sideImg', 'Side Image'));
  bottom.appendChild(rightImg);

  div.appendChild(bottom);

  // ── Footer ──
  div.appendChild(buildRunFooter(page, index));

  return div;
}

// ── TEAM PAGE (Int Page – Temp 11) ────────────────────────

function buildTeamPage(page, index) {
  const div = mkEl('div', 'mag-page page-team');
  div.dataset.pageId = page.id;
  div.style.setProperty('--team-line-height', page.teamLineHeight != null ? page.teamLineHeight : 1.6);
  div.style.setProperty('--team-para-gap', `${page.teamParaGap != null ? page.teamParaGap : 7}px`);
  div.style.setProperty('--team-img1-h', `${page.teamImg1H != null ? page.teamImg1H : 245}px`);
  div.style.setProperty('--team-img2-h', `${page.teamImg2H != null ? page.teamImg2H : 245}px`);
  div.style.setProperty('--team-quote-size', `${page.teamQuoteSize != null ? page.teamQuoteSize : 11}px`);
  div.style.setProperty('--team-quote-mt', `${page.teamQuoteMt != null ? page.teamQuoteMt : 12}px`);

  // ── Image 1 — full-width landscape ──
  if (page.teamShowImg1 !== false) {
    const img1 = mkEl('div', 'team-img');
    img1.appendChild(buildImgLayer(page, 'teamImg1', 'teamImg1X', 'teamImg1Y', 'teamImg1Zoom'));
    img1.appendChild(buildImgOverlay(page.id, 'teamImg1', 'Top Image'));
    div.appendChild(img1);
  }

  // ── Gap ──
  if (page.teamShowImg1 !== false && page.teamShowImg2 !== false) div.appendChild(mkEl('div', 'team-gap'));

  // ── Image 2 — full-width landscape ──
  if (page.teamShowImg2 !== false) {
    const img2 = mkEl('div', 'team-img');
    img2.appendChild(buildImgLayer(page, 'teamImg2', 'teamImg2X', 'teamImg2Y', 'teamImg2Zoom'));
    img2.appendChild(buildImgOverlay(page.id, 'teamImg2', 'Bottom Image'));
    div.appendChild(img2);
  }

  // ── Text section: heading + paragraphs ──
  const text = mkEl('div', 'team-text');

  text.appendChild(inlineEditable('div', 'team-heading',
    page.teamHeading || 'Inside FOMO: How the FOMO Team Operates: Culture, Execution, and Continuous Learning',
    page, 'teamHeading'));

  const teamParas = page.teamParas && page.teamParas.length ? page.teamParas :
    ["FOMO's culture is built around energy, ownership, and curiosity.",
     'They move fast while maintaining strong attention to detail.',
     'When situations arise, they address them directly and constructively.'];

  teamParas.forEach((para, i) => {
    const p = mkEl('p', 'team-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.teamParas) page.teamParas = [...teamParas];
      page.teamParas[i] = p.innerHTML;
      savePages(true);
    });
    text.appendChild(p);
  });

  // ── Quote box (after last paragraph, no author) ──
  if (page.teamShowQuote !== false) {
    const qBox = mkEl('div', 'team-quote-box');
    qBox.appendChild(inlineEditable('span', 'team-quote-text',
      page.pullQuote || '"This ongoing experience continues to strengthen how they operate and refine the way they deliver value."',
      page, 'pullQuote'));
    text.appendChild(qBox);
  }

  div.appendChild(text);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

// ── SPOTLIGHT PAGE (Int Page – Temp 8) ─────────────────────

function buildSpotlightPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-spotlight');
  div.dataset.pageId = page.id;
  div.style.cssText = `--spl-accent:${accent};`;

  // Full-bleed background — inner div is 140×140% so both axes always shift
  const bg = mkEl('div', 'spl-bg');
  const bgInner = mkEl('div', 'spl-bg-inner');
  const imgX = page.coverImageX != null ? page.coverImageX : 50;
  const imgY = page.coverImageY != null ? page.coverImageY : 30;
  const imgZ = page.coverImageZoom != null ? page.coverImageZoom : 100;
  if (page.coverImage) bgInner.style.backgroundImage = `url('${page.coverImage}')`;
  bgInner.style.left = `${-(imgX * 0.4)}%`;
  bgInner.style.top  = `${-(imgY * 0.4)}%`;
  bgInner.style.transform = `scale(${imgZ / 100})`;
  bgInner.style.transformOrigin = 'center center';
  bg.appendChild(bgInner);
  div.appendChild(bg);

  // Diagonal gradient overlay
  div.appendChild(mkEl('div', 'spl-overlay'));

  // Top-left agency tag
  const topTag = mkEl('div', 'spl-top-tag');
  topTag.appendChild(mkEl('span', 'spl-tag-line'));
  topTag.appendChild(inlineEditable('span', 'spl-tag-text',
    page.agency || 'AGENCY FEATURE', page, 'agency'));
  div.appendChild(topTag);

  // Bottom-right info panel
  const panel = mkEl('div', 'spl-panel');

  // Red accent bar
  panel.appendChild(mkEl('div', 'spl-panel-bar'));

  // Name
  const nameEl = mkEl('div', 'spl-name');
  nameEl.contentEditable = 'true';
  nameEl.innerHTML = (page.personName || 'FULL NAME').replace(/\n/g, '<br>');
  nameEl.addEventListener('blur', () => { page.personName = nameEl.innerText; savePages(true); });
  panel.appendChild(nameEl);

  // Title / Designation
  panel.appendChild(inlineEditable('div', 'spl-person-title',
    page.personTitle || 'Designation · Company', page, 'personTitle'));

  // Location row
  const locRow = mkEl('div', 'spl-loc-row');
  locRow.appendChild(mkEl('span', 'spl-loc-icon', '◆'));
  locRow.appendChild(inlineEditable('span', 'spl-loc-text',
    page.personLocation || 'City, Country', page, 'personLocation'));
  panel.appendChild(locRow);

  // Thin divider
  panel.appendChild(mkEl('div', 'spl-panel-divider'));

  // Italic tagline
  panel.appendChild(inlineEditable('div', 'spl-tagline',
    page.tagline || 'A bold statement that defines their vision and ambition.', page, 'tagline'));

  // Description
  panel.appendChild(inlineEditable('p', 'spl-desc',
    page.description || 'A short, compelling description about the person, their impact, and what sets them apart in their industry.', page, 'description'));

  div.appendChild(panel);

  // Footer: Kilowott logo + page number
  const footer = mkEl('div', 'spl-footer');
  const logo = mkEl('img', 'spl-footer-logo');
  logo.src = '/images/kilowott logo.png';
  logo.alt = 'Kilowott';
  footer.appendChild(logo);
  const pgDefault = `PAGE ${String(index + 1).padStart(2, '0')}`;
  footer.appendChild(inlineEditable('span', 'spl-pg-label',
    page.pageLabel || pgDefault, page, 'pageLabel'));
  div.appendChild(footer);
  bg.appendChild(buildImgOverlay(page.id, 'coverImage', 'Background Photo'));

  return div;
}

// ── SHARED PAGE HELPERS ────────────────────────────────────

function buildRunFooter(page, index) {
  const accent = page.accentColor || '#E4022D';
  const footer = mkEl('div', 'art-run-footer');
  footer.appendChild(mkEl('div', 'art-rf-rule'));
  const inner = mkEl('div', 'art-rf-inner');

  // Left: Kilowott logo image
  const logo = mkEl('img', 'art-rf-logo-img');
  logo.src = '/images/kilowott logo.png';
  logo.alt = 'Kilowott';
  inner.appendChild(logo);

  // Right: editable page label
  const pgDefault = `PAGE ${String(index + 1).padStart(2, '0')}`;
  inner.appendChild(inlineEditable('span', 'art-rf-pg', page.pageLabel || pgDefault, page, 'pageLabel'));

  footer.appendChild(inner);
  return footer;
}

function inlineEditable(tag, cls, text, page, field) {
  const d = mkEl(tag, cls);
  d.innerHTML = text || '';
  d.contentEditable = 'true';
  d.addEventListener('blur', () => {
    if (field.startsWith('articleBody_')) {
      const idx = parseInt(field.split('_')[1], 10);
      if (!page.articleBody) page.articleBody = [];
      page.articleBody[idx] = d.innerHTML;
    } else {
      page[field] = d.innerHTML;
    }
    savePages(true);
  });
  return d;
}

function buildImgOverlay(pageId, field, label) {
  const overlay = mkEl('div', 'img-upload-overlay');
  const btn = mkEl('button', 'img-upload-btn', `📷 ${label}`);
  btn.onclick = (e) => {
    e.stopPropagation();
    state.imageTarget = { pageId, field };
    openImageModal();
  };
  overlay.appendChild(btn);
  return overlay;
}

// ── IMAGE LAYER HELPERS (zoom + position) ──────────────────

// Creates an inner div for background-image with position & zoom applied.
// zoomMode: 'scale' (default) uses transform — good for zoom-in only.
//           'bgsize' uses background-size % — supports full zoom-out without gaps.
// The outer container must have overflow:hidden (set in CSS).
function buildImgLayer(page, bgField, xField, yField, zoomField, zoomMode) {
  const layer = mkEl('div', 'img-layer');
  layer.dataset.bgField = bgField;
  if (zoomMode) layer.dataset.zoomMode = zoomMode;
  if (page[bgField]) layer.style.backgroundImage = `url('${page[bgField]}')`;
  const x = (xField && page[xField] != null) ? page[xField] : 50;
  const y = (yField && page[yField] != null) ? page[yField] : 50;
  const z = (zoomField && page[zoomField] != null) ? page[zoomField] : 100;
  layer.style.backgroundPosition = `${x}% ${y}%`;
  if (zoomMode === 'bgsize') {
    layer.style.backgroundSize = `${z}%`;
  } else {
    layer.style.transform = `scale(${z / 100})`;
  }
  return layer;
}

// Binds X / Y / Z sliders to live-update the matching img-layer on drag.
function bindImgSliders(page, bgField, xSlider, ySlider, zSlider) {
  function update() {
    const layer = document.querySelector(
      `.mag-page[data-page-id="${page.id}"] .img-layer[data-bg-field="${bgField}"]`
    );
    if (!layer) return;
    if (xSlider || ySlider) {
      layer.style.backgroundPosition =
        `${xSlider ? xSlider.value : 50}% ${ySlider ? ySlider.value : 50}%`;
    }
    if (zSlider) {
      if (layer.dataset.zoomMode === 'bgsize') {
        layer.style.backgroundSize = `${zSlider.value}%`;
      } else {
        layer.style.transform = `scale(${zSlider.value / 100})`;
      }
    }
  }
  if (xSlider) xSlider.addEventListener('input', update);
  if (ySlider) ySlider.addEventListener('input', update);
  if (zSlider) zSlider.addEventListener('input', update);
}

// ── PAGE ACTIONS ───────────────────────────────────────────

function duplicatePage(id) {
  const orig = state.pages.find(p => p.id === id);
  if (!orig) return;
  const dup = { ...JSON.parse(JSON.stringify(orig)), id: uid() };
  const idx = state.pages.findIndex(p => p.id === id);
  state.pages.splice(idx + 1, 0, dup);
  savePages(true);
  renderAll();
  setTimeout(() => scrollToPage(dup.id), 80);
  showToast('Page duplicated');
}

function deletePage(id) {
  if (state.pages.length <= 1) {
    showToast('Cannot delete the only page', 'error');
    return;
  }
  if (!confirm('Delete this page?')) return;
  state.pages = state.pages.filter(p => p.id !== id);
  savePages(true);
  renderAll();
  showToast('Page deleted');
}

// ── ADD PAGE ───────────────────────────────────────────────

const PAGE_DEFAULTS = {
  cover: {
    type: 'cover', accentColor: '#E4022D',
    coverImage: '', agency: 'Company Name', personName: 'Full Name',
    personTitle: 'Designation',
    coverHeadline: 'Scaling agencies in 2026',
    coverIssue: 'ISSUE #004',
    coverBlurb: 'A brief, compelling description of impact and vision.',
    badgeScript: 'Elite', badgeBold: 'Business Minds', badgeYear: '2026',
    fearText: 'Fear Of Missing Out',
    agencyLogoUrl: '', coverImageX: 50, coverImageY: 35, coverImageZoom: 100
  },
  coverCollage: {
    type: 'coverCollage', accentColor: '#E4022D',
    agency: 'Company Name', personName: 'Full Name',
    personTitle: 'Designation',
    coverHeadline: 'Scaling agencies in 2026',
    coverIssue: 'ISSUE #004',
    badgeScript: 'Elite', badgeBold: 'Business Minds', badgeYear: '2026',
    fearText: 'Fear Of Missing Out',
    agencyLogoUrl: '',
    ccShowText: true,
    ccImages: [
      { url: '', x: 50, y: 50, zoom: 100 },
      { url: '', x: 50, y: 50, zoom: 100 },
      { url: '', x: 50, y: 50, zoom: 100 },
      { url: '', x: 50, y: 50, zoom: 100 },
      { url: '', x: 50, y: 50, zoom: 100 },
      { url: '', x: 50, y: 50, zoom: 100 },
      { url: '', x: 50, y: 50, zoom: 100 },
      { url: '', x: 50, y: 50, zoom: 100 },
      { url: '', x: 50, y: 50, zoom: 100 },
      { url: '', x: 50, y: 50, zoom: 100 }
    ]
  },
  article: {
    type: 'article', coverColor: '#0B0F14', accentColor: '#E4022D',
    articleImage: '', articleImageZoom: 100, agency: 'AGENCY NAME',
    articleHeadline: 'ARTICLE HEADLINE',
    articleSubheadline: 'Supporting subheadline text',
    personName: 'FULL NAME', personTitle: 'Title',
    articleBody: [
      'Opening paragraph of your feature article. Set the scene with strong, vivid language.',
      'Second paragraph continues the narrative with context and detail.',
      'Third paragraph brings in specific examples or achievements.',
      'Final paragraph wraps up and looks ahead to the future.'
    ],
    pullQuote: 'An inspiring pull quote that captures the essence of the story.',
    pullQuoteAuthor: 'Full Name, Title, Agency',
    services: ['Service One', 'Service Two', 'Service Three', 'Service Four', 'Service Five'],
    highlights: []
  },
  vision: {
    type: 'vision', accentColor: '#E4022D',
    heroImage: '', heroImageX: 50, heroImageY: 50, heroImageZoom: 100,
    articleImage: '', articleImageX: 50, articleImageY: 50, articleImageZoom: 100, agency: 'AGENCY NAME',
    articleHeadline: 'A Bold Headline That Commands Attention',
    visionParas: [
      'First paragraph. Five compelling sentences that draw the reader in and set the context for the story being told here.',
      'Second paragraph. Continue the narrative with depth and clarity, giving the reader essential insight into the subject matter.',
      'Third paragraph. Close with a forward-looking perspective that leaves a lasting impression on the reader.'
    ],
    pullQuote: 'An inspiring quote that captures the vision and philosophy of the agency.',
    pullQuoteAuthor: 'Full Name, Title, Agency'
  },
  profile: {
    type: 'profile', accentColor: '#E4022D',
    agency: 'AGENCY NAME', personName: 'FULL NAME', personTitle: 'Title, Agency',
    articleHeadline: 'A DEFINING\nSTORY OF\nGROWTH',
    profileParas: [
      'First paragraph. Tell the agency\'s story with clarity and conviction.',
      'Second paragraph. Expand on the impact, the approach, and what makes them different.',
      'Third paragraph. Close with a vision-forward statement that inspires confidence.'
    ],
    articleImage: '', articleImageX: 50, articleImageY: 50, articleImageZoom: 100, coverImage: ''
  },
  interview: {
    type: 'interview', accentColor: '#E4022D',
    articleImage: '', articleImageX: 50, articleImageY: 50, articleImageZoom: 100, agency: 'AGENCY NAME', personName: 'FULL NAME',
    personTitle: 'Title – Agency',
    articleHeadline: 'Q&A',
    articleSubheadline: 'A conversation about strategy, growth, and what it takes to lead in today\'s competitive landscape.',
    ivLeftThoughts: [
      { heading: 'The Challenge', body: 'Describe the core challenge your industry faces and how your agency approaches it differently.' },
      { heading: 'The Shift', body: 'What major trend or change are you seeing, and how is it reshaping the way you work?' },
      { heading: 'The Opportunity', body: 'Where do you see the biggest untapped opportunity for businesses in your space right now?' }
    ],
    ivRightThoughts: [
      { heading: 'The Advice', body: 'One piece of advice you would give to any business leader trying to navigate today\'s market.' },
      { heading: 'The Future', body: 'Your prediction for where the industry will be in the next two to five years.' }
    ]
  },
  stats: {
    type: 'stats', accentColor: '#E4022D',
    agency: 'AGENCY NAME',
    statsImage1: '', statsImage1Zoom: 100, statsImage2: '', statsImage2Zoom: 100,
    articleHeadline: 'A BOLD HEADING',
    statsLeftParas: ['First left paragraph.', 'Second left paragraph.'],
    statsRightParas: ['First right paragraph.', 'Second right paragraph.'],
    pullQuote: 'An inspiring quote that captures the spirit of the story.',
    pullQuoteAuthor: 'Name, Title'
  },
  showcase: {
    type: 'showcase', accentColor: '#E4022D',
    articleImage: '', articleImageZoom: 100, articleImage2: '', articleImage2Zoom: 100, agency: 'AGENCY NAME',
    scShowQuote: true, scTopImageHeight: 46, scRightWidth: 42,
    articleImageX: 50, articleImageY: 50,
    articleImage2X: 50, articleImage2Y: 50,
    articleHeadline: 'A BOLD HEADING',
    showcaseParas: [
      'First paragraph. Tell the story with clarity and conviction.',
      'Second paragraph. Expand on the impact and what makes this unique.',
      'Third paragraph. Close with a forward-looking statement.'
    ],
    pullQuote: 'An inspiring quote that captures the essence of the story.',
    pullQuoteAuthor: 'Name, Title'
  },
  gallery: {
    type: 'gallery', coverColor: '#0B0F14', accentColor: '#E4022D',
    articleImage: '', articleImageZoom: 100, agency: 'AGENCY NAME',
    articleHeadline: 'BEHIND THE BRAND',
    articleSubheadline: 'A visual snapshot of the team, culture, and creative environment that drives results for clients worldwide.',
    pullQuoteAuthor: 'Photo caption or image credit line'
  },
  editorial: {
    type: 'editorial', accentColor: '#E4022D', coverColor: '#ffffff',
    bannerImage: '', bannerImageX: 50, bannerImageY: 40, bannerImageZoom: 100, edBannerHeight: 272,
    edShowQuote: true,
    pullQuote: '"The right environment can fundamentally change how people work and build what comes next."',
    leftHeading: 'Building a Bold Headline That Draws the Reader In',
    leftParas: [
      'Founded with a clear vision and a bold ambition, the agency began with a simple but powerful question: what if the way we work could be fundamentally reimagined?',
      'Driven by a relentless entrepreneurial mindset, the founders set out to create something the market had never seen — an environment built not just for productivity, but for energy, collaboration, and growth.',
      'Today, the agency stands as one of the region\'s most ambitious destinations, bringing together hundreds of companies from global enterprises to fast-growing technology teams shaping the future.',
      'Spanning multiple locations and thousands of square metres, it offers office space, coworking, meeting areas, and curated environments where founders and global teams share the same ecosystem.',
      'More than just a workspace, it represents a new kind of working environment — one built for companies that want to grow together.'
    ],
    rightHeading: 'Is It Time to Rethink the Traditional Approach Entirely?',
    rightParas: [
      'It is a shared ecosystem where design, community, and ambition intersect, proving that the right environment can fundamentally change how people work and build what comes next.',
      'Magnus envisioned a fundamentally different approach to how companies experience the workplace.',
      'This vision emerged from a clear structural challenge in the traditional office market.',
      'Office spaces were rigid, expensive, and poorly suited for modern, fast-growing companies.',
      'Many businesses faced long lease commitments, limited flexibility, and environments that did not adequately support collaboration or culture.',
      'In response, the concept was developed as a solution to this gap — a flexible coworking and office concept tailored to tech and growth companies.',
      'It combines private offices with shared social spaces, strong community-building, and a plug-and-play setup that enables companies to scale up or down with ease.',
      'This approach is further defined by a highly original interior design, which has attracted attention from competitors across Europe who visit to study the concept.'
    ]
  },
  team: {
    type: 'team', accentColor: '#E4022D', coverColor: '#ffffff',
    teamImg1: '', teamImg1X: 50, teamImg1Y: 50, teamImg1Zoom: 100,
    teamImg2: '', teamImg2X: 50, teamImg2Y: 50, teamImg2Zoom: 100,
    teamHeading: 'Inside FOMO: How the FOMO Team Operates: Culture, Execution, and Continuous Learning',
    teamParas: [
      "FOMO's culture is built around energy, ownership, and curiosity. They operate in a small, high-trust team where people are encouraged to take initiative, think commercially, and continuously improve how things are done.",
      'They move fast while maintaining strong attention to detail, with decision-making kept close to execution and clear priorities guiding what creates value for the customer.',
      'When situations arise, they address them directly and constructively, taking ownership, understanding the root cause, and focusing on practical solutions.',
      'Scaling their coworking environments and adapting them to different types of tenants has been a key part of the journey.'
    ]
  },
  duo: {
    type: 'duo', accentColor: '#E4022D', coverColor: '#ffffff',
    topImg1: '', topImg1X: 50, topImg1Y: 50, topImg1Zoom: 100,
    topImg2: '', topImg2X: 50, topImg2Y: 50, topImg2Zoom: 100,
    sideImg: '', sideImgX: 50, sideImgY: 50, sideImgZoom: 100,
    duoHeading: 'Building a High-Demand Workplace Ecosystem That Scaled to 75,000 m²',
    duoParas: [
      "FOMO's journey demonstrates how a focused, differentiated approach to workplace design can translate into measurable results at scale.",
      'In just three years, a previously empty 35,000 m² building was transformed into a thriving community of 160 companies and 1,200 members. The development achieved a high occupancy rate of 96%, supported by strong tenant retention and continuous growth within the building itself.',
      'The commercial impact has been equally significant. Founders realized a 2,300% return on initial investments within three years, equivalent to approximately 30 million USD.',
      'A key insight from this journey is the importance of differentiation in a competitive market. When everyone is doing the same thing, there is always demand for something special or unique.'
    ]
  },
  widetext: {
    type: 'widetext', accentColor: '#E4022D',
    heroImage: '', heroImageX: 50, heroImageY: 50, heroImageZoom: 100, wtBannerHeight: 421,
    articleHeadline: 'A Bold Headline That Commands Attention',
    visionParas: [
      'Opening paragraph. Set the scene with strong, vivid language that draws the reader in and establishes the context for what follows.',
      'Second paragraph continues the narrative with context and detail, expanding on the key themes and insights introduced above.',
      'Third paragraph brings in specific examples or achievements that illustrate the agency\'s approach and impact in the market.',
      'Fourth paragraph deepens the story, adding texture and nuance that gives readers a fuller picture of what makes this agency unique.',
      'Final paragraph wraps up and looks ahead — leaving the reader with a sense of momentum and possibility.'
    ],
    pullQuote: 'An inspiring quote that captures the vision and philosophy of the agency and its people.'
  },
  twocol: {
    type: 'twocol', accentColor: '#E4022D',
    bannerImage: '', bannerImageX: 50, bannerImageY: 50, bannerImageZoom: 100, tcBannerHeight: 36,
    pageHeading: 'YOUR FULL-WIDTH HEADING GOES HERE',
    leftHeading: 'Left Column Heading',
    tcLeftParas: [
      'Opening paragraph for the left column. Set the scene with strong, vivid language that draws the reader in.',
      'Second paragraph continues the narrative with context and detail about the topic.',
      'Third paragraph brings in specific examples or achievements that illustrate the key points.',
      'Fourth paragraph adds further depth and texture to the story.'
    ],
    rightHeading: 'Right Column Heading',
    tcRightParas: [
      'Opening paragraph for the right column. Offer a complementary perspective or deeper analysis.',
      'Second paragraph expands on the theme with additional insight and supporting evidence.',
      'Third paragraph builds on the left column narrative, adding depth and forward momentum.',
      'Fourth paragraph closes with a compelling statement that connects back to the overarching theme.'
    ]
  },
  showcase2: {
    type: 'showcase2', accentColor: '#E4022D',
    articleHeadline: 'A BOLD HEADING',
    showcaseParas: [
      'Opening paragraph. Set the scene with strong, vivid language that draws the reader in.',
      'Second paragraph continues the story with context and detail about the agency and its work.'
    ],
    pullQuote: 'An inspiring quote that captures the essence of the story.',
    scShowQuote: true,
    scTopImageHeight: 70,
    scRightWidth: 42,
    articleImage: '', articleImageX: 50, articleImageY: 50, articleImageZoom: 100
  },
  impact: {
    type: 'impact', accentColor: '#E4022D',
    impHead1: '#NEVERENOUGH',
    impHead2: ' — WHERE "GOOD" ENDS AND ',
    impHead3: 'REAL IMPACT',
    impHead4: ' BEGINS',
    impImg1: '', impImg1X: 50, impImg1Y: 50, impImg1Zoom: 100,
    impTopParas: [
      'In the ever-changing rhythm of the digital world where trends are quickly consumed and data often floats on the surface, this agency chose a different path: not to follow the noise, but to become a guiding compass.',
      'Because here, "good" is never enough.',
      'Built on a #neverenough mindset, the agency is driven by a culture of continuous evolution where learning, teamwork, and mutual success are not goals, but expectations.'
    ],
    impBodyParas: [
      "It's a space shaped by speed, automation, and original thinking, where feedback flows openly, adaptability is constant, and every individual contributes with an entrepreneurial spirit.",
      'At its core, the agency is built to drive digital innovation turning insights into marketing that drives growth.',
      'Partnering with visionary and innovative businesses, the agency goes beyond visibility — combining access, expertise, and strategic intelligence to deliver marketing that is not only seen, but felt in results.',
      'Decisions are shaped by a balance of data and intuition, ensuring that every campaign is both measurable and meaningful.'
    ],
    pullQuote: 'Because in a world full of content, real success doesn\'t come from doing more — it comes from understanding better. From combining data with intuition. From managing every touchpoint with purpose. And above all: from never settling.',
    impImg2: '', impImg2X: 50, impImg2Y: 50, impImg2Zoom: 100
  },
  impact2: {
    type: 'impact2', accentColor: '#E4022D',
    imp2Headline: '#NEVERENOUGH\n— WHERE "GOOD" ENDS\nAND REAL IMPACT BEGINS',
    impImg1: '', impImg1X: 50, impImg1Y: 50, impImg1Zoom: 100,
    impTopParas: [
      'In the ever-changing rhythm of the digital world where trends are quickly consumed and data often floats on the surface, this agency chose a different path: not to follow the noise, but to become a guiding compass.',
      'Because here, "good" is never enough.',
      'Built on a #neverenough mindset, the agency is driven by a culture of continuous evolution where learning, teamwork, and mutual success are not goals, but expectations.'
    ],
    impBodyParas: [
      "It's a space shaped by speed, automation, and original thinking, where feedback flows openly, adaptability is constant, and every individual contributes with an entrepreneurial spirit.",
      'At its core, the agency is built to drive digital innovation turning insights into marketing that drives growth.',
      'Partnering with visionary and innovative businesses, the agency goes beyond visibility — combining access, expertise, and strategic intelligence to deliver marketing that is not only seen, but felt in results.',
      'Decisions are shaped by a balance of data and intuition, ensuring that every campaign is both measurable and meaningful.'
    ],
    pullQuote: 'Because in a world full of content, real success doesn\'t come from doing more — it comes from understanding better. From combining data with intuition. From managing every touchpoint with purpose. And above all: from never settling.',
    imp2SubHeading: 'Your Sub-Heading Here'
  },
  statsBanner: {
    type: 'statsBanner', accentColor: '#E4022D',
    bannerImage: '', bannerImageX: 50, bannerImageY: 50, bannerImageZoom: 100,
    articleHeadline: 'A BOLD HEADING',
    st2LeftSections: [
      { sub: 'Sub-Heading One', paras: ['First paragraph under sub-heading one. Describe the topic with clarity and purpose.'] },
      { sub: 'Sub-Heading Two', paras: ['First paragraph under sub-heading two. Continue the narrative with supporting detail.'] }
    ],
    st2RightSections: [
      { sub: 'Sub-Heading Three', paras: ['First paragraph under sub-heading three. Introduce the right-column theme here.'] },
      { sub: 'Sub-Heading Four', paras: ['First paragraph under sub-heading four. Close with insight or a forward-looking statement.'] }
    ],
    st2ShowQuote: true,
    pullQuote: 'An inspiring quote that captures the essence of the story and leaves a lasting impression.'
  },
  stats2: {
    type: 'stats2', accentColor: '#E4022D',
    statsImage1: '', statsImage1X: 50, statsImage1Y: 50, statsImage1Zoom: 100,
    statsImage2: '', statsImage2X: 50, statsImage2Y: 50, statsImage2Zoom: 100,
    articleHeadline: 'A BOLD HEADING',
    st2LeftSections: [
      { sub: 'Sub-Heading One', paras: ['First paragraph under sub-heading one. Describe the topic with clarity and purpose.'] },
      { sub: 'Sub-Heading Two', paras: ['First paragraph under sub-heading two. Continue the narrative with supporting detail.'] }
    ],
    st2RightSections: [
      { sub: 'Sub-Heading Three', paras: ['First paragraph under sub-heading three. Introduce the right-column theme here.'] },
      { sub: 'Sub-Heading Four', paras: ['First paragraph under sub-heading four. Close with insight or a forward-looking statement.'] }
    ],
    st2ShowQuote: true,
    pullQuote: 'An inspiring quote that captures the essence of the story and leaves a lasting impression.'
  },
  stats3: {
    type: 'stats3', accentColor: '#E4022D',
    statsImage1: '', statsImage1X: 50, statsImage1Y: 50, statsImage1Zoom: 100,
    st3ImgHeight: 42,
    articleHeadline: 'A BOLD HEADING',
    st2LeftSections: [
      { sub: 'Sub-Heading One', paras: ['First paragraph under sub-heading one. Describe the topic with clarity and purpose.'] },
      { sub: 'Sub-Heading Two', paras: ['First paragraph under sub-heading two. Continue the narrative with supporting detail.'] }
    ],
    st2RightSections: [
      { sub: 'Sub-Heading Three', paras: ['First paragraph under sub-heading three. Introduce the right-column theme here.'] },
      { sub: 'Sub-Heading Four', paras: ['First paragraph under sub-heading four. Close with insight or a forward-looking statement.'] }
    ],
    st2ShowQuote: true,
    pullQuote: 'An inspiring quote that captures the essence of the story and leaves a lasting impression.'
  },
  sidebar: {
    type: 'sidebar', accentColor: '#E4022D',
    articleImage: '', articleImageX: 50, articleImageY: 50, articleImageZoom: 100,
    sbImgHeight: 55,
    sbShowExtraImg: false, sbExtraImage: '', sbExtraImageX: 50, sbExtraImageY: 50, sbExtraImageZoom: 100, sbExtraImgHeight: 25,
    pullQuote: '"A compelling quote that captures the essence of the article and leaves a lasting impression on the reader."',
    sbQuoteWidth: 100,
    articleHeadline: 'THE NEXT 5 YEARS\nOF MARKETING',
    sbParas: [
      'Opening paragraph sets the scene with a bold, forward-looking statement about where the industry is heading.',
      'Second paragraph introduces the key trend or insight that underpins the article\'s central argument.',
      'Third paragraph provides supporting evidence, data, or examples that reinforce the main point.',
      'Fourth paragraph explores the implications for brands and agencies navigating this new landscape.',
      'Fifth paragraph closes with a call to action or a thought-provoking reflection on what comes next.'
    ],
    sbParaGap: 8
  },
  feature: {
    type: 'feature', accentColor: '#E4022D', coverColor: '#0B0F14',
    ftHeaderHeight: 175, ftImgHeight: 300, ftShowQuote: true, ftShowHeading2: false,
    ftHeading2: 'Sub-Heading', ftHeading2Paras: ['Additional paragraph goes here.'],
    ftBrand: 'Agency Name', ftBrandSub: 'winning tomorrow',
    ftHeading: 'HOW THIS AGENCY REDEFINES PERFORMANCE MARKETING',
    ftIntro: 'In today\'s fast-moving digital ecosystem, most performance marketing agencies promise growth but few are structured to deliver it with both speed and depth. That\'s where this agency, founded with a fundamentally different approach, takes centre stage — led by a clear mission: delivering the best for your online success.',
    featureParas: [
      'Instead of a traditional agency hierarchy, this agency operates using a unique cell-based structure, inspired by modern management thinking. The organisation is divided into autonomous teams, each functioning independently while still connected to a larger ecosystem of shared knowledge and expertise. This means clients get the agility and personal attention of a small team, while still benefiting from the scale, resources, and strategic depth of a much larger organisation.',
      'With more than 80 specialists across its network, this model allows the agency to move faster, adapt quicker, and deliver performance-driven strategies that are both flexible and deeply specialised. Each cell operates like a focused growth unit — combining autonomy with accountability to drive measurable results.'
    ],
    pullQuote: 'In an industry where complexity often slows execution, this agency has built a system that does the opposite — turning structure into speed, and autonomy into scalable performance.',
    ftImage: '', ftImageX: 50, ftImageY: 50, ftImageZoom: 100,
    ftHeaderImage: '', ftHeaderImageX: 50, ftHeaderImageY: 50, ftHeaderImageZoom: 100
  },
  spotlight: {
    type: 'spotlight', accentColor: '#E4022D', coverColor: '#0B0F14',
    coverImage: '', coverImageZoom: 100, agency: 'AGENCY FEATURE',
    personName: 'FULL NAME',
    personTitle: 'Designation · Company',
    personLocation: 'City, Country',
    tagline: 'A bold statement that defines their vision and ambition.',
    description: 'A short, compelling description about the person, their impact, and what sets them apart in their industry.',
    coverImageX: 50, coverImageY: 30
  },
  vision2: {
    type: 'vision2', accentColor: '#E4022D',
    vs2TopHeight: 30, vs2PortraitHeight: 100, vs2ParaGap: 8, vs2LabelHeadGap: 10,
    vs2ShowLeftQuote: false, vs2LeftQuote: 'An inspiring quote that captures the story.', vs2QuoteSize: 9.5, vs2QuoteBoxHeight: 35,
    vision2Image1: '', vision2Image1X: 50, vision2Image1Y: 50, vision2Image1Zoom: 100,
    vision2Image2: '', vision2Image2X: 50, vision2Image2Y: 50, vision2Image2Zoom: 100,
    articleImage: '', articleImageX: 50, articleImageY: 50, articleImageZoom: 100,
    agency: 'AGENCY NAME',
    edLabel: 'AGENCY FEATURE', edDate: 'APRIL 2026',
    articleHeadline: 'A Bold Headline That Commands Attention',
    visionParas: [
      'First paragraph. Five compelling sentences that draw the reader in and set the context for the story being told here.',
      'Second paragraph. Continue the narrative with depth and clarity, giving the reader essential insight into the subject matter.',
      'Third paragraph. Close with a forward-looking perspective that leaves a lasting impression on the reader.'
    ],
    pullQuote: 'An inspiring quote that captures the vision and philosophy of the agency.',
    pullQuoteAuthor: 'Full Name, Title, Agency',
    vsShowQuote: true
  }
};

function addPage(type) {
  const newPage = { ...JSON.parse(JSON.stringify(PAGE_DEFAULTS[type] || PAGE_DEFAULTS.article)), id: uid() };
  if (state.targetFolderId) newPage.folderId = state.targetFolderId;
  state.pages.push(newPage);
  savePages(true);
  renderAll();
  setTimeout(() => scrollToPage(newPage.id), 80);
  const folderName = state.targetFolderId
    ? (state.folders.find(f => f.id === state.targetFolderId) || {}).name || ''
    : '';
  showToast(`${getTypeMeta(type).label} added${folderName ? ` to "${folderName}"` : ''}`);
  state.targetFolderId = null;
  closeAddMenu();
}

function openAddMenu(folderId = null) {
  state.targetFolderId = folderId || null;
  const menu = document.getElementById('addPageMenu');
  const title = menu.querySelector('.add-menu-header');
  if (title) {
    const folder = folderId ? state.folders.find(f => f.id === folderId) : null;
    title.textContent = folder ? `Add a page to "${folder.name}"` : 'Add a page';
  }
  menu.classList.remove('hidden');
  document.getElementById('addMenuOverlay').classList.remove('hidden');
}

function closeAddMenu() {
  document.getElementById('addPageMenu').classList.add('hidden');
  document.getElementById('addMenuOverlay').classList.add('hidden');
}

// ── EDIT PANEL ─────────────────────────────────────────────

let editingPageId = null;

function openEditPanel(id) {
  const page = state.pages.find(p => p.id === id);
  if (!page) return;
  editingPageId = id;

  document.getElementById('editPanelTitle').textContent =
    `Edit — ${getTypeMeta(page.type).label}`;

  const body = document.getElementById('editPanelBody');
  body.innerHTML = '';

  // Colors always shown
  addColorField(body, 'Accent Color', 'accentColor', page.accentColor || '#E4022D');
  addColorField(body, 'Background Color', 'coverColor', page.coverColor || '#0B0F14');

  switch (page.type) {
    case 'cover':     buildCoverFields(body, page);     break;
    case 'coverCollage': buildCoverCollageFields(body, page); break;
    case 'article':   buildArticleFields(body, page);   break;
    case 'vision':    buildVisionFields(body, page);    break;
    case 'vision2':   buildVision2Fields(body, page);   break;
    case 'profile':   buildProfileFields(body, page);   break;
    case 'interview': buildInterviewFields(body, page); break;
    case 'stats':     buildStatsFields(body, page);     break;
    case 'gallery':   buildGalleryFields(body, page);    break;
    case 'showcase':  buildShowcaseFields(body, page);   break;
    case 'spotlight': buildSpotlightFields(body, page);   break;
    case 'editorial': buildEditorialFields(body, page);   break;
    case 'duo':       buildDuoFields(body, page);         break;
    case 'team':      buildTeamFields(body, page);        break;
    case 'feature':   buildFeatureFields(body, page);     break;
    case 'impact':    buildImpactFields(body, page);      break;
    case 'widetext':  buildWidetextFields(body, page);    break;
    case 'showcase2': buildShowcase2Fields(body, page);   break;
    case 'twocol':    buildTwocolFields(body, page);      break;
    case 'impact2':   buildImpact2Fields(body, page);     break;
    case 'statsBanner': buildStatsBannerFields(body, page); break;
    case 'stats2':    buildStats2Fields(body, page);      break;
    case 'sidebar':   buildSidebarFields(body, page);     break;
    case 'stats3':    buildStats3Fields(body, page);      break;
  }

  document.getElementById('editPanel').classList.remove('hidden');
}

function closePanel() {
  document.getElementById('editPanel').classList.add('hidden');
  editingPageId = null;
}

function savePanel() {
  const page = state.pages.find(p => p.id === editingPageId);
  if (!page) return;

  const body = document.getElementById('editPanelBody');

  // Pre-clear section arrays so removed items don't persist as ghost data
  if (body.querySelector('[data-field^="st2LeftSub_"]'))       page.st2LeftSections  = [];
  if (body.querySelector('[data-field^="st2RightSub_"]'))      page.st2RightSections = [];
  if (body.querySelector('[data-field^="ivLeftThought"]'))     page.ivLeftThoughts   = [];
  if (body.querySelector('[data-field^="artBodyPara"]'))       page.articleBody      = [];
  if (body.querySelector('[data-field^="visionPara"]'))        page.visionParas      = [];
  if (body.querySelector('[data-field^="sbPara"]'))            page.sbParas          = [];
  if (body.querySelector('[data-field^="widetextPara"]'))     page.visionParas      = [];
  if (body.querySelector('[data-field^="artBodyPara"]'))      page.articleBody      = [];

  // Collect scalar fields (input, textarea with data-field)
  body.querySelectorAll('[data-field]').forEach(inp => {
    const field = inp.dataset.field;
    if (!field) return;
    if (field.startsWith('artBodyPara')) {
      const i = parseInt(field.replace('artBodyPara', ''), 10);
      if (!page.articleBody) page.articleBody = [];
      page.articleBody[i] = inp.value;
    } else if (field === 'articleBody') {
      page.articleBody = inp.value.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    } else if (field === 'servicesText') {
      page.services = inp.value.split('\n').map(s => s.trim()).filter(Boolean);
    } else if (field.startsWith('visionPara')) {
      const i = parseInt(field.replace('visionPara', ''), 10);
      if (!page.visionParas) page.visionParas = [];
      page.visionParas[i] = inp.value;
    } else if (field.startsWith('articleExtraPara') && field !== 'articleExtraPara') {
      const i = parseInt(field.replace('articleExtraPara', ''), 10);
      if (!page.articleExtraParas) page.articleExtraParas = [];
      page.articleExtraParas[i] = inp.value;
    } else if (field.startsWith('profilePara')) {
      const i = parseInt(field.replace('profilePara', ''), 10);
      if (!page.profileParas) page.profileParas = [];
      page.profileParas[i] = inp.value;
    } else if (field.startsWith('statsLeftPara')) {
      const i = parseInt(field.replace('statsLeftPara', ''), 10);
      if (!page.statsLeftParas) page.statsLeftParas = [];
      page.statsLeftParas[i] = inp.value;
    } else if (field.startsWith('statsRightPara')) {
      const i = parseInt(field.replace('statsRightPara', ''), 10);
      if (!page.statsRightParas) page.statsRightParas = [];
      page.statsRightParas[i] = inp.value;
    } else if (field.startsWith('showcasePara')) {
      const i = parseInt(field.replace('showcasePara', ''), 10);
      if (!page.showcaseParas) page.showcaseParas = [];
      page.showcaseParas[i] = inp.value;
    } else if (field.startsWith('edLeftPara')) {
      const i = parseInt(field.replace('edLeftPara', ''), 10);
      if (!page.leftParas) page.leftParas = [];
      page.leftParas[i] = inp.value;
    } else if (field.startsWith('edRightPara')) {
      const i = parseInt(field.replace('edRightPara', ''), 10);
      if (!page.rightParas) page.rightParas = [];
      page.rightParas[i] = inp.value;
    } else if (field.startsWith('duoPara')) {
      const i = parseInt(field.replace('duoPara', ''), 10);
      if (!page.duoParas) page.duoParas = [];
      page.duoParas[i] = inp.value;
    } else if (field.startsWith('teamPara')) {
      const i = parseInt(field.replace('teamPara', ''), 10);
      if (!page.teamParas) page.teamParas = [];
      page.teamParas[i] = inp.value;
    } else if (field.startsWith('featurePara')) {
      const i = parseInt(field.replace('featurePara', ''), 10);
      if (!page.featureParas) page.featureParas = [];
      page.featureParas[i] = inp.value;
    } else if (field.startsWith('ftH2Para')) {
      const i = parseInt(field.replace('ftH2Para', ''), 10);
      if (!page.ftHeading2Paras) page.ftHeading2Paras = [];
      page.ftHeading2Paras[i] = inp.value;
    } else if (field.startsWith('widetextPara')) {
      const i = parseInt(field.replace('widetextPara', ''), 10);
      if (!page.visionParas) page.visionParas = [];
      page.visionParas[i] = inp.value;
    } else if (field.startsWith('impTopPara')) {
      const i = parseInt(field.replace('impTopPara', ''), 10);
      if (!page.impTopParas) page.impTopParas = [];
      page.impTopParas[i] = inp.value;
    } else if (field.startsWith('impBodyPara')) {
      const i = parseInt(field.replace('impBodyPara', ''), 10);
      if (!page.impBodyParas) page.impBodyParas = [];
      page.impBodyParas[i] = inp.value;
    } else if (/^ivLeftThought\d+_heading$/.test(field)) {
      const m = field.match(/^ivLeftThought(\d+)_heading$/);
      const i = parseInt(m[1], 10);
      if (!page.ivLeftThoughts) page.ivLeftThoughts = [];
      if (!page.ivLeftThoughts[i]) page.ivLeftThoughts[i] = { heading: '', paras: [] };
      page.ivLeftThoughts[i].heading = inp.value;
    } else if (/^ivLeftThought\d+_para\d+$/.test(field)) {
      const m = field.match(/^ivLeftThought(\d+)_para(\d+)$/);
      const i = parseInt(m[1], 10), pi = parseInt(m[2], 10);
      if (!page.ivLeftThoughts) page.ivLeftThoughts = [];
      if (!page.ivLeftThoughts[i]) page.ivLeftThoughts[i] = { heading: '', paras: [] };
      if (!page.ivLeftThoughts[i].paras) page.ivLeftThoughts[i].paras = [];
      page.ivLeftThoughts[i].paras[pi] = inp.value;
    } else if (/^ivRightThought\d+_(heading|body)$/.test(field)) {
      const m = field.match(/^ivRightThought(\d+)_(heading|body)$/);
      const i = parseInt(m[1], 10); const part = m[2];
      if (!page.ivRightThoughts) page.ivRightThoughts = [];
      if (!page.ivRightThoughts[i]) page.ivRightThoughts[i] = { heading: '', body: '' };
      page.ivRightThoughts[i][part] = inp.value;
    } else if (/^sbPara\d/.test(field)) {
      const i = parseInt(field.replace('sbPara', ''), 10);
      if (!page.sbParas) page.sbParas = [];
      page.sbParas[i] = inp.value;
    } else if (field.startsWith('st2LeftSub_')) {
      const si = parseInt(field.replace('st2LeftSub_', ''), 10);
      if (!page.st2LeftSections) page.st2LeftSections = [];
      if (!page.st2LeftSections[si]) page.st2LeftSections[si] = { sub: '', paras: [] };
      page.st2LeftSections[si].sub = inp.value;
    } else if (field.startsWith('st2LeftPara_')) {
      const parts = field.replace('st2LeftPara_', '').split('_');
      const si = parseInt(parts[0], 10), pi = parseInt(parts[1], 10);
      if (!page.st2LeftSections) page.st2LeftSections = [];
      if (!page.st2LeftSections[si]) page.st2LeftSections[si] = { sub: '', paras: [] };
      if (!page.st2LeftSections[si].paras) page.st2LeftSections[si].paras = [];
      page.st2LeftSections[si].paras[pi] = inp.value;
    } else if (field.startsWith('st2RightSub_')) {
      const si = parseInt(field.replace('st2RightSub_', ''), 10);
      if (!page.st2RightSections) page.st2RightSections = [];
      if (!page.st2RightSections[si]) page.st2RightSections[si] = { sub: '', paras: [] };
      page.st2RightSections[si].sub = inp.value;
    } else if (field.startsWith('st2RightPara_')) {
      const parts = field.replace('st2RightPara_', '').split('_');
      const si = parseInt(parts[0], 10), pi = parseInt(parts[1], 10);
      if (!page.st2RightSections) page.st2RightSections = [];
      if (!page.st2RightSections[si]) page.st2RightSections[si] = { sub: '', paras: [] };
      if (!page.st2RightSections[si].paras) page.st2RightSections[si].paras = [];
      page.st2RightSections[si].paras[pi] = inp.value;
    } else if (field.startsWith('tcLeftPara')) {
      const i = parseInt(field.replace('tcLeftPara', ''), 10);
      if (!page.tcLeftParas) page.tcLeftParas = [];
      page.tcLeftParas[i] = inp.value;
    } else if (field.startsWith('tcRightPara')) {
      const i = parseInt(field.replace('tcRightPara', ''), 10);
      if (!page.tcRightParas) page.tcRightParas = [];
      page.tcRightParas[i] = inp.value;
    } else if (inp.type === 'range') {
      page[field] = Number(inp.value);
    } else if (inp.type === 'checkbox') {
      page[field] = inp.checked;
    } else {
      page[field] = inp.value;
    }
  });

  // Filter nulls from section arrays (left by removed sub-section blocks)
  if (page.st2LeftSections)  page.st2LeftSections  = page.st2LeftSections.filter(Boolean);
  if (page.st2RightSections) page.st2RightSections = page.st2RightSections.filter(Boolean);
  if (page.ivLeftThoughts)   page.ivLeftThoughts   = page.ivLeftThoughts.filter(Boolean);
  if (page.articleBody)      page.articleBody      = page.articleBody.filter(s => s != null);

  // Highlights
  const hlRows = body.querySelectorAll('.hl-row');
  if (hlRows.length) {
    page.highlights = Array.from(hlRows).map(row => ({
      value: (row.querySelector('[data-hl="value"]') || {}).value || '',
      label: (row.querySelector('[data-hl="label"]') || {}).value || ''
    })).filter(h => h.value || h.label);
  }

  // Q&A pairs (interview page)
  const qaRows = body.querySelectorAll('.qa-row');
  if (qaRows.length) {
    page.questions = Array.from(qaRows).map(row => ({
      q: (row.querySelector('[data-qa-part="q"]') || {}).value || '',
      a: (row.querySelector('[data-qa-part="a"]') || {}).value || ''
    })).filter(qa => qa.q || qa.a);
  }

  // Statistics (stats page)
  const statRows = body.querySelectorAll('.stat-edit-row');
  if (statRows.length) {
    page.stats = Array.from(statRows).map(row => ({
      value:       (row.querySelector('[data-st-part="value"]')       || {}).value || '',
      label:       (row.querySelector('[data-st-part="label"]')       || {}).value || '',
      description: (row.querySelector('[data-st-part="description"]') || {}).value || ''
    })).filter(s => s.value || s.label);
  }

  savePages(true);
  renderAll();
  closePanel();
  showToast('Changes saved');
}

function savePanelSilent() {
  const page = state.pages.find(p => p.id === editingPageId);
  if (!page) return;
  const body = document.getElementById('editPanelBody');
  if (body.querySelector('[data-field^="sbPara"]')) page.sbParas = [];
  if (body.querySelector('[data-field^="visionPara"]')) page.visionParas = [];
  body.querySelectorAll('[data-field]').forEach(inp => {
    const field = inp.dataset.field;
    if (!field) return;
    if (field.startsWith('sbPara')) {
      const i = parseInt(field.replace('sbPara', ''), 10);
      if (!page.sbParas) page.sbParas = [];
      page.sbParas[i] = inp.value;
    } else if (field.startsWith('artBodyPara')) {
      const i = parseInt(field.replace('artBodyPara', ''), 10);
      if (!page.articleBody) page.articleBody = [];
      page.articleBody[i] = inp.value;
    } else if (field.startsWith('widetextPara')) {
      const i = parseInt(field.replace('widetextPara', ''), 10);
      if (!page.visionParas) page.visionParas = [];
      page.visionParas[i] = inp.value;
    } else if (field.startsWith('visionPara')) {
      const i = parseInt(field.replace('visionPara', ''), 10);
      if (!page.visionParas) page.visionParas = [];
      page.visionParas[i] = inp.value;
    }
  });
  savePages(true);
  renderAll();
}

// ── EDIT PANEL FIELD BUILDERS ──────────────────────────────

function addSectionTitle(parent, title) {
  const h = mkEl('div', 'field-section-title', title);
  parent.appendChild(h);
}

function addSliderField(parent, label, field, value, min = 0, max = 100, step = 1) {
  const wrap = mkEl('div', 'field-group');
  const labelRow = mkEl('div', 'slider-label-row');
  labelRow.appendChild(mkEl('label', '', label));
  const valDisplay = mkEl('span', 'slider-val', `${value}%`);
  labelRow.appendChild(valDisplay);
  wrap.appendChild(labelRow);
  const inp = document.createElement('input');
  inp.type = 'range';
  inp.min = min; inp.max = max; inp.step = step;
  inp.value = value;
  inp.className = 'field-slider';
  inp.dataset.field = field;
  inp.addEventListener('input', () => { valDisplay.textContent = `${inp.value}%`; });
  wrap.appendChild(inp);
  parent.appendChild(wrap);
  return inp;
}

function addField(parent, label, field, value, type = 'input') {
  const wrap = mkEl('div', 'field-group');
  wrap.appendChild(mkEl('label', '', label));
  let inp;
  if (type === 'textarea') {
    inp = document.createElement('textarea');
    inp.rows = 5;
  } else {
    inp = document.createElement('input');
    inp.type = type;
  }
  inp.className = 'field-input';
  inp.value = value || '';
  inp.dataset.field = field;
  wrap.appendChild(inp);
  parent.appendChild(wrap);
  return inp;
}

function addColorField(parent, label, field, value) {
  const wrap = mkEl('div', 'field-group');
  wrap.appendChild(mkEl('label', '', label));
  const row = mkEl('div', 'color-field-row');

  const picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'color-picker';
  try { picker.value = value || '#000000'; } catch (_) {}

  const hex = document.createElement('input');
  hex.type = 'text';
  hex.className = 'field-input hex-input';
  hex.value = value || '';
  hex.placeholder = '#000000';
  hex.dataset.field = field;

  picker.addEventListener('input', () => {
    hex.value = picker.value;
    hex.dataset.field = field;
    picker.dataset.field = '';
  });
  hex.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) {
      try { picker.value = hex.value; } catch (_) {}
    }
  });

  row.appendChild(picker);
  row.appendChild(hex);
  wrap.appendChild(row);
  parent.appendChild(wrap);
}

function addImageFieldBtn(parent, pageId, field, label) {
  const wrap = mkEl('div', 'field-group');
  const btn = mkEl('button', 'btn-upload-field', `📷 Upload ${label}`);
  btn.onclick = (e) => {
    e.preventDefault();
    state.imageTarget = { pageId, field };
    openImageModal();
  };
  wrap.appendChild(btn);
  parent.appendChild(wrap);
}

function buildCoverFields(body, page) {
  if (!page.simpleCover) {
    addSectionTitle(body, 'PERSON');
    const nameTa = addField(body, 'Person Name', 'personName', page.personName, 'textarea');
    nameTa.rows = 2;
    addField(body, 'Designation', 'personTitle', page.personTitle);
    addField(body, 'Company Name', 'agency', page.agency);

    const nameXSlider = addSliderField(body, 'Name Position: Left / Right', 'coverNameX', page.coverNameX != null ? page.coverNameX : 0, -200, 200);
    nameXSlider.addEventListener('input', () => {
      page.coverNameX = Number(nameXSlider.value);
      const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
      if (pageEl) pageEl.style.setProperty('--cover-name-x', `${nameXSlider.value}px`);
      savePages(true);
    });
  }
  addSectionTitle(body, 'EDITION BADGE');
  addField(body, 'Badge Script (line 1)', 'badgeScript', page.badgeScript || 'Elite');
  addField(body, 'Badge Bold (line 2)', 'badgeBold', page.badgeBold || 'Business Minds');
  addField(body, 'Badge Year (line 3)', 'badgeYear', page.badgeYear || '2026');

  const badgeXSlider = addSliderField(body, 'Badge Position: Left / Right', 'badgePosX', page.badgePosX != null ? page.badgePosX : 0, -300, 300);
  badgeXSlider.addEventListener('input', () => {
    page.badgePosX = Number(badgeXSlider.value);
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--badge-x', `${badgeXSlider.value}px`);
    savePages(true);
  });
  const badgeYSlider = addSliderField(body, 'Badge Position: Up / Down', 'badgePosY', page.badgePosY != null ? page.badgePosY : 0, -300, 300);
  badgeYSlider.addEventListener('input', () => {
    page.badgePosY = Number(badgeYSlider.value);
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--badge-y', `${badgeYSlider.value}px`);
    savePages(true);
  });

  if (!page.simpleCover) {
    addSectionTitle(body, 'DESIGNATION');
    const desigXSlider = addSliderField(body, 'Designation Position: Left / Right', 'desigPosX', page.desigPosX != null ? page.desigPosX : 0, -300, 300);
    desigXSlider.addEventListener('input', () => {
      page.desigPosX = Number(desigXSlider.value);
      const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
      if (pageEl) pageEl.style.setProperty('--desig-x', `${desigXSlider.value}px`);
      savePages(true);
    });
    const desigYSlider = addSliderField(body, 'Designation Position: Up / Down', 'desigPosY', page.desigPosY != null ? page.desigPosY : 0, -300, 300);
    desigYSlider.addEventListener('input', () => {
      page.desigPosY = Number(desigYSlider.value);
      const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
      if (pageEl) pageEl.style.setProperty('--desig-y', `${desigYSlider.value}px`);
      savePages(true);
    });
  }

  if (!page.simpleCover) {
    const ftTa = addField(body, 'Fear Text', 'fearText', page.fearText || 'Fear Of Missing Out', 'textarea');
    ftTa.rows = 3;

    const fearSizeSlider = addSliderField(body, 'Fear Text Size', 'coverFearSize', page.coverFearSize != null ? page.coverFearSize : 16, 8, 60);
    fearSizeSlider.addEventListener('input', () => {
      page.coverFearSize = Number(fearSizeSlider.value);
      const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
      if (pageEl) pageEl.style.setProperty('--cover-fear-size', `${fearSizeSlider.value}px`);
      savePages(true);
    });

    const nameGapSlider = addSliderField(body, 'Space: Name → Fear Text', 'coverNameGap', page.coverNameGap != null ? page.coverNameGap : 12, 0, 80);
    nameGapSlider.addEventListener('input', () => {
      page.coverNameGap = Number(nameGapSlider.value);
      const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
      if (pageEl) pageEl.style.setProperty('--cover-name-gap', `${nameGapSlider.value}px`);
      savePages(true);
    });

    addSectionTitle(body, 'EXTRA LINE');
    const extraToggleWrap = mkEl('div', 'field-group');
    const extraToggleLbl = mkEl('label', 'toggle-label');
    const extraToggleChk = document.createElement('input');
    extraToggleChk.type = 'checkbox';
    extraToggleChk.checked = !!page.coverExtraLine;
    extraToggleChk.addEventListener('change', () => {
      page.coverExtraLine = extraToggleChk.checked;
      const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
      if (pageEl) {
        const existing = pageEl.querySelector('.cbw-extra-line');
        if (extraToggleChk.checked && !existing) {
          const el = document.createElement('div');
          el.className = 'cbw-extra-line';
          el.contentEditable = 'true';
          el.innerHTML = page.coverExtraText || 'Add your text here';
          el.addEventListener('blur', () => { page.coverExtraText = el.innerHTML; savePages(true); });
          pageEl.querySelector('.cbw-name-row').after(el);
        } else if (!extraToggleChk.checked && existing) {
          existing.remove();
        }
      }
      savePages(true);
    });
    extraToggleLbl.appendChild(extraToggleChk);
    extraToggleLbl.appendChild(document.createTextNode(' Show Extra Line'));
    extraToggleWrap.appendChild(extraToggleLbl);
    body.appendChild(extraToggleWrap);

    const extraTextTa = addField(body, 'Extra Line Text', 'coverExtraText', page.coverExtraText || '', 'textarea');
    extraTextTa.rows = 2;

    const extraSizeSlider = addSliderField(body, 'Extra Line Text Size', 'extraLineSize', page.extraLineSize != null ? page.extraLineSize : 13, 6, 60);
    extraSizeSlider.addEventListener('input', () => {
      page.extraLineSize = Number(extraSizeSlider.value);
      const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
      if (pageEl) pageEl.style.setProperty('--extra-line-size', `${extraSizeSlider.value}px`);
      savePages(true);
    });

    const extraXSlider = addSliderField(body, 'Extra Line Position: Left / Right', 'extraLineX', page.extraLineX != null ? page.extraLineX : 0, -300, 300);
    extraXSlider.addEventListener('input', () => {
      page.extraLineX = Number(extraXSlider.value);
      const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
      if (pageEl) pageEl.style.setProperty('--extra-line-x', `${extraXSlider.value}px`);
      savePages(true);
    });

    const extraYSlider = addSliderField(body, 'Extra Line Position: Up / Down', 'extraLineY', page.extraLineY != null ? page.extraLineY : 0, -300, 300);
    extraYSlider.addEventListener('input', () => {
      page.extraLineY = Number(extraYSlider.value);
      const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
      if (pageEl) pageEl.style.setProperty('--extra-line-y', `${extraYSlider.value}px`);
      savePages(true);
    });
  }
  addSectionTitle(body, 'CONTENT');
  addField(body, 'Tagline', 'coverHeadline', page.coverHeadline || 'Scaling agencies in 2026');
  addField(body, 'Issue Label (right side)', 'coverIssue', page.coverIssue || 'ISSUE #004');
  if (!page.simpleCover) {
    const briefTa = addField(body, 'Brief (right bar)', 'coverBlurb', page.coverBlurb, 'textarea');
    briefTa.rows = 4;
  }
  addSectionTitle(body, 'COVER PHOTO');
  addImageFieldBtn(body, page.id, 'coverImage', 'Cover Photo');
  const cvXS = addSliderField(body, 'Position: Left / Right', 'coverImageX', page.coverImageX != null ? page.coverImageX : 50);
  const cvYS = addSliderField(body, 'Position: Up / Down',   'coverImageY', page.coverImageY != null ? page.coverImageY : 35);
  const cvZS = addSliderField(body, 'Zoom', 'coverImageZoom', page.coverImageZoom != null ? page.coverImageZoom : 120, 80, 200);
  bindImgSliders(page, 'coverImage', cvXS, cvYS, cvZS);
  if (!page.simpleCover) {
    addSectionTitle(body, 'AGENCY LOGO');
    addImageFieldBtn(body, page.id, 'agencyLogoUrl', 'Agency Logo');
  }
}

function buildArticleFields(body, page) {
  addSectionTitle(body, 'HEADER STRIP');
  addField(body, 'Label (left)', 'edLabel', page.edLabel || 'AGENCY FEATURE');
  addField(body, 'Date (right)', 'edDate', page.edDate || 'APRIL 2026');

  addSectionTitle(body, 'ARTICLE');
  addField(body, 'Headline', 'articleHeadline', page.articleHeadline);
  addField(body, 'Subheadline', 'articleSubheadline', page.articleSubheadline);
  const artHSGap = addSliderField(body, 'Heading → Subheading Gap', 'artHeadSubGap', page.artHeadSubGap != null ? page.artHeadSubGap : 8, 0, 50);
  artHSGap.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--art-head-sub-gap', `${artHSGap.value}px`);
  });
  const artSRGap = addSliderField(body, 'Subheading → Rule Gap', 'artSubRuleGap', page.artSubRuleGap != null ? page.artSubRuleGap : 9, 0, 50);
  artSRGap.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--art-sub-rule-gap', `${artSRGap.value}px`);
  });
  const artRPGap = addSliderField(body, 'Rule → Paragraph Gap', 'artRuleParaGap', page.artRuleParaGap != null ? page.artRuleParaGap : 7, 0, 50);
  artRPGap.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--art-rule-para-gap', `${artRPGap.value}px`);
  });

  addSectionTitle(body, 'BODY PARAGRAPHS');
  const artParaGapSlider = addSliderField(body, 'Space Between Paragraphs', 'artParaGap', page.artParaGap != null ? page.artParaGap : 8, 0, 40);
  artParaGapSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--art-para-gap', `${artParaGapSlider.value}px`);
  });
  const bodyParas = page.articleBody && page.articleBody.length ? page.articleBody : ['First paragraph…', 'Second paragraph…'];
  const bodyParasContainer = mkEl('div', 'vision-paras-container');

  function addBodyParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => {
      // Find the current index of this wrap in the container
      const idx = Array.from(bodyParasContainer.querySelectorAll('.vision-para-wrap')).indexOf(wrap);
      wrap.classList.add('para-crossed-out');
      setTimeout(() => {
        // Remove from data first
        if (!page.articleBody || !page.articleBody.length) page.articleBody = [...bodyParas];
        page.articleBody.splice(idx, 1);
        // Remove from DOM and renumber
        wrap.remove();
        bodyParasContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => {
          w.querySelector('label').textContent = `Paragraph ${j + 1}`;
          w.querySelector('textarea').dataset.field = `artBodyPara${j}`;
        });
        savePages(true);
        renderAll();
      }, 400);
    };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `artBodyPara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    bodyParasContainer.appendChild(wrap);
  }

  bodyParas.forEach((v, i) => addBodyParaField(i, v));
  body.appendChild(bodyParasContainer);
  const addBodyParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addBodyParaBtn.type = 'button';
  addBodyParaBtn.onclick = () => addBodyParaField(bodyParasContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addBodyParaBtn);
  addSectionTitle(body, 'LEFT COLUMN');
  addField(body, 'Section Heading', 'articleExtraHeading', page.articleExtraHeading);
  const extraParas = page.articleExtraParas && page.articleExtraParas.length
    ? page.articleExtraParas
    : [page.articleExtraPara || ''];
  const extraParasContainer = mkEl('div', 'vision-paras-container');

  function addExtraParaField(index, value) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const labelRow = mkEl('div', 'slider-label-row');
    labelRow.appendChild(mkEl('label', '', `Paragraph ${index + 1}`));
    const removeBtn = mkEl('button', 'btn-remove-para', '✕');
    removeBtn.type = 'button';
    removeBtn.onclick = () => { wrap.remove(); renumberExtraParaLabels(); };
    labelRow.appendChild(removeBtn);
    wrap.appendChild(labelRow);
    const ta = document.createElement('textarea');
    ta.className = 'field-input';
    ta.rows = 4;
    ta.dataset.field = `articleExtraPara${index}`;
    ta.value = value || '';
    wrap.appendChild(ta);
    extraParasContainer.appendChild(wrap);
  }

  function renumberExtraParaLabels() {
    extraParasContainer.querySelectorAll('.vision-para-wrap').forEach((wrap, i) => {
      wrap.querySelector('label').textContent = `Paragraph ${i + 1}`;
      wrap.querySelector('textarea').dataset.field = `articleExtraPara${i}`;
    });
  }

  extraParas.forEach((val, i) => addExtraParaField(i, val));
  body.appendChild(extraParasContainer);

  const addExtraParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph');
  addExtraParaBtn.type = 'button';
  addExtraParaBtn.onclick = () => {
    const count = extraParasContainer.querySelectorAll('.vision-para-wrap').length;
    addExtraParaField(count, '');
  };
  body.appendChild(addExtraParaBtn);
  addSectionTitle(body, 'PULL QUOTE');
  const pqTa = addField(body, 'Pull Quote', 'pullQuote', page.pullQuote, 'textarea');
  pqTa.rows = 3;
  addSectionTitle(body, 'IMAGE');
  addImageFieldBtn(body, page.id, 'articleImage', 'Article Image');
  const artImgColWSlider = addSliderField(body, 'Image Column Width (%)', 'artImgColWidth', page.artImgColWidth != null ? page.artImgColWidth : 44, 20, 65);
  artImgColWSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--art-img-col-width', `${artImgColWSlider.value}%`);
  });
  const artImgH = addSliderField(body, 'Image Height', 'artImgHeight', page.artImgHeight != null ? page.artImgHeight : 610, 100, 800);
  artImgH.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--art-img-height', `${artImgH.value}px`);
  });
  const artXS = addSliderField(body, 'Position: Left / Right', 'articleImageX', page.articleImageX != null ? page.articleImageX : 50);
  const artYS = addSliderField(body, 'Position: Up / Down',   'articleImageY', page.articleImageY != null ? page.articleImageY : 50);
  const artZS = addSliderField(body, 'Zoom', 'articleImageZoom', page.articleImageZoom != null ? page.articleImageZoom : 100, 80, 200);
  bindImgSliders(page, 'articleImage', artXS, artYS, artZS);
}

function buildVisionFields(body, page) {
  addSectionTitle(body, 'IDENTITY');
  addField(body, 'Agency Name', 'agency', page.agency);
  addSectionTitle(body, 'HEADER STRIP');
  addField(body, 'Label (left)', 'edLabel', page.edLabel || 'AGENCY FEATURE');
  addField(body, 'Date (right)', 'edDate', page.edDate || 'APRIL 2026');
  addSectionTitle(body, 'CONTENT');
  addField(body, 'Headline', 'articleHeadline', page.articleHeadline || '');

  const paras = page.visionParas || ['', ''];
  const parasContainer = mkEl('div', 'vision-paras-container');

  function addParaField(index, value) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const labelRow = mkEl('div', 'slider-label-row');
    labelRow.appendChild(mkEl('label', '', `Paragraph ${index + 1}`));
    const removeBtn = mkEl('button', 'btn-remove-para', '✕');
    removeBtn.type = 'button';
    removeBtn.title = 'Remove paragraph';
    removeBtn.onclick = () => { wrap.classList.add('para-crossed-out'); setTimeout(() => { wrap.remove(); renumberParaLabels(); savePanelSilent(); }, 400); };
    labelRow.appendChild(removeBtn);
    wrap.appendChild(labelRow);
    const ta = document.createElement('textarea');
    ta.className = 'field-input';
    ta.rows = 4;
    ta.dataset.field = `visionPara${index}`;
    ta.value = value || '';
    wrap.appendChild(ta);
    parasContainer.appendChild(wrap);
  }

  function renumberParaLabels() {
    parasContainer.querySelectorAll('.vision-para-wrap').forEach((wrap, i) => {
      wrap.querySelector('label').textContent = `Paragraph ${i + 1}`;
      wrap.querySelector('textarea').dataset.field = `visionPara${i}`;
    });
  }

  paras.forEach((val, i) => addParaField(i, val));
  body.appendChild(parasContainer);

  const addParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph');
  addParaBtn.type = 'button';
  addParaBtn.onclick = () => {
    const count = parasContainer.querySelectorAll('.vision-para-wrap').length;
    addParaField(count, '');
  };
  body.appendChild(addParaBtn);

  addSectionTitle(body, 'QUOTE BOX');
  const vsQToggleWrap = mkEl('div', 'field-group');
  const vsQToggleLabel = mkEl('label', 'toggle-label');
  const vsQChk = document.createElement('input');
  vsQChk.type = 'checkbox'; vsQChk.dataset.field = 'vsShowQuote';
  vsQChk.checked = page.vsShowQuote !== false;
  vsQToggleLabel.appendChild(vsQChk);
  vsQToggleLabel.appendChild(document.createTextNode(' Show Quote Box'));
  vsQToggleWrap.appendChild(vsQToggleLabel);
  body.appendChild(vsQToggleWrap);
  const pqTa = addField(body, 'Pull Quote', 'pullQuote', page.pullQuote, 'textarea'); pqTa.rows = 3;
  addSectionTitle(body, 'HERO BANNER IMAGE');
  addImageFieldBtn(body, page.id, 'heroImage', 'Hero Banner Image');
  const vsOvWrap = mkEl('div', 'field-group');
  const vsOvLabel = mkEl('label', 'toggle-label');
  const vsOvChk = document.createElement('input');
  vsOvChk.type = 'checkbox'; vsOvChk.dataset.field = 'vsHeroOverlay';
  vsOvChk.checked = page.vsHeroOverlay !== false;
  vsOvLabel.appendChild(vsOvChk);
  vsOvLabel.appendChild(document.createTextNode(' Show Black Overlay'));
  vsOvWrap.appendChild(vsOvLabel);
  body.appendChild(vsOvWrap);
  const vsHXS = addSliderField(body, 'Position: Left / Right', 'heroImageX', page.heroImageX != null ? page.heroImageX : 50);
  const vsHYS = addSliderField(body, 'Position: Up / Down',   'heroImageY', page.heroImageY != null ? page.heroImageY : 50);
  const vsHZS = addSliderField(body, 'Zoom', 'heroImageZoom', page.heroImageZoom != null ? page.heroImageZoom : 100, 80, 200);
  bindImgSliders(page, 'heroImage', vsHXS, vsHYS, vsHZS);
  addSectionTitle(body, 'PORTRAIT IMAGE');
  addImageFieldBtn(body, page.id, 'articleImage', 'Portrait Image');
  const vsPXS = addSliderField(body, 'Position: Left / Right', 'articleImageX', page.articleImageX != null ? page.articleImageX : 50);
  const vsPYS = addSliderField(body, 'Position: Up / Down',   'articleImageY', page.articleImageY != null ? page.articleImageY : 50);
  const vsPZS = addSliderField(body, 'Zoom', 'articleImageZoom', page.articleImageZoom != null ? page.articleImageZoom : 100, 80, 200);
  bindImgSliders(page, 'articleImage', vsPXS, vsPYS, vsPZS);
}

function buildVision2Fields(body, page) {
  addSectionTitle(body, 'IDENTITY');
  addField(body, 'Agency Name', 'agency', page.agency);
  addSectionTitle(body, 'HEADER STRIP');
  addField(body, 'Label (left)', 'edLabel', page.edLabel || 'AGENCY FEATURE');
  addField(body, 'Date (right)', 'edDate', page.edDate || 'APRIL 2026');
  addSectionTitle(body, 'CONTENT');
  addField(body, 'Headline', 'articleHeadline', page.articleHeadline || '');
  addSectionTitle(body, 'SPACING');
  const vs2LHSlider = addSliderField(body, 'Label → Heading Gap (px)', 'vs2LabelHeadGap', page.vs2LabelHeadGap != null ? page.vs2LabelHeadGap : 10, 0, 60);
  vs2LHSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--vs2-label-head-gap', `${vs2LHSlider.value}px`);
  });
  const vs2PGSlider = addSliderField(body, 'Space Between Paragraphs', 'vs2ParaGap', page.vs2ParaGap != null ? page.vs2ParaGap : 8, 0, 40);
  vs2PGSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--vs2-para-gap', `${vs2PGSlider.value}px`);
  });

  const paras = page.visionParas || ['', ''];
  const parasContainer = mkEl('div', 'vision-paras-container');
  function addParaField(index, value) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const labelRow = mkEl('div', 'slider-label-row');
    labelRow.appendChild(mkEl('label', '', `Paragraph ${index + 1}`));
    const removeBtn = mkEl('button', 'btn-remove-para', '✕');
    removeBtn.type = 'button';
    removeBtn.onclick = () => { wrap.remove(); renumberParaLabels(); };
    labelRow.appendChild(removeBtn);
    wrap.appendChild(labelRow);
    const ta = document.createElement('textarea');
    ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `visionPara${index}`; ta.value = value || '';
    wrap.appendChild(ta);
    parasContainer.appendChild(wrap);
  }
  function renumberParaLabels() {
    parasContainer.querySelectorAll('.vision-para-wrap').forEach((wrap, i) => {
      wrap.querySelector('label').textContent = `Paragraph ${i + 1}`;
      wrap.querySelector('textarea').dataset.field = `visionPara${i}`;
    });
  }
  paras.forEach((val, i) => addParaField(i, val));
  body.appendChild(parasContainer);
  const addParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph');
  addParaBtn.type = 'button';
  addParaBtn.onclick = () => addParaField(parasContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addParaBtn);


  addSectionTitle(body, 'TOP IMAGES HEIGHT');
  const vs2TopHSlider = addSliderField(body, 'Top Images Height (%)', 'vs2TopHeight', page.vs2TopHeight != null ? page.vs2TopHeight : 30, 10, 70);
  vs2TopHSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--vs2-top-height', `${vs2TopHSlider.value}%`);
  });

  addSectionTitle(body, 'TOP IMAGE 1 (LEFT)');
  addImageFieldBtn(body, page.id, 'vision2Image1', 'Top Image 1');
  const v2I1X = addSliderField(body, 'Position: Left / Right', 'vision2Image1X', page.vision2Image1X != null ? page.vision2Image1X : 50);
  const v2I1Y = addSliderField(body, 'Position: Up / Down',   'vision2Image1Y', page.vision2Image1Y != null ? page.vision2Image1Y : 50);
  const v2I1Z = addSliderField(body, 'Zoom', 'vision2Image1Zoom', page.vision2Image1Zoom != null ? page.vision2Image1Zoom : 100, 80, 200);
  bindImgSliders(page, 'vision2Image1', v2I1X, v2I1Y, v2I1Z);

  addSectionTitle(body, 'TOP IMAGE 2 (RIGHT)');
  addImageFieldBtn(body, page.id, 'vision2Image2', 'Top Image 2');
  const v2I2X = addSliderField(body, 'Position: Left / Right', 'vision2Image2X', page.vision2Image2X != null ? page.vision2Image2X : 50);
  const v2I2Y = addSliderField(body, 'Position: Up / Down',   'vision2Image2Y', page.vision2Image2Y != null ? page.vision2Image2Y : 50);
  const v2I2Z = addSliderField(body, 'Zoom', 'vision2Image2Zoom', page.vision2Image2Zoom != null ? page.vision2Image2Zoom : 100, 80, 200);
  bindImgSliders(page, 'vision2Image2', v2I2X, v2I2Y, v2I2Z);

  addSectionTitle(body, 'PORTRAIT IMAGE');
  const vs2PHSlider = addSliderField(body, 'Portrait Height (%)', 'vs2PortraitHeight', page.vs2PortraitHeight != null ? page.vs2PortraitHeight : 100, 20, 100);
  vs2PHSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--vs2-portrait-height', `${vs2PHSlider.value}%`);
  });
  addImageFieldBtn(body, page.id, 'articleImage', 'Portrait Image');
  const vsPXS = addSliderField(body, 'Position: Left / Right', 'articleImageX', page.articleImageX != null ? page.articleImageX : 50);
  const vsPYS = addSliderField(body, 'Position: Up / Down',   'articleImageY', page.articleImageY != null ? page.articleImageY : 50);
  const vsPZS = addSliderField(body, 'Zoom', 'articleImageZoom', page.articleImageZoom != null ? page.articleImageZoom : 100, 80, 200);
  bindImgSliders(page, 'articleImage', vsPXS, vsPYS, vsPZS);

  // ── LEFT QUOTE BOX (optional, below portrait) ──
  addSectionTitle(body, 'QUOTE BOX (BELOW PORTRAIT)');
  const vs2LQToggleWrap = mkEl('div', 'field-group');
  const vs2LQToggleLabel = mkEl('label', 'toggle-label');
  const vs2LQChk = document.createElement('input');
  vs2LQChk.type = 'checkbox'; vs2LQChk.dataset.field = 'vs2ShowLeftQuote';
  vs2LQChk.checked = !!page.vs2ShowLeftQuote;
  vs2LQToggleLabel.appendChild(vs2LQChk);
  vs2LQToggleLabel.appendChild(document.createTextNode(' Show Quote Box'));
  vs2LQToggleWrap.appendChild(vs2LQToggleLabel);
  body.appendChild(vs2LQToggleWrap);
  const vs2QBHSlider = addSliderField(body, 'Quote Box Height (%)', 'vs2QuoteBoxHeight', page.vs2QuoteBoxHeight != null ? page.vs2QuoteBoxHeight : 35, 10, 70);
  vs2QBHSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--vs2-quote-box-height', `${vs2QBHSlider.value}%`);
  });
  const vs2QSSlider = addSliderField(body, 'Quote Text Size (px)', 'vs2QuoteSize', page.vs2QuoteSize != null ? page.vs2QuoteSize : 9.5, 6, 20);
  vs2QSSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--vs2-quote-size', `${vs2QSSlider.value}px`);
  });
  const lqTa = addField(body, 'Quote Text', 'vs2LeftQuote', page.vs2LeftQuote || 'An inspiring quote that captures the story.', 'textarea');
  lqTa.rows = 3;
}

function buildProfileFields(body, page) {
  addSectionTitle(body, 'HEADER STRIP');
  addField(body, 'Label (left)', 'edLabel', page.edLabel || 'AGENCY FEATURE');
  addField(body, 'Date (right)', 'edDate', page.edDate || 'APRIL 2026');

  addSectionTitle(body, 'HEADLINE');
  const hlTa = addField(body, 'Page Headline (use \\n for line breaks)', 'articleHeadline', page.articleHeadline || '', 'textarea');
  hlTa.rows = 3;
  const prLhSlider = addSliderField(body, 'Heading Line Spacing', 'prHeadingLh', page.prHeadingLh != null ? page.prHeadingLh : 10, 8, 20);
  prLhSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--pr-heading-lh', prLhSlider.value / 10);
  });

  addSectionTitle(body, 'BODY PARAGRAPHS');
  const prGapSlider = addSliderField(body, 'Space Between Paragraphs', 'prParaGap', page.prParaGap != null ? page.prParaGap : 10, 0, 40);
  prGapSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--pr-para-gap', `${prGapSlider.value}px`);
  });
  const profileParas = page.profileParas && page.profileParas.length
    ? page.profileParas : [page.coverBlurb || ''];
  const profParasContainer = mkEl('div', 'vision-paras-container');

  function addProfParaField(index, value) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const labelRow = mkEl('div', 'slider-label-row');
    labelRow.appendChild(mkEl('label', '', `Paragraph ${index + 1}`));
    const removeBtn = mkEl('button', 'btn-remove-para', '✕');
    removeBtn.type = 'button';
    removeBtn.onclick = () => { wrap.remove(); renumberProfParaLabels(); };
    labelRow.appendChild(removeBtn);
    wrap.appendChild(labelRow);
    const ta = document.createElement('textarea');
    ta.className = 'field-input';
    ta.rows = 4;
    ta.dataset.field = `profilePara${index}`;
    ta.value = value || '';
    wrap.appendChild(ta);
    profParasContainer.appendChild(wrap);
  }

  function renumberProfParaLabels() {
    profParasContainer.querySelectorAll('.vision-para-wrap').forEach((wrap, i) => {
      wrap.querySelector('label').textContent = `Paragraph ${i + 1}`;
      wrap.querySelector('textarea').dataset.field = `profilePara${i}`;
    });
  }

  profileParas.forEach((val, i) => addProfParaField(i, val));
  body.appendChild(profParasContainer);

  const addProfParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph');
  addProfParaBtn.type = 'button';
  addProfParaBtn.onclick = () => {
    const count = profParasContainer.querySelectorAll('.vision-para-wrap').length;
    addProfParaField(count, '');
  };
  body.appendChild(addProfParaBtn);

  addSectionTitle(body, 'RIGHT IMAGE');
  addImageFieldBtn(body, page.id, 'articleImage', 'Right Column Image');
  const prXS = addSliderField(body, 'Position: Left / Right', 'articleImageX', page.articleImageX != null ? page.articleImageX : 50);
  const prYS = addSliderField(body, 'Position: Up / Down',   'articleImageY', page.articleImageY != null ? page.articleImageY : 50);
  const prZS = addSliderField(body, 'Zoom', 'articleImageZoom', page.articleImageZoom != null ? page.articleImageZoom : 100, 80, 200);
  bindImgSliders(page, 'articleImage', prXS, prYS, prZS);
}

function buildInterviewFields(body, page) {
  addSectionTitle(body, 'HEADER');
  addField(body, 'Page Title', 'articleHeadline', page.articleHeadline || 'Q&A');
  const ivTitleSlider = addSliderField(body, 'Heading Size', 'ivTitleSize', page.ivTitleSize != null ? page.ivTitleSize : 20, 10, 60);
  ivTitleSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--iv-title-size', `${ivTitleSlider.value}px`);
  });
  const ivTitleLhSlider = addSliderField(body, 'Heading Line Spacing', 'ivTitleLh', page.ivTitleLh != null ? page.ivTitleLh : 11, 8, 25);
  ivTitleLhSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--iv-title-lh', ivTitleLhSlider.value / 10);
  });
  const ivSubLhSlider = addSliderField(body, 'Sub-Heading Line Spacing', 'ivSubheadingLh', page.ivSubheadingLh != null ? page.ivSubheadingLh : 12, 8, 25);
  ivSubLhSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--iv-subheading-lh', ivSubLhSlider.value / 10);
  });
  addField(body, 'Banner Label (e.g. WITH)', 'ivBannerLabel', page.ivBannerLabel || 'WITH');
  addField(body, 'Person Name (banner)', 'personName', page.personName);
  addField(body, 'Person Title', 'personTitle', page.personTitle);

  addSectionTitle(body, 'INTRO PARAGRAPH');
  const introTa = addField(body, 'Intro / Context', 'articleSubheadline', page.articleSubheadline, 'textarea');
  introTa.rows = 3;

  addSectionTitle(body, 'PARAGRAPH SPACING');
  const ivParaGapSlider = addSliderField(body, 'Space Between Paragraphs', 'ivParaGap', page.ivParaGap != null ? page.ivParaGap : 0, 0, 30);
  ivParaGapSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--iv-para-gap', `${ivParaGapSlider.value}px`);
  });

  addSectionTitle(body, 'LEFT COLUMN THOUGHTS');
  const leftThoughts = page.ivLeftThoughts || [
    { heading: 'Thought 1', paras: ['First insight goes here.'] },
    { heading: 'Thought 2', paras: ['Second insight goes here.'] },
    { heading: 'Thought 3', paras: ['Third insight goes here.'] }
  ];
  const leftContainer = mkEl('div', 'vision-paras-container');

  function addLeftThoughtField(i, t) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    wrap.style.cssText = 'border:1px solid #e0d9cc;border-radius:4px;padding:8px;margin-bottom:8px;';

    // Header row: label + remove thought
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Thought ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕ Remove'); rb.type = 'button';
    rb.onclick = () => { wrap.remove(); renumberLeftThoughts(); };
    lr.appendChild(rb); wrap.appendChild(lr);

    // Sub-heading input
    const hInp = document.createElement('input');
    hInp.type = 'text'; hInp.className = 'field-input';
    hInp.placeholder = 'Sub-Heading'; hInp.value = (t && t.heading) || '';
    hInp.dataset.field = `ivLeftThought${i}_heading`;
    hInp.style.marginBottom = '6px';
    wrap.appendChild(hInp);

    // Paragraphs container
    const parasContainer = mkEl('div', 'vision-paras-container');
    parasContainer.style.marginBottom = '4px';
    const existingParas = (t && (t.paras || (t.body ? [t.body] : ['']))) || [''];

    function addParaField(pi, val) {
      const pWrap = mkEl('div', 'field-group vision-para-wrap');
      const pLr = mkEl('div', 'slider-label-row');
      pLr.appendChild(mkEl('label', '', `Para ${pi + 1}`));
      const pRb = mkEl('button', 'btn-remove-para', '✕'); pRb.type = 'button';
      pRb.onclick = () => {
        pWrap.remove();
        parasContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => {
          w.querySelector('label').textContent = `Para ${j + 1}`;
          w.querySelector('textarea').dataset.field = `ivLeftThought${i}_para${j}`;
        });
      };
      pLr.appendChild(pRb); pWrap.appendChild(pLr);
      const ta = document.createElement('textarea');
      ta.className = 'field-input'; ta.rows = 3;
      ta.placeholder = 'Paragraph text'; ta.value = val || '';
      ta.dataset.field = `ivLeftThought${i}_para${pi}`;
      pWrap.appendChild(ta);
      parasContainer.appendChild(pWrap);
    }

    existingParas.forEach((v, pi) => addParaField(pi, v));
    wrap.appendChild(parasContainer);

    const addParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addParaBtn.type = 'button';
    addParaBtn.style.marginTop = '2px';
    addParaBtn.onclick = () => addParaField(parasContainer.querySelectorAll('.vision-para-wrap').length, '');
    wrap.appendChild(addParaBtn);

    leftContainer.appendChild(wrap);
  }

  function renumberLeftThoughts() {
    leftContainer.querySelectorAll(':scope > .vision-para-wrap').forEach((wrap, i) => {
      wrap.querySelector('.slider-label-row label').textContent = `Thought ${i + 1}`;
      wrap.querySelector('input[data-field]').dataset.field = `ivLeftThought${i}_heading`;
      wrap.querySelectorAll('textarea[data-field]').forEach((ta, pi) => {
        ta.dataset.field = `ivLeftThought${i}_para${pi}`;
      });
    });
  }

  leftThoughts.forEach((t, i) => addLeftThoughtField(i, t));
  body.appendChild(leftContainer);
  const addLeftBtn = mkEl('button', 'btn-add-para', '+ Add Thought');
  addLeftBtn.type = 'button';
  addLeftBtn.onclick = () => {
    const count = leftContainer.querySelectorAll(':scope > .vision-para-wrap').length;
    addLeftThoughtField(count, { heading: `Thought ${count + 1}`, paras: [''] });
  };
  body.appendChild(addLeftBtn);

  addSectionTitle(body, 'PORTRAIT IMAGE');
  addImageFieldBtn(body, page.id, 'articleImage', 'Portrait Photo');
  const ivXS = addSliderField(body, 'Position: Left / Right', 'articleImageX', page.articleImageX != null ? page.articleImageX : 50);
  const ivYS = addSliderField(body, 'Position: Up / Down',   'articleImageY', page.articleImageY != null ? page.articleImageY : 50);
  const ivZS = addSliderField(body, 'Zoom', 'articleImageZoom', page.articleImageZoom != null ? page.articleImageZoom : 100, 80, 200);
  bindImgSliders(page, 'articleImage', ivXS, ivYS, ivZS);
}

function buildStatsFields(body, page) {
  addSectionTitle(body, 'PARAGRAPH SPACING');
  const stGapSlider = addSliderField(body, 'Space Between Paragraphs', 'stParaGap', page.stParaGap != null ? page.stParaGap : 0, 0, 30);
  stGapSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--st-para-gap', `${stGapSlider.value}px`);
  });

  addSectionTitle(body, 'TOP IMAGES');
  addImageFieldBtn(body, page.id, 'statsImage1', 'Image 1 (Left)');
  const st1XS = addSliderField(body, 'Image 1: Left / Right', 'statsImage1X', page.statsImage1X != null ? page.statsImage1X : 50);
  const st1YS = addSliderField(body, 'Image 1: Up / Down',    'statsImage1Y', page.statsImage1Y != null ? page.statsImage1Y : 50);
  const st1ZS = addSliderField(body, 'Image 1: Zoom',         'statsImage1Zoom', page.statsImage1Zoom != null ? page.statsImage1Zoom : 100, 80, 200);
  bindImgSliders(page, 'statsImage1', st1XS, st1YS, st1ZS);
  addImageFieldBtn(body, page.id, 'statsImage2', 'Image 2 (Right)');
  const st2XS = addSliderField(body, 'Image 2: Left / Right', 'statsImage2X', page.statsImage2X != null ? page.statsImage2X : 50);
  const st2YS = addSliderField(body, 'Image 2: Up / Down',    'statsImage2Y', page.statsImage2Y != null ? page.statsImage2Y : 50);
  const st2ZS = addSliderField(body, 'Image 2: Zoom',         'statsImage2Zoom', page.statsImage2Zoom != null ? page.statsImage2Zoom : 100, 80, 200);
  bindImgSliders(page, 'statsImage2', st2XS, st2YS, st2ZS);

  addSectionTitle(body, 'LEFT COLUMN');
  addField(body, 'Heading', 'articleHeadline', page.articleHeadline || '');
  const leftParas = page.statsLeftParas || [''];
  const leftContainer = mkEl('div', 'vision-paras-container');
  function addLeftPara(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.remove(); leftContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `statsLeftPara${j}`; }); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `statsLeftPara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    leftContainer.appendChild(wrap);
  }
  leftParas.forEach((v, i) => addLeftPara(i, v));
  body.appendChild(leftContainer);
  const addLeftBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addLeftBtn.type = 'button';
  addLeftBtn.onclick = () => addLeftPara(leftContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addLeftBtn);

  addSectionTitle(body, 'RIGHT COLUMN');
  const rightParas = page.statsRightParas || [''];
  const rightContainer = mkEl('div', 'vision-paras-container');
  function addRightPara(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.remove(); rightContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `statsRightPara${j}`; }); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `statsRightPara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    rightContainer.appendChild(wrap);
  }
  rightParas.forEach((v, i) => addRightPara(i, v));
  body.appendChild(rightContainer);
  const addRightBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addRightBtn.type = 'button';
  addRightBtn.onclick = () => addRightPara(rightContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addRightBtn);

  addSectionTitle(body, 'QUOTE BOX');
  const stQToggleWrap = mkEl('div', 'field-group');
  const stQToggleLabel = mkEl('label', 'toggle-label');
  const stQChk = document.createElement('input');
  stQChk.type = 'checkbox'; stQChk.dataset.field = 'stShowQuote';
  stQChk.checked = page.stShowQuote !== false;
  stQToggleLabel.appendChild(stQChk);
  stQToggleLabel.appendChild(document.createTextNode(' Show Quote Box'));
  stQToggleWrap.appendChild(stQToggleLabel);
  body.appendChild(stQToggleWrap);

  const pqTa = addField(body, 'Quote', 'pullQuote', page.pullQuote, 'textarea'); pqTa.rows = 3;

  const stQTopSlider = addSliderField(body, 'Position: Up / Down', 'stQuoteTop', page.stQuoteTop != null ? page.stQuoteTop : 150, 0, 300);
  stQTopSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--st-quote-top', `${stQTopSlider.value}px`);
  });

  const stQPadSlider = addSliderField(body, 'Height Spacing (Padding)', 'stQuotePad', page.stQuotePad != null ? page.stQuotePad : 10, 4, 50);
  stQPadSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--st-quote-pad', `${stQPadSlider.value}px`);
  });
}

// ── STATS BANNER PAGE (Int Page – Temp 20) ─────────────────

function buildStatsBannerPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const d = PAGE_DEFAULTS.statsBanner;
  const div = mkEl('div', 'mag-page page-stats-banner');
  div.dataset.pageId = page.id;
  div.style.setProperty('--st-accent', accent);
  div.style.setProperty('--stb-img-height', `${page.st2ImgHeight != null ? page.st2ImgHeight : 42}%`);
  div.style.setProperty('--st-para-gap', `${page.st2ParaGap != null ? page.st2ParaGap : 0}px`);

  // ── TOP: single full-width banner ──
  const banner = mkEl('div', 'stb-banner');
  banner.appendChild(buildImgLayer(page, 'bannerImage', 'bannerImageX', 'bannerImageY', 'bannerImageZoom', 'bgsize'));
  banner.appendChild(buildImgOverlay(page.id, 'bannerImage', 'Banner Photo'));
  div.appendChild(banner);

  // ── BOTTOM: 2-column layout (same as stats2) ──
  const bottom = mkEl('div', 'st-bottom');

  function renderSections(col, sections, sectionsKey) {
    sections.forEach((sec, si) => {
      const subEl = mkEl('div', 'st2-sub-heading');
      subEl.contentEditable = 'true';
      subEl.innerHTML = sec.sub || '';
      subEl.addEventListener('blur', () => {
        if (!page[sectionsKey]) page[sectionsKey] = [];
        if (!page[sectionsKey][si]) page[sectionsKey][si] = { sub: '', paras: [] };
        page[sectionsKey][si].sub = subEl.innerHTML;
        savePages(true);
      });
      col.appendChild(subEl);
      (sec.paras || []).forEach((para, pi) => {
        const p = mkEl('p', 'st-body-text');
        p.contentEditable = 'true'; p.innerHTML = para;
        p.addEventListener('blur', () => {
          if (!page[sectionsKey]) page[sectionsKey] = [];
          if (!page[sectionsKey][si]) page[sectionsKey][si] = { sub: '', paras: [] };
          page[sectionsKey][si].paras[pi] = p.innerHTML;
          savePages(true);
        });
        col.appendChild(p);
      });
    });
  }

  const leftCol = mkEl('div', 'st-left');
  leftCol.appendChild(inlineEditable('div', 'st-heading',
    page.articleHeadline || d.articleHeadline, page, 'articleHeadline'));
  const leftSections = page.st2LeftSections && page.st2LeftSections.length ? page.st2LeftSections : d.st2LeftSections;
  renderSections(leftCol, leftSections, 'st2LeftSections');
  bottom.appendChild(leftCol);

  const rightCol = mkEl('div', 'st-right');
  const rightSections = page.st2RightSections && page.st2RightSections.length ? page.st2RightSections : d.st2RightSections;
  renderSections(rightCol, rightSections, 'st2RightSections');

  if (page.st2ShowQuote !== false) {
    const qBox = mkEl('div', 'st-quote-box');
    qBox.appendChild(mkEl('span', 'st-qmark', '"'));
    qBox.appendChild(inlineEditable('p', 'st-quote-text',
      page.pullQuote || d.pullQuote, page, 'pullQuote'));
    rightCol.appendChild(qBox);
  }
  bottom.appendChild(rightCol);

  div.appendChild(bottom);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

function buildStatsBannerFields(body, page) {
  const d = PAGE_DEFAULTS.statsBanner;

  // ── BANNER IMAGE ──
  addSectionTitle(body, 'BANNER IMAGE');
  const stbIH = addSliderField(body, 'Banner Height', 'st2ImgHeight', page.st2ImgHeight != null ? page.st2ImgHeight : 42, 15, 75);
  stbIH.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--stb-img-height', `${stbIH.value}%`);
  });
  addImageFieldBtn(body, page.id, 'bannerImage', 'Banner Photo');
  const stbXS = addSliderField(body, 'Position: Left / Right', 'bannerImageX', page.bannerImageX != null ? page.bannerImageX : 50);
  const stbYS = addSliderField(body, 'Position: Up / Down',    'bannerImageY', page.bannerImageY != null ? page.bannerImageY : 50);
  const stbZS = addSliderField(body, 'Zoom', 'bannerImageZoom', page.bannerImageZoom != null ? page.bannerImageZoom : 100, 80, 200);
  bindImgSliders(page, 'bannerImage', stbXS, stbYS, stbZS);

  // ── MAIN HEADING ──
  addSectionTitle(body, 'MAIN HEADING');
  addField(body, 'Heading', 'articleHeadline', page.articleHeadline || d.articleHeadline);

  // ── PARAGRAPH SPACING ──
  addSectionTitle(body, 'PARAGRAPH SPACING');
  const stbGapSlider = addSliderField(body, 'Space Between Paragraphs', 'st2ParaGap', page.st2ParaGap != null ? page.st2ParaGap : 0, 0, 30);
  stbGapSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--st-para-gap', `${stbGapSlider.value}px`);
  });

  // ── COLUMNS (reuse stats2 column editor) ──
  function buildColumnEditor(colLabel, sectionsKey, defaultSections) {
    addSectionTitle(body, colLabel);
    const sections = page[sectionsKey] && page[sectionsKey].length ? page[sectionsKey] : JSON.parse(JSON.stringify(defaultSections));
    const colContainer = mkEl('div', 'st2-col-container');

    function addSectionBlock(si, secData) {
      const block = mkEl('div', 'st2-section-block');
      block.style.cssText = 'border:1px solid #e0d9cc;border-radius:4px;padding:8px;margin-bottom:8px;';
      const bHeader = mkEl('div', 'slider-label-row');
      bHeader.appendChild(mkEl('label', '', `Section ${si + 1}`));
      const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
      rb.onclick = () => { block.remove(); };
      bHeader.appendChild(rb);
      block.appendChild(bHeader);
      const subInp = document.createElement('input');
      subInp.type = 'text'; subInp.className = 'field-input';
      subInp.placeholder = 'Sub-heading'; subInp.value = secData.sub || '';
      subInp.dataset.field = `${sectionsKey === 'st2LeftSections' ? 'st2LeftSub' : 'st2RightSub'}_${si}`;
      block.appendChild(subInp);
      const parasContainer = mkEl('div', 'vision-paras-container');
      function addParaField(pi, val) {
        const pWrap = mkEl('div', 'field-group vision-para-wrap');
        const pLr = mkEl('div', 'slider-label-row');
        pLr.appendChild(mkEl('label', '', `Para ${pi + 1}`));
        const pRb = mkEl('button', 'btn-remove-para', '✕'); pRb.type = 'button';
        pRb.onclick = () => { pWrap.remove(); };
        pLr.appendChild(pRb); pWrap.appendChild(pLr);
        const ta = document.createElement('textarea');
        ta.className = 'field-input'; ta.rows = 3;
        ta.placeholder = 'Paragraph text'; ta.value = val || '';
        ta.dataset.field = `${sectionsKey === 'st2LeftSections' ? 'st2LeftPara' : 'st2RightPara'}_${si}_${pi}`;
        pWrap.appendChild(ta);
        parasContainer.appendChild(pWrap);
      }
      (secData.paras || ['']).forEach((v, pi) => addParaField(pi, v));
      block.appendChild(parasContainer);
      const addParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addParaBtn.type = 'button';
      addParaBtn.style.marginTop = '2px';
      addParaBtn.onclick = () => addParaField(parasContainer.querySelectorAll('.vision-para-wrap').length, '');
      block.appendChild(addParaBtn);
      colContainer.appendChild(block);
    }

    sections.forEach((sec, si) => addSectionBlock(si, sec));
    body.appendChild(colContainer);
    const addSecBtn = mkEl('button', 'btn-add-para', '+ Add Section'); addSecBtn.type = 'button';
    addSecBtn.onclick = () => addSectionBlock(colContainer.querySelectorAll('.st2-section-block').length, { sub: '', paras: [''] });
    body.appendChild(addSecBtn);
  }

  buildColumnEditor('LEFT COLUMN', 'st2LeftSections', d.st2LeftSections);
  buildColumnEditor('RIGHT COLUMN', 'st2RightSections', d.st2RightSections);

  // ── QUOTE BOX ──
  addSectionTitle(body, 'QUOTE BOX');
  const stbQToggleWrap = mkEl('div', 'field-group');
  const stbQToggleLabel = mkEl('label', 'toggle-label');
  const stbQChk = document.createElement('input');
  stbQChk.type = 'checkbox'; stbQChk.dataset.field = 'st2ShowQuote';
  stbQChk.checked = page.st2ShowQuote !== false;
  stbQToggleLabel.appendChild(stbQChk);
  stbQToggleLabel.appendChild(document.createTextNode(' Show Quote Box'));
  stbQToggleWrap.appendChild(stbQToggleLabel);
  body.appendChild(stbQToggleWrap);
  const stbQTa = addField(body, 'Quote Text', 'pullQuote', page.pullQuote || d.pullQuote, 'textarea');
  stbQTa.rows = 4;
}

// ── STATS 2 PAGE (Int Page – Temp 19) ──────────────────────

function buildStats2Page(page, index) {
  const accent = page.accentColor || '#E4022D';
  const d = PAGE_DEFAULTS.stats2;
  const div = mkEl('div', 'mag-page page-stats2');
  div.dataset.pageId = page.id;
  div.style.setProperty('--st-accent', accent);
  div.style.setProperty('--st2-img-height', `${page.st2ImgHeight != null ? page.st2ImgHeight : 42}%`);
  div.style.setProperty('--st-para-gap', `${page.st2ParaGap != null ? page.st2ParaGap : 0}px`);

  // ── TOP: two images side by side ──
  const topImages = mkEl('div', 'st-top-images');
  const img1 = mkEl('div', 'st-img-box');
  img1.appendChild(buildImgLayer(page, 'statsImage1', 'statsImage1X', 'statsImage1Y', 'statsImage1Zoom'));
  img1.appendChild(buildImgOverlay(page.id, 'statsImage1', 'Image 1'));
  topImages.appendChild(img1);
  const img2 = mkEl('div', 'st-img-box');
  img2.appendChild(buildImgLayer(page, 'statsImage2', 'statsImage2X', 'statsImage2Y', 'statsImage2Zoom'));
  img2.appendChild(buildImgOverlay(page.id, 'statsImage2', 'Image 2'));
  topImages.appendChild(img2);
  div.appendChild(topImages);

  // ── BOTTOM: 2-column layout ──
  const bottom = mkEl('div', 'st-bottom');

  // Helper: render one column's sections into a col element
  function renderSections(col, sections, sectionsKey) {
    sections.forEach((sec, si) => {
      const subEl = mkEl('div', 'st2-sub-heading');
      subEl.contentEditable = 'true';
      subEl.innerHTML = sec.sub || '';
      subEl.addEventListener('blur', () => {
        if (!page[sectionsKey]) page[sectionsKey] = [];
        if (!page[sectionsKey][si]) page[sectionsKey][si] = { sub: '', paras: [] };
        page[sectionsKey][si].sub = subEl.innerHTML;
        savePages(true);
      });
      col.appendChild(subEl);
      (sec.paras || []).forEach((para, pi) => {
        const p = mkEl('p', 'st-body-text');
        p.contentEditable = 'true'; p.innerHTML = para;
        p.addEventListener('blur', () => {
          if (!page[sectionsKey]) page[sectionsKey] = [];
          if (!page[sectionsKey][si]) page[sectionsKey][si] = { sub: '', paras: [] };
          page[sectionsKey][si].paras[pi] = p.innerHTML;
          savePages(true);
        });
        col.appendChild(p);
      });
    });
  }

  // ── LEFT COLUMN ──
  const leftCol = mkEl('div', 'st-left');
  leftCol.appendChild(inlineEditable('div', 'st-heading',
    page.articleHeadline || d.articleHeadline, page, 'articleHeadline'));
  const leftSections = page.st2LeftSections && page.st2LeftSections.length ? page.st2LeftSections : d.st2LeftSections;
  renderSections(leftCol, leftSections, 'st2LeftSections');
  bottom.appendChild(leftCol);

  // ── RIGHT COLUMN ──
  const rightCol = mkEl('div', 'st-right');
  const rightSections = page.st2RightSections && page.st2RightSections.length ? page.st2RightSections : d.st2RightSections;
  renderSections(rightCol, rightSections, 'st2RightSections');

  // Quote box (optional)
  if (page.st2ShowQuote !== false) {
    const qBox = mkEl('div', 'st-quote-box');
    qBox.appendChild(mkEl('span', 'st-qmark', '"'));
    qBox.appendChild(inlineEditable('p', 'st-quote-text',
      page.pullQuote || d.pullQuote, page, 'pullQuote'));
    rightCol.appendChild(qBox);
  }
  bottom.appendChild(rightCol);

  div.appendChild(bottom);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

function buildStats2Fields(body, page) {
  const d = PAGE_DEFAULTS.stats2;

  // ── TOP IMAGES ──
  addSectionTitle(body, 'TOP IMAGES');
  const st2IH = addSliderField(body, 'Banner Height', 'st2ImgHeight', page.st2ImgHeight != null ? page.st2ImgHeight : 42, 15, 75);
  st2IH.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--st2-img-height', `${st2IH.value}%`);
  });
  addImageFieldBtn(body, page.id, 'statsImage1', 'Image 1 (Left)');
  const st1XS = addSliderField(body, 'Image 1: Left / Right', 'statsImage1X', page.statsImage1X != null ? page.statsImage1X : 50);
  const st1YS = addSliderField(body, 'Image 1: Up / Down',    'statsImage1Y', page.statsImage1Y != null ? page.statsImage1Y : 50);
  const st1ZS = addSliderField(body, 'Image 1: Zoom',         'statsImage1Zoom', page.statsImage1Zoom != null ? page.statsImage1Zoom : 100, 80, 200);
  bindImgSliders(page, 'statsImage1', st1XS, st1YS, st1ZS);
  addImageFieldBtn(body, page.id, 'statsImage2', 'Image 2 (Right)');
  const st2XS = addSliderField(body, 'Image 2: Left / Right', 'statsImage2X', page.statsImage2X != null ? page.statsImage2X : 50);
  const st2YS = addSliderField(body, 'Image 2: Up / Down',    'statsImage2Y', page.statsImage2Y != null ? page.statsImage2Y : 50);
  const st2ZS = addSliderField(body, 'Image 2: Zoom',         'statsImage2Zoom', page.statsImage2Zoom != null ? page.statsImage2Zoom : 100, 80, 200);
  bindImgSliders(page, 'statsImage2', st2XS, st2YS, st2ZS);

  // ── MAIN HEADING ──
  addSectionTitle(body, 'MAIN HEADING');
  addField(body, 'Heading', 'articleHeadline', page.articleHeadline || d.articleHeadline);

  // ── PARAGRAPH SPACING ──
  addSectionTitle(body, 'PARAGRAPH SPACING');
  const st2GapSlider = addSliderField(body, 'Space Between Paragraphs', 'st2ParaGap', page.st2ParaGap != null ? page.st2ParaGap : 0, 0, 30);
  st2GapSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--st-para-gap', `${st2GapSlider.value}px`);
  });

  // Helper: build a dynamic column section editor
  function buildColumnEditor(colLabel, sectionsKey, defaultSections) {
    addSectionTitle(body, colLabel);
    const sections = page[sectionsKey] && page[sectionsKey].length ? page[sectionsKey] : JSON.parse(JSON.stringify(defaultSections));
    const colContainer = mkEl('div', 'st2-col-container');

    function addSectionBlock(si, secData) {
      const block = mkEl('div', 'st2-section-block');
      block.style.cssText = 'border:1px solid #e0d9cc;border-radius:4px;padding:8px;margin-bottom:8px;';

      // Section header row with label + remove button
      const hdr = mkEl('div', 'slider-label-row');
      hdr.appendChild(mkEl('label', '', `Sub-Section ${si + 1}`));
      const subField = sectionsKey === 'st2LeftSections' ? 'st2LeftSub' : 'st2RightSub';
      const parasKey = sectionsKey === 'st2LeftSections' ? 'st2LeftPara' : 'st2RightPara';

      const removeBlock = mkEl('button', 'btn-remove-para', '✕ Remove'); removeBlock.type = 'button';
      removeBlock.onclick = () => {
        block.remove();
        colContainer.querySelectorAll('.st2-section-block').forEach((b, j) => {
          b.querySelector('.slider-label-row label').textContent = `Sub-Section ${j + 1}`;
          const subI = b.querySelector(`input[data-field^="${subField}_"]`);
          if (subI) subI.dataset.field = `${subField}_${j}`;
          b.querySelectorAll(`textarea[data-field^="${parasKey}_"]`).forEach((ta, pi) => {
            ta.dataset.field = `${parasKey}_${j}_${pi}`;
          });
        });
      };
      hdr.appendChild(removeBlock);
      block.appendChild(hdr);

      // Sub-heading input
      const subInp = document.createElement('input');
      subInp.type = 'text'; subInp.className = 'field-input';
      subInp.dataset.field = `${subField}_${si}`;
      subInp.value = secData.sub || '';
      subInp.placeholder = 'Sub-Heading Text';
      subInp.style.marginBottom = '6px';
      block.appendChild(subInp);

      // Paragraphs
      const parasContainer = mkEl('div', 'vision-paras-container');
      function addParaField(pi, val) {
        const wrap = mkEl('div', 'field-group vision-para-wrap');
        const lr = mkEl('div', 'slider-label-row');
        lr.appendChild(mkEl('label', '', `Para ${pi + 1}`));
        const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
        rb.onclick = () => {
          wrap.remove();
          parasContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => {
            w.querySelector('label').textContent = `Para ${j + 1}`;
            w.querySelector('textarea').dataset.field = `${parasKey}_${si}_${j}`;
          });
        };
        lr.appendChild(rb); wrap.appendChild(lr);
        const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 2;
        ta.dataset.field = `${parasKey}_${si}_${pi}`; ta.value = val || ''; wrap.appendChild(ta);
        parasContainer.appendChild(wrap);
      }
      (secData.paras || ['']).forEach((v, pi) => addParaField(pi, v));
      block.appendChild(parasContainer);
      const addParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addParaBtn.type = 'button';
      addParaBtn.style.marginTop = '4px';
      addParaBtn.onclick = () => addParaField(parasContainer.querySelectorAll('.vision-para-wrap').length, '');
      block.appendChild(addParaBtn);

      colContainer.appendChild(block);
    }

    sections.forEach((sec, si) => addSectionBlock(si, sec));
    body.appendChild(colContainer);

    const addSecBtn = mkEl('button', 'btn-add-para', '+ Add Sub-Section'); addSecBtn.type = 'button';
    addSecBtn.style.marginBottom = '12px';
    addSecBtn.onclick = () => addSectionBlock(colContainer.querySelectorAll('.st2-section-block').length, { sub: 'New Sub-Heading', paras: [''] });
    body.appendChild(addSecBtn);
  }

  buildColumnEditor('LEFT COLUMN — SUB-SECTIONS', 'st2LeftSections', d.st2LeftSections);
  buildColumnEditor('RIGHT COLUMN — SUB-SECTIONS', 'st2RightSections', d.st2RightSections);

  // ── QUOTE BOX (right column) ──
  addSectionTitle(body, 'QUOTE BOX (Right Column)');
  const showQ2Wrap = mkEl('div', 'field-group');
  showQ2Wrap.appendChild(mkEl('label', '', 'Show Quote Box'));
  const showQ2Chk = document.createElement('input');
  showQ2Chk.type = 'checkbox'; showQ2Chk.dataset.field = 'st2ShowQuote';
  showQ2Chk.checked = page.st2ShowQuote !== false;
  showQ2Wrap.appendChild(showQ2Chk);
  body.appendChild(showQ2Wrap);
  const q2Ta = addField(body, 'Quote Text', 'pullQuote', page.pullQuote || d.pullQuote, 'textarea');
  q2Ta.rows = 3;
}

// ── STATS3 PAGE (Int Page – Temp 21) ───────────────────────
// Like Temp 19 but single full-width landscape image on top.

function buildStats3Page(page, index) {
  const accent = page.accentColor || '#E4022D';
  const d = PAGE_DEFAULTS.stats3;
  const div = mkEl('div', 'mag-page page-stats3');
  div.dataset.pageId = page.id;
  div.style.setProperty('--st-accent', accent);
  div.style.setProperty('--st3-img-height', `${page.st3ImgHeight != null ? page.st3ImgHeight : 42}%`);
  div.style.setProperty('--st-para-gap', `${page.st3ParaGap != null ? page.st3ParaGap : 0}px`);

  // ── TOP: single full-width landscape image ──
  const topImg = mkEl('div', 'st3-top-image');
  topImg.appendChild(buildImgLayer(page, 'statsImage1', 'statsImage1X', 'statsImage1Y', 'statsImage1Zoom'));
  topImg.appendChild(buildImgOverlay(page.id, 'statsImage1', 'Top Image'));
  div.appendChild(topImg);

  // ── BOTTOM: 2-column layout (same as Temp 19) ──
  const bottom = mkEl('div', 'st-bottom');

  function renderSections(col, sections, sectionsKey) {
    sections.forEach((sec, si) => {
      const subEl = mkEl('div', 'st2-sub-heading');
      subEl.contentEditable = 'true';
      subEl.innerHTML = sec.sub || '';
      subEl.addEventListener('blur', () => {
        if (!page[sectionsKey]) page[sectionsKey] = [];
        if (!page[sectionsKey][si]) page[sectionsKey][si] = { sub: '', paras: [] };
        page[sectionsKey][si].sub = subEl.innerHTML;
        savePages(true);
      });
      col.appendChild(subEl);
      (sec.paras || []).forEach((para, pi) => {
        const p = mkEl('p', 'st-body-text');
        p.contentEditable = 'true'; p.innerHTML = para;
        p.addEventListener('blur', () => {
          if (!page[sectionsKey]) page[sectionsKey] = [];
          if (!page[sectionsKey][si]) page[sectionsKey][si] = { sub: '', paras: [] };
          page[sectionsKey][si].paras[pi] = p.innerHTML;
          savePages(true);
        });
        col.appendChild(p);
      });
    });
  }

  const leftCol = mkEl('div', 'st-left');
  leftCol.appendChild(inlineEditable('div', 'st-heading',
    page.articleHeadline || d.articleHeadline, page, 'articleHeadline'));
  const leftSections = page.st2LeftSections && page.st2LeftSections.length ? page.st2LeftSections : d.st2LeftSections;
  renderSections(leftCol, leftSections, 'st2LeftSections');
  bottom.appendChild(leftCol);

  const rightCol = mkEl('div', 'st-right');
  const rightSections = page.st2RightSections && page.st2RightSections.length ? page.st2RightSections : d.st2RightSections;
  renderSections(rightCol, rightSections, 'st2RightSections');

  if (page.st2ShowQuote !== false) {
    const qBox = mkEl('div', 'st-quote-box');
    qBox.appendChild(mkEl('span', 'st-qmark', '"'));
    qBox.appendChild(inlineEditable('p', 'st-quote-text',
      page.pullQuote || d.pullQuote, page, 'pullQuote'));
    rightCol.appendChild(qBox);
  }
  bottom.appendChild(rightCol);

  div.appendChild(bottom);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

function buildStats3Fields(body, page) {
  const d = PAGE_DEFAULTS.stats3;

  // ── TOP IMAGE ──
  addSectionTitle(body, 'TOP IMAGE');
  addImageFieldBtn(body, page.id, 'statsImage1', 'Top Image');
  const st3IH = addSliderField(body, 'Image Height', 'st3ImgHeight', page.st3ImgHeight != null ? page.st3ImgHeight : 42, 15, 75);
  st3IH.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--st3-img-height', `${st3IH.value}%`);
  });
  const st3X = addSliderField(body, 'Position: Left / Right', 'statsImage1X', page.statsImage1X != null ? page.statsImage1X : 50);
  const st3Y = addSliderField(body, 'Position: Up / Down',   'statsImage1Y', page.statsImage1Y != null ? page.statsImage1Y : 50);
  const st3Z = addSliderField(body, 'Zoom', 'statsImage1Zoom', page.statsImage1Zoom != null ? page.statsImage1Zoom : 100, 80, 200);
  bindImgSliders(page, 'statsImage1', st3X, st3Y, st3Z);

  // ── MAIN HEADING ──
  addSectionTitle(body, 'MAIN HEADING');
  addField(body, 'Heading', 'articleHeadline', page.articleHeadline || d.articleHeadline);

  // ── PARAGRAPH SPACING ──
  addSectionTitle(body, 'PARAGRAPH SPACING');
  const st3GapSlider = addSliderField(body, 'Space Between Paragraphs', 'st3ParaGap', page.st3ParaGap != null ? page.st3ParaGap : 0, 0, 30);
  st3GapSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--st-para-gap', `${st3GapSlider.value}px`);
  });

  // ── COLUMN EDITORS (shared helper from stats2) ──
  function buildColumnEditor(colLabel, sectionsKey, defaultSections) {
    addSectionTitle(body, colLabel);
    const sections = page[sectionsKey] && page[sectionsKey].length ? page[sectionsKey] : JSON.parse(JSON.stringify(defaultSections));
    const colContainer = mkEl('div', 'st2-col-container');

    function addSectionBlock(si, secData) {
      const block = mkEl('div', 'st2-section-block');
      block.style.cssText = 'border:1px solid #e0d9cc;border-radius:4px;padding:8px;margin-bottom:8px;';
      const hdr = mkEl('div', 'slider-label-row');
      hdr.appendChild(mkEl('label', '', `Sub-Section ${si + 1}`));

      const subField = sectionsKey === 'st2LeftSections' ? 'st2LeftSub' : 'st2RightSub';
      const parasKey = sectionsKey === 'st2LeftSections' ? 'st2LeftPara' : 'st2RightPara';

      const removeBlock = mkEl('button', 'btn-remove-para', '✕ Remove'); removeBlock.type = 'button';
      removeBlock.onclick = () => {
        block.remove();
        colContainer.querySelectorAll('.st2-section-block').forEach((b, j) => {
          b.querySelector('.slider-label-row label').textContent = `Sub-Section ${j + 1}`;
          const subI = b.querySelector(`input[data-field^="${subField}_"]`);
          if (subI) subI.dataset.field = `${subField}_${j}`;
          b.querySelectorAll(`textarea[data-field^="${parasKey}_"]`).forEach((ta, pi) => {
            ta.dataset.field = `${parasKey}_${j}_${pi}`;
          });
        });
      };
      hdr.appendChild(removeBlock);
      block.appendChild(hdr);

      const subInp = document.createElement('input');
      subInp.type = 'text'; subInp.className = 'field-input';
      subInp.dataset.field = `${subField}_${si}`;
      subInp.value = secData.sub || '';
      subInp.placeholder = 'Sub-Heading Text';
      subInp.style.marginBottom = '6px';
      block.appendChild(subInp);

      const parasContainer = mkEl('div', 'vision-paras-container');
      function addParaField(pi, val) {
        const wrap = mkEl('div', 'field-group vision-para-wrap');
        const lr = mkEl('div', 'slider-label-row');
        lr.appendChild(mkEl('label', '', `Para ${pi + 1}`));
        const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
        rb.onclick = () => {
          wrap.remove();
          parasContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => {
            w.querySelector('label').textContent = `Para ${j + 1}`;
            w.querySelector('textarea').dataset.field = `${parasKey}_${si}_${j}`;
          });
        };
        lr.appendChild(rb); wrap.appendChild(lr);
        const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 2;
        ta.dataset.field = `${parasKey}_${si}_${pi}`; ta.value = val || ''; wrap.appendChild(ta);
        parasContainer.appendChild(wrap);
      }
      (secData.paras || ['']).forEach((v, pi) => addParaField(pi, v));
      block.appendChild(parasContainer);
      const addParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addParaBtn.type = 'button';
      addParaBtn.style.marginTop = '4px';
      addParaBtn.onclick = () => addParaField(parasContainer.querySelectorAll('.vision-para-wrap').length, '');
      block.appendChild(addParaBtn);
      colContainer.appendChild(block);
    }

    sections.forEach((sec, si) => addSectionBlock(si, sec));
    body.appendChild(colContainer);
    const addSecBtn = mkEl('button', 'btn-add-para', '+ Add Sub-Section'); addSecBtn.type = 'button';
    addSecBtn.style.marginBottom = '12px';
    addSecBtn.onclick = () => addSectionBlock(colContainer.querySelectorAll('.st2-section-block').length, { sub: 'New Sub-Heading', paras: [''] });
    body.appendChild(addSecBtn);
  }

  buildColumnEditor('LEFT COLUMN — SUB-SECTIONS', 'st2LeftSections', d.st2LeftSections);
  buildColumnEditor('RIGHT COLUMN — SUB-SECTIONS', 'st2RightSections', d.st2RightSections);

  // ── QUOTE BOX ──
  addSectionTitle(body, 'QUOTE BOX (Right Column)');
  const showQ3Wrap = mkEl('div', 'field-group');
  showQ3Wrap.appendChild(mkEl('label', '', 'Show Quote Box'));
  const showQ3Chk = document.createElement('input');
  showQ3Chk.type = 'checkbox'; showQ3Chk.dataset.field = 'st2ShowQuote';
  showQ3Chk.checked = page.st2ShowQuote !== false;
  showQ3Wrap.appendChild(showQ3Chk);
  body.appendChild(showQ3Wrap);
  const q3Ta = addField(body, 'Quote Text', 'pullQuote', page.pullQuote || d.pullQuote, 'textarea');
  q3Ta.rows = 3;
}

// ── SIDEBAR PAGE (Int Page – Temp 20) ──────────────────────

function buildSidebarPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const d = PAGE_DEFAULTS.sidebar;
  const div = mkEl('div', 'mag-page page-sidebar');
  div.dataset.pageId = page.id;
  div.style.setProperty('--sb-accent', accent);
  div.style.setProperty('--sb-img-height', `${page.sbImgHeight != null ? page.sbImgHeight : 55}%`);
  div.style.setProperty('--sb-quote-height', `${page.sbQuoteHeight != null ? page.sbQuoteHeight : 45}%`);
  div.style.setProperty('--sb-img-quote-gap', `${page.sbImgQuoteGap != null ? page.sbImgQuoteGap : 0}px`);
  div.style.setProperty('--sb-para-gap', `${page.sbParaGap != null ? page.sbParaGap : 8}px`);
  div.style.setProperty('--sb-extra-img-height', `${page.sbExtraImgHeight != null ? page.sbExtraImgHeight : 25}%`);

  // ── BODY ROW ──
  const body = mkEl('div', 'sb-body');

  // ── LEFT COLUMN ──
  const left = mkEl('div', 'sb-left');

  // Image (top portion of left column)
  const imgWrap = mkEl('div', 'sb-img-wrap');
  imgWrap.appendChild(buildImgLayer(page, 'articleImage', 'articleImageX', 'articleImageY', 'articleImageZoom', 'bgsize'));
  imgWrap.appendChild(buildImgOverlay(page.id, 'articleImage', 'Left Image'));
  left.appendChild(imgWrap);

  // Optional extra image — sits between portrait and quote box
  if (page.sbShowExtraImg) {
    const extraImgWrap = mkEl('div', 'sb-extra-img-wrap');
    extraImgWrap.appendChild(buildImgLayer(page, 'sbExtraImage', 'sbExtraImageX', 'sbExtraImageY', 'sbExtraImageZoom'));
    extraImgWrap.appendChild(buildImgOverlay(page.id, 'sbExtraImage', 'Extra Image'));
    left.appendChild(extraImgWrap);
  }

  // Quote box — sits below the image, left-border accent style (matches Temp 19)
  const qBox = mkEl('div', 'sb-quote-box');
  qBox.appendChild(mkEl('span', 'sb-qmark', '“'));
  qBox.appendChild(inlineEditable('p', 'sb-quote-text',
    page.pullQuote || d.pullQuote, page, 'pullQuote'));
  left.appendChild(qBox);

  body.appendChild(left);

  // ── RIGHT COLUMN ──
  const right = mkEl('div', 'sb-right');

  right.appendChild(inlineEditable('div', 'sb-heading',
    page.articleHeadline || d.articleHeadline, page, 'articleHeadline'));

  const parasWrap = mkEl('div', 'sb-paras-wrap');
  const paras = page.sbParas && page.sbParas.length ? page.sbParas : d.sbParas;
  paras.forEach((para, i) => {
    const p = mkEl('p', 'sb-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.sbParas) page.sbParas = [...paras];
      page.sbParas[i] = p.innerHTML;
      savePages(true);
    });
    parasWrap.appendChild(p);
  });
  right.appendChild(parasWrap);
  body.appendChild(right);

  div.appendChild(body);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

function buildSidebarFields(body, page) {
  const d = PAGE_DEFAULTS.sidebar;

  // ── LEFT IMAGE ──
  addSectionTitle(body, 'LEFT IMAGE');
  addImageFieldBtn(body, page.id, 'articleImage', 'Left Image');
  const sbImgH = addSliderField(body, 'Image Height', 'sbImgHeight', page.sbImgHeight != null ? page.sbImgHeight : 55, 20, 85);
  sbImgH.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--sb-img-height', `${sbImgH.value}%`);
  });
  const sbIQGap = addSliderField(body, 'Gap: Image → Quote Box', 'sbImgQuoteGap', page.sbImgQuoteGap != null ? page.sbImgQuoteGap : 0, 0, 60);
  sbIQGap.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--sb-img-quote-gap', `${sbIQGap.value}px`);
  });
  const sbX = addSliderField(body, 'Position: Left / Right', 'articleImageX', page.articleImageX != null ? page.articleImageX : 50);
  const sbY = addSliderField(body, 'Position: Up / Down',   'articleImageY', page.articleImageY != null ? page.articleImageY : 50);
  const sbZ = addSliderField(body, 'Zoom', 'articleImageZoom', page.articleImageZoom != null ? page.articleImageZoom : 150, 100, 300);
  bindImgSliders(page, 'articleImage', sbX, sbY, sbZ);

  // ── EXTRA IMAGE (optional) ──
  addSectionTitle(body, 'EXTRA IMAGE (ABOVE QUOTE)');
  const sbEIToggleWrap = mkEl('div', 'field-group');
  const sbEIToggleLabel = mkEl('label', 'toggle-label');
  const sbEIChk = document.createElement('input');
  sbEIChk.type = 'checkbox'; sbEIChk.dataset.field = 'sbShowExtraImg';
  sbEIChk.checked = !!page.sbShowExtraImg;
  sbEIToggleLabel.appendChild(sbEIChk);
  sbEIToggleLabel.appendChild(document.createTextNode(' Show Extra Image'));
  sbEIToggleWrap.appendChild(sbEIToggleLabel);
  body.appendChild(sbEIToggleWrap);
  const sbEIH = addSliderField(body, 'Extra Image Height (%)', 'sbExtraImgHeight', page.sbExtraImgHeight != null ? page.sbExtraImgHeight : 25, 10, 70);
  sbEIH.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--sb-extra-img-height', `${sbEIH.value}%`);
  });
  addImageFieldBtn(body, page.id, 'sbExtraImage', 'Extra Image');
  const sbEIX = addSliderField(body, 'Position: Left / Right', 'sbExtraImageX', page.sbExtraImageX != null ? page.sbExtraImageX : 50);
  const sbEIY = addSliderField(body, 'Position: Up / Down',   'sbExtraImageY', page.sbExtraImageY != null ? page.sbExtraImageY : 50);
  const sbEIZ = addSliderField(body, 'Zoom', 'sbExtraImageZoom', page.sbExtraImageZoom != null ? page.sbExtraImageZoom : 100, 80, 200);
  bindImgSliders(page, 'sbExtraImage', sbEIX, sbEIY, sbEIZ);

  // ── QUOTE BOX ──
  addSectionTitle(body, 'QUOTE BOX');
  const sbQH = addSliderField(body, 'Quote Box Height', 'sbQuoteHeight', page.sbQuoteHeight != null ? page.sbQuoteHeight : 45, 10, 80);
  sbQH.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--sb-quote-height', `${sbQH.value}%`);
  });
  const pqTa = addField(body, 'Quote Text', 'pullQuote', page.pullQuote || d.pullQuote, 'textarea');
  pqTa.rows = 4;

  // ── RIGHT COLUMN ──
  addSectionTitle(body, 'HEADING');
  const hlTa = addField(body, 'Heading (use \\n for line breaks)', 'articleHeadline', page.articleHeadline || d.articleHeadline, 'textarea');
  hlTa.rows = 3;

  addSectionTitle(body, 'PARAGRAPHS');
  const sbGap = addSliderField(body, 'Space Between Paragraphs', 'sbParaGap', page.sbParaGap != null ? page.sbParaGap : 8, 0, 40);
  sbGap.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--sb-para-gap', `${sbGap.value}px`);
  });
  const paras = page.sbParas && page.sbParas.length ? page.sbParas : d.sbParas;
  const container = mkEl('div', 'vision-paras-container');
  function addParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.classList.add('para-crossed-out'); setTimeout(() => { wrap.remove(); container.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `sbPara${j}`; }); savePanelSilent(); }, 400); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 3;
    ta.dataset.field = `sbPara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    container.appendChild(wrap);
  }
  paras.forEach((v, i) => addParaField(i, v));
  body.appendChild(container);
  const addBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addBtn.type = 'button';
  addBtn.onclick = () => addParaField(container.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addBtn);
}

function buildShowcaseFields(body, page) {
  addSectionTitle(body, 'CONTENT');
  addField(body, 'Heading', 'articleHeadline', page.articleHeadline || '');

  const showcaseParas = page.showcaseParas && page.showcaseParas.length ? page.showcaseParas : [''];
  const container = mkEl('div', 'vision-paras-container');

  function addScParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.remove(); container.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `showcasePara${j}`; }); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `showcasePara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    container.appendChild(wrap);
  }

  showcaseParas.forEach((v, i) => addScParaField(i, v));
  body.appendChild(container);
  const addBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addBtn.type = 'button';
  addBtn.onclick = () => addScParaField(container.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addBtn);

  addSectionTitle(body, 'QUOTE BOX');
  // Toggle checkbox
  const qToggleWrap = mkEl('div', 'field-group');
  const qToggleLabel = mkEl('label', 'toggle-label');
  const qToggleCb = document.createElement('input');
  qToggleCb.type = 'checkbox';
  qToggleCb.dataset.field = 'scShowQuote';
  qToggleCb.checked = page.scShowQuote !== false && page.scShowQuote !== 'false';
  qToggleLabel.appendChild(qToggleCb);
  qToggleLabel.appendChild(document.createTextNode(' Show Quote Box'));
  qToggleWrap.appendChild(qToggleLabel);
  body.appendChild(qToggleWrap);
  const pqTa = addField(body, 'Quote Text', 'pullQuote', page.pullQuote, 'textarea'); pqTa.rows = 4;

  addSectionTitle(body, 'FEATURE IMAGE');
  addSliderField(body, 'Height (%)', 'scTopImageHeight', page.scTopImageHeight != null ? page.scTopImageHeight : 46, 20, 65);
  addImageFieldBtn(body, page.id, 'articleImage', 'Top Feature Image');
  const sc1XS = addSliderField(body, 'Position: Left / Right', 'articleImageX', page.articleImageX != null ? page.articleImageX : 50);
  const sc1YS = addSliderField(body, 'Position: Up / Down',   'articleImageY', page.articleImageY != null ? page.articleImageY : 50);
  const sc1ZS = addSliderField(body, 'Zoom', 'articleImageZoom', page.articleImageZoom != null ? page.articleImageZoom : 100, 80, 200);
  bindImgSliders(page, 'articleImage', sc1XS, sc1YS, sc1ZS);

  addSectionTitle(body, 'SECOND IMAGE');
  addSliderField(body, 'Column Width (%)', 'scRightWidth', page.scRightWidth != null ? page.scRightWidth : 42, 20, 65);
  addImageFieldBtn(body, page.id, 'articleImage2', 'Second Image');
  const sc2XS = addSliderField(body, 'Position: Left / Right', 'articleImage2X', page.articleImage2X != null ? page.articleImage2X : 50);
  const sc2YS = addSliderField(body, 'Position: Up / Down',   'articleImage2Y', page.articleImage2Y != null ? page.articleImage2Y : 50);
  const sc2ZS = addSliderField(body, 'Zoom', 'articleImage2Zoom', page.articleImage2Zoom != null ? page.articleImage2Zoom : 100, 80, 200);
  bindImgSliders(page, 'articleImage2', sc2XS, sc2YS, sc2ZS);
}

function buildGalleryFields(body, page) {
  addSectionTitle(body, 'TEXT OVERLAY');
  addField(body, 'Heading', 'articleHeadline', page.articleHeadline || 'A Glimpse Into The Agency');
  addField(body, 'Agency Name', 'agency', page.agency);
  addField(body, 'Location', 'personLocation', page.personLocation);
  addSectionTitle(body, 'IMAGE');
  addImageFieldBtn(body, page.id, 'articleImage', 'Gallery Image');
  const glXS = addSliderField(body, 'Position: Left / Right', 'articleImageX', page.articleImageX != null ? page.articleImageX : 50);
  const glYS = addSliderField(body, 'Position: Up / Down',   'articleImageY', page.articleImageY != null ? page.articleImageY : 50);
  const glZS = addSliderField(body, 'Zoom', 'articleImageZoom', page.articleImageZoom != null ? page.articleImageZoom : 100, 80, 200);
  bindImgSliders(page, 'articleImage', glXS, glYS, glZS);
}

function buildEditorialFields(body, page) {
  // ── PARAGRAPH SPACING ──
  addSectionTitle(body, 'HEADER STRIP');
  addField(body, 'Label (left)', 'edLabel', page.edLabel || 'AGENCY FEATURE');
  addField(body, 'Date (right)', 'edDate', page.edDate || 'APRIL 2026');

  addSectionTitle(body, 'PARAGRAPH SPACING');
  const gapSlider = addSliderField(body, 'Space Between Paragraphs',
    'paragraphSpacing', page.paragraphSpacing != null ? page.paragraphSpacing : 7, 0, 20);
  gapSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--ed-para-gap', `${gapSlider.value}px`);
  });

  // ── QUOTE BOX ──
  addSectionTitle(body, 'QUOTE BOX');
  const edQToggleWrap = mkEl('div', 'field-group');
  const edQToggleLabel = mkEl('label', 'toggle-label');
  const edQChk = document.createElement('input');
  edQChk.type = 'checkbox'; edQChk.dataset.field = 'edShowQuote';
  edQChk.checked = page.edShowQuote !== false;
  edQToggleLabel.appendChild(edQChk);
  edQToggleLabel.appendChild(document.createTextNode(' Show Quote Box'));
  edQToggleWrap.appendChild(edQToggleLabel);
  body.appendChild(edQToggleWrap);
  const pqTa = addField(body, 'Quote Text', 'pullQuote', page.pullQuote || '', 'textarea');
  pqTa.rows = 3;

  // ── BANNER IMAGE ──
  addSectionTitle(body, 'BANNER IMAGE');
  addImageFieldBtn(body, page.id, 'bannerImage', 'Top Banner Image');
  const edHS = addSliderField(body, 'Banner Height', 'edBannerHeight', page.edBannerHeight != null ? page.edBannerHeight : 272, 80, 500);
  edHS.addEventListener('input', () => {
    const bannerEl = document.querySelector(`.mag-page[data-page-id="${page.id}"] .ed-banner`);
    if (bannerEl) bannerEl.style.height = `${edHS.value}px`;
  });
  const edXS = addSliderField(body, 'Position: Left / Right', 'bannerImageX', page.bannerImageX != null ? page.bannerImageX : 50);
  const edYS = addSliderField(body, 'Position: Up / Down',   'bannerImageY', page.bannerImageY != null ? page.bannerImageY : 40);
  const edZS = addSliderField(body, 'Zoom', 'bannerImageZoom', page.bannerImageZoom != null ? page.bannerImageZoom : 100, 80, 200);
  bindImgSliders(page, 'bannerImage', edXS, edYS, edZS);

  // ── LEFT COLUMN ──
  addSectionTitle(body, 'LEFT COLUMN');
  addField(body, 'Heading', 'leftHeading', page.leftHeading || '', 'textarea').rows = 3;

  const leftParas = page.leftParas && page.leftParas.length ? page.leftParas : [''];
  const leftContainer = mkEl('div', 'vision-paras-container');

  function addLeftPara(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => {
      wrap.remove();
      leftContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => {
        w.querySelector('label').textContent = `Paragraph ${j + 1}`;
        w.querySelector('textarea').dataset.field = `edLeftPara${j}`;
      });
    };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea');
    ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `edLeftPara${i}`; ta.value = val || '';
    wrap.appendChild(ta);
    leftContainer.appendChild(wrap);
  }

  leftParas.forEach((v, i) => addLeftPara(i, v));
  body.appendChild(leftContainer);
  const addLeftBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addLeftBtn.type = 'button';
  addLeftBtn.onclick = () => addLeftPara(leftContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addLeftBtn);

  // ── RIGHT COLUMN ──
  addSectionTitle(body, 'RIGHT COLUMN');
  addField(body, 'Heading', 'rightHeading', page.rightHeading || '', 'textarea').rows = 3;

  const rightParas = page.rightParas && page.rightParas.length ? page.rightParas : [''];
  const rightContainer = mkEl('div', 'vision-paras-container');

  function addRightPara(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => {
      wrap.remove();
      rightContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => {
        w.querySelector('label').textContent = `Paragraph ${j + 1}`;
        w.querySelector('textarea').dataset.field = `edRightPara${j}`;
      });
    };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea');
    ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `edRightPara${i}`; ta.value = val || '';
    wrap.appendChild(ta);
    rightContainer.appendChild(wrap);
  }

  rightParas.forEach((v, i) => addRightPara(i, v));
  body.appendChild(rightContainer);
  const addRightBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addRightBtn.type = 'button';
  addRightBtn.onclick = () => addRightPara(rightContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addRightBtn);
}

function buildSpotlightFields(body, page) {
  addSectionTitle(body, 'PERSON');
  const nameTa = addField(body, 'Person Name', 'personName', page.personName, 'textarea');
  nameTa.rows = 2;
  addField(body, 'Designation / Title', 'personTitle', page.personTitle || '');
  addField(body, 'Location', 'personLocation', page.personLocation || '');
  addSectionTitle(body, 'CONTENT');
  addField(body, 'Top Label (agency tag)', 'agency', page.agency || '');
  const tagTa = addField(body, 'Tagline (italic)', 'tagline', page.tagline || '', 'textarea');
  tagTa.rows = 2;
  const descTa = addField(body, 'Description', 'description', page.description || '', 'textarea');
  descTa.rows = 4;
  addSectionTitle(body, 'BACKGROUND PHOTO');
  addImageFieldBtn(body, page.id, 'coverImage', 'Background Photo');

  const spXSlider = addSliderField(body, 'Position: Left / Right', 'coverImageX', page.coverImageX != null ? page.coverImageX : 50);
  const spYSlider = addSliderField(body, 'Position: Up / Down',   'coverImageY', page.coverImageY != null ? page.coverImageY : 30);
  const spZSlider = addSliderField(body, 'Zoom', 'coverImageZoom', page.coverImageZoom != null ? page.coverImageZoom : 100, 80, 200);

  function liveUpdateSpotlight() {
    const inner = document.querySelector(`.mag-page[data-page-id="${page.id}"] .spl-bg-inner`);
    if (inner) {
      inner.style.left = `${-(spXSlider.value * 0.4)}%`;
      inner.style.top  = `${-(spYSlider.value * 0.4)}%`;
      inner.style.transform = `scale(${spZSlider.value / 100})`;
      inner.style.transformOrigin = 'center center';
    }
  }
  spXSlider.addEventListener('input', liveUpdateSpotlight);
  spYSlider.addEventListener('input', liveUpdateSpotlight);
  spZSlider.addEventListener('input', liveUpdateSpotlight);
}

function buildDuoFields(body, page) {
  // ── TOP LEFT IMAGE ──
  addSectionTitle(body, 'TOP LEFT IMAGE');
  addImageFieldBtn(body, page.id, 'topImg1', 'Top Left Image');
  const t1X = addSliderField(body, 'Position: Left / Right', 'topImg1X', page.topImg1X != null ? page.topImg1X : 50);
  const t1Y = addSliderField(body, 'Position: Up / Down',   'topImg1Y', page.topImg1Y != null ? page.topImg1Y : 50);
  const t1Z = addSliderField(body, 'Zoom', 'topImg1Zoom', page.topImg1Zoom != null ? page.topImg1Zoom : 100, 80, 200);
  bindImgSliders(page, 'topImg1', t1X, t1Y, t1Z);

  // ── TOP RIGHT IMAGE ──
  addSectionTitle(body, 'TOP RIGHT IMAGE');
  addImageFieldBtn(body, page.id, 'topImg2', 'Top Right Image');
  const t2X = addSliderField(body, 'Position: Left / Right', 'topImg2X', page.topImg2X != null ? page.topImg2X : 50);
  const t2Y = addSliderField(body, 'Position: Up / Down',   'topImg2Y', page.topImg2Y != null ? page.topImg2Y : 50);
  const t2Z = addSliderField(body, 'Zoom', 'topImg2Zoom', page.topImg2Zoom != null ? page.topImg2Zoom : 100, 80, 200);
  bindImgSliders(page, 'topImg2', t2X, t2Y, t2Z);

  // ── SIDE IMAGE ──
  addSectionTitle(body, 'SIDE IMAGE (BOTTOM RIGHT)');
  addImageFieldBtn(body, page.id, 'sideImg', 'Side Image');
  const siX = addSliderField(body, 'Position: Left / Right', 'sideImgX', page.sideImgX != null ? page.sideImgX : 50);
  const siY = addSliderField(body, 'Position: Up / Down',   'sideImgY', page.sideImgY != null ? page.sideImgY : 50);
  const siZ = addSliderField(body, 'Zoom', 'sideImgZoom', page.sideImgZoom != null ? page.sideImgZoom : 100, 80, 200);
  bindImgSliders(page, 'sideImg', siX, siY, siZ);

  // ── HEADING ──
  addSectionTitle(body, 'HEADING');
  addField(body, 'Heading', 'duoHeading', page.duoHeading || '', 'textarea').rows = 3;

  // ── PARAGRAPHS ──
  addSectionTitle(body, 'PARAGRAPHS');
  const duoParas = page.duoParas && page.duoParas.length ? page.duoParas : [''];
  const parasContainer = mkEl('div', 'vision-paras-container');

  function addDuoParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => {
      wrap.remove();
      parasContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => {
        w.querySelector('label').textContent = `Paragraph ${j + 1}`;
        w.querySelector('textarea').dataset.field = `duoPara${j}`;
      });
    };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea');
    ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `duoPara${i}`; ta.value = val || '';
    wrap.appendChild(ta);
    parasContainer.appendChild(wrap);
  }

  duoParas.forEach((v, i) => addDuoParaField(i, v));
  body.appendChild(parasContainer);
  const addParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addParaBtn.type = 'button';
  addParaBtn.onclick = () => addDuoParaField(parasContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addParaBtn);
}

function buildTeamFields(body, page) {
  // ── Top image ──
  addSectionTitle(body, 'TOP IMAGE');
  const t1TogWrap = mkEl('div', 'field-group');
  const t1TogLbl = mkEl('label', 'toggle-label');
  const t1Chk = document.createElement('input');
  t1Chk.type = 'checkbox'; t1Chk.dataset.field = 'teamShowImg1';
  t1Chk.checked = page.teamShowImg1 !== false;
  t1TogLbl.appendChild(t1Chk);
  t1TogLbl.appendChild(document.createTextNode(' Show Top Image'));
  t1TogWrap.appendChild(t1TogLbl);
  body.appendChild(t1TogWrap);
  addImageFieldBtn(body, page.id, 'teamImg1', 'Top Image');
  const t1H = addSliderField(body, 'Banner Height', 'teamImg1H', page.teamImg1H != null ? page.teamImg1H : 245, 80, 500);
  t1H.addEventListener('input', () => {
    page.teamImg1H = Number(t1H.value);
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--team-img1-h', `${t1H.value}px`);
    savePages(true);
  });
  const t1X = addSliderField(body, 'Position: Left / Right', 'teamImg1X', page.teamImg1X != null ? page.teamImg1X : 50);
  const t1Y = addSliderField(body, 'Position: Up / Down',   'teamImg1Y', page.teamImg1Y != null ? page.teamImg1Y : 50);
  const t1Z = addSliderField(body, 'Zoom', 'teamImg1Zoom', page.teamImg1Zoom != null ? page.teamImg1Zoom : 100, 80, 200);
  bindImgSliders(page, 'teamImg1', t1X, t1Y, t1Z);

  // ── Bottom image ──
  addSectionTitle(body, 'BOTTOM IMAGE');
  const t2TogWrap = mkEl('div', 'field-group');
  const t2TogLbl = mkEl('label', 'toggle-label');
  const t2Chk = document.createElement('input');
  t2Chk.type = 'checkbox'; t2Chk.dataset.field = 'teamShowImg2';
  t2Chk.checked = page.teamShowImg2 !== false;
  t2TogLbl.appendChild(t2Chk);
  t2TogLbl.appendChild(document.createTextNode(' Show Bottom Image'));
  t2TogWrap.appendChild(t2TogLbl);
  body.appendChild(t2TogWrap);
  addImageFieldBtn(body, page.id, 'teamImg2', 'Bottom Image');
  const t2H = addSliderField(body, 'Banner Height', 'teamImg2H', page.teamImg2H != null ? page.teamImg2H : 245, 80, 500);
  t2H.addEventListener('input', () => {
    page.teamImg2H = Number(t2H.value);
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--team-img2-h', `${t2H.value}px`);
    savePages(true);
  });
  const t2X = addSliderField(body, 'Position: Left / Right', 'teamImg2X', page.teamImg2X != null ? page.teamImg2X : 50);
  const t2Y = addSliderField(body, 'Position: Up / Down',   'teamImg2Y', page.teamImg2Y != null ? page.teamImg2Y : 50);
  const t2Z = addSliderField(body, 'Zoom', 'teamImg2Zoom', page.teamImg2Zoom != null ? page.teamImg2Zoom : 100, 80, 200);
  bindImgSliders(page, 'teamImg2', t2X, t2Y, t2Z);

  // ── Heading ──
  addSectionTitle(body, 'HEADING');
  addField(body, 'Heading', 'teamHeading', page.teamHeading || '', 'textarea').rows = 2;

  // ── Paragraphs ──
  addSectionTitle(body, 'PARAGRAPHS');

  const teamLineSlider = addSliderField(body, 'Line Spacing (within paragraph)', 'teamLineHeight', page.teamLineHeight != null ? page.teamLineHeight : 1.6, 1.0, 3.0, 0.05);
  teamLineSlider.addEventListener('input', () => {
    page.teamLineHeight = Number(teamLineSlider.value);
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--team-line-height', teamLineSlider.value);
    savePages(true);
  });

  const teamGapSlider = addSliderField(body, 'Space Between Paragraphs', 'teamParaGap', page.teamParaGap != null ? page.teamParaGap : 7, 0, 40);
  teamGapSlider.addEventListener('input', () => {
    page.teamParaGap = Number(teamGapSlider.value);
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--team-para-gap', `${teamGapSlider.value}px`);
    savePages(true);
  });

  const teamParas = page.teamParas && page.teamParas.length ? page.teamParas : [''];
  const parasContainer = mkEl('div', 'vision-paras-container');

  function addTeamParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => {
      wrap.remove();
      parasContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => {
        w.querySelector('label').textContent = `Paragraph ${j + 1}`;
        w.querySelector('textarea').dataset.field = `teamPara${j}`;
      });
    };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea');
    ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `teamPara${i}`; ta.value = val || '';
    wrap.appendChild(ta);
    parasContainer.appendChild(wrap);
  }

  teamParas.forEach((v, i) => addTeamParaField(i, v));
  body.appendChild(parasContainer);
  const addTeamParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addTeamParaBtn.type = 'button';
  addTeamParaBtn.onclick = () => addTeamParaField(parasContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addTeamParaBtn);

  // ── Quote box ──
  addSectionTitle(body, 'QUOTE BOX');
  const showQWrap = mkEl('div', 'field-group');
  const showQLabel = mkEl('label', '', 'Show Quote Box');
  const showQChk = document.createElement('input');
  showQChk.type = 'checkbox';
  showQChk.dataset.field = 'teamShowQuote';
  showQChk.checked = page.teamShowQuote !== false;
  showQWrap.appendChild(showQLabel);
  showQWrap.appendChild(showQChk);
  body.appendChild(showQWrap);
  const pqTa = addField(body, 'Quote Text', 'pullQuote', page.pullQuote || '', 'textarea');
  pqTa.rows = 3;
  const tqSz = addSliderField(body, 'Quote Font Size', 'teamQuoteSize', page.teamQuoteSize != null ? page.teamQuoteSize : 11, 7, 24);
  tqSz.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--team-quote-size', `${tqSz.value}px`);
  });
  const tqMt = addSliderField(body, 'Quote Box Position: Up / Down', 'teamQuoteMt', page.teamQuoteMt != null ? page.teamQuoteMt : 12, -200, 200);
  tqMt.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--team-quote-mt', `${tqMt.value}px`);
  });
}

function addQAEditor(parent, questions) {
  const container = mkEl('div', 'qa-container');

  function addQARow(q, a) {
    const row = mkEl('div', 'qa-row');
    const qInp = document.createElement('textarea');
    qInp.className = 'field-input';
    qInp.placeholder = 'Question';
    qInp.value = q || '';
    qInp.rows = 2;
    qInp.dataset.qaPart = 'q';
    const aInp = document.createElement('textarea');
    aInp.className = 'field-input';
    aInp.placeholder = 'Answer';
    aInp.value = a || '';
    aInp.rows = 4;
    aInp.dataset.qaPart = 'a';
    const rmBtn = mkEl('button', 'btn-rm-hl', '✕');
    rmBtn.onclick = (e) => { e.preventDefault(); row.remove(); };
    row.appendChild(qInp);
    row.appendChild(aInp);
    row.appendChild(rmBtn);
    container.appendChild(row);
  }

  (questions || []).forEach(qa => addQARow(qa.q, qa.a));
  parent.appendChild(container);

  const addBtn = mkEl('button', 'btn-add-hl', '+ Add Q&A Pair');
  addBtn.onclick = (e) => { e.preventDefault(); addQARow('', ''); };
  parent.appendChild(addBtn);
}

function addStatsEditor(parent, stats) {
  const container = mkEl('div', 'stats-container');

  function addStatRow(val, lbl, desc) {
    const row = mkEl('div', 'stat-edit-row');
    const vInp = document.createElement('input');
    vInp.className = 'field-input';
    vInp.placeholder = 'Value (e.g. 98%)';
    vInp.value = val || '';
    vInp.dataset.stPart = 'value';
    const lInp = document.createElement('input');
    lInp.className = 'field-input';
    lInp.placeholder = 'Label (e.g. Retention Rate)';
    lInp.value = lbl || '';
    lInp.dataset.stPart = 'label';
    const dInp = document.createElement('textarea');
    dInp.className = 'field-input';
    dInp.placeholder = 'Short description sentence';
    dInp.value = desc || '';
    dInp.rows = 2;
    dInp.dataset.stPart = 'description';
    const rmBtn = mkEl('button', 'btn-rm-hl', '✕');
    rmBtn.onclick = (e) => { e.preventDefault(); row.remove(); };
    row.appendChild(vInp);
    row.appendChild(lInp);
    row.appendChild(dInp);
    row.appendChild(rmBtn);
    container.appendChild(row);
  }

  (stats || []).forEach(s => addStatRow(s.value, s.label, s.description));
  parent.appendChild(container);

  const addBtn = mkEl('button', 'btn-add-hl', '+ Add Statistic');
  addBtn.onclick = (e) => { e.preventDefault(); addStatRow('', '', ''); };
  parent.appendChild(addBtn);
}

function addHighlightsEditor(parent, highlights) {
  const container = mkEl('div', 'hl-container');
  container.id = 'hlContainer';

  function addHlRow(val, lbl) {
    const row = mkEl('div', 'hl-row');
    const vInp = document.createElement('input');
    vInp.className = 'field-input';
    vInp.placeholder = 'Value (e.g. 33%)';
    vInp.value = val || '';
    vInp.dataset.hl = 'value';
    const lInp = document.createElement('input');
    lInp.className = 'field-input';
    lInp.placeholder = 'Label';
    lInp.value = lbl || '';
    lInp.dataset.hl = 'label';
    const rmBtn = mkEl('button', 'btn-rm-hl', '✕');
    rmBtn.onclick = (e) => { e.preventDefault(); row.remove(); };
    row.appendChild(vInp);
    row.appendChild(lInp);
    row.appendChild(rmBtn);
    container.appendChild(row);
  }

  (highlights || []).forEach(h => addHlRow(h.value, h.label));
  parent.appendChild(container);

  const addBtn = mkEl('button', 'btn-add-hl', '+ Add Highlight');
  addBtn.onclick = (e) => { e.preventDefault(); addHlRow('', ''); };
  parent.appendChild(addBtn);
}

// ── IMAGE MODAL ────────────────────────────────────────────

function openImageModal() {
  document.getElementById('imageFileInput').value = '';
  document.getElementById('imageUrlInput').value = '';
  document.getElementById('uploadPreview').classList.add('hidden');
  document.getElementById('uploadZone').classList.remove('hidden');
  document.getElementById('imageModal').classList.remove('hidden');
}

function closeImageModal() {
  document.getElementById('imageModal').classList.add('hidden');
  state.imageTarget = null;
}

async function applyImage() {
  if (!state.imageTarget) return;
  const { pageId, field } = state.imageTarget;
  const page = state.pages.find(p => p.id === pageId);
  if (!page) return;

  const fileInput = document.getElementById('imageFileInput');
  const urlInput  = document.getElementById('imageUrlInput');
  let imageUrl = '';

  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    let imageData = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const fd = new FormData();
        fd.append('image', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok || !data.url) {
          if (attempt === 3) { showToast('Upload failed: ' + (data.error || `Server error ${res.status}`), 'error'); return; }
          await new Promise(r => setTimeout(r, 800));
          continue;
        }
        imageData = data.url;
        break;
      } catch (e) {
        if (attempt === 3) { showToast('Upload failed: server not responding. Please restart the server.', 'error'); return; }
        await new Promise(r => setTimeout(r, 800));
      }
    }
    imageUrl = imageData;
  } else if (urlInput.value.trim()) {
    imageUrl = urlInput.value.trim();
  } else {
    showToast('Select an image or enter a URL', 'error');
    return;
  }

  // Handle ccImg_N keys for Cover Collage page
  if (field.startsWith('ccImg_')) {
    const idx = parseInt(field.replace('ccImg_', ''), 10);
    if (!page.ccImages) page.ccImages = [];
    if (!page.ccImages[idx]) page.ccImages[idx] = { url: '', x: 50, y: 50, zoom: 100 };
    page.ccImages[idx].url = imageUrl;
  } else {
    page[field] = imageUrl;
  }
  await savePages(true);
  renderAll();
  closeImageModal();
  showToast('Image applied');
}

function removeImage() {
  if (!state.imageTarget) return;
  const { pageId, field } = state.imageTarget;
  const page = state.pages.find(p => p.id === pageId);
  if (page) {
    if (field.startsWith('ccImg_')) {
      const idx = parseInt(field.replace('ccImg_', ''), 10);
      if (page.ccImages && page.ccImages[idx]) page.ccImages[idx].url = '';
    } else {
      page[field] = '';
    }
    savePages(true); renderAll();
  }
  closeImageModal();
}

// ── PAGE DOWNLOAD (server-side via Puppeteer) ──────────────────

// ── shared export helper ───────────────────────────────────────
async function exportPage(id, num, fmt) {
  const label = fmt.toUpperCase();
  showToast(`Preparing ${label}… please wait`);
  try {
    const idx = state.pages.findIndex(p => p.id === id);
    const res = await fetch(`/api/export?i=${idx}&fmt=${fmt}`);

    if (!res.ok) {
      // Try to read a JSON error; if the body isn't JSON just use the status
      let msg = `Server error ${res.status}`;
      try { const e = await res.json(); msg = e.error || msg; } catch (_) {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `page-${String(num).padStart(2, '0')}.${fmt}`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${label} downloaded ✓`);
  } catch (e) {
    showToast('Download failed: ' + e.message, 'error');
  }
}

async function downloadPagePNG(id, num) { await exportPage(id, num, 'png'); }
async function downloadPagePDF(id, num) { await exportPage(id, num, 'pdf'); }

// Close any open download dropdown when clicking elsewhere
document.addEventListener('click', () => {
  document.querySelectorAll('.pc-dl-menu.open').forEach(m => m.classList.remove('open'));
});

// ── BIND UI ────────────────────────────────────────────────

function bindUI() {
  document.getElementById('pdfBtn').onclick = () => window.print();

  document.getElementById('addPageBtn').onclick = openAddMenu;
  document.getElementById('sbAddBtn').onclick        = openAddMenu;
  document.getElementById('sbNewFolderBtn').onclick  = createFolder;
  document.getElementById('addMenuOverlay').onclick = closeAddMenu;

  document.querySelectorAll('[data-add-type]').forEach(btn => {
    btn.onclick = () => addPage(btn.dataset.addType);
  });

  document.getElementById('closePanelBtn').onclick  = closePanel;
  document.getElementById('cancelPanelBtn').onclick = closePanel;
  document.getElementById('savePanelBtn').onclick   = savePanel;

  document.getElementById('closeImageModal').onclick = closeImageModal;
  document.getElementById('applyImageBtn').onclick   = applyImage;
  document.getElementById('removeImageBtn').onclick  = removeImage;

  const zone      = document.getElementById('uploadZone');
  const fileInput = document.getElementById('imageFileInput');

  zone.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    if (!fileInput.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('uploadPreviewImg').src = e.target.result;
      document.getElementById('uploadPreviewName').textContent = fileInput.files[0].name;
      document.getElementById('uploadPreview').classList.remove('hidden');
      document.getElementById('uploadZone').classList.add('hidden');
    };
    reader.readAsDataURL(fileInput.files[0]);
  };
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
}

// ── FLOATING FORMAT TOOLBAR (Bold / Italic / Link) ──────────

(function initFormatToolbar() {
  // Saved selection range for link apply (focus moves to URL input)
  let savedRange = null;

  // Build toolbar
  const bar = document.createElement('div');
  bar.id = 'formatToolbar';
  bar.className = 'format-toolbar no-print';
  bar.innerHTML = `
    <button class="fmt-btn" data-cmd="bold"   title="Bold (Ctrl+B)"><b>B</b></button>
    <button class="fmt-btn" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
    <div class="fmt-sep"></div>
    <button class="fmt-btn" data-cmd="link"   title="Add Link">🔗</button>
    <button class="fmt-btn fmt-unlink hidden" data-cmd="unlink" title="Remove Link">✕ Link</button>
    <div class="fmt-link-row hidden" id="fmtLinkRow">
      <input class="fmt-url-input" id="fmtUrlInput" type="url" placeholder="https://…">
      <button class="fmt-btn fmt-apply-link" id="fmtApplyLink">Apply</button>
    </div>
  `;
  document.body.appendChild(bar);

  const linkRow   = bar.querySelector('#fmtLinkRow');
  const urlInput  = bar.querySelector('#fmtUrlInput');
  const applyBtn  = bar.querySelector('#fmtApplyLink');
  const unlinkBtn = bar.querySelector('[data-cmd="unlink"]');

  function isInsideEditable(node) {
    const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    return !!el?.closest('[contenteditable="true"]');
  }

  function selectionIsLink() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const el = sel.anchorNode?.nodeType === Node.TEXT_NODE
      ? sel.anchorNode.parentElement : sel.anchorNode;
    return !!el?.closest('a');
  }

  function restoreSelection() {
    if (!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  function hideLinkRow() {
    linkRow.classList.add('hidden');
    urlInput.value = '';
  }

  function showBar(forceKeep) {
    if (!forceKeep) {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !isInsideEditable(sel.anchorNode)) {
        bar.style.display = 'none';
        hideLinkRow();
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect.width) { bar.style.display = 'none'; return; }

      // Show/hide unlink button based on whether selection is inside a link
      if (selectionIsLink()) {
        unlinkBtn.classList.remove('hidden');
      } else {
        unlinkBtn.classList.add('hidden');
      }

      bar.style.display = 'flex';
      hideLinkRow();

      // Save range for link apply
      savedRange = sel.getRangeAt(0).cloneRange();

      // Position above selection
      const barW = bar.offsetWidth || 130;
      let left = rect.left + rect.width / 2 - barW / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - barW - 8));
      bar.style.left = left + 'px';
      bar.style.top  = (rect.top - 44 + window.scrollY) + 'px';
    }
  }

  // Bold / Italic: prevent blur, run command immediately
  bar.addEventListener('mousedown', e => {
    const btn = e.target.closest('[data-cmd]');
    if (!btn) return;

    if (btn.dataset.cmd === 'link') {
      e.preventDefault();
      // Toggle link row
      if (linkRow.classList.contains('hidden')) {
        linkRow.classList.remove('hidden');
        // Pre-fill if selection is already a link
        const sel = window.getSelection();
        const el = sel?.anchorNode?.nodeType === Node.TEXT_NODE
          ? sel.anchorNode.parentElement : sel.anchorNode;
        const anchor = el?.closest('a');
        urlInput.value = anchor ? anchor.href : 'https://';
        setTimeout(() => { urlInput.focus(); urlInput.select(); }, 10);
      } else {
        hideLinkRow();
      }
    } else if (btn.dataset.cmd === 'unlink') {
      e.preventDefault();
      restoreSelection();
      document.execCommand('unlink');
      bar.style.display = 'none';
    } else {
      e.preventDefault();
      document.execCommand(btn.dataset.cmd);
    }
  });

  // Apply link on button click
  applyBtn.addEventListener('mousedown', e => {
    e.preventDefault();
    let url = urlInput.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    restoreSelection();
    document.execCommand('createLink', false, url);
    // Make links open in new tab
    window.getSelection()?.anchorNode?.parentElement?.closest('a')
      ?.setAttribute('target', '_blank');
    bar.style.display = 'none';
    hideLinkRow();
    savedRange = null;
  });

  // Apply link on Enter key in URL input
  urlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); applyBtn.dispatchEvent(new MouseEvent('mousedown')); }
    if (e.key === 'Escape') { hideLinkRow(); }
  });

  // Hide bar when clicking outside
  document.addEventListener('mousedown', e => {
    if (!bar.contains(e.target)) {
      bar.style.display = 'none';
      hideLinkRow();
    }
  });

  document.addEventListener('mouseup',  e => { if (!bar.contains(e.target)) showBar(); });
  document.addEventListener('keyup',    e => { if (!bar.contains(e.target)) showBar(); });
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      if (!bar.contains(document.activeElement)) {
        bar.style.display = 'none';
        hideLinkRow();
      }
    }
  });
})();

// ── TWO-COLUMN PAGE (Int Page – Temp 17) ───────────────────

function buildTwocolPage(page, index) {
  const d = PAGE_DEFAULTS.twocol;
  const div = mkEl('div', 'mag-page page-twocol');
  div.dataset.pageId = page.id;

  // Banner image (height adjustable)
  const banner = mkEl('div', 'tc-banner');
  const tcBannerH = page.tcBannerHeight != null ? page.tcBannerHeight : 36;
  banner.style.flex = `0 0 ${tcBannerH}%`;
  banner.appendChild(buildImgLayer(page, 'bannerImage', 'bannerImageX', 'bannerImageY', 'bannerImageZoom', 'bgsize'));
  banner.appendChild(buildImgOverlay(page.id, 'bannerImage', 'Banner Image'));
  div.appendChild(banner);

  // Full-width page heading
  div.appendChild(inlineEditable('div', 'tc-page-heading',
    page.pageHeading || d.pageHeading, page, 'pageHeading'));

  // Two-column body
  const body = mkEl('div', 'tc-body');

  // Left column
  const leftCol = mkEl('div', 'tc-col');
  leftCol.appendChild(inlineEditable('div', 'tc-col-heading',
    page.leftHeading || d.leftHeading, page, 'leftHeading'));
  const leftParas = page.tcLeftParas && page.tcLeftParas.length ? page.tcLeftParas : d.tcLeftParas;
  leftParas.forEach((para, i) => {
    const p = mkEl('p', 'tc-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.tcLeftParas) page.tcLeftParas = [...leftParas];
      page.tcLeftParas[i] = p.innerHTML;
      savePages(true);
    });
    leftCol.appendChild(p);
  });
  body.appendChild(leftCol);

  // Column divider
  body.appendChild(mkEl('div', 'tc-divider'));

  // Right column
  const rightCol = mkEl('div', 'tc-col');
  rightCol.appendChild(inlineEditable('div', 'tc-col-heading',
    page.rightHeading || d.rightHeading, page, 'rightHeading'));
  const rightParas = page.tcRightParas && page.tcRightParas.length ? page.tcRightParas : d.tcRightParas;
  rightParas.forEach((para, i) => {
    const p = mkEl('p', 'tc-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.tcRightParas) page.tcRightParas = [...rightParas];
      page.tcRightParas[i] = p.innerHTML;
      savePages(true);
    });
    rightCol.appendChild(p);
  });
  body.appendChild(rightCol);

  div.appendChild(body);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

function buildTwocolFields(body, page) {
  const d = PAGE_DEFAULTS.twocol;

  addSectionTitle(body, 'BANNER IMAGE');
  addSliderField(body, 'Height (%)', 'tcBannerHeight', page.tcBannerHeight != null ? page.tcBannerHeight : 36, 15, 70);
  addImageFieldBtn(body, page.id, 'bannerImage', 'Banner Image');
  const bXS = addSliderField(body, 'Position: Left / Right', 'bannerImageX', page.bannerImageX != null ? page.bannerImageX : 50);
  const bYS = addSliderField(body, 'Position: Up / Down',   'bannerImageY', page.bannerImageY != null ? page.bannerImageY : 50);
  const bZS = addSliderField(body, 'Zoom', 'bannerImageZoom', page.bannerImageZoom != null ? page.bannerImageZoom : 100, 10, 300);
  bindImgSliders(page, 'bannerImage', bXS, bYS, bZS);

  addSectionTitle(body, 'PAGE HEADING');
  const phTa = addField(body, 'Heading', 'pageHeading', page.pageHeading || d.pageHeading, 'textarea');
  phTa.rows = 2;

  addSectionTitle(body, 'LEFT COLUMN');
  addField(body, 'Column Heading', 'leftHeading', page.leftHeading || d.leftHeading);
  const leftParas = page.tcLeftParas && page.tcLeftParas.length ? page.tcLeftParas : d.tcLeftParas;
  const leftContainer = mkEl('div', 'vision-paras-container');
  function addLeftPara(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.remove(); leftContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `tcLeftPara${j}`; }); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 3;
    ta.dataset.field = `tcLeftPara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    leftContainer.appendChild(wrap);
  }
  leftParas.forEach((v, i) => addLeftPara(i, v));
  body.appendChild(leftContainer);
  const addLeftBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addLeftBtn.type = 'button';
  addLeftBtn.onclick = () => addLeftPara(leftContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addLeftBtn);

  addSectionTitle(body, 'RIGHT COLUMN');
  addField(body, 'Column Heading', 'rightHeading', page.rightHeading || d.rightHeading);
  const rightParas = page.tcRightParas && page.tcRightParas.length ? page.tcRightParas : d.tcRightParas;
  const rightContainer = mkEl('div', 'vision-paras-container');
  function addRightPara(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.remove(); rightContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `tcRightPara${j}`; }); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 3;
    ta.dataset.field = `tcRightPara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    rightContainer.appendChild(wrap);
  }
  rightParas.forEach((v, i) => addRightPara(i, v));
  body.appendChild(rightContainer);
  const addRightBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addRightBtn.type = 'button';
  addRightBtn.onclick = () => addRightPara(rightContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addRightBtn);
}

// ── WIDETEXT PAGE (Int Page – Temp 15) ─────────────────────

function buildWidetextPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const div = mkEl('div', 'mag-page page-widetext');
  div.dataset.pageId = page.id;
  div.style.setProperty('--wt-accent', accent);
  div.style.setProperty('--wt-para-gap', `${page.wtParaGap != null ? page.wtParaGap : 8}px`);

  // ── TOP: hero banner image ──
  const hero = mkEl('div', 'wt-hero');
  hero.style.height = `${page.wtBannerHeight != null ? page.wtBannerHeight : 421}px`;
  hero.appendChild(buildImgLayer(page, 'heroImage', 'heroImageX', 'heroImageY', 'heroImageZoom'));
  if (page.wtHeroOverlay !== false) hero.appendChild(mkEl('div', 'vs-hero-overlay'));
  hero.appendChild(buildImgOverlay(page.id, 'heroImage', 'Hero Banner Image'));
  div.appendChild(hero);

  // ── BOTTOM: full-width single column ──
  const content = mkEl('div', 'wt-content');

  // Running label
  const label = mkEl('div', 'vs-run-label');
  label.appendChild(mkEl('span', 'vs-run-line'));
  const wtRunText = mkEl('span', 'vs-run-text');
  wtRunText.appendChild(inlineEditable('span', '', page.edLabel || 'AGENCY FEATURE', page, 'edLabel'));
  wtRunText.appendChild(document.createTextNode('  ·  '));
  wtRunText.appendChild(inlineEditable('span', '', page.edDate || 'APRIL 2026', page, 'edDate'));
  label.appendChild(wtRunText);
  content.appendChild(label);

  // Headline
  content.appendChild(inlineEditable('div', 'wt-headline',
    page.articleHeadline || 'A Bold Headline That Commands Attention', page, 'articleHeadline'));

  // Paragraphs
  const parasWrap = mkEl('div', 'wt-paras-wrap');
  const paras = page.visionParas && page.visionParas.length ? page.visionParas :
    ['Paragraph one goes here.', 'Paragraph two goes here.'];
  paras.forEach((para, i) => {
    const p = mkEl('p', 'wt-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.visionParas) page.visionParas = [...paras];
      page.visionParas[i] = p.innerHTML;
      savePages(true);
    });
    parasWrap.appendChild(p);
  });
  content.appendChild(parasWrap);

  div.appendChild(content);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

function buildWidetextFields(body, page) {
  const d = PAGE_DEFAULTS.widetext;

  addSectionTitle(body, 'HEADER STRIP');
  addField(body, 'Label (left)', 'edLabel', page.edLabel || 'AGENCY FEATURE');
  addField(body, 'Date (right)', 'edDate', page.edDate || 'APRIL 2026');

  addSectionTitle(body, 'HEADLINE');
  const hlTa = addField(body, 'Headline', 'articleHeadline', page.articleHeadline || d.articleHeadline, 'textarea');
  hlTa.rows = 2;

  addSectionTitle(body, 'PARAGRAPHS');
  const wtGapSlider = addSliderField(body, 'Space Between Paragraphs', 'wtParaGap', page.wtParaGap != null ? page.wtParaGap : 8, 0, 40);
  wtGapSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--wt-para-gap', `${wtGapSlider.value}px`);
  });
  const paras = page.visionParas && page.visionParas.length ? page.visionParas : d.visionParas;
  const parasContainer = mkEl('div', 'vision-paras-container');

  function addParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.classList.add('para-crossed-out'); setTimeout(() => { wrap.remove(); parasContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `widetextPara${j}`; }); savePanelSilent(); }, 400); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 3;
    ta.dataset.field = `widetextPara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    parasContainer.appendChild(wrap);
  }

  paras.forEach((v, i) => addParaField(i, v));
  body.appendChild(parasContainer);
  const addBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addBtn.type = 'button';
  addBtn.onclick = () => addParaField(parasContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addBtn);

  addSectionTitle(body, 'HERO BANNER IMAGE');
  addImageFieldBtn(body, page.id, 'heroImage', 'Hero Banner Image');

  // Overlay toggle
  const overlayToggleWrap = mkEl('div', 'field-group');
  const overlayLbl = mkEl('label', 'toggle-label');
  const overlayChk = document.createElement('input');
  overlayChk.type = 'checkbox';
  overlayChk.checked = page.wtHeroOverlay !== false;
  overlayChk.addEventListener('change', () => {
    page.wtHeroOverlay = overlayChk.checked;
    const heroEl = document.querySelector(`.mag-page[data-page-id="${page.id}"] .wt-hero`);
    if (heroEl) {
      const existing = heroEl.querySelector('.vs-hero-overlay');
      if (overlayChk.checked && !existing) {
        const ov = mkEl('div', 'vs-hero-overlay');
        heroEl.insertBefore(ov, heroEl.querySelector('.img-upload-overlay'));
      } else if (!overlayChk.checked && existing) {
        existing.remove();
      }
    }
    savePages(true);
  });
  overlayLbl.appendChild(overlayChk);
  overlayLbl.appendChild(document.createTextNode(' Image Shadow / Black Overlay'));
  overlayToggleWrap.appendChild(overlayLbl);
  body.appendChild(overlayToggleWrap);

  const hHS = addSliderField(body, 'Banner Height', 'wtBannerHeight', page.wtBannerHeight != null ? page.wtBannerHeight : 421, 80, 700);
  hHS.addEventListener('input', () => {
    const heroEl = document.querySelector(`.mag-page[data-page-id="${page.id}"] .wt-hero`);
    if (heroEl) heroEl.style.height = `${hHS.value}px`;
  });
  const hXS = addSliderField(body, 'Position: Left / Right', 'heroImageX', page.heroImageX != null ? page.heroImageX : 50);
  const hYS = addSliderField(body, 'Position: Up / Down',   'heroImageY', page.heroImageY != null ? page.heroImageY : 50);
  const hZS = addSliderField(body, 'Zoom', 'heroImageZoom', page.heroImageZoom != null ? page.heroImageZoom : 100, 80, 200);
  bindImgSliders(page, 'heroImage', hXS, hYS, hZS);
}

// ── IMPACT PAGE (Int Page – Temp 14) ───────────────────────

function buildImpactPage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const d = PAGE_DEFAULTS.impact;

  const div = mkEl('div', 'mag-page page-impact');
  div.dataset.pageId = page.id;
  div.style.setProperty('--imp-accent', accent);

  // ── HEADING ──
  const hdg = mkEl('div', 'imp-heading');
  hdg.appendChild(inlineEditable('span', 'imp-head-accent', page.impHead1 || d.impHead1, page, 'impHead1'));
  hdg.appendChild(inlineEditable('span', 'imp-head-dark',   page.impHead2 || d.impHead2, page, 'impHead2'));
  hdg.appendChild(inlineEditable('span', 'imp-head-accent', page.impHead3 || d.impHead3, page, 'impHead3'));
  hdg.appendChild(inlineEditable('span', 'imp-head-dark',   page.impHead4 || d.impHead4, page, 'impHead4'));
  div.appendChild(hdg);

  // ── MIDDLE ROW: left image + right short paras ──
  const mid = mkEl('div', 'imp-mid');

  const midImg = mkEl('div', 'imp-mid-img');
  midImg.appendChild(buildImgLayer(page, 'impImg1', 'impImg1X', 'impImg1Y', 'impImg1Zoom'));
  midImg.appendChild(buildImgOverlay(page.id, 'impImg1', 'Top Image'));
  mid.appendChild(midImg);

  const midText = mkEl('div', 'imp-mid-text');
  const topParas = page.impTopParas && page.impTopParas.length ? page.impTopParas : d.impTopParas;
  topParas.forEach((para, i) => {
    const p = mkEl('p', 'imp-top-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.impTopParas) page.impTopParas = [...topParas];
      page.impTopParas[i] = p.innerHTML;
      savePages(true);
    });
    midText.appendChild(p);
  });
  mid.appendChild(midText);
  div.appendChild(mid);

  // ── BOTTOM ROW: left body+quote | right tall image ──
  const bottom = mkEl('div', 'imp-bottom');

  // Left column
  const bottomLeft = mkEl('div', 'imp-bottom-left');
  const bodyParasWrap = mkEl('div', 'imp-body-wrap');
  const bodyParas = page.impBodyParas && page.impBodyParas.length ? page.impBodyParas : d.impBodyParas;
  bodyParas.forEach((para, i) => {
    const p = mkEl('p', 'imp-body-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.impBodyParas) page.impBodyParas = [...bodyParas];
      page.impBodyParas[i] = p.innerHTML;
      savePages(true);
    });
    bodyParasWrap.appendChild(p);
  });
  bottomLeft.appendChild(bodyParasWrap);

  // Dark red quote box
  const qBox = mkEl('div', 'imp-quote-box');
  qBox.appendChild(inlineEditable('p', 'imp-quote-text',
    page.pullQuote || d.pullQuote, page, 'pullQuote'));
  bottomLeft.appendChild(qBox);

  bottom.appendChild(bottomLeft);

  // Right column — tall image
  const bottomRight = mkEl('div', 'imp-bottom-right');
  const tallImg = mkEl('div', 'imp-tall-img');
  tallImg.appendChild(buildImgLayer(page, 'impImg2', 'impImg2X', 'impImg2Y', 'impImg2Zoom'));
  tallImg.appendChild(buildImgOverlay(page.id, 'impImg2', 'Portrait Image'));
  bottomRight.appendChild(tallImg);
  bottom.appendChild(bottomRight);

  div.appendChild(bottom);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

function buildImpactFields(body, page) {
  const d = PAGE_DEFAULTS.impact;

  // ── HEADING ──
  addSectionTitle(body, 'HEADING');
  addField(body, 'Accent Word 1 (red)', 'impHead1', page.impHead1 || d.impHead1);
  addField(body, 'Connector Text (dark)', 'impHead2', page.impHead2 || d.impHead2);
  addField(body, 'Accent Word 2 (red)', 'impHead3', page.impHead3 || d.impHead3);
  addField(body, 'Ending Text (dark)', 'impHead4', page.impHead4 || d.impHead4);

  // ── TOP IMAGE ──
  addSectionTitle(body, 'TOP IMAGE');
  addImageFieldBtn(body, page.id, 'impImg1', 'Top Landscape Image');
  const i1X = addSliderField(body, 'Position: Left / Right', 'impImg1X', page.impImg1X != null ? page.impImg1X : 50);
  const i1Y = addSliderField(body, 'Position: Up / Down',   'impImg1Y', page.impImg1Y != null ? page.impImg1Y : 50);
  const i1Z = addSliderField(body, 'Zoom', 'impImg1Zoom', page.impImg1Zoom != null ? page.impImg1Zoom : 100, 80, 200);
  bindImgSliders(page, 'impImg1', i1X, i1Y, i1Z);

  // ── TOP-RIGHT PARAGRAPHS ──
  addSectionTitle(body, 'RIGHT PARAGRAPHS (TOP)');
  const topParas = page.impTopParas && page.impTopParas.length ? page.impTopParas : d.impTopParas;
  const topContainer = mkEl('div', 'vision-paras-container');
  function addTopParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.remove(); topContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `impTopPara${j}`; }); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 3;
    ta.dataset.field = `impTopPara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    topContainer.appendChild(wrap);
  }
  topParas.forEach((v, i) => addTopParaField(i, v));
  body.appendChild(topContainer);
  const addTopBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addTopBtn.type = 'button';
  addTopBtn.onclick = () => addTopParaField(topContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addTopBtn);

  // ── BODY PARAGRAPHS ──
  addSectionTitle(body, 'BODY PARAGRAPHS (BOTTOM-LEFT)');
  const bodyParas = page.impBodyParas && page.impBodyParas.length ? page.impBodyParas : d.impBodyParas;
  const bodyContainer = mkEl('div', 'vision-paras-container');
  function addBodyParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.remove(); bodyContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `impBodyPara${j}`; }); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 3;
    ta.dataset.field = `impBodyPara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    bodyContainer.appendChild(wrap);
  }
  bodyParas.forEach((v, i) => addBodyParaField(i, v));
  body.appendChild(bodyContainer);
  const addBodyBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addBodyBtn.type = 'button';
  addBodyBtn.onclick = () => addBodyParaField(bodyContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addBodyBtn);

  // ── QUOTE BOX ──
  addSectionTitle(body, 'QUOTE BOX');
  const pqTa = addField(body, 'Quote Text', 'pullQuote', page.pullQuote || d.pullQuote, 'textarea');
  pqTa.rows = 4;

  // ── PORTRAIT IMAGE ──
  addSectionTitle(body, 'PORTRAIT IMAGE (RIGHT)');
  addImageFieldBtn(body, page.id, 'impImg2', 'Portrait Image');
  const i2X = addSliderField(body, 'Position: Left / Right', 'impImg2X', page.impImg2X != null ? page.impImg2X : 50);
  const i2Y = addSliderField(body, 'Position: Up / Down',   'impImg2Y', page.impImg2Y != null ? page.impImg2Y : 50);
  const i2Z = addSliderField(body, 'Zoom', 'impImg2Zoom', page.impImg2Zoom != null ? page.impImg2Zoom : 100, 80, 200);
  bindImgSliders(page, 'impImg2', i2X, i2Y, i2Z);
}

// ── IMPACT 2 PAGE (Int Page – Temp 18) ────────────────────────

function buildImpact2Page(page, index) {
  const accent = page.accentColor || '#E4022D';
  const d = PAGE_DEFAULTS.impact2;

  const div = mkEl('div', 'mag-page page-impact2');
  div.dataset.pageId = page.id;
  div.style.setProperty('--imp-accent', accent);

  // ── HEADING (Temp 3 / pr-headline style) ──
  const hdg = inlineEditable('div', 'imp2-headline',
    page.imp2Headline || d.imp2Headline, page, 'imp2Headline');
  div.appendChild(hdg);

  // ── MIDDLE ROW: left image + right short paras ──
  const mid = mkEl('div', 'imp-mid');

  const midImg = mkEl('div', 'imp-mid-img');
  midImg.appendChild(buildImgLayer(page, 'impImg1', 'impImg1X', 'impImg1Y', 'impImg1Zoom'));
  midImg.appendChild(buildImgOverlay(page.id, 'impImg1', 'Top Image'));
  mid.appendChild(midImg);

  const midText = mkEl('div', 'imp-mid-text');
  const topParas = page.impTopParas && page.impTopParas.length ? page.impTopParas : d.impTopParas;
  topParas.forEach((para, i) => {
    const p = mkEl('p', 'imp-top-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.impTopParas) page.impTopParas = [...topParas];
      page.impTopParas[i] = p.innerHTML;
      savePages(true);
    });
    midText.appendChild(p);
  });
  mid.appendChild(midText);
  div.appendChild(mid);

  // ── BOTTOM ROW: full-width body + quote (no portrait image) ──
  const bottom = mkEl('div', 'imp-bottom imp2-bottom-full');

  const bottomLeft = mkEl('div', 'imp-bottom-left');

  // ── SUB-HEADING before body paras ──
  bottomLeft.appendChild(inlineEditable('div', 'imp2-sub-heading',
    page.imp2SubHeading != null ? page.imp2SubHeading : d.imp2SubHeading, page, 'imp2SubHeading'));

  const bodyParasWrap = mkEl('div', 'imp-body-wrap');
  const bodyParas = page.impBodyParas && page.impBodyParas.length ? page.impBodyParas : d.impBodyParas;
  bodyParas.forEach((para, i) => {
    const p = mkEl('p', 'imp-body-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.impBodyParas) page.impBodyParas = [...bodyParas];
      page.impBodyParas[i] = p.innerHTML;
      savePages(true);
    });
    bodyParasWrap.appendChild(p);
  });
  bottomLeft.appendChild(bodyParasWrap);

  bottom.appendChild(bottomLeft);
  div.appendChild(bottom);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

function buildImpact2Fields(body, page) {
  const d = PAGE_DEFAULTS.impact2;

  // ── HEADING ──
  addSectionTitle(body, 'HEADING');
  addField(body, 'Headline (use line breaks with \\n)', 'imp2Headline', page.imp2Headline || d.imp2Headline, 'textarea').rows = 4;

  // ── TOP IMAGE ──
  addSectionTitle(body, 'TOP IMAGE');
  addImageFieldBtn(body, page.id, 'impImg1', 'Top Landscape Image');
  const i1X = addSliderField(body, 'Position: Left / Right', 'impImg1X', page.impImg1X != null ? page.impImg1X : 50);
  const i1Y = addSliderField(body, 'Position: Up / Down',   'impImg1Y', page.impImg1Y != null ? page.impImg1Y : 50);
  const i1Z = addSliderField(body, 'Zoom', 'impImg1Zoom', page.impImg1Zoom != null ? page.impImg1Zoom : 100, 80, 200);
  bindImgSliders(page, 'impImg1', i1X, i1Y, i1Z);

  // ── TOP-RIGHT PARAGRAPHS ──
  addSectionTitle(body, 'RIGHT PARAGRAPHS (TOP)');
  const topParas = page.impTopParas && page.impTopParas.length ? page.impTopParas : d.impTopParas;
  const topContainer = mkEl('div', 'vision-paras-container');
  function addTopParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.remove(); topContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `impTopPara${j}`; }); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 3;
    ta.dataset.field = `impTopPara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    topContainer.appendChild(wrap);
  }
  topParas.forEach((v, i) => addTopParaField(i, v));
  body.appendChild(topContainer);
  const addTopBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addTopBtn.type = 'button';
  addTopBtn.onclick = () => addTopParaField(topContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addTopBtn);

  // ── SUB-HEADING ──
  addSectionTitle(body, 'SUB-HEADING (before body paragraphs)');
  addField(body, 'Sub-Heading Text', 'imp2SubHeading', page.imp2SubHeading != null ? page.imp2SubHeading : d.imp2SubHeading);

  // ── BODY PARAGRAPHS ──
  addSectionTitle(body, 'BODY PARAGRAPHS');
  const bodyParas = page.impBodyParas && page.impBodyParas.length ? page.impBodyParas : d.impBodyParas;
  const bodyContainer = mkEl('div', 'vision-paras-container');
  function addBodyParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => { wrap.remove(); bodyContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => { w.querySelector('label').textContent = `Paragraph ${j+1}`; w.querySelector('textarea').dataset.field = `impBodyPara${j}`; }); };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea'); ta.className = 'field-input'; ta.rows = 3;
    ta.dataset.field = `impBodyPara${i}`; ta.value = val || ''; wrap.appendChild(ta);
    bodyContainer.appendChild(wrap);
  }
  bodyParas.forEach((v, i) => addBodyParaField(i, v));
  body.appendChild(bodyContainer);
  const addBodyBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addBodyBtn.type = 'button';
  addBodyBtn.onclick = () => addBodyParaField(bodyContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addBodyBtn);

}

// ── FEATURE PAGE (Int Page – Temp 13) ──────────────────────

function buildFeaturePage(page, index) {
  const accent = page.accentColor || '#E4022D';
  const d = PAGE_DEFAULTS.feature;

  const div = mkEl('div', 'mag-page page-feature');
  div.dataset.pageId = page.id;
  div.style.cssText = `--ft-accent:${accent};--ft-header-height:${page.ftHeaderHeight != null ? page.ftHeaderHeight : 175}px;--ft-img-height:${page.ftImgHeight != null ? page.ftImgHeight : 300}px;`;

  // ── HEADER ──
  const header = mkEl('div', 'ft-header');

  // Background image layer (sits behind everything)
  const hdrImgLayer = buildImgLayer(page, 'ftHeaderImage', 'ftHeaderImageX', 'ftHeaderImageY', 'ftHeaderImageZoom');
  hdrImgLayer.classList.add('ft-header-img');
  header.appendChild(hdrImgLayer);

  // Dark overlay so text stays legible over any photo
  header.appendChild(mkEl('div', 'ft-header-overlay'));

  // Upload trigger for header image
  header.appendChild(buildImgOverlay(page.id, 'ftHeaderImage', 'Header Photo'));

  div.appendChild(header);

  // ── CONTENT AREA ──
  const content = mkEl('div', 'ft-content');

  // Centred bold heading
  content.appendChild(inlineEditable('h1', 'ft-heading',
    page.ftHeading || d.ftHeading, page, 'ftHeading'));

  // Red rule
  content.appendChild(mkEl('div', 'ft-rule'));

  // Intro paragraph
  content.appendChild(inlineEditable('p', 'ft-intro',
    page.ftIntro || d.ftIntro, page, 'ftIntro'));

  // Full-width image
  const imgWrap = mkEl('div', 'ft-img-wrap');
  imgWrap.appendChild(buildImgLayer(page, 'ftImage', 'ftImageX', 'ftImageY', 'ftImageZoom'));
  imgWrap.appendChild(buildImgOverlay(page.id, 'ftImage', 'Feature Photo'));
  content.appendChild(imgWrap);

  // Body paragraphs + quote — all flow together naturally
  const bodyDiv = mkEl('div', 'ft-body');
  const paras = page.featureParas && page.featureParas.length ? page.featureParas : d.featureParas;
  paras.forEach((para, i) => {
    const p = mkEl('p', 'ft-para');
    p.contentEditable = 'true';
    p.innerHTML = para;
    p.addEventListener('blur', () => {
      if (!page.featureParas) page.featureParas = [...paras];
      page.featureParas[i] = p.innerHTML;
      savePages(true);
    });
    bodyDiv.appendChild(p);
  });

  // Quote sits right after the paragraphs — toggleable
  if (page.ftShowQuote !== false) {
    const qBox = mkEl('div', 'ft-quote-box');
    qBox.appendChild(inlineEditable('p', 'ft-quote-text',
      page.pullQuote || d.pullQuote, page, 'pullQuote'));
    bodyDiv.appendChild(qBox);
  }

  // Optional Heading 2 + paragraphs
  if (page.ftShowHeading2) {
    const h2El = inlineEditable('div', 'ft-heading2', page.ftHeading2 || 'Sub-Heading', page, 'ftHeading2');
    bodyDiv.appendChild(h2El);
    const h2Paras = page.ftHeading2Paras && page.ftHeading2Paras.length ? page.ftHeading2Paras : ['Additional paragraph goes here.'];
    h2Paras.forEach((para, i) => {
      const p = mkEl('p', 'ft-para');
      p.contentEditable = 'true';
      p.innerHTML = para;
      p.addEventListener('blur', () => {
        if (!page.ftHeading2Paras) page.ftHeading2Paras = [...h2Paras];
        page.ftHeading2Paras[i] = p.innerHTML;
        savePages(true);
      });
      bodyDiv.appendChild(p);
    });
  }

  content.appendChild(bodyDiv);

  div.appendChild(content);
  div.appendChild(buildRunFooter(page, index));
  return div;
}

function buildFeatureFields(body, page) {
  const d = PAGE_DEFAULTS.feature;

  // ── HEADER IMAGE ──
  addSectionTitle(body, 'HEADER IMAGE');
  const ftHHSlider = addSliderField(body, 'Header Image Height (px)', 'ftHeaderHeight', page.ftHeaderHeight != null ? page.ftHeaderHeight : 175, 60, 400);
  ftHHSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--ft-header-height', `${ftHHSlider.value}px`);
  });
  addImageFieldBtn(body, page.id, 'ftHeaderImage', 'Header Background Photo');
  const hXS = addSliderField(body, 'Position: Left / Right', 'ftHeaderImageX', page.ftHeaderImageX != null ? page.ftHeaderImageX : 50);
  const hYS = addSliderField(body, 'Position: Up / Down',   'ftHeaderImageY', page.ftHeaderImageY != null ? page.ftHeaderImageY : 50);
  const hZS = addSliderField(body, 'Zoom', 'ftHeaderImageZoom', page.ftHeaderImageZoom != null ? page.ftHeaderImageZoom : 100, 80, 200);
  bindImgSliders(page, 'ftHeaderImage', hXS, hYS, hZS);

  // ── HEADING ──
  addSectionTitle(body, 'MAIN HEADING');
  const hlTa = addField(body, 'Heading', 'ftHeading', page.ftHeading || d.ftHeading, 'textarea');
  hlTa.rows = 3;

  // ── INTRO ──
  addSectionTitle(body, 'INTRO PARAGRAPH');
  const introTa = addField(body, 'Intro Text', 'ftIntro', page.ftIntro || d.ftIntro, 'textarea');
  introTa.rows = 4;

  // ── BODY PARAGRAPHS ──
  addSectionTitle(body, 'BODY PARAGRAPHS');
  const featureParas = page.featureParas && page.featureParas.length ? page.featureParas : d.featureParas;
  const parasContainer = mkEl('div', 'vision-paras-container');

  function addFeatureParaField(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => {
      wrap.remove();
      parasContainer.querySelectorAll('.vision-para-wrap').forEach((w, j) => {
        w.querySelector('label').textContent = `Paragraph ${j + 1}`;
        w.querySelector('textarea').dataset.field = `featurePara${j}`;
      });
    };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea');
    ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `featurePara${i}`; ta.value = val || '';
    wrap.appendChild(ta);
    parasContainer.appendChild(wrap);
  }

  featureParas.forEach((v, i) => addFeatureParaField(i, v));
  body.appendChild(parasContainer);
  const addParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addParaBtn.type = 'button';
  addParaBtn.onclick = () => addFeatureParaField(parasContainer.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addParaBtn);

  // ── QUOTE BOX ──
  addSectionTitle(body, 'QUOTE BOX');
  const ftQToggleWrap = mkEl('div', 'field-group');
  const ftQToggleLabel = mkEl('label', 'toggle-label');
  const ftQChk = document.createElement('input');
  ftQChk.type = 'checkbox'; ftQChk.dataset.field = 'ftShowQuote';
  ftQChk.checked = page.ftShowQuote !== false;
  ftQToggleLabel.appendChild(ftQChk);
  ftQToggleLabel.appendChild(document.createTextNode(' Show Quote Box'));
  ftQToggleWrap.appendChild(ftQToggleLabel);
  body.appendChild(ftQToggleWrap);
  const pqTa = addField(body, 'Quote Text', 'pullQuote', page.pullQuote || d.pullQuote, 'textarea');
  pqTa.rows = 3;

  // ── HEADING 2 (optional) ──
  addSectionTitle(body, 'HEADING 2 (OPTIONAL)');
  const ftH2ToggleWrap = mkEl('div', 'field-group');
  const ftH2ToggleLabel = mkEl('label', 'toggle-label');
  const ftH2Chk = document.createElement('input');
  ftH2Chk.type = 'checkbox'; ftH2Chk.dataset.field = 'ftShowHeading2';
  ftH2Chk.checked = !!page.ftShowHeading2;
  ftH2ToggleLabel.appendChild(ftH2Chk);
  ftH2ToggleLabel.appendChild(document.createTextNode(' Show Heading 2 & Paragraphs'));
  ftH2ToggleWrap.appendChild(ftH2ToggleLabel);
  body.appendChild(ftH2ToggleWrap);
  addField(body, 'Heading 2 Text', 'ftHeading2', page.ftHeading2 || 'Sub-Heading');
  const h2Paras = page.ftHeading2Paras && page.ftHeading2Paras.length ? page.ftHeading2Paras : [''];
  const h2Container = mkEl('div', 'vision-paras-container');

  function addH2Para(i, val) {
    const wrap = mkEl('div', 'field-group vision-para-wrap');
    const lr = mkEl('div', 'slider-label-row');
    lr.appendChild(mkEl('label', '', `Paragraph ${i + 1}`));
    const rb = mkEl('button', 'btn-remove-para', '✕'); rb.type = 'button';
    rb.onclick = () => {
      wrap.remove();
      h2Container.querySelectorAll('.vision-para-wrap').forEach((w, j) => {
        w.querySelector('label').textContent = `Paragraph ${j + 1}`;
        w.querySelector('textarea').dataset.field = `ftH2Para${j}`;
      });
    };
    lr.appendChild(rb); wrap.appendChild(lr);
    const ta = document.createElement('textarea');
    ta.className = 'field-input'; ta.rows = 4;
    ta.dataset.field = `ftH2Para${i}`; ta.value = val || '';
    wrap.appendChild(ta);
    h2Container.appendChild(wrap);
  }

  h2Paras.forEach((v, i) => addH2Para(i, v));
  body.appendChild(h2Container);
  const addH2ParaBtn = mkEl('button', 'btn-add-para', '+ Add Paragraph'); addH2ParaBtn.type = 'button';
  addH2ParaBtn.onclick = () => addH2Para(h2Container.querySelectorAll('.vision-para-wrap').length, '');
  body.appendChild(addH2ParaBtn);

  // ── FEATURE IMAGE ──
  addSectionTitle(body, 'FEATURE IMAGE');
  const ftIHSlider = addSliderField(body, 'Feature Image Height (px)', 'ftImgHeight', page.ftImgHeight != null ? page.ftImgHeight : 300, 60, 500);
  ftIHSlider.addEventListener('input', () => {
    const pageEl = document.querySelector(`.mag-page[data-page-id="${page.id}"]`);
    if (pageEl) pageEl.style.setProperty('--ft-img-height', `${ftIHSlider.value}px`);
  });
  addImageFieldBtn(body, page.id, 'ftImage', 'Feature Photo');
  const ftXS = addSliderField(body, 'Position: Left / Right', 'ftImageX', page.ftImageX != null ? page.ftImageX : 50);
  const ftYS = addSliderField(body, 'Position: Up / Down',   'ftImageY', page.ftImageY != null ? page.ftImageY : 50);
  const ftZS = addSliderField(body, 'Zoom', 'ftImageZoom', page.ftImageZoom != null ? page.ftImageZoom : 100, 80, 200);
  bindImgSliders(page, 'ftImage', ftXS, ftYS, ftZS);

  // ── ACCENT COLOUR ──
  addSectionTitle(body, 'ACCENT COLOUR');
  addField(body, 'Accent Colour (hex)', 'accentColor', page.accentColor || '#E4022D');
}

document.addEventListener('DOMContentLoaded', boot);
