/**
 * 产品合规档案 · 新建 / 编辑整页
 */
(function () {
  var store = window.MasterDataComplianceStore;
  if (!store) return;

  var editingId = null;
  var draft = {
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

  function queryParam(name) {
    var m = new RegExp('[?&]' + name + '=([^&]+)').exec(location.search || '');
    return m ? decodeURIComponent(m[1]) : '';
  }

  function toast(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'warning');
  }

  function currentTpl() {
    return store.findTemplate(draft.typeCode);
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
    var opts = store.activeTemplates().map(function (t) {
      return { value: t.code, label: t.name + '（' + t.code + '）' };
    });
    if (locked && draft.typeCode && !opts.some(function (o) { return o.value === draft.typeCode; })) {
      var t = store.findTemplate(draft.typeCode);
      if (t) opts.unshift({ value: t.code, label: t.name + '（已停用）' });
    }
    var el = document.getElementById('dosFormType');
    fillSelect(el, opts, draft.typeCode, '请选择管控类型');
    if (locked) el.disabled = true;
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
    var tpl = currentTpl();
    if (!box) return;
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
        ? '<p class="pts-rule-tip">请先选择' + escapeHtml(it.role) + '</p>'
        : (!opts.length
          ? '<p class="pts-rule-tip">暂无可用证照，请先在<a href="' + pageHref('master_data_supplier.html') + '">供应商档案</a>维护</p>'
          : '');
      return '<div class="pts-rule-field" data-ref-item="' + escapeHtml(it.code) + '">' +
        '<div class="pts-rule-field__label">' + (it.required ? '<span class="erp-req">*</span>' : '') + escapeHtml(it.name) + '</div>' +
        '<div class="pts-rule-field__control"><select class="erp-select" data-ref-select="' + escapeHtml(it.code) + '">' + optionsHtml + '</select>' + emptyHint + '</div></div>';
    }).join('');
  }

  function renderUploads() {
    var box = document.getElementById('dosFormUploads');
    var tpl = currentTpl();
    if (!box) return;
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
      return '<div class="pts-rule-field" style="align-items:flex-start">' +
        '<div class="pts-rule-field__label">' + (it.required ? '<span class="erp-req">*</span>' : '') + escapeHtml(it.name) + '</div>' +
        '<div class="pts-rule-field__control"><div class="compliance-upload-list">' + rows + '</div>' +
        '<button type="button" class="mdb-btn mdb-btn--ghost" style="margin-top:8px" data-upload-add="' + escapeHtml(it.code) + '">+ 上传附件（示意）</button></div></div>';
    }).join('');
  }

  function renderMaps() {
    var body = document.getElementById('dosMapBody');
    if (!body) return;
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
    document.querySelectorAll('[data-ref-select]').forEach(function (el) {
      var code = el.getAttribute('data-ref-select');
      if (!draft.refs) draft.refs = {};
      draft.refs[code] = String(el.value || '');
      if (!draft.refs[code]) delete draft.refs[code];
    });
  }

  function syncUploadsMeta() {
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

  function persist(status) {
    if (status === 'active') {
      if (!validateActive()) return;
    } else if (!validateBase()) return;

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

    (payload.mappings || draft.mappings || []).forEach(function (m) {
      store.setGoodsFlag(m.sku, true, draft.typeCode);
    });

    location.href = pageHref('master_data_compliance_dossier.html');
  }

  function openMapPicker() {
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
    backdrop.className = 'erp-modal-backdrop';
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

  function load() {
    store.mergeDemoSuppliers();
    editingId = queryParam('id');
    var title = document.getElementById('dosFormTitle');
    if (editingId) {
      var d = store.findDossier(editingId);
      if (!d || d.status === 'void') {
        toast('档案不存在或已作废');
        location.href = pageHref('master_data_compliance_dossier.html');
        return;
      }
      if (title) title.textContent = '编辑合规档案';
      draft = {
        code: d.code,
        typeCode: d.typeCode,
        certNo: d.certNo,
        productName: d.productName,
        alias: d.alias || '',
        principalId: d.principalId,
        manufacturerId: d.manufacturerId,
        issueDate: d.issueDate || '',
        longTerm: !!d.longTerm,
        validFrom: d.validFrom || '',
        validTo: d.validTo || '',
        refs: JSON.parse(JSON.stringify(d.refs || {})),
        uploads: JSON.parse(JSON.stringify(d.uploads || {})),
        mappings: JSON.parse(JSON.stringify(d.mappings || []))
      };
      fillTypes(true);
    } else {
      if (title) title.textContent = '新建合规档案';
      draft.code = store.nextDossierCode();
      var active = store.activeTemplates();
      draft.typeCode = active[0] ? active[0].code : '';
      fillTypes(false);
      var preSku = queryParam('sku');
      if (preSku) draft.mappings.push({ sku: preSku, specNote: '' });
    }
    document.getElementById('dosFormCode').value = draft.code;
    document.getElementById('dosFormCertNo').value = draft.certNo;
    document.getElementById('dosFormProductName').value = draft.productName;
    document.getElementById('dosFormAlias').value = draft.alias;
    document.getElementById('dosFormIssueDate').value = draft.issueDate;
    document.getElementById('dosFormLongTerm').checked = draft.longTerm;
    document.getElementById('dosFormValidFrom').value = draft.validFrom;
    document.getElementById('dosFormValidTo').value = draft.validTo;
    document.getElementById('dosFormValidTo').disabled = draft.longTerm;
    fillSubjects();
    refreshDynamic();
  }

  function bind() {
    document.getElementById('dosFormType').addEventListener('change', function () {
      draft.typeCode = this.value;
      draft.refs = {};
      draft.uploads = {};
      refreshDynamic();
    });
    document.getElementById('dosFormPrincipal').addEventListener('change', function () {
      draft.principalId = this.value;
      renderRefs();
    });
    document.getElementById('dosFormManufacturer').addEventListener('change', function () {
      draft.manufacturerId = this.value;
      renderRefs();
    });
    document.getElementById('dosFormLongTerm').addEventListener('change', function () {
      document.getElementById('dosFormValidTo').disabled = this.checked;
      if (this.checked) document.getElementById('dosFormValidTo').value = '';
    });
    document.getElementById('dosFormRefs').addEventListener('change', function (ev) {
      if (ev.target.matches('[data-ref-select]')) syncRefsFromDom();
    });
    document.getElementById('dosFormUploads').addEventListener('click', function (ev) {
      var add = ev.target.closest('[data-upload-add]');
      if (add) {
        var code = add.getAttribute('data-upload-add');
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
      var del = ev.target.closest('[data-upload-del]');
      if (del) {
        syncUploadsMeta();
        var c = del.getAttribute('data-upload-del');
        var i = parseInt(del.getAttribute('data-idx'), 10);
        if (draft.uploads[c]) draft.uploads[c].splice(i, 1);
        renderUploads();
      }
    });
    document.getElementById('dosMapAddBtn').addEventListener('click', function () {
      readHeader();
      if (!draft.typeCode) {
        toast('请先选择管控类型');
        return;
      }
      openMapPicker();
    });
    document.getElementById('dosMapBody').addEventListener('click', function (ev) {
      var del = ev.target.closest('[data-map-del]');
      if (!del) return;
      syncMapsMeta();
      draft.mappings.splice(parseInt(del.getAttribute('data-map-del'), 10), 1);
      renderMaps();
    });
    document.getElementById('dosFormCancel').addEventListener('click', function () {
      location.href = pageHref('master_data_compliance_dossier.html');
    });
    document.getElementById('dosFormDraft').addEventListener('click', function () { persist('draft'); });
    document.getElementById('dosFormActive').addEventListener('click', function () { persist('active'); });
  }

  function init() {
    bind();
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
