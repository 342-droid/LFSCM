/**
 * 产品合规档案 · 列表台账 + 详情
 */
(function () {
  var store = window.MasterDataComplianceStore;
  if (!store) return;

  var state = {
    query: { certNo: '', name: '', type: '', status: '', complete: '', expiry: '' },
    page: 1,
    pageSize: 20
  };

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pageHref(file) {
    return (window.scmPath && window.scmPath.page) ? window.scmPath.page(file) : file;
  }

  function supplierName(id) {
    var s = store.findSupplier(id);
    return s ? s.name : '—';
  }

  function typeName(code) {
    var t = store.findTemplate(code);
    return t ? t.name : code || '—';
  }

  function archiveLabel(status) {
    if (status === 'draft') return '草稿';
    if (status === 'void') return '作废';
    return '生效';
  }

  function completeLabel(v) {
    if (v === 'complete') return '齐全';
    if (v === 'missing') return '缺失';
    return '—';
  }

  function expiryLabel(v) {
    if (v === 'valid') return '有效';
    if (v === 'expiring') return '即将过期';
    if (v === 'expired') return '已过期';
    return '—';
  }

  function fillTypeOptions() {
    var sel = document.getElementById('dosQueryType');
    if (!sel) return;
    var html = '<option value="">全部</option>';
    store.templates().forEach(function (t) {
      html += '<option value="' + escapeHtml(t.code) + '">' + escapeHtml(t.name) + '</option>';
    });
    sel.innerHTML = html;
  }

  function visible() {
    var q = state.query;
    return store.dossiers().filter(function (d) {
      if (q.certNo && String(d.certNo || '').toLowerCase().indexOf(q.certNo.toLowerCase()) < 0) return false;
      if (q.name && String(d.productName || '').toLowerCase().indexOf(q.name.toLowerCase()) < 0) return false;
      if (q.type && d.typeCode !== q.type) return false;
      if (q.status && d.status !== q.status) return false;
      if (q.complete) {
        var c = store.dossierCompleteness(d);
        if (c !== q.complete) return false;
      }
      if (q.expiry) {
        var e = store.dossierExpiry(d);
        if (e !== q.expiry) return false;
      }
      return true;
    });
  }

  function totalPages(total) {
    return Math.max(1, Math.ceil(total / state.pageSize) || 1);
  }

  function renderStats() {
    var el = document.getElementById('complianceDosStats');
    if (!el) return;
    var s = store.statsActive();
    el.innerHTML =
      '<div class="mdb-compliance-stat mdb-compliance-stat--warn"><span class="mdb-compliance-stat__label">即将过期</span><span class="mdb-compliance-stat__value">' + s.expiring + '</span></div>' +
      '<div class="mdb-compliance-stat mdb-compliance-stat--danger"><span class="mdb-compliance-stat__label">已过期</span><span class="mdb-compliance-stat__value">' + s.expired + '</span></div>' +
      '<div class="mdb-compliance-stat mdb-compliance-stat--danger"><span class="mdb-compliance-stat__label">齐套缺失</span><span class="mdb-compliance-stat__value">' + s.missing + '</span></div>' +
      '<div class="mdb-compliance-stat mdb-compliance-stat--ok"><span class="mdb-compliance-stat__label">齐全</span><span class="mdb-compliance-stat__value">' + s.complete + '</span></div>';
  }

  function renderTable(list) {
    var body = document.getElementById('complianceDosTableBody');
    if (!body) return;
    if (!list.length) {
      var empty = Object.keys(state.query).some(function (k) { return state.query[k]; })
        ? '暂无符合条件的合规档案'
        : '暂无合规档案';
      body.innerHTML = '<tr><td class="mdb-table-empty" colspan="11">' + empty + '</td></tr>';
      return;
    }
    var start = (state.page - 1) * state.pageSize;
    body.innerHTML = list.slice(start, start + state.pageSize).map(function (d) {
      var complete = store.dossierCompleteness(d);
      var expiry = store.dossierExpiry(d);
      var mapCount = (d.mappings || []).length;
      var ops = '';
      if (d.status !== 'void') {
        ops += '<button type="button" class="mdb-op-btn" data-dos-edit="' + escapeHtml(d.id) + '">编辑</button>';
        ops += '<button type="button" class="mdb-op-btn mdb-op-btn--danger" data-dos-void="' + escapeHtml(d.id) + '">作废</button>';
      }
      return '<tr>' +
        '<td><button type="button" class="mdb-code-link" data-dos-detail="' + escapeHtml(d.id) + '">' + escapeHtml(d.code) + '</button></td>' +
        '<td>' + escapeHtml(d.certNo) + '</td>' +
        '<td>' + escapeHtml(d.productName) + '</td>' +
        '<td>' + escapeHtml(typeName(d.typeCode)) + '</td>' +
        '<td>' + escapeHtml(supplierName(d.principalId)) + '</td>' +
        '<td>' + escapeHtml(supplierName(d.manufacturerId)) + '</td>' +
        '<td>' + mapCount + '</td>' +
        '<td><span class="mdb-status mdb-status--' + (complete || 'draft') + '">' + completeLabel(complete) + '</span></td>' +
        '<td><span class="mdb-status mdb-status--' + (expiry || 'draft') + '">' + expiryLabel(expiry) + '</span></td>' +
        '<td><span class="mdb-status mdb-status--' + (d.status === 'active' ? 'active' : d.status) + '">' + archiveLabel(d.status) + '</span></td>' +
        '<td class="mdb-table__op"><div class="mdb-table__ops">' + ops + '</div></td></tr>';
    }).join('');
  }

  function renderPagination(total) {
    var totalEl = document.getElementById('complianceDosPaginationTotal');
    var pagesEl = document.getElementById('complianceDosPaginationPages');
    var gotoEl = document.getElementById('complianceDosPageGoto');
    if (totalEl) totalEl.textContent = '共 ' + total + ' 条';
    var pages = totalPages(total);
    if (state.page > pages) state.page = pages;
    if (gotoEl) gotoEl.value = String(state.page);
    if (!pagesEl) return;
    var html = '';
    html += '<button type="button" class="product-pagination__btn" data-dos-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>上一页</button>';
    for (var i = 1; i <= pages; i++) {
      html += '<button type="button" class="product-pagination__btn' + (i === state.page ? ' is-active' : '') + '" data-dos-page="' + i + '">' + i + '</button>';
    }
    html += '<button type="button" class="product-pagination__btn" data-dos-page="' + (state.page + 1) + '"' + (state.page >= pages ? ' disabled' : '') + '>下一页</button>';
    pagesEl.innerHTML = html;
  }

  function renderPage() {
    renderStats();
    var list = visible();
    renderTable(list);
    renderPagination(list.length);
  }

  function openWarm(message, onConfirm) {
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop product-warm-confirm-backdrop';
    backdrop.innerHTML =
      '<div class="erp-modal erp-modal--confirm"><div class="erp-modal__header"><h2 class="erp-modal__title">温馨提示</h2>' +
      '<div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-warm-close aria-label="关闭">&times;</button></div></div>' +
      '<div class="erp-modal__body"><div class="erp-modal-confirm__row"><div class="erp-modal-confirm__icon">!</div><div class="erp-modal-confirm__msg">' + escapeHtml(message) + '</div></div></div>' +
      '<div class="erp-modal__footer"><button type="button" class="erp-btn" data-warm-close>取消</button><button type="button" class="erp-btn erp-btn--primary" data-warm-ok>确定</button></div></div>';
    function close() { backdrop.remove(); }
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop || ev.target.closest('[data-warm-close]')) close();
      if (ev.target.closest('[data-warm-ok]')) {
        close();
        if (onConfirm) onConfirm();
      }
    });
    document.body.appendChild(backdrop);
  }

  function voidDossier(id) {
    var d = store.findDossier(id);
    if (!d || d.status === 'void') return;
    openWarm('确定作废档案「' + d.productName + '」？', function () {
      d.status = 'void';
      d.updatedAt = new Date().toISOString().slice(0, 10);
      store.saveDossiers();
      renderPage();
      if (typeof showToast === 'function') showToast('合规档案已作废', 'success');
    });
  }

  var formState = {
    editingId: null,
    draft: null
  };

  function toast(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'warning');
  }

  function emptyDraft() {
    return {
      code: '',
      typeCode: '',
      certNo: '',
      productName: '',
      alias: '',
      principalId: '',
      manufacturerId: '',
      issueDate: '',
      longTerm: false,
      validFrom: '',
      validTo: '',
      refs: {},
      uploads: {},
      mappings: []
    };
  }

  function closeDosForm() {
    var modal = document.querySelector('[data-compliance-dos-modal]');
    if (modal) modal.remove();
    var picker = document.querySelector('[data-compliance-map-picker]');
    if (picker) picker.remove();
    formState.editingId = null;
    formState.draft = null;
  }

  function currentTpl() {
    return formState.draft ? store.findTemplate(formState.draft.typeCode) : null;
  }

  function fillSelect(el, options, value, placeholder) {
    if (!el) return;
    var html = '<option value="">' + escapeHtml(placeholder || '请选择') + '</option>';
    options.forEach(function (opt) {
      html += '<option value="' + escapeHtml(opt.value) + '"' + (opt.value === value ? ' selected' : '') + '>' + escapeHtml(opt.label) + '</option>';
    });
    el.innerHTML = html;
  }

  function fillSubjects() {
    var draft = formState.draft;
    var principals = store.suppliersByRole('委托方').map(function (s) {
      return { value: s.id, label: s.name + (s.status === 'disabled' ? '（已停用）' : '') };
    });
    var makers = store.suppliersByRole('生产方').map(function (s) {
      return { value: s.id, label: s.name + (s.status === 'disabled' ? '（已停用）' : '') };
    });
    fillSelect(document.getElementById('dosFormPrincipal'), principals, draft.principalId, '请选择委托方');
    fillSelect(document.getElementById('dosFormManufacturer'), makers, draft.manufacturerId, '请选择生产方');
  }

  function fillTypes(locked) {
    var draft = formState.draft;
    var opts = store.activeTemplates().map(function (t) {
      return { value: t.code, label: t.name + '（' + t.code + '）' };
    });
    if (locked && draft.typeCode && !opts.some(function (o) { return o.value === draft.typeCode; })) {
      var t = store.findTemplate(draft.typeCode);
      if (t) opts.unshift({ value: t.code, label: t.name + '（已停用）' });
    }
    var el = document.getElementById('dosFormType');
    fillSelect(el, opts, draft.typeCode, '请选择管控类型');
    if (el) el.disabled = !!locked;
  }

  function renderSummary() {
    var box = document.getElementById('dosFormTplSummary');
    var tpl = currentTpl();
    if (!box) return;
    if (!tpl) {
      box.innerHTML = '<div class="mdb-table-empty">请先选择管控类型</div>';
      return;
    }
    box.innerHTML = '<ul style="margin:0;padding-left:18px;color:#606266;font-size:13px;line-height:1.8">' +
      (tpl.items || []).map(function (it) {
        return '<li>' + (it.required ? '<span class="erp-req">*</span> ' : '') +
          escapeHtml(it.name) + ' · ' + (it.source === 'subject_ref' ? '主体引用/' + escapeHtml(it.role) : '档案包上传') +
          '</li>';
      }).join('') + '</ul>';
  }

  function certOptions(supplierId, allowedTypes) {
    var supplier = store.findSupplier(supplierId);
    if (!supplier || !Array.isArray(supplier.certificates)) return [];
    return supplier.certificates.filter(function (c) {
      if (c.status === 'void') return false;
      if (allowedTypes && allowedTypes.length && allowedTypes.indexOf(c.type) < 0) return false;
      return true;
    }).map(function (c) {
      var exp = store.certExpiryStatus(c);
      var tag = exp === 'expired' ? '已过期' : (exp === 'expiring' ? '即将过期' : '有效');
      return { value: c.id, label: (c.name || c.type) + ' · ' + (c.certNo || '无证号') + '（' + tag + '）' };
    });
  }

  function renderRefs() {
    var box = document.getElementById('dosFormRefs');
    var draft = formState.draft;
    var tpl = currentTpl();
    if (!box || !draft) return;
    var items = tpl ? (tpl.items || []).filter(function (it) { return it.source === 'subject_ref'; }) : [];
    if (!items.length) {
      box.innerHTML = '<div class="mdb-table-empty">当前模板无主体引用项</div>';
      return;
    }
    box.innerHTML = items.map(function (it) {
      var sid = it.role === '生产方' ? draft.manufacturerId : draft.principalId;
      var opts = certOptions(sid, it.certTypes || []);
      var current = (draft.refs && draft.refs[it.code]) || '';
      var optionsHtml = '<option value="">请选择证照</option>' + opts.map(function (o) {
        return '<option value="' + escapeHtml(o.value) + '"' + (o.value === current ? ' selected' : '') + '>' + escapeHtml(o.label) + '</option>';
      }).join('');
      var emptyHint = !sid
        ? '<p class="mdb-compliance-dos-tip">请先选择' + escapeHtml(it.role) + '</p>'
        : (!opts.length
          ? '<p class="mdb-compliance-dos-tip">暂无可用证照，请先在<a href="' + pageHref('master_data_supplier.html') + '" target="_blank">供应商档案</a>维护</p>'
          : '');
      return '<label class="mdb-field mdb-field--wide"><span>' + (it.required ? '<i>*</i>' : '') + escapeHtml(it.name) + '</span>' +
        '<div style="flex:1;min-width:0"><select data-ref-select="' + escapeHtml(it.code) + '">' + optionsHtml + '</select>' + emptyHint + '</div></label>';
    }).join('');
  }

  function renderUploads() {
    var box = document.getElementById('dosFormUploads');
    var draft = formState.draft;
    var tpl = currentTpl();
    if (!box || !draft) return;
    var items = tpl ? (tpl.items || []).filter(function (it) { return it.source === 'dossier_upload'; }) : [];
    if (!items.length) {
      box.innerHTML = '<div class="mdb-table-empty">当前模板无档案包上传项</div>';
      return;
    }
    box.innerHTML = items.map(function (it) {
      var files = (draft.uploads && draft.uploads[it.code]) || [];
      var rows = files.map(function (f, idx) {
        return '<div class="compliance-upload-row">' +
          (f.url ? '<img src="' + escapeHtml(f.url) + '" alt="">' : '') +
          '<span>' + escapeHtml(f.name || '附件') + '</span>' +
          '<input class="erp-input" style="width:160px" data-upload-no="' + escapeHtml(it.code) + '" data-idx="' + idx + '" placeholder="材料编号" value="' + escapeHtml(f.materialNo || '') + '">' +
          (it.expiryWarn
            ? '<input class="erp-input" style="width:150px" type="date" data-upload-valid="' + escapeHtml(it.code) + '" data-idx="' + idx + '" value="' + escapeHtml(f.validTo || '') + '">'
            : '') +
          '<button type="button" class="mdb-op-btn mdb-op-btn--danger" data-upload-del="' + escapeHtml(it.code) + '" data-idx="' + idx + '">删除</button></div>';
      }).join('');
      return '<div class="mdb-field mdb-field--wide" style="align-items:flex-start"><span>' + (it.required ? '<i>*</i>' : '') + escapeHtml(it.name) + '</span>' +
        '<div style="flex:1;min-width:0"><div class="compliance-upload-list">' + rows + '</div>' +
        '<button type="button" class="mdb-btn mdb-btn--ghost" style="margin-top:8px" data-upload-add="' + escapeHtml(it.code) + '">+ 上传附件（示意）</button></div></div>';
    }).join('');
  }

  function renderMaps() {
    var body = document.getElementById('dosMapBody');
    var draft = formState.draft;
    if (!body || !draft) return;
    if (!draft.mappings.length) {
      body.innerHTML = '<tr><td class="mdb-table-empty" colspan="3">暂未映射商品</td></tr>';
      return;
    }
    body.innerHTML = draft.mappings.map(function (m, idx) {
      return '<tr><td>' + escapeHtml(m.sku) + '</td>' +
        '<td><input class="erp-input" data-map-note="' + idx + '" maxlength="40" value="' + escapeHtml(m.specNote || '') + '" placeholder="色号/规格备注"></td>' +
        '<td class="mdb-table__op"><button type="button" class="mdb-op-btn mdb-op-btn--danger" data-map-del="' + idx + '">删除</button></td></tr>';
    }).join('');
  }

  function refreshDynamic() {
    renderSummary();
    renderRefs();
    renderUploads();
    renderMaps();
  }

  function readHeader() {
    var draft = formState.draft;
    if (!draft) return;
    draft.typeCode = String(document.getElementById('dosFormType').value || '');
    draft.certNo = String(document.getElementById('dosFormCertNo').value || '').trim();
    draft.productName = String(document.getElementById('dosFormProductName').value || '').trim();
    draft.alias = String(document.getElementById('dosFormAlias').value || '').trim();
    draft.principalId = String(document.getElementById('dosFormPrincipal').value || '');
    draft.manufacturerId = String(document.getElementById('dosFormManufacturer').value || '');
    draft.issueDate = String(document.getElementById('dosFormIssueDate').value || '');
    draft.longTerm = !!document.getElementById('dosFormLongTerm').checked;
    draft.validFrom = String(document.getElementById('dosFormValidFrom').value || '');
    draft.validTo = String(document.getElementById('dosFormValidTo').value || '');
  }

  function syncRefsFromDom() {
    var draft = formState.draft;
    if (!draft) return;
    document.querySelectorAll('[data-ref-select]').forEach(function (el) {
      var code = el.getAttribute('data-ref-select');
      if (!draft.refs) draft.refs = {};
      draft.refs[code] = String(el.value || '');
      if (!draft.refs[code]) delete draft.refs[code];
    });
  }

  function syncUploadsMeta() {
    var draft = formState.draft;
    if (!draft) return;
    document.querySelectorAll('[data-upload-no]').forEach(function (el) {
      var code = el.getAttribute('data-upload-no');
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      if (draft.uploads[code] && draft.uploads[code][idx]) draft.uploads[code][idx].materialNo = String(el.value || '').trim();
    });
    document.querySelectorAll('[data-upload-valid]').forEach(function (el) {
      var code = el.getAttribute('data-upload-valid');
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      if (draft.uploads[code] && draft.uploads[code][idx]) draft.uploads[code][idx].validTo = String(el.value || '');
    });
  }

  function syncMapsMeta() {
    var draft = formState.draft;
    if (!draft) return;
    document.querySelectorAll('[data-map-note]').forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-map-note'), 10);
      if (draft.mappings[idx]) draft.mappings[idx].specNote = String(el.value || '').trim();
    });
  }

  function validateBase() {
    readHeader();
    syncRefsFromDom();
    syncUploadsMeta();
    syncMapsMeta();
    var draft = formState.draft;
    var editingId = formState.editingId;
    if (!draft.typeCode) { toast('请选择管控类型'); return false; }
    if (!draft.certNo) { toast('请输入证照编号'); return false; }
    var dup = store.dossiers().some(function (d) {
      return d.typeCode === draft.typeCode && d.certNo === draft.certNo && d.id !== editingId && d.status !== 'void';
    });
    if (dup) { toast('该管控类型下证照编号已存在'); return false; }
    if (!draft.productName) { toast('请输入合规品名'); return false; }
    if (!draft.principalId) { toast('请选择委托方'); return false; }
    if (!draft.manufacturerId) { toast('请选择生产方'); return false; }
    if (!draft.longTerm && !draft.validTo) { toast('请填写有效期'); return false; }
    return true;
  }

  function validateActive() {
    if (!validateBase()) return false;
    var settings = store.settings();
    if (settings.allowIncompleteActive !== false) return true;
    var tpl = currentTpl();
    var draft = formState.draft;
    if (!tpl) return false;
    var temp = Object.assign({}, draft, { status: 'active' });
    for (var i = 0; i < (tpl.items || []).length; i++) {
      var it = tpl.items[i];
      if (!it.required) continue;
      if (!store.itemPass(temp, it)) {
        toast('请完善：' + it.name);
        return false;
      }
    }
    return true;
  }

  function persistDosForm(status) {
    if (status === 'active') {
      if (!validateActive()) return;
    } else if (!validateBase()) return;

    var draft = formState.draft;
    var editingId = formState.editingId;
    var list = store.dossiers();
    var payload = {
      typeCode: draft.typeCode,
      certNo: draft.certNo,
      productName: draft.productName,
      alias: draft.alias,
      principalId: draft.principalId,
      manufacturerId: draft.manufacturerId,
      issueDate: draft.issueDate,
      longTerm: !!draft.longTerm,
      validFrom: draft.validFrom,
      validTo: draft.longTerm ? '' : draft.validTo,
      status: status,
      updatedAt: new Date().toISOString().slice(0, 10),
      refs: JSON.parse(JSON.stringify(draft.refs || {})),
      uploads: JSON.parse(JSON.stringify(draft.uploads || {})),
      mappings: JSON.parse(JSON.stringify(draft.mappings || []))
    };

    if (editingId) {
      var cur = store.findDossier(editingId);
      if (!cur) return;
      Object.keys(payload).forEach(function (k) { cur[k] = payload[k]; });
      store.saveDossiers();
      toast(status === 'active' ? '合规档案已生效' : '合规档案已保存为草稿', 'success');
    } else {
      payload.id = store.nextDossierId();
      payload.code = draft.code || store.nextDossierCode();
      list.push(payload);
      store.saveDossiers();
      toast(status === 'active' ? '合规档案已生效' : '合规档案已保存为草稿', 'success');
    }

    (payload.mappings || []).forEach(function (m) {
      store.setGoodsFlag(m.sku, true, draft.typeCode);
    });

    closeDosForm();
    renderPage();
  }

  function openMapPicker() {
    var draft = formState.draft;
    if (!draft) return;
    readHeader();
    if (!draft.typeCode) {
      toast('请先选择管控类型');
      return;
    }
    var existing = document.querySelector('[data-compliance-map-picker]');
    if (existing) existing.remove();
    var goods = store.demoCatalogGoods();
    var flags = store.goodsFlags();
    var candidates = goods.filter(function (g) {
      var f = flags[g.sku] || { enabled: g.complianceEnabled, type: g.complianceType };
      if (!draft.typeCode) return true;
      return f.enabled && f.type === draft.typeCode;
    });
    var options = candidates.map(function (g) {
      var used = draft.mappings.some(function (m) { return m.sku === g.sku; });
      return '<label style="display:flex;gap:8px;align-items:center;margin:6px 0;font-size:13px">' +
        '<input type="checkbox" value="' + escapeHtml(g.sku) + '"' + (used ? ' checked disabled' : '') + '>' +
        escapeHtml(g.sku) + ' · ' + escapeHtml(g.name) + '</label>';
    }).join('') || '<div class="mdb-table-empty">暂无匹配管控类型的货号，请先在商品上开启合规管控</div>';
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop erp-modal-backdrop--nested';
    backdrop.setAttribute('data-compliance-map-picker', '1');
    backdrop.innerHTML =
      '<div class="erp-modal" style="width:520px" role="dialog"><div class="erp-modal__header"><h2 class="erp-modal__title">添加货号</h2>' +
      '<div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-map-close>&times;</button></div></div>' +
      '<div class="erp-modal__body">' + options + '</div>' +
      '<div class="erp-modal__footer"><button type="button" class="erp-btn" data-map-close>取消</button>' +
      '<button type="button" class="erp-btn erp-btn--primary" data-map-ok>确定</button></div></div>';
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop || ev.target.closest('[data-map-close]')) backdrop.remove();
      if (ev.target.closest('[data-map-ok]')) {
        backdrop.querySelectorAll('input[type=checkbox]:checked:not(:disabled)').forEach(function (cb) {
          draft.mappings.push({ sku: cb.value, specNote: '' });
        });
        backdrop.remove();
        renderMaps();
      }
    });
    document.body.appendChild(backdrop);
  }

  function openDosForm(id, options) {
    options = options || {};
    closeDosForm();
    var editing = id ? store.findDossier(id) : null;
    if (id && (!editing || editing.status === 'void')) {
      toast('档案不存在或已作废');
      return;
    }
    formState.editingId = editing ? editing.id : null;
    if (editing) {
      formState.draft = {
        code: editing.code,
        typeCode: editing.typeCode,
        certNo: editing.certNo,
        productName: editing.productName,
        alias: editing.alias || '',
        principalId: editing.principalId,
        manufacturerId: editing.manufacturerId,
        issueDate: editing.issueDate || '',
        longTerm: !!editing.longTerm,
        validFrom: editing.validFrom || '',
        validTo: editing.validTo || '',
        refs: JSON.parse(JSON.stringify(editing.refs || {})),
        uploads: JSON.parse(JSON.stringify(editing.uploads || {})),
        mappings: JSON.parse(JSON.stringify(editing.mappings || []))
      };
    } else {
      formState.draft = emptyDraft();
      formState.draft.code = store.nextDossierCode();
      var active = store.activeTemplates();
      formState.draft.typeCode = active[0] ? active[0].code : '';
      if (options.sku) formState.draft.mappings.push({ sku: String(options.sku), specNote: '' });
    }
    var draft = formState.draft;
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop product-category-modal-backdrop' + (options.nested ? ' erp-modal-backdrop--nested' : '');
    backdrop.setAttribute('data-compliance-dos-modal', '1');
    backdrop.innerHTML =
      '<div class="erp-modal mdb-modal mdb-compliance-dos-modal" role="dialog" aria-modal="true">' +
      '<div class="erp-modal__header"><h2 class="erp-modal__title">' + (editing ? '编辑合规档案' : '新建合规档案') + '</h2>' +
      '<div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-dos-form-close aria-label="关闭">&times;</button></div></div>' +
      '<div class="erp-modal__body">' +
      '<div class="mdm-biz-tip" role="note">管控类型选定后不可修改。主体证照请先在<strong>供应商档案</strong>维护，再于下方引用。</div>' +
      '<section><h3 class="mdb-compliance-dos-section__title">基本信息</h3><div class="mdb-form mdb-compliance-dos-form">' +
      '<label class="mdb-field"><span>档案编号</span><input id="dosFormCode" value="' + escapeHtml(draft.code) + '" readonly tabindex="-1"></label>' +
      '<label class="mdb-field"><span><i>*</i>管控类型</span><select id="dosFormType"></select></label>' +
      '<label class="mdb-field"><span><i>*</i>证照编号</span><input id="dosFormCertNo" maxlength="64" placeholder="国妆特字号 / 备案号" value="' + escapeHtml(draft.certNo) + '"></label>' +
      '<label class="mdb-field"><span><i>*</i>合规品名</span><input id="dosFormProductName" maxlength="80" placeholder="注册/备案上的产品名称" value="' + escapeHtml(draft.productName) + '"></label>' +
      '<label class="mdb-field"><span>内部备注名</span><input id="dosFormAlias" maxlength="40" placeholder="选填" value="' + escapeHtml(draft.alias) + '"></label>' +
      '<label class="mdb-field"><span><i>*</i>委托方</span><select id="dosFormPrincipal"></select></label>' +
      '<label class="mdb-field"><span><i>*</i>生产方</span><select id="dosFormManufacturer"></select></label>' +
      '<label class="mdb-field"><span>发证/备案日期</span><input id="dosFormIssueDate" type="date" value="' + escapeHtml(draft.issueDate) + '"></label>' +
      '<label class="mdb-field mdb-field--check"><span>长期有效</span><label class="mdb-check"><input type="checkbox" id="dosFormLongTerm"' + (draft.longTerm ? ' checked' : '') + '> 长期有效</label></label>' +
      '<label class="mdb-field"><span>有效期起</span><input id="dosFormValidFrom" type="date" value="' + escapeHtml(draft.validFrom) + '"></label>' +
      '<label class="mdb-field"><span>有效期止</span><input id="dosFormValidTo" type="date" value="' + escapeHtml(draft.validTo) + '"' + (draft.longTerm ? ' disabled' : '') + '></label>' +
      '</div></section>' +
      '<section><h3 class="mdb-compliance-dos-section__title">合规范本</h3><div id="dosFormTplSummary"></div></section>' +
      '<section><h3 class="mdb-compliance-dos-section__title">主体证引用</h3><div class="mdb-form" id="dosFormRefs"></div></section>' +
      '<section><h3 class="mdb-compliance-dos-section__title">包内附件</h3><div class="mdb-form" id="dosFormUploads"></div></section>' +
      '<section><div class="mdb-compliance-dos-maps__head"><h3 class="mdb-compliance-dos-section__title" style="margin:0">商品映射</h3>' +
      '<button type="button" class="mdb-btn mdb-btn--primary" id="dosMapAddBtn">+ 添加货号</button></div>' +
      '<div class="mdb-table-wrap compliance-map-table"><table class="mdb-table"><thead><tr><th>货号</th><th>规格备注</th><th class="mdb-table__op">操作</th></tr></thead><tbody id="dosMapBody"></tbody></table></div></section>' +
      '</div>' +
      '<div class="erp-modal__footer"><button type="button" class="erp-btn" data-dos-form-close>取消</button>' +
      '<button type="button" class="erp-btn" data-dos-form-draft>保存草稿</button>' +
      '<button type="button" class="erp-btn erp-btn--primary" data-dos-form-active>保存并生效</button></div></div>';

    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop || ev.target.closest('[data-dos-form-close]')) {
        closeDosForm();
        return;
      }
      if (ev.target.closest('[data-dos-form-draft]')) {
        persistDosForm('draft');
        return;
      }
      if (ev.target.closest('[data-dos-form-active]')) {
        persistDosForm('active');
        return;
      }
      if (ev.target.closest('#dosMapAddBtn')) {
        openMapPicker();
        return;
      }
      var uploadAdd = ev.target.closest('[data-upload-add]');
      if (uploadAdd) {
        var code = uploadAdd.getAttribute('data-upload-add');
        if (!draft.uploads[code]) draft.uploads[code] = [];
        draft.uploads[code].push({
          name: '附件' + (draft.uploads[code].length + 1),
          url: store.PLACEHOLDER,
          materialNo: '',
          validTo: ''
        });
        renderUploads();
        return;
      }
      var uploadDel = ev.target.closest('[data-upload-del]');
      if (uploadDel) {
        syncUploadsMeta();
        var c = uploadDel.getAttribute('data-upload-del');
        var i = parseInt(uploadDel.getAttribute('data-idx'), 10);
        if (draft.uploads[c]) draft.uploads[c].splice(i, 1);
        renderUploads();
        return;
      }
      var mapDel = ev.target.closest('[data-map-del]');
      if (mapDel) {
        syncMapsMeta();
        draft.mappings.splice(parseInt(mapDel.getAttribute('data-map-del'), 10), 1);
        renderMaps();
      }
    });
    backdrop.addEventListener('change', function (ev) {
      var target = ev.target;
      if (!target) return;
      if (target.id === 'dosFormType') {
        draft.typeCode = target.value;
        draft.refs = {};
        draft.uploads = {};
        refreshDynamic();
        return;
      }
      if (target.id === 'dosFormPrincipal') {
        draft.principalId = target.value;
        renderRefs();
        return;
      }
      if (target.id === 'dosFormManufacturer') {
        draft.manufacturerId = target.value;
        renderRefs();
        return;
      }
      if (target.id === 'dosFormLongTerm') {
        document.getElementById('dosFormValidTo').disabled = target.checked;
        if (target.checked) document.getElementById('dosFormValidTo').value = '';
        return;
      }
      if (target.matches('[data-ref-select]')) syncRefsFromDom();
    });
    document.body.appendChild(backdrop);
    fillTypes(!!editing);
    fillSubjects();
    refreshDynamic();
    var focusEl = document.getElementById(editing ? 'dosFormCertNo' : 'dosFormType');
    if (focusEl) focusEl.focus();
  }

  function openDetail(id) {
    var d = store.findDossier(id);
    if (!d) return;
    var tpl = store.findTemplate(d.typeCode);
    var itemsHtml = '';
    if (tpl && tpl.items) {
      itemsHtml = tpl.items.map(function (item) {
        var pass = d.status === 'active' ? store.itemPass(d, item) : false;
        var meta = '';
        if (item.source === 'subject_ref') {
          var sid = item.role === '生产方' ? d.manufacturerId : d.principalId;
          var cert = store.findCertificate(sid, d.refs && d.refs[item.code]);
          meta = cert ? (cert.name || cert.type) + ' · ' + (cert.certNo || '无证号') : '未引用';
        } else {
          var files = (d.uploads && d.uploads[item.code]) || [];
          meta = files.length ? ('已上传 ' + files.length + ' 个附件') : '未上传';
        }
        var badge = d.status !== 'active' ? '—' : (pass ? '通过' : (item.required ? '缺失' : '未填'));
        var badgeClass = pass ? 'complete' : (item.required ? 'missing' : 'draft');
        return '<div class="compliance-detail-item"><div><div class="compliance-detail-item__name">' +
          (item.required ? '<span class="erp-req">*</span> ' : '') + escapeHtml(item.name) +
          '</div><div class="compliance-detail-item__meta">' + escapeHtml(meta) + '</div></div>' +
          '<span class="mdb-status mdb-status--' + badgeClass + '">' + badge + '</span></div>';
      }).join('');
    }
    var maps = (d.mappings || []).map(function (m) {
      return '<tr><td>' + escapeHtml(m.sku) + '</td><td>' + escapeHtml(m.specNote || '—') + '</td></tr>';
    }).join('') || '<tr><td colspan="2" class="mdb-table-empty">暂未映射商品</td></tr>';
    var complete = store.dossierCompleteness(d);
    var expiry = store.dossierExpiry(d);
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop product-category-modal-backdrop';
    backdrop.innerHTML =
      '<div class="erp-modal mdb-supplier-detail" role="dialog" aria-modal="true" style="width:760px;max-width:92vw">' +
      '<div class="erp-modal__header"><h2 class="erp-modal__title">合规档案详情</h2>' +
      '<div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-detail-close aria-label="关闭">&times;</button></div></div>' +
      '<div class="erp-modal__body">' +
      '<div class="mdl-detail-hero__title" style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><h3 style="margin:0">' + escapeHtml(d.productName) + '</h3>' +
      (d.status !== 'void' ? '<button type="button" class="mdl-detail-edit" data-detail-edit>编辑</button>' : '') + '</div>' +
      '<p class="mdl-detail-hero__meta">档案编号：' + escapeHtml(d.code) + ' · 证号：' + escapeHtml(d.certNo) +
      ' · 齐套：' + completeLabel(complete) + ' · 效期：' + expiryLabel(expiry) + ' · 状态：' + archiveLabel(d.status) + '</p>' +
      '<div class="mdl-detail-grid" style="margin:12px 0">' +
      '<div class="mdl-detail-field"><span>管控类型</span><strong>' + escapeHtml(typeName(d.typeCode)) + '</strong></div>' +
      '<div class="mdl-detail-field"><span>委托方</span><strong>' + escapeHtml(supplierName(d.principalId)) + '</strong></div>' +
      '<div class="mdl-detail-field"><span>生产方</span><strong>' + escapeHtml(supplierName(d.manufacturerId)) + '</strong></div>' +
      '<div class="mdl-detail-field"><span>有效期</span><strong>' + escapeHtml(d.longTerm ? '长期有效' : ((d.validFrom || '') + ' ~ ' + (d.validTo || '—'))) + '</strong></div>' +
      '</div>' +
      '<h4 style="font-size:14px;margin:16px 0 8px">合规模板清单</h4>' + itemsHtml +
      '<h4 style="font-size:14px;margin:16px 0 8px">商品映射</h4>' +
      '<div class="mdb-table-wrap"><table class="mdb-table"><thead><tr><th>货号</th><th>规格备注</th></tr></thead><tbody>' + maps + '</tbody></table></div>' +
      '</div></div>';
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop || ev.target.closest('[data-detail-close]')) backdrop.remove();
      if (ev.target.closest('[data-detail-edit]')) {
        backdrop.remove();
        openDosForm(d.id);
      }
    });
    document.body.appendChild(backdrop);
  }

  function bind() {
    fillTypeOptions();
    document.getElementById('complianceDosAddBtn').addEventListener('click', function () {
      openDosForm(null);
    });
    document.getElementById('complianceDosQueryForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      state.query = {
        certNo: String(document.getElementById('dosQueryCertNo').value || '').trim(),
        name: String(document.getElementById('dosQueryName').value || '').trim(),
        type: String(document.getElementById('dosQueryType').value || ''),
        status: String(document.getElementById('dosQueryStatus').value || ''),
        complete: String(document.getElementById('dosQueryComplete').value || ''),
        expiry: String(document.getElementById('dosQueryExpiry').value || '')
      };
      state.page = 1;
      renderPage();
    });
    document.getElementById('complianceDosQueryReset').addEventListener('click', function () {
      ['dosQueryCertNo', 'dosQueryName', 'dosQueryType', 'dosQueryStatus', 'dosQueryComplete', 'dosQueryExpiry'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
      });
      state.query = { certNo: '', name: '', type: '', status: '', complete: '', expiry: '' };
      state.page = 1;
      renderPage();
    });
    document.getElementById('complianceDosTableBody').addEventListener('click', function (ev) {
      var detail = ev.target.closest('[data-dos-detail]');
      if (detail) {
        openDetail(detail.getAttribute('data-dos-detail'));
        return;
      }
      var edit = ev.target.closest('[data-dos-edit]');
      if (edit) {
        openDosForm(edit.getAttribute('data-dos-edit'));
        return;
      }
      var voidBtn = ev.target.closest('[data-dos-void]');
      if (voidBtn) voidDossier(voidBtn.getAttribute('data-dos-void'));
    });
    document.getElementById('complianceDosPaginationPages').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-dos-page]');
      if (!btn || btn.disabled) return;
      var next = parseInt(btn.getAttribute('data-dos-page'), 10);
      if (!next || next === state.page) return;
      state.page = next;
      renderPage();
    });
    document.getElementById('complianceDosPageSize').addEventListener('change', function () {
      state.pageSize = parseInt(this.value, 10) || 20;
      state.page = 1;
      renderPage();
    });
    document.getElementById('complianceDosPageGoto').addEventListener('change', function () {
      var max = totalPages(visible().length);
      var val = parseInt(this.value, 10) || 1;
      if (val < 1) val = 1;
      if (val > max) val = max;
      state.page = val;
      renderPage();
    });
  }

  function init() {
    store.mergeDemoSuppliers();
    bind();
    renderPage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
