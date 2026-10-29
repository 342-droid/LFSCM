/**
 * 合规模板 · 列表
 */
(function () {
  var store = window.MasterDataComplianceStore;
  if (!store) return;

  var state = {
    query: { name: '', code: '', status: '' },
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

  function tplStatus(item) {
    return item && item.status === 'disabled' ? 'disabled' : 'active';
  }

  function visible() {
    var q = state.query;
    return store.templates().filter(function (item) {
      if (q.name && String(item.name || '').toLowerCase().indexOf(q.name.toLowerCase()) < 0) return false;
      if (q.code && String(item.code || '').toLowerCase().indexOf(q.code.toLowerCase()) < 0) return false;
      if (q.status && tplStatus(item) !== q.status) return false;
      return true;
    });
  }

  function totalPages(total) {
    return Math.max(1, Math.ceil(total / state.pageSize) || 1);
  }

  function usedByDossier(code) {
    return store.dossiers().some(function (d) { return d.typeCode === code; });
  }

  function renderTable(list) {
    var body = document.getElementById('complianceTplTableBody');
    if (!body) return;
    if (!list.length) {
      var empty = state.query.name || state.query.code || state.query.status ? '暂无符合条件的合规模板' : '暂无合规模板';
      body.innerHTML = '<tr><td class="mdb-table-empty" colspan="6">' + empty + '</td></tr>';
      return;
    }
    var start = (state.page - 1) * state.pageSize;
    body.innerHTML = list.slice(start, start + state.pageSize).map(function (item) {
      var items = item.items || [];
      var req = items.filter(function (it) { return it.required; }).length;
      var action = tplStatus(item) === 'disabled' ? '启用' : '停用';
      return '<tr>' +
        '<td>' + escapeHtml(item.code) + '</td>' +
        '<td>' + escapeHtml(item.name) + '</td>' +
        '<td>' + req + ' 必填 / ' + items.length + ' 项</td>' +
        '<td><span class="mdb-status mdb-status--' + tplStatus(item) + '">' + (tplStatus(item) === 'disabled' ? '停用' : '启用') + '</span></td>' +
        '<td>' + escapeHtml(item.updatedAt || '—') + '</td>' +
        '<td class="mdb-table__op"><div class="mdb-table__ops">' +
        '<button type="button" class="mdb-op-btn" data-tpl-edit="' + escapeHtml(item.id) + '">编辑</button>' +
        '<button type="button" class="mdb-op-btn" data-tpl-status="' + escapeHtml(item.id) + '">' + action + '</button>' +
        '</div></td></tr>';
    }).join('');
  }

  function renderPagination(total) {
    var totalEl = document.getElementById('complianceTplPaginationTotal');
    var pagesEl = document.getElementById('complianceTplPaginationPages');
    var gotoEl = document.getElementById('complianceTplPageGoto');
    if (totalEl) totalEl.textContent = '共 ' + total + ' 条';
    var pages = totalPages(total);
    if (state.page > pages) state.page = pages;
    if (gotoEl) gotoEl.value = String(state.page);
    if (!pagesEl) return;
    var html = '';
    html += '<button type="button" class="product-pagination__btn" data-tpl-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>上一页</button>';
    for (var i = 1; i <= pages; i++) {
      if (pages > 7 && Math.abs(i - state.page) > 2 && i !== 1 && i !== pages) {
        if (i === 2 || i === pages - 1) html += '<span class="product-pagination__ellipsis">…</span>';
        continue;
      }
      html += '<button type="button" class="product-pagination__btn' + (i === state.page ? ' is-active' : '') + '" data-tpl-page="' + i + '">' + i + '</button>';
    }
    html += '<button type="button" class="product-pagination__btn" data-tpl-page="' + (state.page + 1) + '"' + (state.page >= pages ? ' disabled' : '') + '>下一页</button>';
    pagesEl.innerHTML = html;
  }

  function renderPage() {
    var list = visible();
    renderTable(list);
    renderPagination(list.length);
  }

  function openWarn() {
    var s = store.settings();
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop product-category-modal-backdrop';
    backdrop.innerHTML =
      '<div class="erp-modal" role="dialog" aria-modal="true" style="width:420px">' +
      '<div class="erp-modal__header"><h2 class="erp-modal__title">预警设置</h2>' +
      '<div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-warn-close aria-label="关闭">&times;</button></div></div>' +
      '<div class="erp-modal__body"><label class="mdb-field"><span><i>*</i>到期前提醒天数</span>' +
      '<input id="complianceWarnDays" type="number" min="1" value="' + escapeHtml(s.warnDays || 60) + '"></label>' +
      '<label class="mdb-field" style="margin-top:12px"><span>允许不齐套仍生效</span>' +
      '<select id="complianceAllowIncomplete"><option value="1"' + (s.allowIncompleteActive !== false ? ' selected' : '') + '>开</option>' +
      '<option value="0"' + (s.allowIncompleteActive === false ? ' selected' : '') + '>关</option></select></label>' +
      '</div><div class="erp-modal__footer"><button type="button" class="erp-btn" data-warn-close>取消</button>' +
      '<button type="button" class="erp-btn erp-btn--primary" data-warn-save>确定</button></div></div>';
    function close() { backdrop.remove(); }
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop || ev.target.closest('[data-warn-close]')) close();
      if (ev.target.closest('[data-warn-save]')) {
        var days = parseInt(document.getElementById('complianceWarnDays').value, 10);
        if (!days || days < 1) {
          if (typeof showToast === 'function') showToast('请输入有效的提醒天数', 'warning');
          return;
        }
        s.warnDays = days;
        s.allowIncompleteActive = document.getElementById('complianceAllowIncomplete').value === '1';
        store.saveSettings();
        close();
        if (typeof showToast === 'function') showToast('预警设置已更新', 'success');
      }
    });
    document.body.appendChild(backdrop);
  }

  function toggleStatus(id) {
    var item = store.templates().find(function (t) { return t.id === id; });
    if (!item) return;
    var disabling = tplStatus(item) !== 'disabled';
    if (disabling && usedByDossier(item.code)) {
      if (typeof showToast === 'function') {
        showToast('已有合规档案使用该管控类型，停用后不可新建该类型档案', 'warning');
      }
    }
    item.status = disabling ? 'disabled' : 'active';
    item.updatedAt = new Date().toISOString().slice(0, 10);
    store.saveTemplates();
    renderPage();
    if (typeof showToast === 'function') showToast(disabling ? '模板已停用' : '模板已启用', 'success');
  }

  var formState = { editingId: null, draftItems: [] };

  function emptyItem() {
    return {
      code: '',
      name: '',
      source: 'subject_ref',
      role: '委托方',
      certTypes: ['营业执照'],
      required: true,
      expiryWarn: true
    };
  }

  function closeItemDrawer() {
    var drawer = document.querySelector('[data-compliance-tpl-item-drawer]');
    if (drawer) drawer.remove();
  }

  function closeTplForm() {
    closeItemDrawer();
    var modal = document.querySelector('[data-compliance-tpl-modal]');
    if (modal) modal.remove();
    formState.editingId = null;
    formState.draftItems = [];
  }

  function itemSourceLabel(item) {
    return item && item.source === 'dossier_upload' ? '档案包上传' : '主体引用';
  }

  function itemSummary(item) {
    if (!item) return '—';
    if (item.source === 'dossier_upload') return '包内上传';
    var role = item.role || '—';
    var types = Array.isArray(item.certTypes) && item.certTypes.length
      ? item.certTypes.join('、')
      : '未选类型';
    return role + ' · ' + types;
  }

  function suggestItemCode(name, index) {
    var text = String(name || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (text) return text.slice(0, 32);
    return 'ITEM_' + (index + 1);
  }

  function renderFormItems() {
    var body = document.getElementById('tplItemTableBody');
    if (!body) return;
    var draftItems = formState.draftItems;
    if (!draftItems.length) {
      body.innerHTML = '<tr><td colspan="7" class="mdb-table-empty">请至少添加一个清单项</td></tr>';
      return;
    }
    body.innerHTML = draftItems.map(function (item, index) {
      var nameText = item.name || '未命名清单项';
      var codeText = item.code ? '<div class="compliance-item-summary__code">' + escapeHtml(item.code) + '</div>' : '';
      return '<tr data-item-row="' + index + '">' +
        '<td class="compliance-item-summary__ord">' + (index + 1) + '</td>' +
        '<td><div class="compliance-item-summary__name">' + escapeHtml(nameText) + '</div>' + codeText + '</td>' +
        '<td>' + escapeHtml(itemSourceLabel(item)) + '</td>' +
        '<td class="compliance-item-summary__meta">' + escapeHtml(itemSummary(item)) + '</td>' +
        '<td>' + (item.required ? '必填' : '选填') + '</td>' +
        '<td>' + (item.expiryWarn ? '是' : '否') + '</td>' +
        '<td class="compliance-item-table__op">' +
        '<button type="button" class="mdb-op-btn" data-item-edit="' + index + '">编辑</button> ' +
        '<button type="button" class="mdb-op-btn" data-item-up="' + index + '"' + (index === 0 ? ' disabled' : '') + '>上移</button> ' +
        '<button type="button" class="mdb-op-btn" data-item-down="' + index + '"' + (index === draftItems.length - 1 ? ' disabled' : '') + '>下移</button> ' +
        '<button type="button" class="mdb-op-btn mdb-op-btn--danger" data-item-del="' + index + '">删除</button>' +
        '</td></tr>';
    }).join('');
  }

  function openItemDrawer(index) {
    closeItemDrawer();
    if (index < 0 || index >= formState.draftItems.length) return;
    var item = formState.draftItems[index];
    var isNew = !item.name && !item.code;
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop erp-modal-backdrop--nested compliance-item-drawer-backdrop';
    backdrop.setAttribute('data-compliance-tpl-item-drawer', '1');
    var typeChecks = store.CERT_TYPES.map(function (t) {
      var checked = (item.certTypes || []).indexOf(t) >= 0 ? ' checked' : '';
      return '<label class="compliance-item-drawer__check"><input type="checkbox" name="itemCertType" value="' +
        escapeHtml(t) + '"' + checked + '>' + escapeHtml(t) + '</label>';
    }).join('');
    backdrop.innerHTML =
      '<div class="erp-modal mdb-modal compliance-item-drawer" role="dialog" aria-modal="true">' +
      '<div class="erp-modal__header"><h2 class="erp-modal__title">' + (isNew ? '添加清单项' : '编辑清单项') + '</h2>' +
      '<div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-item-drawer-close aria-label="关闭">&times;</button></div></div>' +
      '<div class="erp-modal__body">' +
      '<div class="mdm-biz-tip" role="note"><strong>主体引用</strong>：从供应商主体证照勾选；<strong>档案包上传</strong>：材料挂在本档案包内，不选供应商证照。</div>' +
      '<div class="mdb-form compliance-item-drawer__form">' +
      '<label class="mdb-field"><span><i>*</i>项名称</span><input id="itemDrawerName" maxlength="40" placeholder="如：委托方营业执照" value="' + escapeHtml(item.name || '') + '"></label>' +
      '<div class="compliance-item-drawer__row2">' +
      '<label class="mdb-field"><span><i>*</i>必要程度</span><select id="itemDrawerRequired"><option value="1"' + (item.required !== false ? ' selected' : '') + '>必填</option><option value="0"' + (item.required === false ? ' selected' : '') + '>选填</option></select></label>' +
      '<label class="mdb-field"><span><i>*</i>效期预警</span><select id="itemDrawerExpiry"><option value="1"' + (item.expiryWarn !== false ? ' selected' : '') + '>是</option><option value="0"' + (item.expiryWarn === false ? ' selected' : '') + '>否</option></select></label>' +
      '</div>' +
      '<label class="mdb-field"><span><i>*</i>来源</span><select id="itemDrawerSource">' +
      '<option value="subject_ref"' + (item.source !== 'dossier_upload' ? ' selected' : '') + '>主体引用</option>' +
      '<option value="dossier_upload"' + (item.source === 'dossier_upload' ? ' selected' : '') + '>档案包上传</option>' +
      '</select></label>' +
      '<div data-item-ref-fields>' +
      '<label class="mdb-field"><span><i>*</i>主体角色</span><select id="itemDrawerRole">' +
      '<option value="委托方"' + (item.role !== '生产方' ? ' selected' : '') + '>委托方</option>' +
      '<option value="生产方"' + (item.role === '生产方' ? ' selected' : '') + '>生产方</option>' +
      '</select></label>' +
      '<div class="mdb-field mdb-field--wide"><span><i>*</i>允许证照类型</span><div class="compliance-item-drawer__checks" id="itemDrawerTypes">' + typeChecks + '</div></div>' +
      '</div>' +
      '<p class="mdb-doc-hint compliance-item-drawer__upload-tip" data-item-upload-tip hidden>本项材料在产品合规档案中由业务上传附件，无需选择供应商主体证照。</p>' +
      '<details class="compliance-item-drawer__advanced"' + (item.code ? ' open' : '') + '>' +
      '<summary>高级设置 · 项编码</summary>' +
      '<label class="mdb-field" style="margin-top:10px"><span><i>*</i>项编码</span><input id="itemDrawerCode" maxlength="32" placeholder="英数下划线，模板内唯一" value="' + escapeHtml(item.code || '') + '"></label>' +
      '<p class="mdb-doc-hint">档案引用/上传挂在此编码上；已有档案后请勿随意修改。留空保存时将按名称自动生成。</p>' +
      '</details>' +
      '</div></div>' +
      '<div class="erp-modal__footer"><button type="button" class="erp-btn" data-item-drawer-close>取消</button>' +
      '<button type="button" class="erp-btn erp-btn--primary" data-item-drawer-save>确定</button></div></div>';

    function syncSourceUi() {
      var source = document.getElementById('itemDrawerSource').value;
      var refBox = backdrop.querySelector('[data-item-ref-fields]');
      var tip = backdrop.querySelector('[data-item-upload-tip]');
      var isRef = source === 'subject_ref';
      if (refBox) refBox.hidden = !isRef;
      if (tip) tip.hidden = isRef;
    }

    function closeDrawer() { backdrop.remove(); }

    function saveDrawer() {
      var name = String(document.getElementById('itemDrawerName').value || '').trim();
      var source = document.getElementById('itemDrawerSource').value === 'dossier_upload' ? 'dossier_upload' : 'subject_ref';
      var required = document.getElementById('itemDrawerRequired').value === '1';
      var expiryWarn = document.getElementById('itemDrawerExpiry').value === '1';
      var role = document.getElementById('itemDrawerRole').value;
      var code = String(document.getElementById('itemDrawerCode').value || '').trim();
      var certTypes = [];
      backdrop.querySelectorAll('input[name="itemCertType"]:checked').forEach(function (cb) {
        certTypes.push(cb.value);
      });
      if (!name) {
        if (typeof showToast === 'function') showToast('请输入项名称', 'warning');
        return;
      }
      if (!code) code = suggestItemCode(name, index);
      if (!/^[A-Za-z0-9_]+$/.test(code)) {
        if (typeof showToast === 'function') showToast('项编码仅支持英数下划线', 'warning');
        return;
      }
      var dup = formState.draftItems.some(function (it, i) {
        return i !== index && it.code === code;
      });
      if (dup) {
        if (typeof showToast === 'function') showToast('项编码已存在', 'warning');
        return;
      }
      if (source === 'subject_ref') {
        if (!role) {
          if (typeof showToast === 'function') showToast('请选择主体角色', 'warning');
          return;
        }
        if (!certTypes.length) {
          if (typeof showToast === 'function') showToast('请选择允许证照类型', 'warning');
          return;
        }
      } else {
        role = '';
        certTypes = [];
      }
      formState.draftItems[index] = {
        code: code,
        name: name,
        source: source,
        role: role,
        certTypes: certTypes,
        required: required,
        expiryWarn: expiryWarn
      };
      closeDrawer();
      renderFormItems();
    }

    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop || ev.target.closest('[data-item-drawer-close]')) {
        if (isNew && !item.name && !item.code) {
          formState.draftItems.splice(index, 1);
          if (!formState.draftItems.length) formState.draftItems.push(emptyItem());
          renderFormItems();
        }
        closeDrawer();
        return;
      }
      if (ev.target.closest('[data-item-drawer-save]')) saveDrawer();
    });
    document.body.appendChild(backdrop);
    document.getElementById('itemDrawerSource').addEventListener('change', syncSourceUi);
    syncSourceUi();
    var nameEl = document.getElementById('itemDrawerName');
    if (nameEl) nameEl.focus();
  }

  function saveTplForm() {
    var editingId = formState.editingId;
    var draftItems = formState.draftItems;
    var code = String(document.getElementById('tplFormCode').value || '').trim();
    var name = String(document.getElementById('tplFormName').value || '').trim();
    var status = document.getElementById('tplFormStatus').value === 'disabled' ? 'disabled' : 'active';
    var tip = String(document.getElementById('tplFormTip').value || '').trim();
    if (!code) {
      if (typeof showToast === 'function') showToast('请输入管控类型编码', 'warning');
      return;
    }
    if (!/^[A-Za-z0-9_]+$/.test(code)) {
      if (typeof showToast === 'function') showToast('管控类型编码仅支持英数下划线', 'warning');
      return;
    }
    if (!name) {
      if (typeof showToast === 'function') showToast('请输入模板名称', 'warning');
      return;
    }
    var list = store.templates();
    if (list.some(function (t) { return t.code === code && t.id !== editingId; })) {
      if (typeof showToast === 'function') showToast('管控类型编码已存在', 'warning');
      return;
    }
    if (list.some(function (t) { return t.name === name && t.id !== editingId; })) {
      if (typeof showToast === 'function') showToast('模板名称已存在', 'warning');
      return;
    }
    if (!draftItems.length) {
      if (typeof showToast === 'function') showToast('请至少保留一个清单项', 'warning');
      return;
    }
    var codes = {};
    for (var i = 0; i < draftItems.length; i++) {
      var it = draftItems[i];
      function failItem(msg) {
        if (typeof showToast === 'function') showToast(msg, 'warning');
        openItemDrawer(i);
      }
      if (!it.code) {
        failItem('请完善第 ' + (i + 1) + ' 项的项编码');
        return;
      }
      if (!/^[A-Za-z0-9_]+$/.test(it.code)) {
        failItem('第 ' + (i + 1) + ' 项编码仅支持英数下划线');
        return;
      }
      if (codes[it.code]) {
        failItem('项编码「' + it.code + '」重复，请修改');
        return;
      }
      codes[it.code] = true;
      if (!it.name) {
        failItem('请完善第 ' + (i + 1) + ' 项的项名称');
        return;
      }
      if (it.source === 'subject_ref') {
        if (!it.role) {
          failItem('请为第 ' + (i + 1) + ' 项选择主体角色');
          return;
        }
        if (!it.certTypes || !it.certTypes.length) {
          failItem('请为第 ' + (i + 1) + ' 项选择允许证照类型');
          return;
        }
      }
    }
    var payloadItems = draftItems.map(function (row) {
      return {
        code: row.code,
        name: row.name,
        source: row.source,
        role: row.source === 'subject_ref' ? row.role : '',
        certTypes: row.source === 'subject_ref' ? (row.certTypes || []).slice() : [],
        required: !!row.required,
        expiryWarn: !!row.expiryWarn
      };
    });
    if (editingId) {
      var current = list.find(function (t) { return t.id === editingId; });
      if (!current) return;
      current.name = name;
      current.status = status;
      current.tip = tip;
      current.updatedAt = new Date().toISOString().slice(0, 10);
      current.items = payloadItems;
      store.saveTemplates();
      if (typeof showToast === 'function') showToast('合规模板已更新', 'success');
    } else {
      list.push({
        id: store.nextTemplateId(),
        code: code,
        name: name,
        status: status,
        tip: tip,
        updatedAt: new Date().toISOString().slice(0, 10),
        items: payloadItems
      });
      store.saveTemplates();
      if (typeof showToast === 'function') showToast('合规模板已创建', 'success');
    }
    closeTplForm();
    renderPage();
  }

  function openTplForm(id) {
    closeTplForm();
    var editing = id ? store.templates().find(function (t) { return t.id === id; }) : null;
    if (id && !editing) {
      if (typeof showToast === 'function') showToast('模板不存在', 'warning');
      return;
    }
    formState.editingId = editing ? editing.id : null;
    formState.draftItems = editing
      ? JSON.parse(JSON.stringify(editing.items || []))
      : [emptyItem()];
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop product-category-modal-backdrop';
    backdrop.setAttribute('data-compliance-tpl-modal', '1');
    backdrop.innerHTML =
      '<div class="erp-modal mdb-modal mdb-compliance-tpl-modal" role="dialog" aria-modal="true">' +
      '<div class="erp-modal__header"><h2 class="erp-modal__title">' + (editing ? '编辑合规模板' : '新建合规模板') + '</h2>' +
      '<div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-tpl-form-close aria-label="关闭">&times;</button></div></div>' +
      '<div class="erp-modal__body">' +
      '<div class="mdm-biz-tip" role="note">模板变更后，已有档案包按最新清单重新计算齐套状态。</div>' +
      '<div class="mdb-form mdb-compliance-tpl-form">' +
      '<label class="mdb-field"><span><i>*</i>管控类型编码</span><input id="tplFormCode" maxlength="32" placeholder="英数下划线，如 COSMETIC_SPECIAL" value="' + escapeHtml(editing ? editing.code : '') + '"' + (editing ? ' readonly tabindex="-1"' : '') + '></label>' +
      '<label class="mdb-field"><span><i>*</i>模板名称</span><input id="tplFormName" maxlength="40" placeholder="请输入模板名称" value="' + escapeHtml(editing ? editing.name : '') + '"></label>' +
      '<label class="mdb-field"><span><i>*</i>状态</span><select id="tplFormStatus"><option value="active"' + (!editing || editing.status !== 'disabled' ? ' selected' : '') + '>启用</option><option value="disabled"' + (editing && editing.status === 'disabled' ? ' selected' : '') + '>停用</option></select></label>' +
      '<label class="mdb-field mdb-field--wide"><span>说明</span><textarea id="tplFormTip" maxlength="200" placeholder="选填" rows="2">' + escapeHtml(editing ? (editing.tip || '') : '') + '</textarea></label>' +
      '</div>' +
      '<div class="mdb-compliance-tpl-items">' +
      '<div class="mdb-compliance-tpl-items__head"><strong>清单项</strong>' +
      '<button type="button" class="mdb-btn mdb-btn--primary" id="tplItemAddBtn">+ 添加清单项</button></div>' +
      '<p class="mdb-doc-hint" style="margin:0 0 10px">列表仅展示摘要；点击「编辑」在侧层完善来源、角色与证照类型等。</p>' +
      '<div class="compliance-item-table-wrap"><table class="compliance-item-table compliance-item-table--summary"><thead><tr>' +
      '<th style="width:56px">顺序</th><th>项名称</th><th>来源</th><th>引用摘要</th><th>必要程度</th><th>效期预警</th><th class="compliance-item-table__op">操作</th>' +
      '</tr></thead><tbody id="tplItemTableBody"></tbody></table></div></div></div>' +
      '<div class="erp-modal__footer"><button type="button" class="erp-btn" data-tpl-form-close>取消</button>' +
      '<button type="button" class="erp-btn erp-btn--primary" data-tpl-form-save>保存</button></div></div>';
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop || ev.target.closest('[data-tpl-form-close]')) {
        closeTplForm();
        return;
      }
      if (ev.target.closest('[data-tpl-form-save]')) {
        saveTplForm();
        return;
      }
      if (ev.target.closest('#tplItemAddBtn')) {
        formState.draftItems.push(emptyItem());
        renderFormItems();
        openItemDrawer(formState.draftItems.length - 1);
        return;
      }
      var edit = ev.target.closest('[data-item-edit]');
      if (edit) {
        openItemDrawer(parseInt(edit.getAttribute('data-item-edit'), 10));
        return;
      }
      var up = ev.target.closest('[data-item-up]');
      var down = ev.target.closest('[data-item-down]');
      var del = ev.target.closest('[data-item-del]');
      if (up) {
        var ui = parseInt(up.getAttribute('data-item-up'), 10);
        if (ui > 0) {
          var tmp = formState.draftItems[ui - 1];
          formState.draftItems[ui - 1] = formState.draftItems[ui];
          formState.draftItems[ui] = tmp;
          renderFormItems();
        }
        return;
      }
      if (down) {
        var di = parseInt(down.getAttribute('data-item-down'), 10);
        if (di < formState.draftItems.length - 1) {
          var tmp2 = formState.draftItems[di + 1];
          formState.draftItems[di + 1] = formState.draftItems[di];
          formState.draftItems[di] = tmp2;
          renderFormItems();
        }
        return;
      }
      if (del) {
        if (formState.draftItems.length <= 1) {
          if (typeof showToast === 'function') showToast('请至少保留一个清单项', 'warning');
          return;
        }
        closeItemDrawer();
        formState.draftItems.splice(parseInt(del.getAttribute('data-item-del'), 10), 1);
        renderFormItems();
      }
    });
    document.body.appendChild(backdrop);
    renderFormItems();
    var focusEl = document.getElementById(editing ? 'tplFormName' : 'tplFormCode');
    if (focusEl) focusEl.focus();
  }

  function bind() {
    var form = document.getElementById('complianceTplQueryForm');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        state.query = {
          name: String(document.getElementById('complianceTplQueryName').value || '').trim(),
          code: String(document.getElementById('complianceTplQueryCode').value || '').trim(),
          status: String(document.getElementById('complianceTplQueryStatus').value || '')
        };
        state.page = 1;
        renderPage();
      });
    }
    var reset = document.getElementById('complianceTplQueryReset');
    if (reset) {
      reset.addEventListener('click', function () {
        document.getElementById('complianceTplQueryName').value = '';
        document.getElementById('complianceTplQueryCode').value = '';
        document.getElementById('complianceTplQueryStatus').value = '';
        state.query = { name: '', code: '', status: '' };
        state.page = 1;
        renderPage();
      });
    }
    var addBtn = document.getElementById('complianceTplAddBtn');
    if (addBtn) addBtn.addEventListener('click', function () { openTplForm(null); });
    var warnBtn = document.getElementById('complianceWarnBtn');
    if (warnBtn) warnBtn.addEventListener('click', openWarn);
    var body = document.getElementById('complianceTplTableBody');
    if (body) {
      body.addEventListener('click', function (ev) {
        var edit = ev.target.closest('[data-tpl-edit]');
        if (edit) {
          openTplForm(edit.getAttribute('data-tpl-edit'));
          return;
        }
        var st = ev.target.closest('[data-tpl-status]');
        if (st) toggleStatus(st.getAttribute('data-tpl-status'));
      });
    }
    var pages = document.getElementById('complianceTplPaginationPages');
    if (pages) {
      pages.addEventListener('click', function (ev) {
        var btn = ev.target.closest('[data-tpl-page]');
        if (!btn || btn.disabled) return;
        var next = parseInt(btn.getAttribute('data-tpl-page'), 10);
        if (!next || next === state.page) return;
        state.page = next;
        renderPage();
      });
    }
    var sizeEl = document.getElementById('complianceTplPageSize');
    if (sizeEl) {
      sizeEl.addEventListener('change', function () {
        state.pageSize = parseInt(sizeEl.value, 10) || 20;
        state.page = 1;
        renderPage();
      });
    }
    var gotoEl = document.getElementById('complianceTplPageGoto');
    if (gotoEl) {
      gotoEl.addEventListener('change', function () {
        var max = totalPages(visible().length);
        var val = parseInt(gotoEl.value, 10) || 1;
        if (val < 1) val = 1;
        if (val > max) val = max;
        state.page = val;
        renderPage();
      });
    }
  }

  function init() {
    store.mergeDemoSuppliers();
    bind();
    renderPage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
