/**
 * 主数据 · 一级类目字段模型
 * 全局系统字段池 + 与一级配置合并解析；扩展字段（原商品属性）挂在一级 fieldModel 上。
 */
(function () {
  /** 扩展字段可选类型（第一批补齐） */
  var EXT_FIELD_TYPES = [
    'text',
    'textarea',
    'select',
    'radio',
    'multiSelect',
    'number',
    'integer',
    'boolean',
    'date'
  ];

  var TYPE_LABELS = {
    text: '文本',
    textarea: '多行文本',
    select: '下拉',
    radio: '单选',
    multiSelect: '多选',
    number: '数字',
    integer: '整数',
    boolean: '开关',
    date: '日期',
    section: '区块',
    attr: '下拉'
  };

  /** 需要配置选项的类型 */
  function typeNeedsOptions(type) {
    return type === 'select' || type === 'radio' || type === 'multiSelect';
  }

  /** 选择类类型（校验文案用「请选择」） */
  function typeIsChoice(type) {
    return type === 'select' || type === 'radio' || type === 'multiSelect' || type === 'boolean';
  }

  /** 系统字段池：locked 不可关闭显示；其余由一级 fieldModel.systemFields 覆盖 */
  var SYSTEM_FIELD_POOL = [
    { key: 'name', label: '商品名称', type: 'text', section: 'info', locked: true, defaultVisible: true, defaultRequired: true, tip: '' },
    { key: 'spu', label: 'SPU编码', type: 'text', section: 'info', locked: true, defaultVisible: true, defaultRequired: true, tip: '系统按一级编码自动生成' },
    { key: 'sku', label: '货号', type: 'text', section: 'info', locked: true, defaultVisible: true, defaultRequired: true, tip: '系统按一级编码自动生成' },
    { key: 'barcode', label: '商品条码', type: 'text', section: 'info', locked: true, defaultVisible: true, defaultRequired: true, tip: '' },
    { key: 'brand', label: '商品品牌', type: 'select', section: 'info', locked: true, defaultVisible: true, defaultRequired: true, tip: '来自品牌库启用品牌' },
    { key: 'purchasePrice', label: '标准采购价', type: 'number', section: 'info', locked: true, defaultVisible: true, defaultRequired: true, tip: '' },
    { key: 'purchaseUnit', label: '标准采购单位', type: 'select', section: 'info', locked: true, defaultVisible: true, defaultRequired: true, tip: '受一级商品单位配置约束' },
    { key: 'shelfLife', label: '保质期天数', type: 'number', section: 'info', locked: false, defaultVisible: true, defaultRequired: true, tip: '大于等于 0 的整数' },
    { key: 'operateMode', label: '经营方式', type: 'select', section: 'info', locked: false, defaultVisible: true, defaultRequired: true, tip: '代采代销 / 购销 / 联营' },
    { key: 'weigh', label: '是否称重', type: 'select', section: 'info', locked: false, defaultVisible: true, defaultRequired: true, tip: '是 / 否' },
    { key: 'tempLayer', label: '温层', type: 'select', section: 'info', locked: false, defaultVisible: true, defaultRequired: true, tip: '常温 / 冷藏 / 冷冻' },
    { key: 'unitCards', label: '单位换算', type: 'section', section: 'units', locked: false, defaultVisible: true, defaultRequired: true, tip: '最小计量 / 最小 / 规格 / 包装四级换算' },
    { key: 'richText', label: '图文信息', type: 'section', section: 'copy', locked: false, defaultVisible: true, defaultRequired: false, tip: '卖点、介绍、场景、售后、图文详情等' }
  ];

  /** 演示：各一级类目对可配系统字段的差异（未列出的用字段池默认） */
  var SYSTEM_FIELD_SEED = {
    '生鲜食品': [
      { key: 'shelfLife', visible: true, required: true },
      { key: 'operateMode', visible: true, required: true },
      { key: 'weigh', visible: true, required: true },
      { key: 'tempLayer', visible: true, required: true },
      { key: 'unitCards', visible: true, required: true },
      { key: 'richText', visible: true, required: false }
    ],
    '粮油调味': [
      { key: 'shelfLife', visible: true, required: true },
      { key: 'operateMode', visible: true, required: true },
      { key: 'weigh', visible: false, required: false },
      { key: 'tempLayer', visible: false, required: false },
      { key: 'unitCards', visible: true, required: true },
      { key: 'richText', visible: true, required: false }
    ],
    '酒水饮料': [
      { key: 'shelfLife', visible: true, required: true },
      { key: 'operateMode', visible: true, required: true },
      { key: 'weigh', visible: false, required: false },
      { key: 'tempLayer', visible: true, required: false },
      { key: 'unitCards', visible: true, required: true },
      { key: 'richText', visible: true, required: false }
    ],
    '餐厨用品': [
      { key: 'shelfLife', visible: true, required: false },
      { key: 'operateMode', visible: true, required: true },
      { key: 'weigh', visible: false, required: false },
      { key: 'tempLayer', visible: false, required: false },
      { key: 'unitCards', visible: true, required: true },
      { key: 'richText', visible: true, required: false }
    ]
  };

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function typeLabel(type) {
    return TYPE_LABELS[type] || TYPE_LABELS.text;
  }

  function poolByKey() {
    var map = {};
    SYSTEM_FIELD_POOL.forEach(function (item) { map[item.key] = item; });
    return map;
  }

  function defaultSystemFieldConfigs() {
    return SYSTEM_FIELD_POOL.map(function (item) {
      return {
        key: item.key,
        visible: !!item.defaultVisible,
        required: !!item.defaultRequired
      };
    });
  }

  function seedSystemFieldsForName(name) {
    var pool = poolByKey();
    var overrides = {};
    (SYSTEM_FIELD_SEED[name] || []).forEach(function (item) {
      overrides[item.key] = item;
    });
    return SYSTEM_FIELD_POOL.map(function (item) {
      if (item.locked) {
        return { key: item.key, visible: true, required: true };
      }
      var override = overrides[item.key];
      if (override) {
        return {
          key: item.key,
          visible: override.visible !== false,
          required: !!override.required && override.visible !== false
        };
      }
      return {
        key: item.key,
        visible: !!item.defaultVisible,
        required: !!item.defaultRequired
      };
    }).filter(function (item) {
      return pool[item.key];
    });
  }

  /**
   * 合并字段池默认与一级配置，返回带 label/type/tip 的解析结果
   */
  function resolveFieldModel(fieldModel) {
    var configMap = {};
    var source = fieldModel && Array.isArray(fieldModel.systemFields) ? fieldModel.systemFields : defaultSystemFieldConfigs();
    source.forEach(function (item) {
      if (item && item.key) configMap[item.key] = item;
    });
    var systemFields = SYSTEM_FIELD_POOL.map(function (meta) {
      var cfg = configMap[meta.key] || {};
      var visible = meta.locked ? true : (cfg.visible !== false && (cfg.visible != null ? !!cfg.visible : !!meta.defaultVisible));
      var required = meta.locked
        ? true
        : (visible && (cfg.required != null ? !!cfg.required : !!meta.defaultRequired));
      return {
        key: meta.key,
        label: meta.label,
        type: meta.type || 'text',
        typeLabel: typeLabel(meta.type || 'text'),
        tip: meta.tip || '',
        section: meta.section,
        locked: !!meta.locked,
        visible: visible,
        required: required
      };
    });
    var byKey = {};
    systemFields.forEach(function (item) { byKey[item.key] = item; });
    return {
      systemFields: systemFields,
      groups: fieldModel && Array.isArray(fieldModel.groups) ? cloneJson(fieldModel.groups) : [],
      fields: fieldModel && Array.isArray(fieldModel.fields) ? cloneJson(fieldModel.fields) : [],
      byKey: byKey
    };
  }

  function isSystemFieldVisible(resolved, key) {
    var item = resolved && resolved.byKey && resolved.byKey[key];
    return !!(item && item.visible);
  }

  function isSystemFieldRequired(resolved, key) {
    var item = resolved && resolved.byKey && resolved.byKey[key];
    return !!(item && item.visible && item.required);
  }

  function emptyFieldModel() {
    return {
      systemFields: defaultSystemFieldConfigs(),
      groups: [],
      fields: []
    };
  }

  /** 扩展字段说明：优先 tip，否则汇总选项 */
  function extensionFieldTip(field) {
    if (field && field.tip) return String(field.tip);
    var options = fieldOptions(field);
    if (!options.length) return '—';
    var preview = options.slice(0, 4).join(' / ');
    if (options.length > 4) preview += ' 等';
    return preview;
  }

  function fieldOptions(field) {
    if (!field) return [];
    if (field.type === 'boolean') {
      if (Array.isArray(field.options) && field.options.length) {
        return field.options.map(function (item) {
          return typeof item === 'string' ? item : String((item && (item.text || item.value)) || '');
        }).filter(Boolean);
      }
      return ['是', '否'];
    }
    if (Array.isArray(field.options)) {
      return field.options.map(function (item) {
        return typeof item === 'string' ? item : String((item && (item.text || item.value)) || '');
      }).filter(Boolean);
    }
    // 兼容旧 values 结构：只取首层文本，忽略下级
    return (field.values || []).map(function (value) {
      if (typeof value === 'string') return value;
      return value && value.text ? String(value.text) : '';
    }).filter(Boolean);
  }

  function normalizeExtensionField(field) {
    var next = cloneJson(field || {});
    next.type = next.type || 'select';
    next.key = next.key || next.name || '';
    next.required = !!next.required;
    next.tip = next.tip || '';
    next.options = fieldOptions(next);
    delete next.values;
    delete next.independent_sku;
    return next;
  }

  window.MasterDataFieldModel = {
    SYSTEM_FIELD_POOL: SYSTEM_FIELD_POOL,
    SYSTEM_FIELD_SEED: SYSTEM_FIELD_SEED,
    EXT_FIELD_TYPES: EXT_FIELD_TYPES,
    TYPE_LABELS: TYPE_LABELS,
    cloneJson: cloneJson,
    typeLabel: typeLabel,
    typeNeedsOptions: typeNeedsOptions,
    typeIsChoice: typeIsChoice,
    defaultSystemFieldConfigs: defaultSystemFieldConfigs,
    seedSystemFieldsForName: seedSystemFieldsForName,
    resolveFieldModel: resolveFieldModel,
    isSystemFieldVisible: isSystemFieldVisible,
    isSystemFieldRequired: isSystemFieldRequired,
    emptyFieldModel: emptyFieldModel,
    extensionFieldTip: extensionFieldTip,
    fieldOptions: fieldOptions,
    normalizeExtensionField: normalizeExtensionField
  };
})();
