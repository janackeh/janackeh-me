/* ============================================================
   Mispick Investigation Demo — rule-based, static, no storage
   ============================================================ */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, '');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- category metadata ---------- */
  const CATEGORIES = {
    'true-mispick': { name: 'True warehouse mispick', desc: 'A different SKU was physically picked and shipped. The received item is not the item that was ordered.' },
    'packaging-change': { name: 'Manufacturer packaging change', desc: 'The correct item was shipped, but the manufacturer updated its packaging or branding. The product itself matches the order.' },
    'vendor-substitution': { name: 'Vendor / manufacturer substitution', desc: 'The manufacturer superseded the original part number with a replacement. The item is functionally equivalent but carries a new part number.' },
    'customer-ordered-wrong': { name: 'Customer ordered the wrong item', desc: 'The listing and the shipped item match the order exactly. The mismatch is between what the customer expected and what they actually ordered.' },
    'listing-error': { name: 'Catalog listing error', desc: 'The product listing itself is inaccurate — images, specifications, or title do not match the actual product. This is a data issue, not a picking or packaging issue.' },
    'variation-confusion': { name: 'Product variation confusion', desc: 'The correct product family was shipped, but a different variant — size, voltage, thread, or finish — was selected. Same family, different specification.' },
    'no-issue': { name: 'No issue found', desc: 'The ordered and received items match on every verified specification. No mispick is indicated by the current evidence.' },
  };

  /* ---------- scenarios (anonymized, illustrative) ---------- */
  const SCENARIOS = [
    {
      id: 's1-motor', title: 'Motor — wrong horsepower',
      category: 'true-mispick',
      customer: 'Marcus', order: 'SO-48217', zoro: 'G1234567',
      ordered: { mfr: 'LEESON C4D17FK29A', desc: '1/2 HP, 115/230V, TEFC, Foot-Mounted Motor', specs: { Voltage: '115/230V', Horsepower: '1/2 HP', Frame: '56C', Enclosure: 'TEFC' } },
      received: { mfr: 'LEESON C4D17FK39C', upc: '7-84591-33902-1', specs: { Voltage: '115/230V', Horsepower: '3/4 HP', Frame: '56C', Enclosure: 'TEFC' } },
      flags: { packagingChanged: false, superseded: false, listingDiscrepancy: false, customerExpectedDiff: false, sameFamilyDiff: false },
      redirect: null,
    },
    {
      id: 's2-gloves', title: 'Gloves — different box',
      category: 'packaging-change',
      customer: 'Dana', order: 'SO-73610', zoro: 'G7654321',
      ordered: { mfr: 'MCR SAFETY NGR100', desc: 'Nitrile Gloves, Powder-Free, Size L, 100/Box', specs: { Material: 'Nitrile', Size: 'Large', Quantity: '100/box', Powder: 'No' } },
      received: { mfr: 'MCR SAFETY NGR100', upc: '0-95521-88100-4', specs: { Material: 'Nitrile', Size: 'Large', Quantity: '100/box', Powder: 'No' } },
      flags: { packagingChanged: true, superseded: false, listingDiscrepancy: false, customerExpectedDiff: false, sameFamilyDiff: false },
      redirect: null,
    },
    {
      id: 's3-filter', title: 'Filter — new part number',
      category: 'vendor-substitution',
      customer: 'Priya', order: 'SO-60954', zoro: 'G2345678',
      ordered: { mfr: 'PARKER 9LPR-50', desc: 'Hydraulic Return-Line Filter Element, 50 Micron', specs: { Micron: '50', Type: 'Return-line', Thread: '1 in NPT', Height: '4.5 in' } },
      received: { mfr: 'PARKER PRB-50', upc: '7-43120-50018-2', specs: { Micron: '50', Type: 'Return-line', Thread: '1 in NPT', Height: '4.5 in' } },
      flags: { packagingChanged: true, superseded: true, listingDiscrepancy: false, customerExpectedDiff: false, sameFamilyDiff: false },
      redirect: { mfr: 'Parker Hannifin', url: 'https://www.parker.com/', note: "Confirm the superseded part number cross-reference on the manufacturer's product page before reordering." },
    },
    {
      id: 's4-heater', title: 'Heater — wrong voltage expected',
      category: 'customer-ordered-wrong',
      customer: 'Tomás', order: 'SO-55823', zoro: 'G3456789',
      ordered: { mfr: 'TPI CORPORATION FSE1504A', desc: 'Electric Unit Heater, 120V, 5000W', specs: { Voltage: '120V', Wattage: '5000W', Mounting: 'Wall/Ceiling', Thermostat: 'Not included' } },
      received: { mfr: 'TPI CORPORATION FSE1504A', upc: '0-68223-51504-7', specs: { Voltage: '120V', Wattage: '5000W', Mounting: 'Wall/Ceiling', Thermostat: 'Not included' } },
      flags: { packagingChanged: false, superseded: false, listingDiscrepancy: false, customerExpectedDiff: true, sameFamilyDiff: false },
      redirect: null,
    },
    {
      id: 's5-bracket', title: 'Bracket — listing says stainless',
      category: 'listing-error',
      customer: 'Aisha', order: 'SO-49201', zoro: 'G4567890',
      ordered: { mfr: 'ERICO CAT500', desc: 'Stainless Steel C-Channel Bracket, 5"', specs: { Material: 'Stainless steel', Length: '5 in', Channel: 'C-channel', Finish: 'Passivated' } },
      received: { mfr: 'ERICO CAT500', upc: '0-79423-50011-3', specs: { Material: 'Zinc-plated steel', Length: '5 in', Channel: 'C-channel', Finish: 'Zinc' } },
      flags: { packagingChanged: false, superseded: false, listingDiscrepancy: true, customerExpectedDiff: false, sameFamilyDiff: false },
      redirect: { mfr: 'nVent ERICO', url: 'https://www.nvent.com/en-us/erico', note: 'Verify the current catalog material specification with the manufacturer before reordering.' },
    },
    {
      id: 's6-insert', title: 'Insert — wrong thread size',
      category: 'variation-confusion',
      customer: 'Lena', order: 'SO-67342', zoro: 'G5678901',
      ordered: { mfr: 'E-Z LOK THC-375-4', desc: 'Threaded Brass Insert, 3/8"-16, for Hard Wood', specs: { Thread: '3/8"-16', Material: 'Brass', Length: '1/2 in', Drill: '5/8 in' } },
      received: { mfr: 'E-Z LOK THC-375-4', upc: '7-81200-43715-9', specs: { Thread: '5/16"-18', Material: 'Brass', Length: '1/2 in', Drill: '5/8 in' } },
      flags: { packagingChanged: false, superseded: false, listingDiscrepancy: false, customerExpectedDiff: false, sameFamilyDiff: true },
      redirect: null,
    },
  ];

  const FLAG_DEFS = [
    { key: 'packagingChanged', label: 'Packaging/branding changed' },
    { key: 'superseded', label: 'Part number superseded' },
    { key: 'listingDiscrepancy', label: 'Listing images/specs inaccurate' },
    { key: 'customerExpectedDiff', label: 'Customer expected different item' },
    { key: 'sameFamilyDiff', label: 'Same family, different variant' },
  ];

  /* ---------- state ---------- */
  const state = {
    scenarioId: SCENARIOS[0].id,
    received: null,      // editable copy
    flags: null,         // editable copy
    emailVer: 'v2',
    notesVer: 'v2',
    emailEdited: { v1: null, v2: null },
    notesEdited: { v1: null, v2: null },
  };
  const gen = {}; // generated outputs cache
  const scenario = () => SCENARIOS.find(s => s.id === state.scenarioId);

  /* ---------- spec comparison ---------- */
  function compareSpecs(ordered, received) {
    const fields = [...new Set([...Object.keys(ordered.specs), ...Object.keys(received.specs)])];
    const rows = fields.map(f => {
      const o = ordered.specs[f], r = received.specs[f];
      let status = 'unknown';
      if (o != null && r != null) status = norm(o) === norm(r) ? 'match' : 'mismatch';
      return { field: f, ordered: o ?? '—', received: r ?? '—', status };
    });
    const matchCount = rows.filter(r => r.status === 'match').length;
    const mismatchCount = rows.filter(r => r.status === 'mismatch').length;
    const unknownCount = rows.filter(r => r.status === 'unknown').length;
    return { rows, matchCount, mismatchCount, unknownCount };
  }

  /* ---------- classification engine (rule-based) ---------- */
  function classify(sc, received, flags) {
    const cmp = compareSpecs(sc.ordered, received);
    const mfrMatch = norm(received.mfr) === norm(sc.ordered.mfr);
    const allMatch = cmp.mismatchCount === 0 && cmp.unknownCount === 0 && cmp.matchCount > 0;
    const path = [];
    const evidence = [];
    const gaps = [];

    path.push({ q: 'Listing itself inaccurate?', on: flags.listingDiscrepancy });
    if (flags.listingDiscrepancy) {
      evidence.push('Listing images/specs disagree with the actual product');
      gaps.push('Confirm with the catalog/content team before correcting the listing');
      return finalize('listing-error', 'medium', sc, received, cmp, path, evidence, gaps);
    }

    path.push({ q: 'Part number superseded?', on: flags.superseded });
    if (flags.superseded) {
      evidence.push('Manufacturer superseded the original part number');
      evidence.push('Functionally equivalent replacement confirmed');
      return finalize('vendor-substitution', 'high', sc, received, cmp, path, evidence, gaps);
    }

    path.push({ q: 'Mfr # matches order?', on: mfrMatch });
    if (!mfrMatch) {
      evidence.push(`Mfr # differs from order (${sc.ordered.mfr} → ${received.mfr})`);
      if (cmp.mismatchCount > 0) evidence.push(`${cmp.mismatchCount} spec(s) also mismatch`);
      return finalize('true-mispick', 'high', sc, received, cmp, path, evidence, gaps);
    }

    evidence.push('Mfr # matches the order exactly');
    path.push({ q: 'All specs match?', on: allMatch });
    if (allMatch) {
      path.push({ q: 'Packaging/branding changed?', on: flags.packagingChanged });
      if (flags.packagingChanged) {
        evidence.push(`All ${cmp.matchCount} verified specs match`);
        evidence.push('Packaging/branding change confirmed');
        gaps.push('Manufacturer release notice not yet reviewed');
        return finalize('packaging-change', 'medium', sc, received, cmp, path, evidence, gaps);
      }
      path.push({ q: 'Customer expected different item?', on: flags.customerExpectedDiff });
      if (flags.customerExpectedDiff) {
        evidence.push('Shipped item matches the order exactly');
        evidence.push('Customer expectation differs from what was ordered');
        return finalize('customer-ordered-wrong', 'medium', sc, received, cmp, path, evidence, gaps);
      }
      evidence.push(`All ${cmp.matchCount} verified specs match`);
      return finalize('no-issue', 'high', sc, received, cmp, path, evidence, gaps);
    }

    // mfr matches, some specs mismatch
    evidence.push(`${cmp.mismatchCount} spec(s) mismatch despite matching Mfr #`);
    path.push({ q: 'Same family, different variant?', on: flags.sameFamilyDiff });
    if (flags.sameFamilyDiff) {
      const diffs = cmp.rows.filter(r => r.status === 'mismatch').map(r => r.field);
      evidence.push(`Different ${diffs.join(', ')} within the same product family`);
      return finalize('variation-confusion', 'high', sc, received, cmp, path, evidence, gaps);
    }
    gaps.push('Spec mismatch is unexplained — verify listing accuracy');
    return finalize('listing-error', 'medium', sc, received, cmp, path, evidence, gaps);
  }

  function finalize(category, level, sc, received, cmp, path, evidence, gaps) {
    return { category, level, evidence, gaps, path, cmp, mfrMatch: norm(received.mfr) === norm(sc.ordered.mfr) };
  }

  /* ---------- output generators ---------- */
  function emailV1(sc, cls, received) {
    const C = CATEGORIES[cls.category];
    const c = sc.customer;
    switch (cls.category) {
      case 'true-mispick': return `Hi ${c}, thanks for reaching out about order ${sc.order}. It looks like you received the wrong motor — a 3/4 HP unit instead of the 1/2 HP you ordered. I'm sorry about that. I'll get a replacement sent out for the correct item and arrange a return for the wrong one.`;
      case 'packaging-change': return `Hi ${c}, thanks for your message about order ${sc.order}. I checked and the gloves you received are the correct item — same part number and specs. The box looks different because the manufacturer updated their packaging. You got the right product.`;
      case 'vendor-substitution': return `Hi ${c}, thanks for reaching out about order ${sc.order}. The manufacturer replaced the original filter part number with a new equivalent one, which is what you received. It's the same 50 micron return-line filter. Let me know if you'd like more detail.`;
      case 'customer-ordered-wrong': return `Hi ${c}, thanks for your message about order ${sc.order}. I checked the order and listing — the 120V heater you received is exactly what was ordered and matches the listing. It looks like a 240V unit may have been intended. I can help with a return if the voltage doesn't work for you.`;
      case 'listing-error': return `Hi ${c}, thanks for flagging order ${sc.order}. You're right — the bracket you received is zinc-plated, not stainless steel as the listing shows. That's an error in our listing. I'm sorry for the confusion and will get this corrected.`;
      case 'variation-confusion': return `Hi ${c}, thanks for reaching out about order ${sc.order}. The threaded insert you received is a 5/16"-18 size, not the 3/8"-16 you ordered. I'm sorry — looks like the wrong variant was sent. I'll send the correct one and arrange a return.`;
      default: return `Hi ${c}, thanks for your message about order ${sc.order}. Based on my review, the item you received matches the order. Let me know what specifically looks off and I'll dig in further.`;
    }
  }
  function emailV2(sc, cls, received) {
    const C = CATEGORIES[cls.category];
    const c = sc.customer;
    const sig = `\n\nThanks for your patience,\nJanackeh Blackwell\nCustomer Support`;
    switch (cls.category) {
      case 'true-mispick': return `Hi ${c},\n\nThanks for letting me know about order ${sc.order}. I verified the part numbers and you're right — the wrong motor shipped. You received a 3/4 HP unit (LEESON C4D17FK39C) instead of the 1/2 HP model you ordered (LEESON C4D17FK29A).\n\nHere's what I'm doing now:\n• A replacement 1/2 HP motor (catalog #${sc.zoro}) is being shipped at no cost.\n• A prepaid return label for the wrong unit is on its way.\n\nYou shouldn't have to lift a finger on this one.${sig}`;
      case 'packaging-change': return `Hi ${c},\n\nThanks for checking in on order ${sc.order}. Good news — the gloves you received are the correct item. I confirmed the manufacturer part number (MCR SAFETY NGR100), size, quantity, and material all match your order. The box looks different because MCR Safety updated their packaging recently, but the product inside is exactly what you ordered.\n\nNothing further is needed on your end.${sig}`;
      case 'vendor-substitution': return `Hi ${c},\n\nThanks for reaching out about order ${sc.order}. The filter you received carries a new part number (PARKER PRB-50) because Parker superseded the original (PARKER 9LPR-50) with an equivalent replacement. I confirmed the micron rating, thread size, and type all match what you ordered — same 50 micron return-line filter.\n\nIf you'd like, I can send you the manufacturer's cross-reference page so you can verify the substitution directly.${sig}`;
      case 'customer-ordered-wrong': return `Hi ${c},\n\nThanks for your message about order ${sc.order}. I want to make sure we get this right for you. I checked the order and the listing, and the 120V electric unit heater you received matches the order exactly — same part number (TPI FSE1504A), same voltage, same wattage.\n\nIf your installation needs 240V instead, that's a different model entirely, and I'm happy to help you return this one and get the correct 240V unit ordered. Just confirm and I'll set that up.${sig}`;
      case 'listing-error': return `Hi ${c},\n\nThanks for flagging this — you were right to question it. The bracket you received is zinc-plated steel, but our listing shows it as stainless steel. That's an error on our listing, not a shipping mistake on your order.\n\nI'm escalating the listing to our catalog team to get the material corrected. In the meantime, if you need true stainless steel, I can help locate the right part — or process a return if this one won't work for your application. I'm sorry for the mix-up.${sig}`;
      case 'variation-confusion': return `Hi ${c},\n\nThanks for reaching out about order ${sc.order}. You're right — the threaded insert you received is a 5/16"-18 size, not the 3/8"-16 you ordered. Same manufacturer and family, but the wrong variant went out.\n\nI'm sending the correct 3/8"-16 inserts (catalog #${sc.zoro}) at no cost, and a prepaid return label for the wrong ones is on its way.${sig}`;
      default: return `Hi ${c},\n\nThanks for your message about order ${sc.order}. I reviewed the order details, manufacturer part number, and specifications — and the item you received matches the order on every point I can verify.\n\nIf something specific looks off, send me a photo of the label or tell me which detail doesn't match and I'll investigate further.${sig}`;
    }
  }
  function notesV1(sc, cls, received) {
    switch (cls.category) {
      case 'true-mispick': return `Cust ${sc.customer} reports wrong motor. Verified Mfr# mismatch (received C4D17FK39C vs ordered C4D17FK29A) + HP mismatch. True mispick. Replacement + return initiated. catalog#${sc.zoro}.`;
      case 'packaging-change': return `Cust ${sc.customer} reports different box on gloves. Verified Mfr# NGR100 matches + all specs match. Packaging change by MCR Safety. No mispick. Item correct.`;
      case 'vendor-substitution': return `Cust ${sc.customer} reports different part number on filter. Parker superseded 9LPR-50 → PRB-50. Specs match. Vendor substitution. Item correct.`;
      case 'customer-ordered-wrong': return `Cust ${sc.customer} reports wrong voltage heater. Verified ordered item (TPI FSE1504A, 120V) matches listing + order. Cust expected 240V. No mispick. Offered return for correct 240V model.`;
      case 'listing-error': return `Cust ${sc.customer} reports bracket is zinc, not stainless. Listing shows stainless; received item is zinc-plated. Listing error. Escalated to catalog team. Offered return/replace.`;
      case 'variation-confusion': return `Cust ${sc.customer} reports wrong thread size on insert. Received 5/16"-18 vs ordered 3/8"-16. Same Mfr#, same family, wrong variant. Replacement + return initiated. catalog#${sc.zoro}.`;
      default: return `Cust ${sc.customer} reports concern on order ${sc.order}. Reviewed order + specs — item matches. No mispick indicated. Awaiting specifics from customer.`;
    }
  }
  function notesV2(sc, cls, received) {
    const C = CATEGORIES[cls.category];
    const evidence = cls.evidence.map(e => `  - ${e}`).join('\n');
    const gaps = cls.gaps.length ? '\nOpen items:\n' + cls.gaps.map(g => `  - ${g}`).join('\n') : '';
    const action = actionFor(cls.category, sc);
    return `INVESTIGATION — ${C.name}\nOrder: ${sc.order} (catalog #${sc.zoro}) · Customer: ${sc.customer}\nConfidence: ${cls.level.toUpperCase()}\n\nEvidence:\n${evidence}${gaps}\n\nClassification: ${C.name} — ${C.desc}\n\nAction: ${action}`;
  }
  function actionFor(cat, sc) {
    switch (cat) {
      case 'true-mispick': return `Ship correct item (catalog #${sc.zoro}) at no cost; send prepaid return label for wrong unit; document for warehouse QA.`;
      case 'packaging-change': return `No replacement needed. Inform customer the item is correct; note packaging change on the order.`;
      case 'vendor-substitution': return `No replacement needed. Provide manufacturer cross-reference link; confirm substitution is documented.`;
      case 'customer-ordered-wrong': return `Offer return + reorder of the correct variant if needed; no mispick credit.`;
      case 'listing-error': return `Escalate listing to catalog/content team; offer return or correct-part sourcing for the customer.`;
      case 'variation-confusion': return `Ship correct variant (catalog #${sc.zoro}) at no cost; prepaid return for wrong variant; flag for pick-process review.`;
      default: return `Close investigation; no action required pending further customer input.`;
    }
  }

  /* ---------- word-level diff ---------- */
  function tokenize(s) { return s.split(/(\s+)/); }
  function diffWords(a, b) {
    const aw = tokenize(a), bw = tokenize(b);
    const n = aw.length, m = bw.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i][j] = aw[i] === bw[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0, j = 0, out = '';
    while (i < n && j < m) {
      if (aw[i] === bw[j]) { out += esc(aw[i]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out += `<del>${esc(aw[i])}</del>`; i++; }
      else { out += `<ins>${esc(bw[j])}</ins>`; j++; }
    }
    while (i < n) { out += `<del>${esc(aw[i++])}</del>`; }
    while (j < m) { out += `<ins>${esc(bw[j++])}</ins>`; }
    return out;
  }

  /* ---------- rendering ---------- */
  function renderScenarioChips() {
    const wrap = $('#scenarioChips');
    wrap.innerHTML = SCENARIOS.map(s =>
      `<button type="button" class="scenario-chip${s.id === state.scenarioId ? ' is-active' : ''}" data-sc="${s.id}" role="tab" aria-selected="${s.id === state.scenarioId}">${esc(s.title)}</button>`
    ).join('');
    $$('.scenario-chip', wrap).forEach(btn => btn.addEventListener('click', () => {
      state.scenarioId = btn.dataset.sc; loadScenario();
    }));
  }

  function renderOrdered() {
    const sc = scenario();
    $('#orderedSo').textContent = `${sc.order} · catalog #${sc.zoro}`;
    const specs = Object.entries(sc.ordered.specs).map(([f, v]) =>
      `<div class="spec-row"><span class="spec-label">${esc(f)}</span><span class="spec-val mono">${esc(v)}</span></div>`).join('');
    $('#orderedBody').innerHTML =
      `<div class="ordered-desc">${esc(sc.ordered.desc)}</div>` +
      `<div class="ordered-meta">Mfr # ${esc(sc.ordered.mfr)}</div>` +
      `<div class="spec-list">${specs}</div>`;
  }

  function renderReceived() {
    const sc = scenario();
    const fields = Object.keys(sc.ordered.specs);
    const inputs = fields.map(f => {
      const v = state.received.specs[f] ?? '';
      return `<div class="spec-row"><span class="spec-label">${esc(f)}</span>` +
        `<input class="spec-input" data-field="${esc(f)}" value="${esc(v)}" aria-label="Received ${esc(f)}" /></div>`;
    }).join('');
    $('#receivedBody').innerHTML =
      `<div class="spec-row"><span class="spec-label">Mfr #</span>` +
      `<input class="spec-input" data-field="__mfr" value="${esc(state.received.mfr)}" aria-label="Received manufacturer part number" /></div>` +
      `<div class="label-img"><div class="li-tag">Box label (reported)</div><div class="li-mfr">${esc(state.received.mfr || '—')}</div>` +
      `<div class="li-upc">UPC ${esc(state.received.upc || '—')}</div></div>` +
      `<div class="spec-list">${inputs}</div>`;

    $$('.spec-input', $('#receivedBody')).forEach(inp => inp.addEventListener('input', () => {
      const f = inp.dataset.field;
      if (f === '__mfr') state.received.mfr = inp.value;
      else state.received.specs[f] = inp.value;
      // update box label live
      $('.li-mfr').textContent = state.received.mfr || '—';
      renderDownstream();
    }));
  }

  function renderFlags() {
    const grid = $('#flagsGrid');
    grid.innerHTML = FLAG_DEFS.map(f =>
      `<button type="button" class="flag-chip${state.flags[f.key] ? ' is-on' : ''}" data-flag="${f.key}">` +
      `<span class="flag-dot"></span>${esc(f.label)}</button>`).join('');
    $$('.flag-chip', grid).forEach(btn => btn.addEventListener('click', () => {
      const k = btn.dataset.flag;
      state.flags[k] = !state.flags[k];
      btn.classList.toggle('is-on', state.flags[k]);
      renderDownstream();
    }));
  }

  function renderCompare(cmp) {
    const head = `<div class="cmp-head"><span>Spec</span><span class="cmp-col-ordered">Ordered</span><span>Received</span><span>Status</span></div>`;
    const rows = cmp.rows.map(r =>
      `<div class="cmp-row"><span class="cmp-field">${esc(r.field)}</span>` +
      `<span class="cmp-val ordered">${esc(r.ordered)}</span>` +
      `<span class="cmp-val ${r.status === 'mismatch' ? '' : 'muted'}">${esc(r.received)}</span>` +
      `<span class="cmp-status ${r.status}">${r.status}</span></div>`).join('');
    $('#compareTable').innerHTML = head + rows;
    $('#compareSummary').textContent = `${cmp.matchCount} match · ${cmp.mismatchCount} mismatch · ${cmp.unknownCount} unknown`;
  }

  function renderTree(cls) {
    const labels = {
      'listingDiscrepancy': 'Listing inaccurate?',
      'superseded': 'Part superseded?',
      'mfrMatch': 'Mfr # matches?',
      'allMatch': 'All specs match?',
      'packagingChanged': 'Packaging changed?',
      'customerExpectedDiff': 'Cust expected different?',
      'sameFamilyDiff': 'Same family, diff variant?',
    };
    const nodes = [
      { key: 'listingDiscrepancy', q: 'Is the listing itself inaccurate?', on: cls.path[0]?.on },
      { key: 'superseded', q: 'Was the part number superseded?', on: cls.path[1]?.on },
      { key: 'mfrMatch', q: 'Does the Mfr # match the order?', on: cls.path[2]?.on },
      { key: 'allMatch', q: 'Do all specs match?', on: cls.path[3]?.on },
      { key: 'packagingChanged', q: 'Did the packaging/branding change?', on: cls.path[4]?.on },
      { key: 'customerExpectedDiff', q: 'Did the customer expect a different item?', on: cls.path[5]?.on },
      { key: 'sameFamilyDiff', q: 'Same family, different variant?', on: cls.path[6]?.on },
    ];
    const activeIdx = cls.path.filter(p => p.on !== undefined).length - 1;
    const html = nodes.map((n, i) => {
      if (n.on === undefined) return `<div class="tree-node dim"><span class="tree-q">${n.q}</span>not evaluated</div>`;
      const isResult = i === activeIdx && n.on;
      return `<div class="tree-node${n.on ? ' is-on' : ' dim'}${isResult ? ' is-result' : ''}"><span class="tree-q">${n.q}</span>${n.on ? 'Yes' : 'No'}</div>`;
    }).join('') +
      `<div class="tree-node is-result is-on"><span class="tree-q">Classification</span>${esc(CATEGORIES[cls.category].name)}</div>`;
    $('#decisionTree').innerHTML = html;
  }

  function renderClassification(cls) {
    const C = CATEGORIES[cls.category];
    $('#classificationResult').innerHTML =
      `<p class="cr-label">Classification</p>` +
      `<p class="cr-name">${esc(C.name)}</p>` +
      `<p class="cr-desc">${esc(C.desc)}</p>`;
    const levels = [
      { key: 'low', label: 'Low' }, { key: 'med', label: 'Medium' }, { key: 'high', label: 'High' },
    ];
    const order = { low: 0, med: 1, high: 2 };
    const cur = order[cls.level];
    $('#confMeter').innerHTML = levels.map(l =>
      `<span class="conf-seg ${l.key}${order[l.key] <= cur ? ' is-on' : ''}"></span>`).join('');
    const evList = [...cls.evidence.map(e => `<li>${esc(e)}</li>`), ...cls.gaps.map(g => `<li class="gap">${esc(g)}</li>`)];
    $('#confEvidence').innerHTML = evList.length ? evList.join('') : `<li>No supporting evidence yet</li>`;
  }

  function renderRedirect(sc) {
    const card = $('#redirectCard');
    if (!sc.redirect) { card.hidden = true; return; }
    card.hidden = false;
    $('#redirectBody').innerHTML =
      `<div class="rb-line"><span class="rb-label">Can this be sourced with the manufacturer? </span><span class="rb-val">Yes</span></div>` +
      `<div class="rb-line"><span class="rb-label">Official manufacturer link: </span><span class="rb-val"><a href="${esc(sc.redirect.url)}" target="_blank" rel="noopener noreferrer">${esc(sc.redirect.mfr)} ↗</a></span></div>` +
      `<div class="rb-script">${esc(sc.redirect.note)}</div>`;
  }

  function generateOutputs(cls) {
    const sc = scenario();
    gen.emailV1 = emailV1(sc, cls, state.received);
    gen.emailV2 = emailV2(sc, cls, state.received);
    gen.notesV1 = notesV1(sc, cls, state.received);
    gen.notesV2 = notesV2(sc, cls, state.received);
    state.emailEdited = { v1: null, v2: null };
    state.notesEdited = { v1: null, v2: null };
  }

  function currentText(target, ver) {
    const edited = target === 'email' ? state.emailEdited : state.notesEdited;
    const base = target === 'email' ? gen : gen;
    const key = target + 'V' + ver[1];
    return edited[ver] != null ? edited[ver] : base[key];
  }

  function renderOutput(target) {
    const ver = target === 'email' ? state.emailVer : state.notesVer;
    const ta = $('#' + target + 'Out');
    ta.value = currentText(target, ver);
    $$('.vt-btn', ta.closest('.output-card')).forEach(b => {
      b.classList.toggle('is-active', b.dataset.target === target && b.dataset.ver === ver);
      b.setAttribute('aria-selected', b.dataset.target === target && b.dataset.ver === ver ? 'true' : 'false');
    });
    const panel = $('#' + target + 'DiffPanel');
    if (!panel.hidden) renderDiff(target);
  }

  function renderDiff(target) {
    const v1 = currentText(target, 'v1');
    const v2 = currentText(target, 'v2');
    const html = diffWords(v1, v2);
    $('#' + target + 'Diff').innerHTML = html;
    $('#' + target + 'DiffStatus').textContent = v1 === v2 ? 'No changes between v1 and v2.' : '';
  }

  function renderDownstream() {
    const sc = scenario();
    const cls = classify(sc, state.received, state.flags);
    renderCompare(cls.cmp);
    renderTree(cls);
    renderClassification(cls);
    renderRedirect(sc);
    generateOutputs(cls);
    renderOutput('email');
    renderOutput('notes');
  }

  function loadScenario() {
    const sc = scenario();
    state.received = JSON.parse(JSON.stringify(sc.received));
    state.flags = { ...sc.flags };
    renderScenarioChips();
    renderOrdered();
    renderReceived();
    renderFlags();
    renderDownstream();
  }

  /* ---------- static panels ---------- */
  const DEMONSTRATES = [
    'Evidence-based support investigation', 'Root-cause analysis', 'Product & spec verification',
    'Human-in-the-loop AI workflow design', 'Decision-tree & process design', 'Better documentation quality',
    'Reduced ambiguity before refunds/replacements', 'First-contact resolution thinking', 'Repeatable, standardized workflows',
  ];
  const METRICS = [
    { name: 'First-contact resolution', desc: 'Cases closed on the first interaction without recontact.' },
    { name: 'Recontact rate', desc: 'Customers returning about the same issue after an investigation.' },
    { name: 'Avoided replacements/refunds', desc: 'Cases where evidence showed no mispick, preventing unnecessary credits or reships.' },
    { name: 'Escalation rate', desc: 'Investigations that had to be escalated versus resolved at first line.' },
    { name: 'Documentation completeness', desc: 'Notes containing classification, evidence, and action — ready for QA review.' },
    { name: 'Time to classification', desc: 'Average time from case open to a confident, evidence-backed classification.' },
  ];
  function renderStatic() {
    $('#demonstratesGrid').innerHTML = DEMONSTRATES.map(d => `<li>${esc(d)}</li>`).join('');
    $('#metricsGrid').innerHTML = METRICS.map(m =>
      `<li><p class="m-name">${esc(m.name)}</p><p class="m-desc">${esc(m.desc)}</p></li>`).join('');
  }

  /* ---------- wiring ---------- */
  function wireOutputs() {
    $$('.vt-btn').forEach(btn => btn.addEventListener('click', () => {
      const t = btn.dataset.target, v = btn.dataset.ver;
      if (t === 'email') state.emailVer = v; else state.notesVer = v;
      renderOutput(t);
    }));
    ['email', 'notes'].forEach(t => {
      const ta = $('#' + t + 'Out');
      ta.addEventListener('input', () => {
        const edited = t === 'email' ? state.emailEdited : state.notesEdited;
        edited[state[t + 'Ver']] = ta.value;
      });
      $('#' + t + 'DiffBtn').addEventListener('click', () => {
        const panel = $('#' + t + 'DiffPanel');
        panel.hidden = !panel.hidden;
        if (!panel.hidden) renderDiff(t);
      });
    });
    $$('.copy-btn').forEach(btn => btn.addEventListener('click', async () => {
      const ta = $('#' + btn.dataset.copy);
      try { await navigator.clipboard.writeText(ta.value); btn.textContent = 'Copied'; setTimeout(() => btn.textContent = 'Copy', 1500); }
      catch { btn.textContent = 'Copy'; }
    }));
    $('#resetReceived').addEventListener('click', () => loadScenario());
  }

  function wirePlaybookScroll() {
    const zones = [
      { id: 'intake', step: 'intake' },
      { id: 'classify', step: 'classify' },
      { id: 'outputs', step: 'outputs' },
    ];
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const z = zones.find(z => z.id === e.target.id);
          if (z) $$('.playbook-steps li').forEach(li => li.classList.toggle('is-active', li.dataset.step === z.step));
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    zones.forEach(z => { const el = $('#' + z.id); if (el) obs.observe(el); });
  }

  function wireTheme() {
    const root = document.documentElement;
    const stored = null; // no localStorage — use system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    const btn = $('#themeToggle');
    btn.addEventListener('click', () => {
      const isDark = root.getAttribute('data-theme') === 'dark';
      root.setAttribute('data-theme', isDark ? 'light' : 'dark');
      btn.setAttribute('aria-pressed', isDark ? 'false' : 'true');
    });
  }

  /* ---------- init ---------- */
  function init() {
    $('#year').textContent = new Date().getFullYear();
    wireTheme();
    renderStatic();
    loadScenario();
    wireOutputs();
    wirePlaybookScroll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
