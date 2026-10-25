/**
 * RAG Lead Hunter & B2B Database Explorer
 * Frontend Application Engine
 */

(function () {
  'use strict';

  // Global Application State
  const state = {
    ragLeads: [],
    kzCompanies: [],
    digestItems: [],
    crmStatus: {},
    activeTab: 'rag',
    viewMode: localStorage.getItem('rag_view_mode') || 'table',
    theme: localStorage.getItem('rag_theme') || 'dark',

    // Active filters
    filters: {
      search: '',
      ragScore: 'all',
      ragPain: 'all',
      ragSource: 'all',
      ragStatus: 'all',
      ragOnlyContacts: false,

      kzNiche: 'all',
      kzCity: 'all',
      kzOnlyWhatsApp: false,
      kzOnlyWebsite: false,
    },

    // Sorting
    sort: {
      column: 'score',
      dir: 'desc',
    },

    // Drawer state
    currentLead: null,
    currentLeadIndex: 0,
    filteredList: [],
  };

  // DOM Elements cache
  const el = {
    // Tabs
    tabBtnRag: document.getElementById('tabBtnRag'),
    tabBtnKz: document.getElementById('tabBtnKz'),
    tabBtnDigest: document.getElementById('tabBtnDigest'),
    tabBtnAnalytics: document.getElementById('tabBtnAnalytics'),
    badgeRagCount: document.getElementById('badgeRagCount'),
    badgeKzCount: document.getElementById('badgeKzCount'),

    // Panes
    paneRag: document.getElementById('paneRag'),
    paneKz: document.getElementById('paneKz'),
    paneDigest: document.getElementById('paneDigest'),
    paneAnalytics: document.getElementById('paneAnalytics'),

    // KPIs
    kpiTotalVal: document.getElementById('kpiTotalVal'),
    kpiTotalSub: document.getElementById('kpiTotalSub'),
    kpiHotVal: document.getElementById('kpiHotVal'),
    kpiContactsVal: document.getElementById('kpiContactsVal'),
    kpiOutreachVal: document.getElementById('kpiOutreachVal'),
    kpiHot: document.getElementById('kpiHot'),
    kpiContacts: document.getElementById('kpiContacts'),

    // Toolbar
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    ragFiltersGroup: document.getElementById('ragFiltersGroup'),
    kzFiltersGroup: document.getElementById('kzFiltersGroup'),
    filterScore: document.getElementById('filterScore'),
    filterPain: document.getElementById('filterPain'),
    filterSource: document.getElementById('filterSource'),
    filterStatus: document.getElementById('filterStatus'),
    checkOnlyContacts: document.getElementById('checkOnlyContacts'),
    filterKzNiche: document.getElementById('filterKzNiche'),
    filterKzCity: document.getElementById('filterKzCity'),
    checkKzWhatsApp: document.getElementById('checkKzWhatsApp'),
    checkKzWebsite: document.getElementById('checkKzWebsite'),
    resultsCount: document.getElementById('resultsCount'),
    btnViewTable: document.getElementById('btnViewTable'),
    btnViewGrid: document.getElementById('btnViewGrid'),
    activeTagsBar: document.getElementById('activeTagsBar'),
    activeTagsList: document.getElementById('activeTagsList'),
    btnResetFilters: document.getElementById('btnResetFilters'),

    // Containers
    ragTableView: document.getElementById('ragTableView'),
    ragGridView: document.getElementById('ragGridView'),
    tbodyRag: document.getElementById('tbodyRag'),
    ragEmptyState: document.getElementById('ragEmptyState'),

    kzTableView: document.getElementById('kzTableView'),
    kzGridView: document.getElementById('kzGridView'),
    tbodyKz: document.getElementById('tbodyKz'),
    kzEmptyState: document.getElementById('kzEmptyState'),

    digestContainer: document.getElementById('digestContainer'),

    // Analytics
    chartScoreBars: document.getElementById('chartScoreBars'),
    chartPainBars: document.getElementById('chartPainBars'),
    chartSourceBars: document.getElementById('chartSourceBars'),
    chartKzNiches: document.getElementById('chartKzNiches'),
    crmFunnelContainer: document.getElementById('crmFunnelContainer'),

    // Header actions
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    btnRefreshData: document.getElementById('btnRefreshData'),
    exportDropdown: document.getElementById('exportDropdown'),
    btnExportMenu: document.getElementById('btnExportMenu'),
    btnExportFiltered: document.getElementById('btnExportFiltered'),

    // Drawer
    leadDrawer: document.getElementById('leadDrawer'),
    drawerOverlay: document.getElementById('drawerOverlay'),
    btnDrawerClose: document.getElementById('btnDrawerClose'),
    drawerScoreBadge: document.getElementById('drawerScoreBadge'),
    drawerCompany: document.getElementById('drawerCompany'),
    drawerTitle: document.getElementById('drawerTitle'),
    drawerSource: document.getElementById('drawerSource'),
    drawerCategory: document.getElementById('drawerCategory'),
    drawerSalary: document.getElementById('drawerSalary'),
    drawerContactVal: document.getElementById('drawerContactVal'),
    drawerActionButtons: document.getElementById('drawerActionButtons'),
    drawerStatusSelect: document.getElementById('drawerStatusSelect'),
    drawerNotes: document.getElementById('drawerNotes'),
    notesSavedTag: document.getElementById('notesSavedTag'),
    drawerTgPitchText: document.getElementById('drawerTgPitchText'),
    drawerEmailPitchText: document.getElementById('drawerEmailPitchText'),
    btnCopyTgPitch: document.getElementById('btnCopyTgPitch'),
    btnCopyEmailPitch: document.getElementById('btnCopyEmailPitch'),
    btnOpenMailClient: document.getElementById('btnOpenMailClient'),
    btnPrevLead: document.getElementById('btnPrevLead'),
    btnNextLead: document.getElementById('btnNextLead'),
    drawerNavIndex: document.getElementById('drawerNavIndex'),

    // Toast
    toastContainer: document.getElementById('toastContainer'),
  };

  // Initialize
  async function init() {
    applyTheme(state.theme);
    applyViewMode(state.viewMode);
    attachEventListeners();
    await loadAllData();
  }

  // Load All Data from API (with automatic static JSON fallback for GitHub Pages)
  async function loadAllData() {
    showToast('Синхронизация базы данных...', 'info');
    let loaded = false;

    // Check if running on GitHub Pages or static host
    const isStaticHost =
      window.location.hostname.includes('github.io') ||
      window.location.protocol === 'file:' ||
      !window.location.port;

    if (!isStaticHost) {
      try {
        const [leadsRes, kzRes, digestRes, crmRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/companies'),
          fetch('/api/digest'),
          fetch('/api/crm'),
        ]);

        if (leadsRes.ok) {
          state.ragLeads = await leadsRes.json();
          loaded = true;
        }
        if (kzRes && kzRes.ok) state.kzCompanies = await kzRes.json();
        if (digestRes && digestRes.ok) state.digestItems = await digestRes.json();
        if (crmRes && crmRes.ok) state.crmStatus = await crmRes.json();
      } catch (e) {
        console.warn('API недоступно, переключаемся на статические JSON-файлы (GitHub Pages mode):', e);
      }
    }

    if (!loaded) {
      try {
        const [leadsRes, kzRes, digestRes] = await Promise.all([
          fetch('./data/leads.json'),
          fetch('./data/companies.json'),
          fetch('./data/digest.json'),
        ]);

        if (leadsRes.ok) state.ragLeads = await leadsRes.json();
        if (kzRes.ok) state.kzCompanies = await kzRes.json();
        if (digestRes.ok) state.digestItems = await digestRes.json();

        try {
          const localCrm = localStorage.getItem('rag_crm_status');
          if (localCrm) state.crmStatus = JSON.parse(localCrm);
        } catch (e) {}
      } catch (staticErr) {
        console.error('Ошибка загрузки статических данных:', staticErr);
        showToast('Не удалось загрузить данные.', 'error');
        return;
      }
    }

    updateKpiSummary();
    renderCurrentView();
    showToast('База данных успешно загружена!', 'success');
  }

  // KPI Summary calculation
  function updateKpiSummary() {
    el.badgeRagCount.textContent = state.ragLeads.length;
    el.badgeKzCount.textContent = state.kzCompanies.length;

    if (state.activeTab === 'rag') {
      const total = state.ragLeads.length;
      const hot = state.ragLeads.filter((l) => (l.rag_score || 0) >= 8).length;
      const contacts = state.ragLeads.filter((l) => l.contact && l.contact.trim() !== '').length;

      let inProgress = 0;
      for (const lead of state.ragLeads) {
        const id = lead.id || lead.company;
        const st = (state.crmStatus[id] && state.crmStatus[id].status) || 'new';
        if (st === 'sent' || st === 'in_progress' || st === 'call') inProgress++;
      }

      el.kpiTotalVal.textContent = total;
      el.kpiTotalSub.textContent = 'RAG-лидов в базе';
      el.kpiHotVal.textContent = hot;
      el.kpiContactsVal.textContent = contacts;
      el.kpiOutreachVal.textContent = inProgress;
    } else if (state.activeTab === 'kz') {
      const total = state.kzCompanies.length;
      const withWa = state.kzCompanies.filter((c) => c.whatsapp && c.whatsapp.trim() !== '').length;
      const withWeb = state.kzCompanies.filter((c) => c.website && c.website.trim() !== '').length;

      el.kpiTotalVal.textContent = total;
      el.kpiTotalSub.textContent = 'компаний в Казахстане';
      el.kpiHotVal.textContent = withWa;
      el.kpiContactsVal.textContent = withWa;
      el.kpiOutreachVal.textContent = withWeb;
    }
  }

  // Filter & Search Logic for RAG Leads
  function getFilteredRagLeads() {
    const q = state.filters.search.toLowerCase().trim();
    const score = state.filters.ragScore;
    const pain = state.filters.ragPain;
    const src = state.filters.ragSource;
    const status = state.filters.ragStatus;
    const onlyContacts = state.filters.ragOnlyContacts;

    let list = state.ragLeads.filter((item) => {
      // Search
      if (q) {
        const fullSearchString = [
          item.company || '',
          item.title || '',
          item.category || '',
          item.contact || '',
          item.source || '',
          item.tg_pitch || '',
        ].join(' ').toLowerCase();

        const words = q.split(/\s+/);
        const matchesAll = words.every((w) => fullSearchString.includes(w));
        if (!matchesAll) return false;
      }

      // Score
      if (score !== 'all') {
        const sc = item.rag_score || 0;
        if (score === '10' && sc !== 10) return false;
        if (score === '9' && sc !== 9) return false;
        if (score === '8' && sc !== 8) return false;
        if (score === '7' && sc !== 7) return false;
        if (score === '6' && sc !== 6) return false;
        if (score === '4-5' && (sc > 5 || sc < 4)) return false;
      }

      // Pain
      if (pain !== 'all') {
        const cat = (item.category || '').toLowerCase();
        if (pain === 'support' && !cat.includes('саппорт') && !cat.includes('поддержк')) return false;
        if (pain === 'knowledge' && !cat.includes('документ') && !cat.includes('баз') && !cat.includes('notion')) return false;
        if (pain === 'onboarding' && !cat.includes('онбординг') && !cat.includes('обучен')) return false;
        if (pain === 'legal' && !cat.includes('договор')) return false;
      }

      // Source
      if (src !== 'all') {
        const s = (item.source || '').toLowerCase();
        if (src === 'telegram' && !s.includes('telegram')) return false;
        if (src === 'habr' && !s.includes('хабр')) return false;
        if (src === 'hh' && !s.includes('hh') && !s.includes('headhunter')) return false;
      }

      // Status
      if (status !== 'all') {
        const leadStatus = (state.crmStatus[item.id] && state.crmStatus[item.id].status) || 'new';
        if (leadStatus !== status) return false;
      }

      // Only Contacts
      if (onlyContacts) {
        if (!item.contact || item.contact.trim() === '') return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      let valA, valB;
      if (state.sort.column === 'score') {
        valA = a.rag_score || 0;
        valB = b.rag_score || 0;
        return state.sort.dir === 'desc' ? valB - valA : valA - valB;
      } else if (state.sort.column === 'company') {
        valA = (a.company || '').toLowerCase();
        valB = (b.company || '').toLowerCase();
        return state.sort.dir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      return 0;
    });

    return list;
  }

  // Filter & Search Logic for KZ Companies
  function getFilteredKzCompanies() {
    const q = state.filters.search.toLowerCase().trim();
    const niche = state.filters.kzNiche;
    const city = state.filters.kzCity;
    const onlyWa = state.filters.kzOnlyWhatsApp;
    const onlyWeb = state.filters.kzOnlyWebsite;

    let list = state.kzCompanies.filter((item) => {
      if (q) {
        const fullSearchString = [
          item.company || '',
          item.niche || '',
          item.city || '',
          item.phone || '',
          item.whatsapp || '',
          item.email || '',
          item.website || '',
          item.address || '',
        ].join(' ').toLowerCase();

        const words = q.split(/\s+/);
        const matchesAll = words.every((w) => fullSearchString.includes(w));
        if (!matchesAll) return false;
      }

      if (niche !== 'all') {
        const n = (item.niche || '').toLowerCase();
        if (niche === 'med' && !n.includes('медицин')) return false;
        if (niche === 'ecom' && !n.includes('коммерц') && !n.includes('ритейл')) return false;
        if (niche === 'estate' && !n.includes('недвижим')) return false;
        if (niche === 'legal' && !n.includes('юридическ') && !n.includes('бухгалтер')) return false;
        if (niche === 'it' && !n.includes('it') && !n.includes('digital')) return false;
        if (niche === 'build' && !n.includes('производств') && !n.includes('строительств')) return false;
      }

      if (city !== 'all') {
        const c = (item.city || '').toLowerCase();
        if (!c.includes(city.toLowerCase())) return false;
      }

      if (onlyWa && (!item.whatsapp || item.whatsapp.trim() === '')) return false;
      if (onlyWeb && (!item.website || item.website.trim() === '')) return false;

      return true;
    });

    list.sort((a, b) => {
      const valA = (a.company || '').toLowerCase();
      const valB = (b.company || '').toLowerCase();
      return state.sort.dir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
    });

    return list;
  }

  // Render current view depending on active tab
  function renderCurrentView() {
    updateActiveFilterTags();

    if (state.activeTab === 'rag') {
      const filtered = getFilteredRagLeads();
      state.filteredList = filtered;
      el.resultsCount.textContent = `Показано: ${filtered.length} из ${state.ragLeads.length}`;

      if (filtered.length === 0) {
        el.ragEmptyState.style.display = 'block';
        el.ragTableView.style.display = 'none';
        el.ragGridView.style.display = 'none';
      } else {
        el.ragEmptyState.style.display = 'none';
        if (state.viewMode === 'table') {
          el.ragTableView.style.display = 'block';
          el.ragGridView.style.display = 'none';
          renderRagTable(filtered);
        } else {
          el.ragTableView.style.display = 'none';
          el.ragGridView.style.display = 'grid';
          renderRagGrid(filtered);
        }
      }
    } else if (state.activeTab === 'kz') {
      const filtered = getFilteredKzCompanies();
      state.filteredList = filtered;
      el.resultsCount.textContent = `Показано: ${filtered.length} из ${state.kzCompanies.length}`;

      if (filtered.length === 0) {
        el.kzEmptyState.style.display = 'block';
        el.kzTableView.style.display = 'none';
        el.kzGridView.style.display = 'none';
      } else {
        el.kzEmptyState.style.display = 'none';
        if (state.viewMode === 'table') {
          el.kzTableView.style.display = 'block';
          el.kzGridView.style.display = 'none';
          renderKzTable(filtered);
        } else {
          el.kzTableView.style.display = 'none';
          el.kzGridView.style.display = 'grid';
          renderKzGrid(filtered);
        }
      }
    } else if (state.activeTab === 'digest') {
      renderDigest();
    } else if (state.activeTab === 'analytics') {
      renderAnalytics();
    }
  }

  // Render RAG Table
  function renderRagTable(leads) {
    el.tbodyRag.innerHTML = '';
    const fragment = document.createDocumentFragment();

    leads.forEach((lead, index) => {
      const tr = document.createElement('tr');
      tr.className = 'lead-row';
      tr.setAttribute('data-id', lead.id);

      const score = lead.rag_score || 5;
      let scoreClass = 'score-base';
      if (score === 10) scoreClass = 'score-10';
      else if (score === 9) scoreClass = 'score-9';
      else if (score === 8) scoreClass = 'score-8';
      else if (score === 7) scoreClass = 'score-7';

      // Pain class
      const painText = lead.category || 'Потенциал внедрения';
      let painClass = 'pain-support';
      if (painText.includes('документ') || painText.includes('Notion') || painText.includes('Confluence')) {
        painClass = 'pain-knowledge';
      } else if (painText.includes('онбординг')) {
        painClass = 'pain-onboarding';
      } else if (painText.includes('договор')) {
        painClass = 'pain-legal';
      }

      // Contact link
      let contactHtml = '<span class="contact-none">В вакансии</span>';
      if (lead.contact && lead.contact.startsWith('@')) {
        const handle = lead.contact.replace('@', '');
        contactHtml = `<a href="https://t.me/${handle}" target="_blank" class="contact-tag contact-tg" onclick="event.stopPropagation()">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
          <span>${escapeHtml(lead.contact)}</span>
        </a>`;
      } else if (lead.contact) {
        contactHtml = `<span class="contact-tag">${escapeHtml(lead.contact)}</span>`;
      }

      // CRM Status
      const currentStatus = (state.crmStatus[lead.id] && state.crmStatus[lead.id].status) || 'new';
      const statusLabels = {
        new: '⚪ Новый',
        in_progress: '🟡 В работе',
        sent: '🔵 Отправлен',
        call: '🟢 Созвон',
        reject: '🔴 Отказ',
      };
      const statusHtml = `<span class="status-pill status-${currentStatus}">${statusLabels[currentStatus] || 'Новый'}</span>`;

      tr.innerHTML = `
        <td class="col-center text-muted">${index + 1}</td>
        <td class="col-center">
          <span class="score-badge ${scoreClass}">⭐ ${score}</span>
        </td>
        <td>
          <div class="company-cell">
            <span class="company-name">${escapeHtml(lead.company || 'Компания')}</span>
            ${lead.url ? `<a href="${escapeHtml(lead.url)}" target="_blank" class="company-link" onclick="event.stopPropagation()">Открыть источник ↗</a>` : ''}
          </div>
        </td>
        <td>
          <span class="text-main font-medium">${escapeHtml(lead.title || 'Позиция не указана')}</span>
          ${lead.salary ? `<br><span class="text-muted text-xs">${escapeHtml(lead.salary)}</span>` : ''}
        </td>
        <td>
          <span class="pain-pill ${painClass}">${escapeHtml(painText)}</span>
        </td>
        <td>
          <span class="text-secondary text-xs">${escapeHtml(lead.source || 'Каталог')}</span>
        </td>
        <td>${contactHtml}</td>
        <td class="col-center">${statusHtml}</td>
        <td class="col-center">
          <div class="row-actions-group">
            <button class="action-btn-sm btn-copy-tg" title="Скопировать питч для Telegram" data-id="${lead.id}" onclick="window.app.copyLeadPitch(event, '${lead.id}', 'tg')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
            </button>
            <button class="action-btn-sm btn-copy-email" title="Скопировать письмо Email" data-id="${lead.id}" onclick="window.app.copyLeadPitch(event, '${lead.id}', 'email')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </button>
            <button class="action-btn-sm" title="Открыть карточку" onclick="window.app.openLeadDrawer('${lead.id}')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
          </div>
        </td>
      `;

      tr.addEventListener('click', () => openLeadDrawer(lead.id));
      fragment.appendChild(tr);
    });

    el.tbodyRag.appendChild(fragment);
  }

  // Render RAG Grid (Cards)
  function renderRagGrid(leads) {
    el.ragGridView.innerHTML = '';
    const fragment = document.createDocumentFragment();

    leads.forEach((lead) => {
      const card = document.createElement('div');
      card.className = 'lead-card';
      card.setAttribute('data-id', lead.id);

      const score = lead.rag_score || 5;
      let scoreClass = score >= 8 ? 'score-10' : score >= 6 ? 'score-8' : 'score-base';

      card.innerHTML = `
        <div>
          <div class="card-top-row">
            <div>
              <h3 class="card-company-title">${escapeHtml(lead.company || 'Компания')}</h3>
              <div class="card-role">${escapeHtml(lead.title || 'Позиция не указана')}</div>
            </div>
            <span class="score-badge ${scoreClass}">⭐ ${score}</span>
          </div>
          <div style="margin: 8px 0;">
            <span class="pain-pill pain-support">${escapeHtml(lead.category || 'Боль бизнеса')}</span>
          </div>
          <div class="card-pitch-snippet">
            ${escapeHtml(lead.tg_pitch || lead.email_pitch || 'Питч не сгенерирован')}
          </div>
        </div>
        <div class="card-footer">
          <span class="text-xs text-muted">${escapeHtml(lead.source || '')}</span>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-secondary" onclick="window.app.copyLeadPitch(event, '${lead.id}', 'tg')">Питч TG</button>
            <button class="btn btn-sm btn-primary" onclick="window.app.openLeadDrawer('${lead.id}')">Открыть</button>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openLeadDrawer(lead.id));
      fragment.appendChild(card);
    });

    el.ragGridView.appendChild(fragment);
  }

  // Render KZ Table
  function renderKzTable(companies) {
    el.tbodyKz.innerHTML = '';
    const fragment = document.createDocumentFragment();

    companies.forEach((c, index) => {
      const tr = document.createElement('tr');
      tr.className = 'lead-row';

      // WhatsApp Button
      let waHtml = '<span class="text-muted text-xs">-</span>';
      if (c.whatsapp && c.whatsapp.trim() !== '') {
        const cleanWa = c.whatsapp.replace(/\D/g, '');
        waHtml = `<a href="https://wa.me/${cleanWa}" target="_blank" class="contact-tag contact-wa" onclick="event.stopPropagation()">
          <span>WhatsApp ↗</span>
        </a>`;
      }

      // Phone link
      let phoneHtml = escapeHtml(c.phone || '-');
      if (c.phone) {
        const telNumber = c.phone.replace(/[^\d+]/g, '');
        phoneHtml = `<a href="tel:${telNumber}" class="company-link" onclick="event.stopPropagation()">${escapeHtml(c.phone)}</a>`;
      }

      // Website link
      let webHtml = '<span class="text-muted text-xs">-</span>';
      if (c.website && c.website.trim() !== '') {
        let url = c.website;
        if (!url.startsWith('http')) url = 'https://' + url;
        webHtml = `<a href="${escapeHtml(url)}" target="_blank" class="company-link" onclick="event.stopPropagation()">${escapeHtml(c.website)} ↗</a>`;
      }

      tr.innerHTML = `
        <td class="col-center text-muted">${index + 1}</td>
        <td>
          <span class="company-name">${escapeHtml(c.company || 'Компания')}</span>
        </td>
        <td>
          <span class="pain-pill pain-knowledge">${escapeHtml(c.niche || 'Сфера')}</span>
        </td>
        <td>
          <span class="text-secondary font-medium">${escapeHtml(c.city || 'Казахстан')}</span>
        </td>
        <td>${phoneHtml}</td>
        <td class="col-center">${waHtml}</td>
        <td>
          <span class="text-secondary text-xs">${escapeHtml(c.email || '-')}</span>
        </td>
        <td>${webHtml}</td>
        <td>
          <span class="text-muted text-xs">${escapeHtml(c.address || '-')}</span>
        </td>
        <td class="col-center">
          <div class="row-actions-group">
            <button class="btn btn-sm btn-secondary" onclick="window.app.copyText(event, '${escapeHtml(c.phone || '')}', 'Телефон')">Тел</button>
            ${c.whatsapp ? `<a href="https://wa.me/${c.whatsapp.replace(/\D/g, '')}" target="_blank" class="btn btn-sm btn-primary" onclick="event.stopPropagation()">Чат</a>` : ''}
          </div>
        </td>
      `;

      fragment.appendChild(tr);
    });

    el.tbodyKz.appendChild(fragment);
  }

  // Render KZ Grid
  function renderKzGrid(companies) {
    el.kzGridView.innerHTML = '';
    const fragment = document.createDocumentFragment();

    companies.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'lead-card';

      card.innerHTML = `
        <div>
          <div class="card-top-row">
            <div>
              <h3 class="card-company-title">${escapeHtml(c.company || 'Компания')}</h3>
              <div class="card-role">${escapeHtml(c.city || 'Казахстан')}</div>
            </div>
            <span class="pain-pill pain-knowledge">${escapeHtml(c.niche || 'Ниша')}</span>
          </div>
          <div style="margin-top: 10px; font-size: 13px; display: flex; flex-direction: column; gap: 4px;">
            <div><strong>Тел:</strong> ${escapeHtml(c.phone || 'Не указан')}</div>
            <div><strong>WhatsApp:</strong> ${escapeHtml(c.whatsapp || 'Не указан')}</div>
            <div><strong>Адрес:</strong> ${escapeHtml(c.address || '-')}</div>
          </div>
        </div>
        <div class="card-footer">
          <span class="text-xs text-muted">${escapeHtml(c.source || '')}</span>
          <div style="display: flex; gap: 8px;">
            ${c.whatsapp ? `<a href="https://wa.me/${c.whatsapp.replace(/\D/g, '')}" target="_blank" class="btn btn-sm btn-primary">WhatsApp</a>` : ''}
            ${c.website ? `<a href="${c.website.startsWith('http') ? c.website : 'https://' + c.website}" target="_blank" class="btn btn-sm btn-secondary">Сайт</a>` : ''}
          </div>
        </div>
      `;

      fragment.appendChild(card);
    });

    el.kzGridView.appendChild(fragment);
  }

  // Render Digest
  function renderDigest() {
    el.digestContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const topLeads = state.ragLeads.filter((l) => (l.rag_score || 0) === 10).slice(0, 10);

    topLeads.forEach((lead, i) => {
      const card = document.createElement('div');
      card.className = 'digest-card';

      const handle = lead.contact && lead.contact.startsWith('@') ? lead.contact.replace('@', '') : null;

      card.innerHTML = `
        <div class="digest-card-top">
          <div class="digest-title-row">
            <span class="score-badge score-10">⭐ 10/10</span>
            <div>
              <h3 style="font-size: 17px; font-weight: 800; color: var(--text-main);">${i + 1}. ${escapeHtml(lead.company || 'Компания')}</h3>
              <span class="text-secondary text-xs">${escapeHtml(lead.title || 'Позиция')}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="pain-pill pain-support">${escapeHtml(lead.category || 'Боль')}</span>
            ${handle ? `<a href="https://t.me/${handle}" target="_blank" class="btn btn-sm btn-primary">Диалог в Telegram</a>` : ''}
          </div>
        </div>

        <div style="background: var(--bg-surface-elevated); border-radius: var(--radius-sm); padding: 12px; font-size: 13px;">
          <div><strong>Источник:</strong> ${escapeHtml(lead.source || '')} &bull; <strong>Контакт:</strong> ${escapeHtml(lead.contact || 'В объявлении')}</div>
          ${lead.url ? `<div style="margin-top: 4px;"><a href="${escapeHtml(lead.url)}" target="_blank" class="company-link">Перейти к публикации ↗</a></div>` : ''}
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Готовый питч для аутрича:</span>
            <button class="btn btn-sm btn-secondary" onclick="window.app.copyText(event, ${JSON.stringify(lead.tg_pitch || '')}, 'Питч Telegram')">📋 Скопировать</button>
          </div>
          <pre class="pitch-code-block">${escapeHtml(lead.tg_pitch || 'Питч отсутствует')}</pre>
        </div>
      `;

      fragment.appendChild(card);
    });

    el.digestContainer.appendChild(fragment);
  }

  // Render Analytics View
  function renderAnalytics() {
    // 1. Scores chart
    const scoreCounts = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0 };
    state.ragLeads.forEach((l) => {
      const s = l.rag_score || 5;
      if (scoreCounts[s] !== undefined) scoreCounts[s]++;
    });

    el.chartScoreBars.innerHTML = '';
    const maxScoreVal = Math.max(...Object.values(scoreCounts), 1);
    [10, 9, 8, 7, 6, 5, 4].forEach((s) => {
      const cnt = scoreCounts[s] || 0;
      const pct = Math.round((cnt / maxScoreVal) * 100);
      const color = s >= 9 ? 'var(--accent-amber)' : s >= 7 ? 'var(--accent-cyan)' : 'var(--accent-indigo)';

      const row = document.createElement('div');
      row.className = 'chart-bar-row';
      row.innerHTML = `
        <div class="bar-meta">
          <span class="bar-label">⭐ Приоритет ${s}/10</span>
          <span class="bar-val">${cnt} лидов</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%; background: ${color};"></div>
        </div>
      `;
      el.chartScoreBars.appendChild(row);
    });

    // 2. Pain categories
    const painCounts = {
      'Перегрузка саппорта': 0,
      'Хаос в документах / Notion': 0,
      'Онбординг новичков': 0,
      'Поиск по договорам': 0,
    };
    state.ragLeads.forEach((l) => {
      const c = (l.category || '').toLowerCase();
      if (c.includes('саппорт') || c.includes('поддержк')) painCounts['Перегрузка саппорта']++;
      else if (c.includes('документ') || c.includes('notion') || c.includes('confluence')) painCounts['Хаос в документах / Notion']++;
      else if (c.includes('онбординг')) painCounts['Онбординг новичков']++;
      else if (c.includes('договор')) painCounts['Поиск по договорам']++;
    });

    el.chartPainBars.innerHTML = '';
    const maxPainVal = Math.max(...Object.values(painCounts), 1);
    Object.entries(painCounts).forEach(([name, cnt]) => {
      const pct = Math.round((cnt / maxPainVal) * 100);
      const row = document.createElement('div');
      row.className = 'chart-bar-row';
      row.innerHTML = `
        <div class="bar-meta">
          <span class="bar-label">${escapeHtml(name)}</span>
          <span class="bar-val">${cnt}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%; background: var(--accent-rose);"></div>
        </div>
      `;
      el.chartPainBars.appendChild(row);
    });

    // 3. Source Breakdown
    const srcCounts = { Telegram: 0, 'Хабр Карьера': 0, HeadHunter: 0 };
    state.ragLeads.forEach((l) => {
      const s = (l.source || '').toLowerCase();
      if (s.includes('telegram')) srcCounts['Telegram']++;
      else if (s.includes('хабр')) srcCounts['Хабр Карьера']++;
      else if (s.includes('hh')) srcCounts['HeadHunter']++;
    });

    el.chartSourceBars.innerHTML = '';
    const maxSrcVal = Math.max(...Object.values(srcCounts), 1);
    Object.entries(srcCounts).forEach(([name, cnt]) => {
      const pct = Math.round((cnt / maxSrcVal) * 100);
      const row = document.createElement('div');
      row.className = 'chart-bar-row';
      row.innerHTML = `
        <div class="bar-meta">
          <span class="bar-label">${escapeHtml(name)}</span>
          <span class="bar-val">${cnt} лидов</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%; background: var(--accent-cyan);"></div>
        </div>
      `;
      el.chartSourceBars.appendChild(row);
    });

    // 4. KZ Niches
    const nicheCounts = {};
    state.kzCompanies.forEach((c) => {
      const n = c.niche || 'Другое';
      nicheCounts[n] = (nicheCounts[n] || 0) + 1;
    });

    el.chartKzNiches.innerHTML = '';
    const maxNicheVal = Math.max(...Object.values(nicheCounts), 1);
    Object.entries(nicheCounts).forEach(([name, cnt]) => {
      const pct = Math.round((cnt / maxNicheVal) * 100);
      const row = document.createElement('div');
      row.className = 'chart-bar-row';
      row.innerHTML = `
        <div class="bar-meta">
          <span class="bar-label">${escapeHtml(name)}</span>
          <span class="bar-val">${cnt}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%; background: var(--accent-emerald);"></div>
        </div>
      `;
      el.chartKzNiches.appendChild(row);
    });

    // 5. CRM Funnel
    const funnel = { new: 0, in_progress: 0, sent: 0, call: 0, reject: 0 };
    state.ragLeads.forEach((l) => {
      const st = (state.crmStatus[l.id] && state.crmStatus[l.id].status) || 'new';
      if (funnel[st] !== undefined) funnel[st]++;
      else funnel.new++;
    });

    el.crmFunnelContainer.innerHTML = `
      <div class="funnel-step-box">
        <span class="funnel-step-num" style="color: #cbd5e1;">${funnel.new}</span>
        <span class="funnel-step-name">⚪ Новые</span>
      </div>
      <div class="funnel-step-box">
        <span class="funnel-step-num" style="color: var(--accent-amber);">${funnel.in_progress}</span>
        <span class="funnel-step-name">🟡 В работе</span>
      </div>
      <div class="funnel-step-box">
        <span class="funnel-step-num" style="color: var(--accent-indigo);">${funnel.sent}</span>
        <span class="funnel-step-name">🔵 Питч отправлен</span>
      </div>
      <div class="funnel-step-box">
        <span class="funnel-step-num" style="color: var(--accent-emerald);">${funnel.call}</span>
        <span class="funnel-step-name">🟢 Созвон назначен</span>
      </div>
      <div class="funnel-step-box">
        <span class="funnel-step-num" style="color: var(--accent-rose);">${funnel.reject}</span>
        <span class="funnel-step-name">🔴 Отказ</span>
      </div>
    `;
  }

  // Open Lead Drawer (Inspector)
  function openLeadDrawer(leadId) {
    const list = state.filteredList;
    const index = list.findIndex((l) => l.id === leadId);
    if (index === -1) return;

    state.currentLead = list[index];
    state.currentLeadIndex = index;

    const lead = state.currentLead;

    // Fill metadata
    el.drawerScoreBadge.textContent = `⭐ ${lead.rag_score || 5}/10`;
    el.drawerCompany.textContent = lead.company || 'Компания';
    el.drawerTitle.textContent = lead.title || 'Позиция не указана';
    el.drawerSource.textContent = lead.source || '-';
    el.drawerCategory.textContent = lead.category || '-';
    el.drawerSalary.textContent = lead.salary || 'Не указана';
    el.drawerContactVal.textContent = lead.contact || 'В публикации';

    // Navigation index
    el.drawerNavIndex.textContent = `${index + 1} из ${list.length}`;
    el.btnPrevLead.disabled = index === 0;
    el.btnNextLead.disabled = index === list.length - 1;

    // Direct Action buttons
    el.drawerActionButtons.innerHTML = '';
    if (lead.contact && lead.contact.startsWith('@')) {
      const handle = lead.contact.replace('@', '');
      const btnTg = document.createElement('a');
      btnTg.href = `https://t.me/${handle}`;
      btnTg.target = '_blank';
      btnTg.className = 'btn btn-tg-action';
      btnTg.innerHTML = `💬 Написать @${handle} в Telegram`;
      el.drawerActionButtons.appendChild(btnTg);
    }
    if (lead.url) {
      const btnUrl = document.createElement('a');
      btnUrl.href = lead.url;
      btnUrl.target = '_blank';
      btnUrl.className = 'btn btn-outline';
      btnUrl.innerHTML = `🔗 Открыть публикацию ↗`;
      el.drawerActionButtons.appendChild(btnUrl);
    }

    // CRM status & notes
    const crmRecord = state.crmStatus[lead.id] || { status: 'new', notes: '' };
    el.drawerStatusSelect.value = crmRecord.status || 'new';
    el.drawerNotes.value = crmRecord.notes || '';

    // Pitches
    el.drawerTgPitchText.textContent = lead.tg_pitch || 'Питч не сформирован.';
    el.drawerEmailPitchText.textContent = lead.email_pitch || 'Письмо не сформировано.';

    // Email client button
    const emailSubject = encodeURIComponent(`Сотрудничество: оптимизация регламентов и базы знаний в ${lead.company || ''}`);
    const emailBody = encodeURIComponent(lead.email_pitch || '');
    el.btnOpenMailClient.href = `mailto:?subject=${emailSubject}&body=${emailBody}`;

    // Show drawer
    el.leadDrawer.classList.add('open');
    el.drawerOverlay.classList.add('open');
  }

  function closeLeadDrawer() {
    el.leadDrawer.classList.remove('open');
    el.drawerOverlay.classList.remove('open');
    state.currentLead = null;
  }

  // Update CRM record on server and memory
  async function saveCrmUpdate(leadId, status, notes) {
    if (!state.crmStatus[leadId]) {
      state.crmStatus[leadId] = {};
    }
    state.crmStatus[leadId].status = status;
    state.crmStatus[leadId].notes = notes;
    state.crmStatus[leadId].updated_at = new Date().toISOString();

    // Show indicator
    el.notesSavedTag.classList.add('visible');
    setTimeout(() => el.notesSavedTag.classList.remove('visible'), 1200);

    // Save to localStorage for GitHub Pages / offline persistence
    try {
      localStorage.setItem('rag_crm_status', JSON.stringify(state.crmStatus));
    } catch (e) {}

    try {
      await fetch('/api/crm/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, status, notes }),
      });
      updateKpiSummary();
      renderCurrentView();
    } catch (err) {
      console.warn('API сохранения CRM недоступно (сохранено локально в localStorage):', err);
      updateKpiSummary();
      renderCurrentView();
    }
  }

  // Copy to clipboard helper
  async function copyText(e, text, label) {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      showToast(`✅ ${label || 'Текст'} скопирован в буфер обмена!`, 'success');
    } catch (err) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(`✅ ${label || 'Текст'} скопирован!`, 'success');
    }
  }

  // Copy lead pitch
  function copyLeadPitch(e, leadId, type) {
    if (e && e.stopPropagation) e.stopPropagation();
    const lead = state.ragLeads.find((l) => l.id === leadId);
    if (!lead) return;

    if (type === 'tg') {
      copyText(null, lead.tg_pitch || '', 'Питч для Telegram');
    } else {
      copyText(null, lead.email_pitch || '', 'Письмо для Email');
    }
  }

  // Active filter tags UI
  function updateActiveFilterTags() {
    const tags = [];

    if (state.filters.search) {
      tags.push({ label: `Поиск: "${state.filters.search}"`, key: 'search' });
    }

    if (state.activeTab === 'rag') {
      if (state.filters.ragScore !== 'all') tags.push({ label: `⭐ Приоритет ${state.filters.ragScore}`, key: 'ragScore' });
      if (state.filters.ragPain !== 'all') tags.push({ label: `Боль: ${state.filters.ragPain}`, key: 'ragPain' });
      if (state.filters.ragSource !== 'all') tags.push({ label: `Источник: ${state.filters.ragSource}`, key: 'ragSource' });
      if (state.filters.ragStatus !== 'all') tags.push({ label: `Статус: ${state.filters.ragStatus}`, key: 'ragStatus' });
      if (state.filters.ragOnlyContacts) tags.push({ label: `Только с контактом`, key: 'ragOnlyContacts' });
    } else if (state.activeTab === 'kz') {
      if (state.filters.kzNiche !== 'all') tags.push({ label: `Ниша: ${state.filters.kzNiche}`, key: 'kzNiche' });
      if (state.filters.kzCity !== 'all') tags.push({ label: `Город: ${state.filters.kzCity}`, key: 'kzCity' });
      if (state.filters.kzOnlyWhatsApp) tags.push({ label: `Только WhatsApp`, key: 'kzOnlyWhatsApp' });
      if (state.filters.kzOnlyWebsite) tags.push({ label: `Только Сайт`, key: 'kzOnlyWebsite' });
    }

    if (tags.length > 0) {
      el.activeTagsBar.style.display = 'flex';
      el.activeTagsList.innerHTML = tags
        .map(
          (t) =>
            `<span class="filter-tag">${escapeHtml(t.label)} <button onclick="window.app.removeFilterTag('${t.key}')">✕</button></span>`
        )
        .join('');
    } else {
      el.activeTagsBar.style.display = 'none';
      el.activeTagsList.innerHTML = '';
    }
  }

  function removeFilterTag(key) {
    if (key === 'search') {
      state.filters.search = '';
      el.searchInput.value = '';
      el.btnClearSearch.style.display = 'none';
    } else if (key === 'ragScore') {
      state.filters.ragScore = 'all';
      el.filterScore.value = 'all';
    } else if (key === 'ragPain') {
      state.filters.ragPain = 'all';
      el.filterPain.value = 'all';
    } else if (key === 'ragSource') {
      state.filters.ragSource = 'all';
      el.filterSource.value = 'all';
    } else if (key === 'ragStatus') {
      state.filters.ragStatus = 'all';
      el.filterStatus.value = 'all';
    } else if (key === 'ragOnlyContacts') {
      state.filters.ragOnlyContacts = false;
      el.checkOnlyContacts.checked = false;
    } else if (key === 'kzNiche') {
      state.filters.kzNiche = 'all';
      el.filterKzNiche.value = 'all';
    } else if (key === 'kzCity') {
      state.filters.kzCity = 'all';
      el.filterKzCity.value = 'all';
    } else if (key === 'kzOnlyWhatsApp') {
      state.filters.kzOnlyWhatsApp = false;
      el.checkKzWhatsApp.checked = false;
    } else if (key === 'kzOnlyWebsite') {
      state.filters.kzOnlyWebsite = false;
      el.checkKzWebsite.checked = false;
    }
    renderCurrentView();
  }

  function resetFilters() {
    state.filters.search = '';
    state.filters.ragScore = 'all';
    state.filters.ragPain = 'all';
    state.filters.ragSource = 'all';
    state.filters.ragStatus = 'all';
    state.filters.ragOnlyContacts = false;
    state.filters.kzNiche = 'all';
    state.filters.kzCity = 'all';
    state.filters.kzOnlyWhatsApp = false;
    state.filters.kzOnlyWebsite = false;

    el.searchInput.value = '';
    el.btnClearSearch.style.display = 'none';
    el.filterScore.value = 'all';
    el.filterPain.value = 'all';
    el.filterSource.value = 'all';
    el.filterStatus.value = 'all';
    el.checkOnlyContacts.checked = false;
    el.filterKzNiche.value = 'all';
    el.filterKzCity.value = 'all';
    el.checkKzWhatsApp.checked = false;
    el.checkKzWebsite.checked = false;

    renderCurrentView();
  }

  // Export filtered items to CSV
  function exportFilteredCSV() {
    const list = state.filteredList;
    if (!list || list.length === 0) {
      showToast('Нет данных для экспорта', 'info');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM
    if (state.activeTab === 'rag') {
      csvContent += 'rag_score,company,title,category,source,contact,url,salary,tg_pitch,email_pitch\n';
      list.forEach((l) => {
        const row = [
          l.rag_score || '',
          cleanCsvCell(l.company),
          cleanCsvCell(l.title),
          cleanCsvCell(l.category),
          cleanCsvCell(l.source),
          cleanCsvCell(l.contact),
          cleanCsvCell(l.url),
          cleanCsvCell(l.salary),
          cleanCsvCell(l.tg_pitch),
          cleanCsvCell(l.email_pitch),
        ];
        csvContent += row.join(',') + '\n';
      });
    } else {
      csvContent += 'company,niche,city,phone,whatsapp,email,website,address,source\n';
      list.forEach((c) => {
        const row = [
          cleanCsvCell(c.company),
          cleanCsvCell(c.niche),
          cleanCsvCell(c.city),
          cleanCsvCell(c.phone),
          cleanCsvCell(c.whatsapp),
          cleanCsvCell(c.email),
          cleanCsvCell(c.website),
          cleanCsvCell(c.address),
          cleanCsvCell(c.source),
        ];
        csvContent += row.join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_export_${state.activeTab}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Файл успешно сгенерирован и скачивается!', 'success');
  }

  function cleanCsvCell(val) {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  }

  // Theme & View mode toggles
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rag_theme', theme);
  }

  function applyViewMode(mode) {
    state.viewMode = mode;
    localStorage.setItem('rag_view_mode', mode);
    if (mode === 'table') {
      el.btnViewTable.classList.add('active');
      el.btnViewGrid.classList.remove('active');
    } else {
      el.btnViewTable.classList.remove('active');
      el.btnViewGrid.classList.add('active');
    }
    renderCurrentView();
  }

  // Toast System
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  // Helper Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Attach Event Listeners
  function attachEventListeners() {
    // Tabs
    const switchTab = (tab) => {
      state.activeTab = tab;
      [el.tabBtnRag, el.tabBtnKz, el.tabBtnDigest, el.tabBtnAnalytics].forEach((btn) => btn.classList.remove('active'));
      [el.paneRag, el.paneKz, el.paneDigest, el.paneAnalytics].forEach((pane) => (pane.style.display = 'none'));

      if (tab === 'rag') {
        el.tabBtnRag.classList.add('active');
        el.paneRag.style.display = 'block';
        el.ragFiltersGroup.style.display = 'flex';
        el.kzFiltersGroup.style.display = 'none';
      } else if (tab === 'kz') {
        el.tabBtnKz.classList.add('active');
        el.paneKz.style.display = 'block';
        el.ragFiltersGroup.style.display = 'none';
        el.kzFiltersGroup.style.display = 'flex';
      } else if (tab === 'digest') {
        el.tabBtnDigest.classList.add('active');
        el.paneDigest.style.display = 'block';
      } else if (tab === 'analytics') {
        el.tabBtnAnalytics.classList.add('active');
        el.paneAnalytics.style.display = 'block';
      }

      updateKpiSummary();
      renderCurrentView();
    };

    el.tabBtnRag.addEventListener('click', () => switchTab('rag'));
    el.tabBtnKz.addEventListener('click', () => switchTab('kz'));
    el.tabBtnDigest.addEventListener('click', () => switchTab('digest'));
    el.tabBtnAnalytics.addEventListener('click', () => switchTab('analytics'));

    // KPI Clicks
    el.kpiHot.addEventListener('click', () => {
      if (state.activeTab !== 'rag') switchTab('rag');
      state.filters.ragScore = '10';
      el.filterScore.value = '10';
      renderCurrentView();
    });

    el.kpiContacts.addEventListener('click', () => {
      if (state.activeTab === 'rag') {
        state.filters.ragOnlyContacts = true;
        el.checkOnlyContacts.checked = true;
      } else {
        state.filters.kzOnlyWhatsApp = true;
        el.checkKzWhatsApp.checked = true;
      }
      renderCurrentView();
    });

    // Search Input
    let debounceTimer;
    el.searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.filters.search = e.target.value;
        el.btnClearSearch.style.display = e.target.value ? 'block' : 'none';
        renderCurrentView();
      }, 150);
    });

    el.btnClearSearch.addEventListener('click', () => {
      el.searchInput.value = '';
      state.filters.search = '';
      el.btnClearSearch.style.display = 'none';
      renderCurrentView();
    });

    // RAG Filters
    el.filterScore.addEventListener('change', (e) => {
      state.filters.ragScore = e.target.value;
      renderCurrentView();
    });

    el.filterPain.addEventListener('change', (e) => {
      state.filters.ragPain = e.target.value;
      renderCurrentView();
    });

    el.filterSource.addEventListener('change', (e) => {
      state.filters.ragSource = e.target.value;
      renderCurrentView();
    });

    el.filterStatus.addEventListener('change', (e) => {
      state.filters.ragStatus = e.target.value;
      renderCurrentView();
    });

    el.checkOnlyContacts.addEventListener('change', (e) => {
      state.filters.ragOnlyContacts = e.target.checked;
      renderCurrentView();
    });

    // KZ Filters
    el.filterKzNiche.addEventListener('change', (e) => {
      state.filters.kzNiche = e.target.value;
      renderCurrentView();
    });

    el.filterKzCity.addEventListener('change', (e) => {
      state.filters.kzCity = e.target.value;
      renderCurrentView();
    });

    el.checkKzWhatsApp.addEventListener('change', (e) => {
      state.filters.kzOnlyWhatsApp = e.target.checked;
      renderCurrentView();
    });

    el.checkKzWebsite.addEventListener('change', (e) => {
      state.filters.kzOnlyWebsite = e.target.checked;
      renderCurrentView();
    });

    // Reset filters
    el.btnResetFilters.addEventListener('click', resetFilters);

    // View switcher
    el.btnViewTable.addEventListener('click', () => applyViewMode('table'));
    el.btnViewGrid.addEventListener('click', () => applyViewMode('grid'));

    // Theme toggle
    el.btnThemeToggle.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    // Refresh Data
    el.btnRefreshData.addEventListener('click', loadAllData);

    // Export Dropdown
    el.btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      el.exportDropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      el.exportDropdown.classList.remove('open');
    });

    el.btnExportFiltered.addEventListener('click', exportFilteredCSV);

    // Drawer close
    el.btnDrawerClose.addEventListener('click', closeLeadDrawer);
    el.drawerOverlay.addEventListener('click', closeLeadDrawer);

    // Drawer Navigation
    el.btnPrevLead.addEventListener('click', () => {
      if (state.currentLeadIndex > 0) {
        openLeadDrawer(state.filteredList[state.currentLeadIndex - 1].id);
      }
    });

    el.btnNextLead.addEventListener('click', () => {
      if (state.currentLeadIndex < state.filteredList.length - 1) {
        openLeadDrawer(state.filteredList[state.currentLeadIndex + 1].id);
      }
    });

    // Drawer Status change & Notes saving
    el.drawerStatusSelect.addEventListener('change', (e) => {
      if (state.currentLead) {
        saveCrmUpdate(state.currentLead.id, e.target.value, el.drawerNotes.value);
      }
    });

    let notesTimer;
    el.drawerNotes.addEventListener('input', (e) => {
      clearTimeout(notesTimer);
      notesTimer = setTimeout(() => {
        if (state.currentLead) {
          saveCrmUpdate(state.currentLead.id, el.drawerStatusSelect.value, e.target.value);
        }
      }, 400);
    });

    // Drawer Pitch Copy buttons
    el.btnCopyTgPitch.addEventListener('click', () => {
      if (state.currentLead) {
        copyText(null, state.currentLead.tg_pitch || '', 'Питч Telegram');
      }
    });

    el.btnCopyEmailPitch.addEventListener('click', () => {
      if (state.currentLead) {
        copyText(null, state.currentLead.email_pitch || '', 'Письмо Email');
      }
    });

    // Table Header Sorting
    document.querySelectorAll('.data-table th.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (state.sort.column === col) {
          state.sort.dir = state.sort.dir === 'desc' ? 'asc' : 'desc';
        } else {
          state.sort.column = col;
          state.sort.dir = 'desc';
        }
        renderCurrentView();
      });
    });

    // Keyboard Shortcuts (Esc to close, Arrows to navigate)
    document.addEventListener('keydown', (e) => {
      if (el.leadDrawer.classList.contains('open')) {
        if (e.key === 'Escape') {
          closeLeadDrawer();
        } else if (e.key === 'ArrowLeft' && !e.target.matches('textarea, input')) {
          el.btnPrevLead.click();
        } else if (e.key === 'ArrowRight' && !e.target.matches('textarea, input')) {
          el.btnNextLead.click();
        }
      }
    });
  }

  // Public API exposure for inline event handlers
  window.app = {
    openLeadDrawer,
    copyText,
    copyLeadPitch,
    removeFilterTag,
    resetFilters,
  };

  // Launch
  document.addEventListener('DOMContentLoaded', init);
})();
