/**
 * 合规模板 · 新建 / 编辑整页
 */
(function () {
  var store = window.MasterDataComplianceStore;
  if (!store) return;

  var editingId = null;
  var draftItems = [];

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

  function queryId() {
    var m = /[?&]id=([^&]+)/.exec(location.search || '');
    return m ? decodeURIComponent(m[1]) : '';
  }

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

  function renderItems() {
    var body = document.getElementById('tplItemTableBody');
    if (!body) return;
    if (!draftItems.length) {
      body.innerHTML = '<tr><td colspan="9" class="mdb-table-empty">请至少添加一个清单项</td></tr>';
      return;
    }
    body.innerHTML = draftItems.map(function (item, index) {
      var isRef = item.source === 'subject_ref';
      var typeOptions = store.CERT_TYPES.map(function (t) {
        var checked = (item.certTypes || []).indexOf(t) >= 0 ? ' checked' : '';
        return '<label><input type="checkbox" data-item-type="' + index + '" value="' + escapeHtml(t) + '"' + checked + (isRef ? '' : ' disabled') + '>' + escapeHtml(t) + '</label>';
      }).join('');
      return '<tr data-item-row="' + index + '">' +
        '<td><input class="erp-input" data-item-sort type="number" value="' + (index + 1) + '" style="width:56px" readonly></td>' +
        '<td><input class="erp-input" data-item-field="code" value="' + escapeHtml(item.code) + '" maxlength="32" placeholder="项编码"></td>' +
        '<td><input class="erp-input" data-item-field="name" value="' + escapeHtml(item.name) + '" maxlength="40" placeholder="项名称"></td>' +
        '<td><select class="erp-select" data-item-field="source">' +
        '<option value="subject_ref"' + (item.source === 'subject_ref' ? ' selected' : '') + '>主体引用</option>' +
        '<option value="dossier_upload"' + (item.source === 'dossier_upload' ? ' selected' : '') + '>档案包上传</option>' +
        '</select></td>' +
        '<td><select class="erp-select" data-item-field="role"' + (isRef ? '' : ' disabled') + '>' +
        '<option value="委托方"' + (item.role === '委托方' ? ' selected' : '') + '>委托方</option>' +
        '<option value="生产方"' + (item.role === '生产方' ? ' selected' : '') + '>生产方</option>' +
        '</select></td>' +
        '<td><div class="compliance-check-list">' + typeOptions + '</div></td>' +
        '<td><select class="erp-select" data-item-field="required">' +
        '<option value="1"' + (item.required ? ' selected' : '') + '>必填</option>' +
        '<option value="0"' + (!item.required ? ' selected' : '') + '>选填</option>' +
        '</select></td>' +
        '<td><select class="erp-select" data-item-field="expiryWarn">' +
        '<option value="1"' + (item.expiryWarn ? ' selected' : '') + '>是</option>' +
        '<option value="0"' + (!item.expiryWarn ? ' selected' : '') + '>否</option>' +
        '</select></td>' +
        '<td class="compliance-item-table__op">' +
        '<button type="button" class="mdb-op-btn" data-item-up="' + index + '"' + (index === 0 ? ' disabled' : '') + '>上移</button> ' +
        '<button type="button" class="mdb-op-btn" data-item-down="' + index + '"' + (index === draftItems.length - 1 ? ' disabled' : '') + '>下移</button> ' +
        '<button type="button" class="mdb-op-btn mdb-op-btn--danger" data-item-del="' + index + '">删除</button>' +
        '</td></tr>';
    }).join('');
  }

  function syncRow(index, row) {
    if (!draftItems[index] || !row) return;
    var item = draftItems[index];
    row.querySelectorAll('[data-item-field]').forEach(function (el) {
      var key = el.getAttribute('data-item-field');
      if (key === 'required' || key === 'expiryWarn') item[key] = el.value === '1';
      else item[key] = String(el.value || '').trim();
    });
    if (item.source !== 'subject_ref') {
      item.role = '';
      item.certTypes = [];
    } else {
      item.certTypes = [];
      row.querySelectorAll('[data-item-type]').forEach(function (cb) {
        if (cb.checked) item.certTypes.push(cb.value);
      });
    }
  }

  function syncAll() {
    document.querySelectorAll('[data-item-row]').forEach(function (row) {
      var index = parseInt(row.getAttribute('data-item-row'), 10);
      syncRow(index, row);
    });
  }

  function load() {
    editingId = queryId();
    var title = document.getElementById('complianceTplFormTitle');
    if (editingId) {
      var item = store.templates().find(function (t) { return t.id === editingId; });
      if (!item) {
        if (typeof showToast === 'function') showToast('模板不存在', 'warning');
        location.href = pageHref('master_data_compliance_template.html');
        return;
      }
      if (title) title.textContent = '编辑合规模板';
      document.getElementById('tplFormCode').value = item.code || '';
      document.getElementById('tplFormCode').disabled = true;
      document.getElementById('tplFormName').value = item.name || '';
      document.getElementById('tplFormStatus').value = item.status === 'disabled' ? 'disabled' : 'active';
      document.getElementById('tplFormTip').value = item.tip || '';
      draftItems = JSON.parse(JSON.stringify(item.items || []));
    } else {
      if (title) title.textContent = '新建合规模板';
      draftItems = [emptyItem()];
    }
    renderItems();
  }

  function save() {
    syncAll();
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
      if (!it.code) {
        if (typeof showToast === 'function') showToast('请输入项编码', 'warning');
        return;
      }
      if (!/^[A-Za-z0-9_]+$/.test(it.code)) {
        if (typeof showToast === 'function') showToast('项编码仅支持英数下划线', 'warning');
        return;
      }
      if (codes[it.code]) {
        if (typeof showToast === 'function') showToast('项编码已存在', 'warning');
        return;
      }
      codes[it.code] = true;
      if (!it.name) {
        if (typeof showToast === 'function') showToast('请输入项名称', 'warning');
        return;
      }
      if (it.source === 'subject_ref') {
        if (!it.role) {
          if (typeof showToast === 'function') showToast('请选择主体角色', 'warning');
          return;
        }
        if (!it.certTypes || !it.certTypes.length) {
          if (typeof showToast === 'function') showToast('请选择允许证照类型', 'warning');
          return;
        }
      }
    }
    var payload = {
      code: code,
      name: name,
      status: status,
      tip: tip,
      updatedAt: new Date().toISOString().slice(0, 10),
      items: draftItems.map(function (it) {
        return {
          code: it.code,
          name: it.name,
          source: it.source,
          role: it.source === 'subject_ref' ? it.role : '',
          certTypes: it.source === 'subject_ref' ? (it.certTypes || []).slice() : [],
          required: !!it.required,
          expiryWarn: !!it.expiryWarn
        };
      })
    };
    if (editingId) {
      var current = list.find(function (t) { return t.id === editingId; });
      if (!current) return;
      current.name = payload.name;
      current.status = payload.status;
      current.tip = payload.tip;
      current.updatedAt = payload.updatedAt;
      current.items = payload.items;
      store.saveTemplates();
      if (typeof showToast === 'function') showToast('合规模板已更新', 'success');
    } else {
      payload.id = store.nextTemplateId();
      list.push(payload);
      store.saveTemplates();
      if (typeof showToast === 'function') showToast('合规模板已创建', 'success');
    }
    location.href = pageHref('master_data_compliance_template.html');
  }

  function bind() {
    document.getElementById('tplItemAddBtn').addEventListener('click', function () {
      syncAll();
      draftItems.push(emptyItem());
      renderItems();
    });
    document.getElementById('tplItemTableBody').addEventListener('click', function (ev) {
      var up = ev.target.closest('[data-item-up]');
      var down = ev.target.closest('[data-item-down]');
      var del = ev.target.closest('[data-item-del]');
      if (up || down || del) syncAll();
      if (up) {
        var ui = parseInt(up.getAttribute('data-item-up'), 10);
        if (ui > 0) {
          var tmp = draftItems[ui - 1];
          draftItems[ui - 1] = draftItems[ui];
          draftItems[ui] = tmp;
          renderItems();
        }
        return;
      }
      if (down) {
        var di = parseInt(down.getAttribute('data-item-down'), 10);
        if (di < draftItems.length - 1) {
          var tmp2 = draftItems[di + 1];
          draftItems[di + 1] = draftItems[di];
          draftItems[di] = tmp2;
          renderItems();
        }
        return;
      }
      if (del) {
        if (draftItems.length <= 1) {
          if (typeof showToast === 'function') showToast('请至少保留一个清单项', 'warning');
          return;
        }
        draftItems.splice(parseInt(del.getAttribute('data-item-del'), 10), 1);
        renderItems();
      }
    });
    document.getElementById('tplItemTableBody').addEventListener('change', function (ev) {
      var row = ev.target.closest('[data-item-row]');
      if (!row) return;
      var index = parseInt(row.getAttribute('data-item-row'), 10);
      syncRow(index, row);
      if (ev.target.getAttribute('data-item-field') === 'source') renderItems();
    });
    document.getElementById('tplFormCancel').addEventListener('click', function () {
      location.href = pageHref('master_data_compliance_template.html');
    });
    document.getElementById('tplFormSave').addEventListener('click', save);
  }

  function init() {
    bind();
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
