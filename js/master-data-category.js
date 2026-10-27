(function () {
  var store = window.MasterDataCategoryStore;
  var LEVEL_LABEL = ['', '一级分类', '二级分类', '三级分类', '四级分类'];

  var state = {
    selectedL1: null,
    selectedL2: null,
    selectedL3: null,
    selectedL4: null,
    detailTab: 'info',
    detailFocusId: null,
    dragSuppressClick: false
  };

  /** 拖动排序按账号隔离：只影响当前账号看到的顺序，不改主数据全局 sort */
  var ACCOUNT_SORT_STORAGE_KEY = 'md_category_account_sort';

  function getAccountKey() {
    var user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (user) {
      var key = user.id || user.userId || user.account || user.username || user.name;
      if (key != null && String(key).trim() !== '') return String(key);
    }
    return 'default';
  }

  function parentOrderKey(parentId) {
    return parentId || '__root__';
  }

  function readAllAccountSorts() {
    try {
      var raw = localStorage.getItem(ACCOUNT_SORT_STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function writeAllAccountSorts(all) {
    try {
      localStorage.setItem(ACCOUNT_SORT_STORAGE_KEY, JSON.stringify(all || {}));
    } catch (e) { /* ignore quota */ }
  }

  function getAccountSiblingOrder(parentId) {
    var all = readAllAccountSorts();
    var byAccount = all[getAccountKey()];
    if (!byAccount) return null;
    var order = byAccount[parentOrderKey(parentId)];
    return Array.isArray(order) ? order.slice() : null;
  }

  function setAccountSiblingOrder(parentId, orderedIds) {
    var all = readAllAccountSorts();
    var accountKey = getAccountKey();
    if (!all[accountKey]) all[accountKey] = {};
    var key = parentOrderKey(parentId);
    var prev = Array.isArray(all[accountKey][key]) ? all[accountKey][key] : [];
    var next = (orderedIds || []).slice();
    var same = prev.length === next.length && prev.every(function (id, index) { return id === next[index]; });
    if (same) return false;
    all[accountKey][key] = next;
    writeAllAccountSorts(all);
    return true;
  }

  function applyAccountSort(nodes, parentId) {
    var list = (nodes || []).slice();
    var order = getAccountSiblingOrder(parentId);
    if (!order || !order.length) {
      return list.sort(function (a, b) {
        return (parseInt(a.sort, 10) || 0) - (parseInt(b.sort, 10) || 0);
      });
    }
    var indexMap = {};
    order.forEach(function (id, index) { indexMap[id] = index; });
    return list.sort(function (a, b) {
      var hasA = Object.prototype.hasOwnProperty.call(indexMap, a.id);
      var hasB = Object.prototype.hasOwnProperty.call(indexMap, b.id);
      if (hasA && hasB) return indexMap[a.id] - indexMap[b.id];
      if (hasA) return -1;
      if (hasB) return 1;
      return (parseInt(a.sort, 10) || 0) - (parseInt(b.sort, 10) || 0);
    });
  }

  function listSiblingsForAccount(parentId) {
    if (parentId) return applyAccountSort(store.getChildren(parentId), parentId);
    return applyAccountSort(store.getByLevel(1), null);
  }

  function getEffectiveSort(node) {
    if (!node) return 0;
    var siblings = listSiblingsForAccount(node.parent_id || null);
    var idx = -1;
    for (var i = 0; i < siblings.length; i += 1) {
      if (siblings[i].id === node.id) {
        idx = i;
        break;
      }
    }
    return idx >= 0 ? (idx + 1) * 10 : (parseInt(node.sort, 10) || 0);
  }

  function appendToAccountOrder(parentId, newId) {
    var order = getAccountSiblingOrder(parentId);
    if (!order || !order.length) return;
    if (order.indexOf(newId) >= 0) return;
    order.push(newId);
    setAccountSiblingOrder(parentId, order);
  }

  function removeFromAllAccountOrders(ids) {
    if (!ids || !ids.length) return;
    var idSet = {};
    ids.forEach(function (id) { idSet[id] = true; });
    var all = readAllAccountSorts();
    var changed = false;
    Object.keys(all).forEach(function (accountKey) {
      var byParent = all[accountKey] || {};
      Object.keys(byParent).forEach(function (pk) {
        var before = byParent[pk] || [];
        var after = before.filter(function (id) { return !idSet[id]; });
        if (after.length !== before.length) {
          byParent[pk] = after;
          changed = true;
        }
      });
    });
    if (changed) writeAllAccountSorts(all);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function nowStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function genId(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function selectedId(level) {
    return state['selectedL' + level];
  }

  function setSelectedId(level, id) {
    state['selectedL' + level] = id;
  }

  function hasHiddenAncestor(node) {
    var parent = node && node.parent_id ? store.getNode(node.parent_id) : null;
    while (parent) {
      if (parent.status === 'off_shelf') return true;
      parent = parent.parent_id ? store.getNode(parent.parent_id) : null;
    }
    return false;
  }

  function renderStatusTag(status) {
    if (status === 'off_shelf') {
      return '<span class="product-tag product-tag--stopped">隐藏</span>';
    }
    return '<span class="product-tag product-tag--on-shelf">显示</span>';
  }

  function renderDragHandle() {
    return (
      '<span class="product-category-cascade__drag" title="按住拖动排序" aria-label="按住拖动排序">' +
      '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">' +
      '<circle cx="5" cy="3.5" r="1.35"/><circle cx="11" cy="3.5" r="1.35"/>' +
      '<circle cx="5" cy="8" r="1.35"/><circle cx="11" cy="8" r="1.35"/>' +
      '<circle cx="5" cy="12.5" r="1.35"/><circle cx="11" cy="12.5" r="1.35"/>' +
      '</svg></span>'
    );
  }

  function renderListItem(node, selectedIdValue, showIcon, canDrag) {
    var active = node.id === selectedIdValue ? ' is-active' : '';
    var off = node.status === 'off_shelf' ? ' is-off' : '';
    var dragCls = canDrag ? ' is-draggable' : '';
    var iconHtml = '';
    if (showIcon && node.icon) {
      iconHtml = '<img class="product-category-cascade__avatar" src="' + node.icon + '" alt="">';
    } else if (showIcon) {
      iconHtml = '<span class="product-category-cascade__avatar product-category-cascade__avatar--placeholder">' + escapeHtml(node.name.charAt(0)) + '</span>';
    }
    return (
      '<li class="product-category-cascade__item' + active + off + dragCls + '" data-id="' + node.id + '" data-level="' + node.level + '"' +
      (node.parent_id ? ' data-parent-id="' + node.parent_id + '"' : ' data-parent-id=""') + '>' +
      (canDrag ? renderDragHandle() : '') +
      iconHtml +
      '<span class="product-category-cascade__name">' + escapeHtml(node.name) + '</span>' +
      renderStatusTag(node.status) +
      '<span class="product-category-cascade__count">' + node.product_count + '</span>' +
      '</li>'
    );
  }

  function renderColumn(listEl, nodes, selectedIdValue, showIcon, emptyText) {
    if (!listEl) return;
    var canDrag = nodes.length > 1;
    listEl.classList.toggle('is-sortable', canDrag);
    if (!nodes.length) {
      listEl.innerHTML = '<li class="product-category-cascade__empty">' + escapeHtml(emptyText) + '</li>';
      return;
    }
    listEl.innerHTML = nodes.map(function (n) { return renderListItem(n, selectedIdValue, showIcon, canDrag); }).join('');
  }

  function syncAddButtons() {
    var btnL2 = document.getElementById('catAddL2');
    var btnL3 = document.getElementById('catAddL3');
    var btnL4 = document.getElementById('catAddL4');
    if (btnL2) btnL2.disabled = !state.selectedL1;
    if (btnL3) btnL3.disabled = !state.selectedL2;
    if (btnL4) btnL4.disabled = !state.selectedL3;
  }

  function syncHints() {
    var l1 = state.selectedL1 ? store.getNode(state.selectedL1) : null;
    var l2 = state.selectedL2 ? store.getNode(state.selectedL2) : null;
    var l3 = state.selectedL3 ? store.getNode(state.selectedL3) : null;
    var hintL1 = document.querySelector('.product-category-cascade__col[data-level="1"] .product-category-cascade__hint');
    var hintL2 = document.getElementById('catHintL2');
    var hintL3 = document.getElementById('catHintL3');
    var hintL4 = document.getElementById('catHintL4');
    if (hintL1) {
      hintL1.textContent = '拖动排序仅当前账号生效';
    }
    if (hintL2) hintL2.textContent = l1 ? '所属：' + l1.name : '请先选择一级分类';
    if (hintL3) hintL3.textContent = l2 ? '所属：' + (l1 ? l1.name + ' / ' : '') + l2.name : '请先选择二级分类';
    if (hintL4) {
      hintL4.textContent = l3
        ? '所属：' + [l1 && l1.name, l2 && l2.name, l3.name].filter(Boolean).join(' / ')
        : '请先选择三级分类';
    }
  }

  function getDetailNode() {
    if (state.detailFocusId) return store.getNode(state.detailFocusId);
    if (state.selectedL4) return store.getNode(state.selectedL4);
    if (state.selectedL3) return store.getNode(state.selectedL3);
    if (state.selectedL2) return store.getNode(state.selectedL2);
    if (state.selectedL1) return store.getNode(state.selectedL1);
    return null;
  }

  function renderDetail() {
    var node = getDetailNode();
    var breadcrumbEl = document.getElementById('catDetailBreadcrumb');
    var paneInfo = document.getElementById('catDetailPaneInfo');
    var paneUnits = document.getElementById('catDetailPaneUnits');
    var paneFieldModel = document.getElementById('catDetailPaneFieldModel');
    var paneProducts = document.getElementById('catDetailPaneProducts');
    var tabUnits = document.getElementById('catDetailTabUnits');
    var tabFieldModel = document.getElementById('catDetailTabFieldModel');
    var tabProducts = document.getElementById('catDetailTabProducts');

    if (!node) {
      state.detailTab = 'info';
      if (breadcrumbEl) breadcrumbEl.innerHTML = '<span class="product-category-detail__crumb">请选择分类</span>';
      if (tabUnits) tabUnits.hidden = true;
      if (tabFieldModel) tabFieldModel.hidden = true;
      if (tabProducts) tabProducts.hidden = true;
      if (paneInfo) {
        paneInfo.hidden = false;
        paneInfo.innerHTML = '<div class="product-category-detail__products-empty">从左侧选择一级至四级分类</div>';
      }
      if (paneUnits) paneUnits.hidden = true;
      if (paneFieldModel) paneFieldModel.hidden = true;
      if (paneProducts) paneProducts.hidden = true;
      return;
    }

    if (breadcrumbEl) {
      var parts = node.path.split('/');
      breadcrumbEl.innerHTML = parts.map(function (part, index) {
        var cls = index === parts.length - 1 ? ' is-current' : '';
        return '<span class="product-category-detail__crumb' + cls + '">' + escapeHtml(part) + '</span>';
      }).join('<span class="product-category-detail__sep">/</span>');
    }

    if (tabUnits) tabUnits.hidden = node.level !== 1;
    if (tabFieldModel) tabFieldModel.hidden = node.level !== 1;
    if (tabProducts) tabProducts.hidden = node.level !== 4;
    if (node.level !== 1 && (state.detailTab === 'fieldmodel' || state.detailTab === 'units' || state.detailTab === 'attrcats' || state.detailTab === 'attrs')) {
      state.detailTab = 'info';
    }
    if (node.level !== 4 && state.detailTab === 'products') state.detailTab = 'info';

    document.querySelectorAll('.product-category-detail__tab').forEach(function (tab) {
      tab.classList.toggle('is-active', tab.getAttribute('data-tab') === state.detailTab);
    });

    if (paneInfo) paneInfo.hidden = state.detailTab !== 'info';
    if (paneUnits) paneUnits.hidden = state.detailTab !== 'units';
    if (paneFieldModel) paneFieldModel.hidden = state.detailTab !== 'fieldmodel';
    if (paneProducts) paneProducts.hidden = state.detailTab !== 'products';

    var deleteBlocked = store.hasBindingsInTree(node.id);
    if (paneInfo) {
      var levelText = LEVEL_LABEL[node.level] + (node.level === 4 ? '（商品挂载点）' : '');
      var iconPreview = node.icon
        ? '<img class="product-category-detail__icon" src="' + node.icon + '" alt="">'
        : '<span class="product-category-detail__icon product-category-detail__icon--placeholder">' + escapeHtml(node.name.charAt(0)) + '</span>';
      var deleteBtn = deleteBlocked
        ? '  <button type="button" class="erp-btn erp-btn--danger" disabled title="' + escapeHtml(store.BLOCK_MSG) + '">删除</button>'
        : '  <button type="button" class="erp-btn erp-btn--danger" data-detail-action="delete" data-id="' + node.id + '">删除</button>';
      var showBlocked = node.status === 'off_shelf' && hasHiddenAncestor(node);
      var statusBtn = node.status === 'off_shelf'
        ? (showBlocked
          ? '  <button type="button" class="erp-btn" disabled title="上级分类已隐藏，请先显示上级分类">显示</button>'
          : '  <button type="button" class="erp-btn" data-detail-action="on-shelf" data-id="' + node.id + '">显示</button>')
        : '  <button type="button" class="erp-btn" data-detail-action="off-shelf" data-id="' + node.id + '">隐藏</button>';
      var root = store.rootCategory(node.id);
      var fieldModelTip = node.level !== 1
        ? '<p class="product-category-modal__hint" style="margin:12px 0 0">扩展字段与可配商品信息由一级分类「' + escapeHtml(root ? root.name : '') + '」的字段模型统一维护；本级及下级新增商品时按该模型展示。</p>'
        : '';

      paneInfo.innerHTML =
        '<div class="product-category-detail__hero">' +
        iconPreview +
        '<div class="product-category-detail__hero-text">' +
        '  <h3 class="product-category-detail__name">' + escapeHtml(node.name) + '</h3>' +
        '  <p class="product-category-detail__level-tag">' + levelText + '</p>' +
        '</div>' +
        renderStatusTag(node.status) +
        '</div>' +
        '<dl class="product-category-detail__meta">' +
        '  <div class="product-category-detail__meta-row"><dt>分类编码</dt><dd>' + escapeHtml(node.code || '') + '</dd></div>' +
        '  <div class="product-category-detail__meta-row"><dt>完整路径</dt><dd>' + escapeHtml(node.path) + '</dd></div>' +
        '  <div class="product-category-detail__meta-row"><dt>排序</dt><dd>' + getEffectiveSort(node) + '<span class="product-category-detail__sort-tip">（仅当前账号）</span></dd></div>' +
        '  <div class="product-category-detail__meta-row"><dt>已绑定商品</dt><dd>' + node.product_count + ' 个' + (node.level < 4 ? '（下级汇总）' : '') + '</dd></div>' +
        '  <div class="product-category-detail__meta-row"><dt>创建时间</dt><dd>' + escapeHtml(node.created_at) + '</dd></div>' +
        '</dl>' +
        fieldModelTip +
        '<div class="product-category-detail__actions">' +
        '  <button type="button" class="erp-btn erp-btn--primary" data-detail-action="edit" data-id="' + node.id + '">编辑</button>' +
        statusBtn +
        deleteBtn +
        '</div>';
    }

    if (paneUnits && state.detailTab === 'units' && node.level === 1) {
      paneUnits.innerHTML = renderGoodsUnitsPane(node);
    }

    if (paneFieldModel && state.detailTab === 'fieldmodel' && node.level === 1) {
      paneFieldModel.innerHTML = renderFieldModelPane(node);
    }

    if (paneProducts && node.level === 4) {
      var products = store.getBindings(node.id);
      var listHtml = products.length
        ? products.map(function (product) {
          return (
            '<div class="product-category-bound-item">' +
            '<img class="product-category-bound-item__img" src="' + product.img + '" alt="">' +
            '<div class="product-category-bound-item__info">' +
            '  <div class="product-category-bound-item__name">' + escapeHtml(product.name) + '</div>' +
            '  <div class="product-category-bound-item__code">' + escapeHtml(product.sku || '') + '</div>' +
            '</div>' +
            '</div>'
          );
        }).join('')
        : '<div class="product-category-detail__products-empty">暂无绑定商品；删除分类前需解绑全部商品</div>';

      paneProducts.innerHTML =
        '<div class="product-category-detail__products-head">共 ' + products.length + ' 个商品</div>' +
        '<div class="product-category-bound-list">' + listHtml + '</div>';
    }
  }

  function renderAll() {
    var l1List = listSiblingsForAccount(null);
    var l2List = state.selectedL1 ? listSiblingsForAccount(state.selectedL1) : [];
    var l3List = state.selectedL2 ? listSiblingsForAccount(state.selectedL2) : [];
    var l4List = state.selectedL3 ? listSiblingsForAccount(state.selectedL3) : [];

    renderColumn(document.getElementById('catListL1'), l1List, state.selectedL1, true, '暂无一级分类');
    renderColumn(
      document.getElementById('catListL2'),
      l2List,
      state.selectedL2,
      true,
      state.selectedL1 ? '该一级下暂无二级分类' : '请先选择一级分类'
    );
    renderColumn(
      document.getElementById('catListL3'),
      l3List,
      state.selectedL3,
      true,
      state.selectedL2 ? '该二级下暂无三级分类' : '请先选择二级分类'
    );
    renderColumn(
      document.getElementById('catListL4'),
      l4List,
      state.selectedL4,
      true,
      state.selectedL3 ? '该三级下暂无四级分类' : '请先选择三级分类'
    );

    syncAddButtons();
    syncHints();
    renderDetail();
  }

  function clearFrom(level) {
    var current = level;
    while (current <= 4) {
      setSelectedId(current, null);
      current += 1;
    }
  }

  function selectLevel(level, id) {
    state.detailFocusId = id;
    setSelectedId(level, id);
    clearFrom(level + 1);
    renderAll();
  }

  function ensureDefaultSelection() {
    var l1 = state.selectedL1 ? store.getNode(state.selectedL1) : null;
    if (!l1 || l1.level !== 1) {
      clearFrom(1);
      return;
    }
    var l2 = state.selectedL2 ? store.getNode(state.selectedL2) : null;
    if (!l2 || l2.parent_id !== state.selectedL1) {
      clearFrom(2);
      return;
    }
    var l3 = state.selectedL3 ? store.getNode(state.selectedL3) : null;
    if (!l3 || l3.parent_id !== state.selectedL2) {
      clearFrom(3);
      return;
    }
    var l4 = state.selectedL4 ? store.getNode(state.selectedL4) : null;
    if (!l4 || l4.parent_id !== state.selectedL3) clearFrom(4);
  }

  function closeModal() {
    var modal = document.querySelector('[data-master-category-modal]');
    if (modal) modal.remove();
  }

  function renderFieldLabel(text, required) {
    var req = required ? '<span class="erp-req">*</span>' : '';
    return req + escapeHtml(text);
  }

  function renderCategoryIconUploadField(required) {
    return (
      '<div class="product-category-modal__field">' +
      '  <label class="product-category-modal__label">' + renderFieldLabel('分类图标', required) + (required ? '' : '<span class="product-category-modal__optional">选填</span>') + '</label>' +
      '  <div class="product-add-upload product-category-modal__upload">' +
      '    <button type="button" class="product-add-upload__box" id="masterCatIconBtn" aria-label="上传分类图标">' +
      '      <span class="product-add-upload__plus">+</span>' +
      '    </button>' +
      '    <input type="file" id="masterCatIconFile" accept="image/jpeg,image/png,image/webp,image/svg+xml" hidden>' +
      '    <p class="product-add-upload__hint">支持 JPG/PNG/WEBP/SVG，建议正方形，单张不超过 2MB</p>' +
      '  </div>' +
      '</div>'
    );
  }

  function setupCategoryIconUpload(backdrop, initialIcon) {
    var iconValue = initialIcon || '';
    var btn = backdrop.querySelector('#masterCatIconBtn');
    var fileInput = backdrop.querySelector('#masterCatIconFile');

    function renderPreview() {
      if (!btn) return;
      if (!iconValue) {
        btn.innerHTML = '<span class="product-add-upload__plus">+</span>';
        btn.classList.remove('product-add-upload__box--filled');
        return;
      }
      btn.innerHTML = '<img class="product-category-modal__icon-preview" src="" alt="">';
      btn.classList.add('product-add-upload__box--filled');
      var img = btn.querySelector('.product-category-modal__icon-preview');
      if (img) img.src = iconValue;
    }

    renderPreview();
    if (btn && fileInput) {
      btn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        if (!/^image\/(jpeg|png|webp|svg\+xml)$/.test(file.type)) {
          if (typeof showToast === 'function') showToast('请上传 JPG/PNG/WEBP/SVG 格式图片', 'warning');
          fileInput.value = '';
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          if (typeof showToast === 'function') showToast('图片不能超过 2MB', 'warning');
          fileInput.value = '';
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          iconValue = reader.result;
          renderPreview();
        };
        reader.readAsDataURL(file);
      });
    }

    return function getCategoryIconValue() {
      return iconValue;
    };
  }

  function parentAt(level) {
    var id = selectedId(level);
    return id ? store.getNode(id) : null;
  }

  function nextCodeSegment(parentId) {
    var max = 9;
    store.getCategories().forEach(function (item) {
      if ((item.parent_id || null) !== (parentId || null)) return;
      var current = parseInt(item.code_segment, 10);
      if (!isNaN(current) && current > max) max = current;
    });
    var next = max + 1;
    if (next > 99) return '';
    return next < 10 ? '0' + next : String(next);
  }

  function openCategoryModal(options) {
    closeModal();
    options = options || {};
    var isEdit = !!options.node;
    var node = options.node;
    var createLevel = options.createLevel || 1;
    var parents = [];
    if (!isEdit) {
      for (var level = 1; level < createLevel; level += 1) {
        parents.push(parentAt(level));
      }
    }

    var title = isEdit ? '编辑分类' : '新增' + LEVEL_LABEL[createLevel];
    var hint = isEdit
      ? '编辑「' + node.path + '」'
      : createLevel === 1
        ? '请完整填写分类信息。'
        : '将在「' + parents.map(function (item) { return item && item.name; }).filter(Boolean).join(' / ') + '」下创建' + LEVEL_LABEL[createLevel] + '。';

    var readonlyHtml = '';
    if (!isEdit && createLevel > 1) {
      readonlyHtml = parents.map(function (item, index) {
        if (!item) return '';
        return '<div class="product-category-modal__readonly"><label>所属' + LEVEL_LABEL[index + 1] + '</label><span>' + escapeHtml(item.name) + '</span></div>';
      }).join('');
    }

    var codeParent = isEdit
      ? (node.parent_id ? store.getNode(node.parent_id) : null)
      : (createLevel > 1 ? parents[parents.length - 1] : null);
    var parentPrefix = codeParent && codeParent.code ? codeParent.code : '';
    var createParentId = isEdit ? (node.parent_id || null) : (codeParent ? codeParent.id : null);
    var segmentValue = isEdit ? (node.code_segment || '') : nextCodeSegment(createParentId);
    var fullPreview = segmentValue ? parentPrefix + segmentValue : '—';
    var prefixHtml = parentPrefix
      ? '<span class="master-data-code__prefix">' + escapeHtml(parentPrefix) + '</span>'
      : '';

    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop product-category-modal-backdrop';
    backdrop.setAttribute('data-master-category-modal', '1');
    backdrop.innerHTML =
      '<div class="erp-modal product-category-modal">' +
      '  <div class="erp-modal__header"><h2 class="erp-modal__title">' + title + '</h2>' +
      '    <div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-modal-close aria-label="关闭">&times;</button></div></div>' +
      '  <div class="erp-modal__body"><p class="product-category-modal__hint">' + escapeHtml(hint) + '</p>' +
      readonlyHtml +
      '    <div class="product-category-modal__field"><label class="product-category-modal__label" for="masterCatCode">' + renderFieldLabel('分类编码', true) + '</label>' +
      '      <div class="master-data-code">' + prefixHtml +
      '        <input class="product-category-modal__input master-data-code__input master-data-code__input--locked" id="masterCatCode" type="text" value="' + escapeHtml(segmentValue) + '" readonly tabindex="-1">' +
      '      </div>' +
      '      <p class="master-data-code__preview">完整编码：<strong id="masterCatCodeFull">' + escapeHtml(fullPreview) + '</strong></p>' +
      '    </div>' +
      '    <div class="product-category-modal__field"><label class="product-category-modal__label" for="masterCatName">' + renderFieldLabel('分类名称', true) + '</label><input class="product-category-modal__input" id="masterCatName" type="text" placeholder="请输入分类名称" value="' + escapeHtml(isEdit ? node.name : '') + '"></div>' +
      renderCategoryIconUploadField(true) +
      '  </div>' +
      '  <div class="erp-modal__footer"><button type="button" class="erp-btn" data-modal-cancel>取消</button><button type="button" class="erp-btn erp-btn--primary" data-modal-save>确定</button></div></div>';

    backdrop.addEventListener('click', function (ev) { if (ev.target === backdrop) closeModal(); });
    backdrop.querySelectorAll('[data-modal-close], [data-modal-cancel]').forEach(function (btn) {
      btn.addEventListener('click', closeModal);
    });

    var getCategoryIconValue = setupCategoryIconUpload(backdrop, isEdit ? (node.icon || '') : '');

    backdrop.querySelector('[data-modal-save]').addEventListener('click', function () {
      var name = ((document.getElementById('masterCatName') || {}).value || '').trim();
      var icon = getCategoryIconValue();
      var parentId = isEdit
        ? (node.parent_id || null)
        : (createLevel === 1 ? null : (parents[parents.length - 1] ? parents[parents.length - 1].id : null));
      var segment = isEdit ? (node.code_segment || '') : nextCodeSegment(parentId);
      if (!segment) {
        if (typeof showToast === 'function') showToast('同级分类编码已用完', 'warning');
        return;
      }
      if (!name) {
        if (typeof showToast === 'function') showToast('请输入分类名称', 'warning');
        return;
      }
      if (!icon) {
        if (typeof showToast === 'function') showToast('请上传分类图标', 'warning');
        return;
      }
      var fullCode = parentPrefix + segment;
      var siblings = store.getCategories().filter(function (item) {
        return (item.parent_id || null) === parentId && (!isEdit || item.id !== node.id);
      });
      if (!isEdit && siblings.some(function (item) { return item.code_segment === segment; })) {
        if (typeof showToast === 'function') showToast('同级下已存在相同分类编码', 'warning');
        return;
      }
      if (siblings.some(function (item) { return item.name === name; })) {
        if (typeof showToast === 'function') showToast('同级下已存在同名分类', 'warning');
        return;
      }

      if (isEdit) {
        node.name = name;
        node.icon = icon;
        store.updateCategory(node);
        closeModal();
        renderAll();
        if (typeof showToast === 'function') showToast('分类已更新', 'success');
        return;
      }

      var parent = createLevel === 1 ? null : parents[parents.length - 1];
      var sort = store.nextSiblingSort(parentId);

      var newId = genId('cat');
      var newNode = {
        id: newId,
        name: name,
        code_segment: segment,
        code: fullCode,
        level: createLevel,
        parent_id: parentId,
        path: parent ? parent.path + '/' + name : name,
        path_ids: parent ? parent.path_ids.concat([newId]) : [newId],
        icon: icon,
        sort: sort,
        status: 'on_shelf',
        is_leaf: createLevel === 4,
        product_count: 0,
        attributes: [],
        attribute_categories: [],
        goods_units: [],
        created_at: nowStr()
      };
      store.addCategory(newNode);
      appendToAccountOrder(parentId, newId);
      setSelectedId(createLevel, newId);
      state.detailFocusId = newId;
      if (createLevel < 4) {
        for (var next = createLevel + 1; next <= 4; next += 1) setSelectedId(next, null);
      }
      closeModal();
      renderAll();
      if (typeof showToast === 'function') showToast('分类已创建', 'success');
    });

    document.body.appendChild(backdrop);
    var nameInput = document.getElementById('masterCatName');
    if (nameInput) nameInput.focus();
  }

  function renderGoodsUnitsPane(node) {
    var list = store.getGoodsUnits(node.id);
    var rows = list.length
      ? '<div class="master-data-attr__list">' + list.map(function (item) {
        return (
          '<div class="master-data-attr master-data-attrcat">' +
          '<div class="master-data-attr__line">' +
          '<div class="master-data-attr__name">' + escapeHtml(item.name) +
          '<span class="master-data-attr__sort">排序 ' + escapeHtml(String(item.sort != null && item.sort !== '' ? item.sort : 0)) + '</span></div>' +
          '<div class="master-data-attr__ops">' +
          '<button type="button" class="product-action__link" data-goods-unit-edit data-cat-id="' + node.id + '" data-goods-unit-id="' + item.id + '">编辑</button>' +
          '<button type="button" class="product-action__link product-action__link--muted" data-goods-unit-delete data-cat-id="' + node.id + '" data-goods-unit-id="' + item.id + '">删除</button>' +
          '</div></div></div>'
        );
      }).join('') + '</div>'
      : '<div class="product-category-detail__products-empty">暂无商品单位；配置后，本一级下新增商品与供货关系仅可选这些单位</div>';
    return (
      '<div class="master-data-attr__head"><span>共 ' + list.length + ' 个商品单位</span>' +
      '<button type="button" class="erp-btn erp-btn--primary" data-goods-unit-add data-cat-id="' + node.id + '">新增单位</button></div>' +
      '<p class="product-category-modal__hint" style="margin:0 0 12px">单位从供应链全局枚举中选择；配置后对该一级分类下全部下级生效。</p>' +
      rows
    );
  }

  function renderRequiredBadge(required, interactive, key) {
    var cls = required ? 'master-data-field-badge master-data-field-badge--required' : 'master-data-field-badge master-data-field-badge--optional';
    var text = required ? '必填' : '选填';
    if (!interactive) return '<span class="' + cls + '">' + text + '</span>';
    return '<button type="button" class="' + cls + ' is-action" data-sys-field-toggle-required data-key="' + escapeHtml(key) + '" title="点击切换必填">' + text + '</button>';
  }

  function renderTypeBadge(typeLabel) {
    return '<span class="master-data-field-type">' + escapeHtml(typeLabel || '文本') + '</span>';
  }

  function renderFieldModelTableHead() {
    return '<thead><tr><th>字段</th><th>标识</th><th>类型</th><th>必填</th><th>说明</th><th class="master-data-field-table__ops">操作</th></tr></thead>';
  }

  function renderFieldModelSystemSection(node, resolved) {
    var visible = [];
    var hidden = [];
    (resolved.systemFields || []).forEach(function (item) {
      if (item.visible) visible.push(item);
      else hidden.push(item);
    });
    var rows = visible.map(function (item) {
      var ops = item.locked
        ? '<span class="master-data-field-locked">固定</span>'
        : '<button type="button" class="product-action__link product-action__link--muted" data-sys-field-toggle-visible data-key="' + escapeHtml(item.key) + '">隐藏</button>';
      return (
        '<tr data-sys-field-row="' + escapeHtml(item.key) + '"' + (item.visible ? '' : ' class="is-hidden-field"') + '>' +
        '<td class="master-data-field-name">' + escapeHtml(item.label) + '</td>' +
        '<td><code class="master-data-field-key">' + escapeHtml(item.key) + '</code></td>' +
        '<td>' + renderTypeBadge(item.typeLabel) + '</td>' +
        '<td>' + renderRequiredBadge(item.required, !item.locked, item.key) + '</td>' +
        '<td class="master-data-field-tip">' + escapeHtml(item.tip || '—') + '</td>' +
        '<td class="master-data-field-table__ops">' + ops + '</td>' +
        '</tr>'
      );
    }).join('');
    var hiddenRows = hidden.map(function (item) {
      return (
        '<tr data-sys-field-row="' + escapeHtml(item.key) + '" class="is-hidden-field">' +
        '<td class="master-data-field-name">' + escapeHtml(item.label) + '</td>' +
        '<td><code class="master-data-field-key">' + escapeHtml(item.key) + '</code></td>' +
        '<td>' + renderTypeBadge(item.typeLabel) + '</td>' +
        '<td>' + renderRequiredBadge(false, false, item.key) + '</td>' +
        '<td class="master-data-field-tip">' + escapeHtml(item.tip || '—') + '</td>' +
        '<td class="master-data-field-table__ops">' +
        '<button type="button" class="product-action__link" data-sys-field-toggle-visible data-key="' + escapeHtml(item.key) + '">显示</button>' +
        '</td></tr>'
      );
    }).join('');
    return (
      '<section class="master-data-field-block">' +
      '<div class="master-data-field-block__head">' +
      '<h4 class="master-data-field-block__title">通用字段</h4>' +
      '<span class="master-data-field-block__count">' + visible.length + ' 个</span></div>' +
      '<div class="master-data-field-table-wrap" data-sys-field-body data-cat-id="' + node.id + '">' +
      '<table class="master-data-field-table">' + renderFieldModelTableHead() +
      '<tbody>' + (rows || '<tr><td colspan="6" class="master-data-field-empty">暂无通用字段</td></tr>') + '</tbody></table></div>' +
      (hidden.length
        ? '<details class="master-data-field-hidden"><summary>已隐藏 ' + hidden.length + ' 个通用字段</summary>' +
          '<div class="master-data-field-table-wrap"><table class="master-data-field-table">' + renderFieldModelTableHead() +
          '<tbody>' + hiddenRows + '</tbody></table></div></details>'
        : '') +
      '</section>'
    );
  }

  function renderExtensionFieldRow(node, attr) {
    var FieldModel = window.MasterDataFieldModel;
    var normalized = FieldModel && FieldModel.normalizeExtensionField
      ? FieldModel.normalizeExtensionField(attr)
      : attr;
    var tip = FieldModel && FieldModel.extensionFieldTip
      ? FieldModel.extensionFieldTip(normalized)
      : (normalized.tip || '');
    var typeLabel = FieldModel && FieldModel.typeLabel
      ? FieldModel.typeLabel(normalized.type || 'select')
      : '下拉';
    var key = normalized.key || normalized.name || '';
    return (
      '<tr>' +
      '<td class="master-data-field-name">' + escapeHtml(normalized.name) + '</td>' +
      '<td><code class="master-data-field-key">' + escapeHtml(key) + '</code></td>' +
      '<td>' + renderTypeBadge(typeLabel) + '</td>' +
      '<td>' + renderRequiredBadge(!!normalized.required, false, '') + '</td>' +
      '<td class="master-data-field-tip">' + escapeHtml(tip || '—') + '</td>' +
      '<td class="master-data-field-table__ops">' +
      '<button type="button" class="product-action__link" data-attr-edit data-cat-id="' + node.id + '" data-attr-id="' + attr.id + '">编辑</button>' +
      '<button type="button" class="product-action__link product-action__link--muted" data-attr-delete data-cat-id="' + node.id + '" data-attr-id="' + attr.id + '">删除</button>' +
      '</td></tr>'
    );
  }

  function renderFieldModelExtensionSections(node, resolved) {
    var groups = (resolved.groups || []).slice().sort(function (a, b) {
      return (parseInt(a.sort, 10) || 0) - (parseInt(b.sort, 10) || 0);
    });
    var fields = resolved.fields || [];
    var grouped = {};
    groups.forEach(function (group) { grouped[group.id] = []; });
    var orphans = [];
    fields.forEach(function (field) {
      if (field.category_id && grouped[field.category_id]) grouped[field.category_id].push(field);
      else orphans.push(field);
    });
    var sections = groups.map(function (group) {
      var list = (grouped[group.id] || []).slice().sort(function (a, b) {
        return (parseInt(a.sort, 10) || 0) - (parseInt(b.sort, 10) || 0);
      });
      var rows = list.map(function (attr) { return renderExtensionFieldRow(node, attr); }).join('');
      return (
        '<section class="master-data-field-block">' +
        '<div class="master-data-field-block__head">' +
        '<h4 class="master-data-field-block__title">' + escapeHtml(group.name) +
        '<span class="master-data-field-block__sub">· ' + escapeHtml(node.name) + '专属</span></h4>' +
        '<div class="master-data-field-block__actions">' +
        '<span class="master-data-field-block__count">' + list.length + ' 个</span>' +
        '<button type="button" class="product-action__link" data-attr-cat-edit data-cat-id="' + node.id + '" data-attr-cat-id="' + group.id + '">编辑分组</button>' +
        '<button type="button" class="product-action__link product-action__link--muted" data-attr-cat-delete data-cat-id="' + node.id + '" data-attr-cat-id="' + group.id + '">删除分组</button>' +
        '</div></div>' +
        '<div class="master-data-field-table-wrap"><table class="master-data-field-table">' + renderFieldModelTableHead() +
        '<tbody>' + (rows || '<tr><td colspan="6" class="master-data-field-empty">暂无专属字段</td></tr>') +
        '</tbody></table></div></section>'
      );
    });
    if (orphans.length) {
      var orphanRows = orphans.map(function (attr) { return renderExtensionFieldRow(node, attr); }).join('');
      sections.push(
        '<section class="master-data-field-block">' +
        '<div class="master-data-field-block__head">' +
        '<h4 class="master-data-field-block__title">未分类' +
        '<span class="master-data-field-block__sub">· ' + escapeHtml(node.name) + '专属</span></h4>' +
        '<span class="master-data-field-block__count">' + orphans.length + ' 个</span></div>' +
        '<div class="master-data-field-table-wrap"><table class="master-data-field-table">' + renderFieldModelTableHead() +
        '<tbody>' + orphanRows + '</tbody></table></div></section>'
      );
    }
    if (!sections.length) {
      return (
        '<section class="master-data-field-block">' +
        '<div class="master-data-field-block__head"><h4 class="master-data-field-block__title">类目专属字段</h4></div>' +
        '<div class="master-data-field-empty-card">暂无专属字段；可新增分组后添加扩展字段</div></section>'
      );
    }
    return sections.join('');
  }

  function renderFieldModelPane(node) {
    var resolved = store.resolveFieldModel(node.id);
    var commonCount = (resolved.systemFields || []).filter(function (item) { return item.visible; }).length;
    var extCount = (resolved.fields || []).length;
    var total = commonCount + extCount;
    return (
      '<div class="master-data-field-model" data-sys-field-body data-cat-id="' + node.id + '">' +
      '<div class="master-data-field-model__hero">' +
      '<div class="master-data-field-model__hero-main">' +
      '<h3 class="master-data-field-model__title">字段模型与一级类目绑定</h3>' +
      '<p class="master-data-field-model__bind">绑定的一级类目：<strong>' + escapeHtml(node.code ? node.code + ' ' : '') + escapeHtml(node.name) + '</strong></p>' +
      '<div class="master-data-field-model__tags">' +
      '<span class="master-data-field-chip">通用字段 ' + commonCount + '</span>' +
      '<span class="master-data-field-chip master-data-field-chip--accent">专属字段 ' + extCount + '</span>' +
      '</div></div>' +
      '<div class="master-data-field-model__hero-actions">' +
      '<button type="button" class="erp-btn" data-field-model-copy data-cat-id="' + node.id + '">从其他一级复制</button>' +
      '<button type="button" class="erp-btn" data-attr-cat-add data-cat-id="' + node.id + '">新增分组</button>' +
      '<button type="button" class="erp-btn erp-btn--primary" data-attr-add data-cat-id="' + node.id + '">新增扩展字段</button>' +
      '</div></div>' +
      renderFieldModelSystemSection(node, resolved) +
      renderFieldModelExtensionSections(node, resolved) +
      '<div class="master-data-field-model__footer">' +
      '<span>' + escapeHtml(node.name) + '模型共 <strong>' + total + '</strong> 个字段</span>' +
      '</div></div>'
    );
  }

  function closeAttrModal() {
    var modal = document.querySelector('[data-master-attr-modal]');
    if (modal) modal.remove();
  }

  function openAttributeModal(catId, attrId) {
    closeAttrModal();
    var node = store.getNode(catId);
    if (!node) return;
    if (node.level !== 1) {
      if (typeof showToast === 'function') showToast('扩展字段请在一级分类的字段模型中维护', 'warning');
      return;
    }
    var FieldModel = window.MasterDataFieldModel;
    var attrs = store.getAttributes(catId);
    var current = null;
    if (attrId) {
      for (var i = 0; i < attrs.length; i += 1) {
        if (attrs[i].id === attrId) current = attrs[i];
      }
      if (!current) return;
    }
    var currentNorm = current && FieldModel && FieldModel.normalizeExtensionField
      ? FieldModel.normalizeExtensionField(current)
      : (current || {});
    var attrCategories = store.getAttributeCategories(catId);
    var categoryOptions = '<option value="">请选择所属分组</option>' + attrCategories.map(function (item) {
      var selected = current && current.category_id === item.id ? ' selected' : '';
      return '<option value="' + escapeHtml(item.id) + '"' + selected + '>' + escapeHtml(item.name) + '</option>';
    }).join('');
    var typeList = (FieldModel && FieldModel.EXT_FIELD_TYPES)
      ? FieldModel.EXT_FIELD_TYPES
      : ['text', 'textarea', 'select', 'radio', 'multiSelect', 'number', 'integer', 'boolean', 'date'];
    var typeOptions = typeList.map(function (type) {
      var label = FieldModel && FieldModel.typeLabel ? FieldModel.typeLabel(type) : type;
      var selected = (currentNorm.type || 'select') === type ? ' selected' : '';
      return '<option value="' + type + '"' + selected + '>' + escapeHtml(label) + '</option>';
    }).join('');
    var optionsText = ((currentNorm.options || []).join('\n'));
    var categoryHint = attrCategories.length
      ? ''
      : '<p class="product-category-modal__hint">请先在字段模型中维护扩展字段分组。</p>';
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop product-category-modal-backdrop';
    backdrop.setAttribute('data-master-attr-modal', '1');
    backdrop.innerHTML =
      '<div class="erp-modal product-category-modal master-data-attr-modal">' +
      '<div class="erp-modal__header"><h2 class="erp-modal__title">' + (current ? '编辑扩展字段' : '新增扩展字段') + '</h2>' +
      '<div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-attr-modal-close aria-label="关闭">&times;</button></div></div>' +
      '<div class="erp-modal__body"><p class="product-category-modal__hint">维护一级分类「' + escapeHtml(node.name) + '」字段模型中的扩展字段。字段为扁平结构，不支持多级。</p>' +
      categoryHint +
      '<div class="product-category-modal__field"><label class="product-category-modal__label" for="masterAttrCategory">' + renderFieldLabel('所属分组', true) + '</label>' +
      '<select class="product-category-modal__input" id="masterAttrCategory">' + categoryOptions + '</select></div>' +
      '<div class="product-category-modal__field"><label class="product-category-modal__label" for="masterAttrName">' + renderFieldLabel('字段名称', true) + '</label>' +
      '<input class="product-category-modal__input" id="masterAttrName" type="text" placeholder="请输入字段名称" value="' + escapeHtml(currentNorm.name || '') + '"></div>' +
      '<div class="product-category-modal__field"><label class="product-category-modal__label" for="masterAttrKey">' + renderFieldLabel('标识', true) + '</label>' +
      '<input class="product-category-modal__input" id="masterAttrKey" type="text" placeholder="如 origin" value="' + escapeHtml(currentNorm.key || '') + '"></div>' +
      '<div class="product-category-modal__field"><label class="product-category-modal__label" for="masterAttrType">' + renderFieldLabel('类型', true) + '</label>' +
      '<select class="product-category-modal__input" id="masterAttrType">' + typeOptions + '</select></div>' +
      '<div class="product-category-modal__field"><label class="product-category-modal__label" for="masterAttrSort">' + renderFieldLabel('排序', true) + '</label>' +
      '<input class="product-category-modal__input" id="masterAttrSort" type="number" min="0" placeholder="请输入排序" value="' + (currentNorm.sort != null && currentNorm.sort !== '' ? currentNorm.sort : '') + '"></div>' +
      '<div class="product-category-modal__field"><label class="product-category-modal__label">' + renderFieldLabel('必填', false) + '</label>' +
      '<label class="master-data-field-check"><input id="masterAttrRequired" type="checkbox"' + (currentNorm.required ? ' checked' : '') + '> 必填</label></div>' +
      '<div class="product-category-modal__field"><label class="product-category-modal__label" for="masterAttrTip">' + renderFieldLabel('说明', false) + '</label>' +
      '<input class="product-category-modal__input" id="masterAttrTip" type="text" placeholder="选填，展示在字段模型与表单提示" value="' + escapeHtml(currentNorm.tip || '') + '"></div>' +
      '<div class="product-category-modal__field" id="masterAttrOptionsField"><label class="product-category-modal__label" for="masterAttrOptions">' + renderFieldLabel('选项', true) + '</label>' +
      '<textarea class="product-category-modal__input" id="masterAttrOptions" rows="5" placeholder="每行一个选项">' + escapeHtml(optionsText) + '</textarea></div>' +
      '</div>' +
      '<div class="erp-modal__footer"><button type="button" class="erp-btn" data-attr-modal-cancel>取消</button>' +
      '<button type="button" class="erp-btn erp-btn--primary" data-attr-modal-save>确定</button></div></div>';

    function syncOptionsVisibility() {
      var typeEl = document.getElementById('masterAttrType');
      var box = document.getElementById('masterAttrOptionsField');
      if (!typeEl || !box) return;
      var needs = FieldModel && FieldModel.typeNeedsOptions
        ? FieldModel.typeNeedsOptions(typeEl.value)
        : (typeEl.value === 'select' || typeEl.value === 'radio' || typeEl.value === 'multiSelect');
      box.hidden = !needs;
    }

    backdrop.addEventListener('click', function (ev) { if (ev.target === backdrop) closeAttrModal(); });
    backdrop.querySelectorAll('[data-attr-modal-close], [data-attr-modal-cancel]').forEach(function (btn) {
      btn.addEventListener('click', closeAttrModal);
    });
    backdrop.querySelector('#masterAttrType').addEventListener('change', syncOptionsVisibility);
    backdrop.querySelector('[data-attr-modal-save]').addEventListener('click', function () {
      var categoryId = (document.getElementById('masterAttrCategory') || {}).value || '';
      if (!categoryId) {
        if (typeof showToast === 'function') showToast('请选择所属分组', 'warning');
        return;
      }
      var name = (document.getElementById('masterAttrName') || {}).value.trim();
      if (!name) {
        if (typeof showToast === 'function') showToast('请输入字段名称', 'warning');
        return;
      }
      var key = (document.getElementById('masterAttrKey') || {}).value.trim();
      if (!key) {
        if (typeof showToast === 'function') showToast('请输入标识', 'warning');
        return;
      }
      var type = (document.getElementById('masterAttrType') || {}).value || 'select';
      var sortInput = document.getElementById('masterAttrSort');
      var sortText = sortInput ? String(sortInput.value || '').trim() : '';
      var sort = parseInt(sortText, 10);
      if (sortText === '' || isNaN(sort) || sort < 0) {
        if (typeof showToast === 'function') showToast('请输入排序', 'warning');
        return;
      }
      if (attrs.some(function (item) {
        if (current && item.id === current.id) return false;
        return parseInt(item.sort, 10) === sort;
      })) {
        if (typeof showToast === 'function') showToast('同级下已存在相同排序', 'warning');
        return;
      }
      if (store.listAttributeRows(catId).some(function (row) {
        if (current && row.attr.id === current.id) return false;
        return row.attr.name === name || row.attr.key === key;
      })) {
        if (typeof showToast === 'function') showToast('已存在同名字段或标识', 'warning');
        return;
      }
      var options = [];
      var needsOptions = FieldModel && FieldModel.typeNeedsOptions
        ? FieldModel.typeNeedsOptions(type)
        : (type === 'select' || type === 'radio' || type === 'multiSelect');
      if (needsOptions) {
        options = String((document.getElementById('masterAttrOptions') || {}).value || '')
          .split(/\n/)
          .map(function (line) { return line.trim(); })
          .filter(Boolean);
        if (!options.length) {
          if (typeof showToast === 'function') showToast('请填写选项，每行一个', 'warning');
          return;
        }
      }
      var next = {
        id: current ? current.id : genId('attr'),
        name: name,
        key: key,
        type: type,
        required: !!(document.getElementById('masterAttrRequired') || {}).checked,
        tip: ((document.getElementById('masterAttrTip') || {}).value || '').trim(),
        sort: sort,
        category_id: categoryId,
        options: options
      };
      if (FieldModel && FieldModel.normalizeExtensionField) next = FieldModel.normalizeExtensionField(next);
      next.id = current ? current.id : next.id;
      next.category_id = categoryId;
      var list = current
        ? attrs.map(function (item) { return item.id === next.id ? next : item; })
        : attrs.concat([next]);
      store.setAttributes(catId, list);
      closeAttrModal();
      renderAll();
      if (typeof showToast === 'function') showToast(current ? '扩展字段已更新' : '扩展字段已新增', 'success');
    });
    document.body.appendChild(backdrop);
    syncOptionsVisibility();
    var nameInput = document.getElementById('masterAttrName');
    if (nameInput) nameInput.focus();
  }

  function deleteAttribute(catId, attrId) {
    var attrs = store.getAttributes(catId);
    var attr = null;
    for (var i = 0; i < attrs.length; i += 1) {
      if (attrs[i].id === attrId) attr = attrs[i];
    }
    if (!attr) return;
    openWarmConfirm('确定删除扩展字段「' + attr.name + '」？', function () {
      store.setAttributes(catId, attrs.filter(function (item) { return item.id !== attrId; }));
      renderAll();
      if (typeof showToast === 'function') showToast('扩展字段已删除', 'success');
    });
  }

  function closeGoodsUnitModal() {
    var modal = document.querySelector('[data-master-goods-unit-modal]');
    if (modal) modal.remove();
  }

  function openGoodsUnitModal(l1Id, unitId) {
    closeGoodsUnitModal();
    var node = store.getNode(l1Id);
    if (!node || node.level !== 1) return;
    var list = store.getGoodsUnits(l1Id);
    var current = null;
    if (unitId) {
      for (var i = 0; i < list.length; i += 1) {
        if (list[i].id === unitId) current = list[i];
      }
      if (!current) return;
    }
    var enumList = (window.MasterDataGoodsUnits && window.MasterDataGoodsUnits.list)
      ? window.MasterDataGoodsUnits.list.slice()
      : [];
    var usedNames = {};
    list.forEach(function (item) {
      if (!current || item.id !== current.id) usedNames[item.name] = true;
    });
    var options = enumList.filter(function (name) {
      return current && current.name === name ? true : !usedNames[name];
    });
    if (!options.length) {
      if (typeof showToast === 'function') showToast(current ? '没有可切换的单位' : '全局枚举中的单位已全部添加', 'warning');
      return;
    }
    var optionHtml = options.map(function (name) {
      var selected = current && current.name === name ? ' selected' : (!current && name === options[0] ? ' selected' : '');
      return '<option value="' + escapeHtml(name) + '"' + selected + '>' + escapeHtml(name) + '</option>';
    }).join('');
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop product-category-modal-backdrop';
    backdrop.setAttribute('data-master-goods-unit-modal', '1');
    backdrop.innerHTML =
      '<div class="erp-modal product-category-modal">' +
      '<div class="erp-modal__header"><h2 class="erp-modal__title">' + (current ? '编辑商品单位' : '新增商品单位') + '</h2>' +
      '<div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-goods-unit-modal-close aria-label="关闭">&times;</button></div></div>' +
      '<div class="erp-modal__body"><p class="product-category-modal__hint">维护一级分类「' + escapeHtml(node.name) + '」的商品单位。配置后，该一级下新增商品与供货关系仅可选这些单位。</p>' +
      '<div class="product-category-modal__field"><label class="product-category-modal__label" for="masterGoodsUnitName">' + renderFieldLabel('单位', true) + '</label>' +
      '<select class="product-category-modal__input" id="masterGoodsUnitName">' + optionHtml + '</select></div>' +
      '<div class="product-category-modal__field"><label class="product-category-modal__label" for="masterGoodsUnitSort">' + renderFieldLabel('排序', true) + '</label>' +
      '<input class="product-category-modal__input" id="masterGoodsUnitSort" type="number" min="0" placeholder="请输入排序" value="' + (current && current.sort != null && current.sort !== '' ? current.sort : '') + '"></div>' +
      '</div>' +
      '<div class="erp-modal__footer"><button type="button" class="erp-btn" data-goods-unit-modal-cancel>取消</button>' +
      '<button type="button" class="erp-btn erp-btn--primary" data-goods-unit-modal-save>确定</button></div></div>';
    backdrop.addEventListener('click', function (ev) { if (ev.target === backdrop) closeGoodsUnitModal(); });
    backdrop.querySelectorAll('[data-goods-unit-modal-close], [data-goods-unit-modal-cancel]').forEach(function (btn) {
      btn.addEventListener('click', closeGoodsUnitModal);
    });
    backdrop.querySelector('[data-goods-unit-modal-save]').addEventListener('click', function () {
      var nameEl = document.getElementById('masterGoodsUnitName');
      var name = nameEl ? String(nameEl.value || '').trim() : '';
      if (!name) {
        if (typeof showToast === 'function') showToast('请选择单位', 'warning');
        return;
      }
      if (enumList.indexOf(name) < 0) {
        if (typeof showToast === 'function') showToast('请从全局单位枚举中选择', 'warning');
        return;
      }
      var sortInput = document.getElementById('masterGoodsUnitSort');
      var sortText = sortInput ? String(sortInput.value || '').trim() : '';
      var sort = parseInt(sortText, 10);
      if (sortText === '' || isNaN(sort) || sort < 0) {
        if (typeof showToast === 'function') showToast('请输入排序', 'warning');
        return;
      }
      if (list.some(function (item) { return (!current || item.id !== current.id) && item.name === name; })) {
        if (typeof showToast === 'function') showToast('该单位已添加', 'warning');
        return;
      }
      if (list.some(function (item) { return (!current || item.id !== current.id) && parseInt(item.sort, 10) === sort; })) {
        if (typeof showToast === 'function') showToast('同级下已存在相同排序', 'warning');
        return;
      }
      var next = {
        id: current ? current.id : genId('gunit'),
        name: name,
        sort: sort
      };
      var saved = current
        ? list.map(function (item) { return item.id === next.id ? next : item; })
        : list.concat([next]);
      store.setGoodsUnits(l1Id, saved);
      closeGoodsUnitModal();
      renderAll();
      if (typeof showToast === 'function') showToast(current ? '商品单位已更新' : '商品单位已新增', 'success');
    });
    document.body.appendChild(backdrop);
    var sortEl = document.getElementById('masterGoodsUnitSort');
    if (sortEl) sortEl.focus();
  }

  function deleteGoodsUnit(l1Id, unitId) {
    var list = store.getGoodsUnits(l1Id);
    var current = null;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === unitId) current = list[i];
    }
    if (!current) return;
    openWarmConfirm('确定删除商品单位「' + current.name + '」？', function () {
      store.setGoodsUnits(l1Id, list.filter(function (item) { return item.id !== unitId; }));
      renderAll();
      if (typeof showToast === 'function') showToast('商品单位已删除', 'success');
    });
  }

  function closeAttrCategoryModal() {
    var modal = document.querySelector('[data-master-attr-cat-modal]');
    if (modal) modal.remove();
  }

  function openAttrCategoryModal(l1Id, categoryId) {
    closeAttrCategoryModal();
    var node = store.getNode(l1Id);
    if (!node || node.level !== 1) return;
    var list = store.getAttributeCategories(l1Id);
    var current = null;
    if (categoryId) {
      for (var i = 0; i < list.length; i += 1) {
        if (list[i].id === categoryId) current = list[i];
      }
      if (!current) return;
    }
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop product-category-modal-backdrop';
    backdrop.setAttribute('data-master-attr-cat-modal', '1');
    backdrop.innerHTML =
      '<div class="erp-modal product-category-modal">' +
      '<div class="erp-modal__header"><h2 class="erp-modal__title">' + (current ? '编辑扩展字段分组' : '新增扩展字段分组') + '</h2>' +
      '<div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-attr-cat-modal-close aria-label="关闭">&times;</button></div></div>' +
      '<div class="erp-modal__body"><p class="product-category-modal__hint">维护一级分类「' + escapeHtml(node.name) + '」字段模型中的扩展字段分组。扩展字段从这里选择所属分组。</p>' +
      '<div class="product-category-modal__field"><label class="product-category-modal__label" for="masterAttrCatName">' + renderFieldLabel('分组名称', true) + '</label>' +
      '<input class="product-category-modal__input" id="masterAttrCatName" type="text" placeholder="请输入分组名称" value="' + escapeHtml(current ? current.name : '') + '"></div>' +
      '<div class="product-category-modal__field"><label class="product-category-modal__label" for="masterAttrCatSort">' + renderFieldLabel('排序', true) + '</label>' +
      '<input class="product-category-modal__input" id="masterAttrCatSort" type="number" min="0" placeholder="请输入排序" value="' + (current && current.sort != null && current.sort !== '' ? current.sort : '') + '"></div>' +
      '</div>' +
      '<div class="erp-modal__footer"><button type="button" class="erp-btn" data-attr-cat-modal-cancel>取消</button>' +
      '<button type="button" class="erp-btn erp-btn--primary" data-attr-cat-modal-save>确定</button></div></div>';
    backdrop.addEventListener('click', function (ev) { if (ev.target === backdrop) closeAttrCategoryModal(); });
    backdrop.querySelectorAll('[data-attr-cat-modal-close], [data-attr-cat-modal-cancel]').forEach(function (btn) {
      btn.addEventListener('click', closeAttrCategoryModal);
    });
    backdrop.querySelector('[data-attr-cat-modal-save]').addEventListener('click', function () {
      var name = (document.getElementById('masterAttrCatName') || {}).value.trim();
      if (!name) {
        if (typeof showToast === 'function') showToast('请输入分组名称', 'warning');
        return;
      }
      var sortInput = document.getElementById('masterAttrCatSort');
      var sortText = sortInput ? String(sortInput.value || '').trim() : '';
      var sort = parseInt(sortText, 10);
      if (sortText === '' || isNaN(sort) || sort < 0) {
        if (typeof showToast === 'function') showToast('请输入排序', 'warning');
        return;
      }
      if (list.some(function (item) { return (!current || item.id !== current.id) && item.name === name; })) {
        if (typeof showToast === 'function') showToast('已存在同名分组', 'warning');
        return;
      }
      if (list.some(function (item) { return (!current || item.id !== current.id) && parseInt(item.sort, 10) === sort; })) {
        if (typeof showToast === 'function') showToast('同级下已存在相同排序', 'warning');
        return;
      }
      var next = {
        id: current ? current.id : genId('acat'),
        name: name,
        sort: sort
      };
      var saved = current
        ? list.map(function (item) { return item.id === next.id ? next : item; })
        : list.concat([next]);
      store.setAttributeCategories(l1Id, saved);
      closeAttrCategoryModal();
      renderAll();
      if (typeof showToast === 'function') showToast(current ? '扩展字段分组已更新' : '扩展字段分组已新增', 'success');
    });
    document.body.appendChild(backdrop);
    var nameInput = document.getElementById('masterAttrCatName');
    if (nameInput) nameInput.focus();
  }

  function deleteAttributeCategory(l1Id, categoryId) {
    var list = store.getAttributeCategories(l1Id);
    var current = null;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === categoryId) current = list[i];
    }
    if (!current) return;
    if (store.isAttributeCategoryUsed(l1Id, categoryId)) {
      if (typeof showToast === 'function') showToast('该分组下已有扩展字段，请先调整后再删除', 'warning');
      return;
    }
    openWarmConfirm('确定删除扩展字段分组「' + current.name + '」？', function () {
      store.setAttributeCategories(l1Id, list.filter(function (item) { return item.id !== categoryId; }));
      renderAll();
      if (typeof showToast === 'function') showToast('扩展字段分组已删除', 'success');
    });
  }

  function closeCopyFieldModelModal() {
    var modal = document.querySelector('[data-field-model-copy-modal]');
    if (modal) modal.remove();
  }

  function openCopyFieldModelModal(targetId) {
    closeCopyFieldModelModal();
    var target = store.getNode(targetId);
    if (!target || target.level !== 1) return;
    var sources = store.getByLevel(1).filter(function (item) { return item.id !== targetId; });
    var options = sources.length
      ? sources.map(function (item) {
        return '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + '</option>';
      }).join('')
      : '';
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop product-category-modal-backdrop';
    backdrop.setAttribute('data-field-model-copy-modal', '1');
    backdrop.innerHTML =
      '<div class="erp-modal product-category-modal">' +
      '<div class="erp-modal__header"><h2 class="erp-modal__title">从其他一级复制字段模型</h2>' +
      '<div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-field-model-copy-close aria-label="关闭">&times;</button></div></div>' +
      '<div class="erp-modal__body">' +
      '<p class="product-category-modal__hint">将覆盖一级分类「' + escapeHtml(target.name) + '」当前的系统字段与扩展字段配置，类目间互不影响。</p>' +
      (sources.length
        ? '<div class="product-category-modal__field"><label class="product-category-modal__label" for="fieldModelCopySource">' + renderFieldLabel('来源一级', true) + '</label>' +
          '<select class="product-category-modal__input" id="fieldModelCopySource"><option value="">请选择来源一级分类</option>' + options + '</select></div>'
        : '<div class="product-category-detail__products-empty">暂无其他一级分类可复制</div>') +
      '</div>' +
      '<div class="erp-modal__footer"><button type="button" class="erp-btn" data-field-model-copy-cancel>取消</button>' +
      '<button type="button" class="erp-btn erp-btn--primary" data-field-model-copy-ok' + (sources.length ? '' : ' disabled') + '>确定复制</button></div></div>';
    backdrop.addEventListener('click', function (ev) { if (ev.target === backdrop) closeCopyFieldModelModal(); });
    backdrop.querySelectorAll('[data-field-model-copy-close], [data-field-model-copy-cancel]').forEach(function (btn) {
      btn.addEventListener('click', closeCopyFieldModelModal);
    });
    var okBtn = backdrop.querySelector('[data-field-model-copy-ok]');
    if (okBtn) {
      okBtn.addEventListener('click', function () {
        var sourceId = (document.getElementById('fieldModelCopySource') || {}).value || '';
        if (!sourceId) {
          if (typeof showToast === 'function') showToast('请选择来源一级分类', 'warning');
          return;
        }
        openWarmConfirm('确定用所选一级的字段模型覆盖「' + target.name + '」的当前配置？', function () {
          if (!store.copyFieldModel(targetId, sourceId)) {
            if (typeof showToast === 'function') showToast('复制失败', 'warning');
            return;
          }
          closeCopyFieldModelModal();
          renderAll();
          if (typeof showToast === 'function') showToast('字段模型已复制', 'success');
        });
      });
    }
    document.body.appendChild(backdrop);
  }

  function toggleSystemField(catId, key, action) {
    var resolved = store.resolveFieldModel(catId);
    var FieldModel = window.MasterDataFieldModel;
    var pool = FieldModel && FieldModel.SYSTEM_FIELD_POOL ? FieldModel.SYSTEM_FIELD_POOL : [];
    var next = pool.map(function (meta) {
      var current = resolved.byKey && resolved.byKey[meta.key]
        ? resolved.byKey[meta.key]
        : { visible: meta.defaultVisible, required: meta.defaultRequired, locked: meta.locked };
      if (meta.locked) {
        return { key: meta.key, visible: true, required: true };
      }
      var visible = !!current.visible;
      var required = !!current.required;
      if (meta.key === key) {
        if (action === 'visible') {
          visible = !visible;
          if (!visible) required = false;
        } else if (action === 'required') {
          if (!visible) visible = true;
          required = !required;
        }
      }
      return { key: meta.key, visible: visible, required: required && visible };
    });
    store.setSystemFields(catId, next);
    renderDetail();
    if (typeof showToast === 'function') showToast('系统字段已更新', 'success');
  }

  function openWarmConfirm(message, onConfirm) {
    var existing = document.querySelector('[data-product-warm-confirm]');
    if (existing) existing.remove();
    var backdrop = document.createElement('div');
    backdrop.className = 'erp-modal-backdrop mdm-people-warm-confirm-backdrop product-warm-confirm-backdrop';
    backdrop.setAttribute('data-product-warm-confirm', '1');
    backdrop.innerHTML =
      '<div class="erp-modal erp-modal--confirm"><div class="erp-modal__header"><h2 class="erp-modal__title">温馨提示</h2><div class="erp-modal__header-actions"><button type="button" class="erp-modal__header-btn" data-warm-close aria-label="关闭">&times;</button></div></div>' +
      '<div class="erp-modal__body"><div class="erp-modal-confirm__row"><div class="erp-modal-confirm__icon">!</div><div class="erp-modal-confirm__msg">' + escapeHtml(message) + '</div></div></div>' +
      '<div class="erp-modal__footer"><button type="button" class="erp-btn" data-warm-cancel>取消</button><button type="button" class="erp-btn erp-btn--primary" data-warm-ok>确定</button></div></div>';
    function closeWarm() { backdrop.remove(); }
    backdrop.addEventListener('click', function (ev) { if (ev.target === backdrop) closeWarm(); });
    backdrop.querySelectorAll('[data-warm-close], [data-warm-cancel]').forEach(function (btn) {
      btn.addEventListener('click', closeWarm);
    });
    backdrop.querySelector('[data-warm-ok]').addEventListener('click', function () {
      closeWarm();
      if (onConfirm) onConfirm();
    });
    document.body.appendChild(backdrop);
  }

  function deleteCategory(id) {
    if (!store.canDelete(id)) {
      if (typeof showToast === 'function') showToast(store.BLOCK_MSG, 'warning');
      return;
    }
    var node = store.getNode(id);
    if (!node) return;
    var descIds = store.collectDescendantIds(id);
    var msg = descIds.length > 1
      ? '删除「' + node.name + '」将同时删除其下 ' + (descIds.length - 1) + ' 个下级分类，确定继续？'
      : '确定删除分类「' + node.name + '」？';
    openWarmConfirm(msg, function () {
      store.removeCategoryTree(id);
      removeFromAllAccountOrders(descIds);
      [1, 2, 3, 4].forEach(function (level) {
        if (descIds.indexOf(selectedId(level)) >= 0) setSelectedId(level, null);
      });
      if (descIds.indexOf(state.detailFocusId) >= 0) state.detailFocusId = null;
      ensureDefaultSelection();
      renderAll();
      if (typeof showToast === 'function') showToast('分类已删除', 'success');
    });
  }

  function toggleShelf(id, status) {
    var node = store.getNode(id);
    if (!node) return;
    if (status === 'on_shelf' && hasHiddenAncestor(node)) {
      if (typeof showToast === 'function') showToast('上级分类已隐藏，请先显示上级分类', 'warning');
      return;
    }
    store.setCategoryStatus(id, status);
    renderAll();
    if (typeof showToast === 'function') {
      showToast(status === 'on_shelf' ? '分类已显示' : '分类已隐藏', 'success');
    }
  }

  function applyListOrderFromDom(listEl) {
    if (!listEl) return;
    var items = Array.prototype.slice.call(listEl.querySelectorAll('.product-category-cascade__item[data-id]'));
    if (items.length < 2) return;
    var parentAttr = items[0].getAttribute('data-parent-id');
    var parentId = parentAttr ? parentAttr : null;
    var orderedIds = items.map(function (item) { return item.getAttribute('data-id'); });
    var changed = setAccountSiblingOrder(parentId, orderedIds);
    if (changed) {
      renderAll();
      if (typeof showToast === 'function') showToast('排序已更新（仅当前账号）', 'success');
    }
  }

  function bindListSort(listEl) {
    if (!listEl || listEl.getAttribute('data-sort-bound') === '1') return;
    listEl.setAttribute('data-sort-bound', '1');

    var drag = null;
    var scrollRaf = 0;

    function visibleSortItems() {
      return Array.prototype.slice.call(listEl.children).filter(function (el) {
        return el.classList.contains('product-category-cascade__item') && el.getAttribute('data-id');
      });
    }

    function stopAutoScroll() {
      if (scrollRaf) {
        cancelAnimationFrame(scrollRaf);
        scrollRaf = 0;
      }
    }

    function positionGhost(clientX, clientY) {
      if (!drag || !drag.ghost) return;
      drag.ghost.style.transform =
        'translate3d(' + (clientX - drag.ghostOffsetX) + 'px,' + (clientY - drag.ghostOffsetY) + 'px,0)';
    }

    function tickAutoScroll() {
      scrollRaf = 0;
      if (!drag || !drag.moved) return;
      var rect = listEl.getBoundingClientRect();
      var y = drag.lastY;
      var edge = 48;
      var speed = 0;
      if (y < rect.top + edge) speed = -Math.max(6, (rect.top + edge - y) * 0.35);
      else if (y > rect.bottom - edge) speed = Math.max(6, (y - (rect.bottom - edge)) * 0.35);
      if (speed) {
        listEl.scrollTop += speed;
        movePlaceholder(y);
        scrollRaf = requestAnimationFrame(tickAutoScroll);
      }
    }

    function movePlaceholder(clientY) {
      if (!drag || !drag.placeholder) return;
      var items = visibleSortItems();
      var placeholder = drag.placeholder;
      if (!items.length) {
        listEl.appendChild(placeholder);
        return;
      }
      var insertBeforeEl = null;
      for (var i = 0; i < items.length; i += 1) {
        var rect = items[i].getBoundingClientRect();
        if (clientY < rect.top + rect.height * 0.45) {
          insertBeforeEl = items[i];
          break;
        }
      }
      if (insertBeforeEl) {
        if (placeholder.nextSibling !== insertBeforeEl) listEl.insertBefore(placeholder, insertBeforeEl);
      } else {
        var last = items[items.length - 1];
        if (last.nextSibling !== placeholder) listEl.insertBefore(placeholder, last.nextSibling);
      }
    }

    function endDrag(commit) {
      if (!drag) return;
      var current = drag;
      drag = null;
      stopAutoScroll();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (current.ghost && current.ghost.parentNode) current.ghost.parentNode.removeChild(current.ghost);
      if (commit && current.moved && current.placeholder && current.placeholder.parentNode) {
        current.item.classList.remove('is-drag-source');
        listEl.insertBefore(current.item, current.placeholder);
        current.placeholder.parentNode.removeChild(current.placeholder);
        listEl.classList.remove('is-sorting');
        document.body.classList.remove('is-category-sorting');
        applyListOrderFromDom(listEl);
        state.dragSuppressClick = true;
        setTimeout(function () { state.dragSuppressClick = false; }, 80);
        return;
      }
      if (current.placeholder && current.placeholder.parentNode) {
        listEl.insertBefore(current.item, current.placeholder);
        current.placeholder.parentNode.removeChild(current.placeholder);
      } else if (current.item && !current.item.parentNode) {
        listEl.appendChild(current.item);
      }
      current.item.classList.remove('is-drag-source');
      listEl.classList.remove('is-sorting');
      document.body.classList.remove('is-category-sorting');
      state.dragSuppressClick = false;
    }

    function beginDragVisual(e) {
      var rect = drag.item.getBoundingClientRect();
      drag.ghostOffsetX = Math.min(Math.max(e.clientX - rect.left, 10), Math.max(rect.width - 10, 10));
      drag.ghostOffsetY = Math.min(Math.max(e.clientY - rect.top, 10), Math.max(rect.height - 10, 10));
      var ghost = drag.item.cloneNode(true);
      ghost.className = 'product-category-cascade__item product-category-cascade__ghost';
      ghost.removeAttribute('data-id');
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      document.body.appendChild(ghost);
      drag.ghost = ghost;
      var placeholder = document.createElement('li');
      placeholder.className = 'product-category-cascade__placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.style.height = rect.height + 'px';
      listEl.insertBefore(placeholder, drag.item);
      drag.placeholder = placeholder;
      drag.item.classList.add('is-drag-source');
      listEl.removeChild(drag.item);
      listEl.classList.add('is-sorting');
      document.body.classList.add('is-category-sorting');
      positionGhost(e.clientX, e.clientY);
      movePlaceholder(e.clientY);
    }

    function onPointerMove(e) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      drag.lastY = e.clientY;
      var dx = e.clientX - drag.startX;
      var dy = e.clientY - drag.startY;
      if (!drag.moved) {
        if (dx * dx + dy * dy < 16) return;
        drag.moved = true;
        state.dragSuppressClick = true;
        beginDragVisual(e);
      }
      e.preventDefault();
      positionGhost(e.clientX, e.clientY);
      movePlaceholder(e.clientY);
      if (!scrollRaf) scrollRaf = requestAnimationFrame(tickAutoScroll);
    }

    function onPointerUp(e) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      endDrag(true);
    }

    listEl.addEventListener('pointerdown', function (e) {
      if (drag) return;
      if (e.button != null && e.button !== 0) return;
      if (!listEl.classList.contains('is-sortable')) return;
      var item = e.target.closest('.product-category-cascade__item[data-id]');
      if (!item || !listEl.contains(item)) return;
      if (listEl.querySelectorAll('.product-category-cascade__item[data-id]').length < 2) return;
      // 从手柄或左侧热区起拖，避免点名称/滚动列表时误触
      var fromHandle = !!e.target.closest('.product-category-cascade__drag');
      var itemRect = item.getBoundingClientRect();
      var fromHotzone = (e.clientX - itemRect.left) <= 40;
      if (!fromHandle && !fromHotzone) return;
      e.preventDefault();
      drag = {
        item: item,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastY: e.clientY,
        moved: false,
        ghost: null,
        placeholder: null,
        ghostOffsetX: 0,
        ghostOffsetY: 0
      };
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    });
  }

  function bindEvents() {
    var addLevels = [
      { id: 'catAddL1', level: 1, need: 0, warn: '' },
      { id: 'catAddL2', level: 2, need: 1, warn: '请先选择一级分类' },
      { id: 'catAddL3', level: 3, need: 2, warn: '请先选择二级分类' },
      { id: 'catAddL4', level: 4, need: 3, warn: '请先选择三级分类' }
    ];
    addLevels.forEach(function (item) {
      var btn = document.getElementById(item.id);
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (item.need && !selectedId(item.need)) {
          if (typeof showToast === 'function') showToast(item.warn, 'warning');
          return;
        }
        openCategoryModal({ createLevel: item.level });
      });
    });

    ['catListL1', 'catListL2', 'catListL3', 'catListL4'].forEach(function (listId) {
      var el = document.getElementById(listId);
      if (!el) return;
      bindListSort(el);
      el.addEventListener('click', function (e) {
        if (state.dragSuppressClick) return;
        if (e.target.closest('.product-category-cascade__drag')) return;
        var item = e.target.closest('.product-category-cascade__item[data-id]');
        if (!item) return;
        selectLevel(parseInt(item.getAttribute('data-level'), 10), item.getAttribute('data-id'));
      });
    });

    var tabs = document.getElementById('catDetailTabs');
    if (tabs) {
      tabs.addEventListener('click', function (e) {
        var tab = e.target.closest('.product-category-detail__tab[data-tab]');
        if (!tab || tab.hidden) return;
        state.detailTab = tab.getAttribute('data-tab');
        renderDetail();
      });
    }

    var panel = document.getElementById('catDetailPanel');
    if (panel) {
      panel.addEventListener('click', function (e) {
        var actionBtn = e.target.closest('[data-detail-action]');
        if (actionBtn) {
          var action = actionBtn.getAttribute('data-detail-action');
          var id = actionBtn.getAttribute('data-id');
          if (action === 'edit') openCategoryModal({ node: store.getNode(id) });
          else if (action === 'on-shelf') toggleShelf(id, 'on_shelf');
          else if (action === 'off-shelf') toggleShelf(id, 'off_shelf');
          else if (action === 'delete') deleteCategory(id);
          return;
        }
        var copyFieldModelBtn = e.target.closest('[data-field-model-copy]');
        if (copyFieldModelBtn) {
          openCopyFieldModelModal(copyFieldModelBtn.getAttribute('data-cat-id'));
          return;
        }
        var addAttrBtn = e.target.closest('[data-attr-add]');
        if (addAttrBtn) {
          openAttributeModal(addAttrBtn.getAttribute('data-cat-id'));
          return;
        }
        var addGoodsUnitBtn = e.target.closest('[data-goods-unit-add]');
        if (addGoodsUnitBtn) {
          openGoodsUnitModal(addGoodsUnitBtn.getAttribute('data-cat-id'));
          return;
        }
        var editGoodsUnitBtn = e.target.closest('[data-goods-unit-edit]');
        if (editGoodsUnitBtn) {
          openGoodsUnitModal(editGoodsUnitBtn.getAttribute('data-cat-id'), editGoodsUnitBtn.getAttribute('data-goods-unit-id'));
          return;
        }
        var delGoodsUnitBtn = e.target.closest('[data-goods-unit-delete]');
        if (delGoodsUnitBtn) {
          deleteGoodsUnit(delGoodsUnitBtn.getAttribute('data-cat-id'), delGoodsUnitBtn.getAttribute('data-goods-unit-id'));
          return;
        }
        var addAttrCatBtn = e.target.closest('[data-attr-cat-add]');
        if (addAttrCatBtn) {
          openAttrCategoryModal(addAttrCatBtn.getAttribute('data-cat-id'));
          return;
        }
        var editAttrCatBtn = e.target.closest('[data-attr-cat-edit]');
        if (editAttrCatBtn) {
          openAttrCategoryModal(editAttrCatBtn.getAttribute('data-cat-id'), editAttrCatBtn.getAttribute('data-attr-cat-id'));
          return;
        }
        var delAttrCatBtn = e.target.closest('[data-attr-cat-delete]');
        if (delAttrCatBtn) {
          deleteAttributeCategory(delAttrCatBtn.getAttribute('data-cat-id'), delAttrCatBtn.getAttribute('data-attr-cat-id'));
          return;
        }
        var editAttrBtn = e.target.closest('[data-attr-edit]');
        if (editAttrBtn) {
          openAttributeModal(editAttrBtn.getAttribute('data-cat-id'), editAttrBtn.getAttribute('data-attr-id'));
          return;
        }
        var delAttrBtn = e.target.closest('[data-attr-delete]');
        if (delAttrBtn) {
          deleteAttribute(delAttrBtn.getAttribute('data-cat-id'), delAttrBtn.getAttribute('data-attr-id'));
          return;
        }
        var toggleVisible = e.target.closest('[data-sys-field-toggle-visible]');
        if (toggleVisible) {
          var bodyVisible = e.target.closest('[data-sys-field-body]');
          if (bodyVisible) {
            toggleSystemField(bodyVisible.getAttribute('data-cat-id'), toggleVisible.getAttribute('data-key'), 'visible');
          }
          return;
        }
        var toggleRequired = e.target.closest('[data-sys-field-toggle-required]');
        if (toggleRequired) {
          var bodyRequired = e.target.closest('[data-sys-field-body]');
          if (bodyRequired) {
            toggleSystemField(bodyRequired.getAttribute('data-cat-id'), toggleRequired.getAttribute('data-key'), 'required');
          }
        }
      });
    }
  }

  function init() {
    store.load();
    ensureDefaultSelection();
    bindEvents();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
