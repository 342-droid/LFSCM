/**
 * 主数据 · 商品分类 — 四级分类（扁平表 + 四级挂载商品）
 */
(function () {
  var ASSET = '../user-app/assets/restock/';

  var DEMO_PRODUCTS = [
    { code: 'SPU00085', sku: '100003', name: '圆茄 优质', img: ASSET + 'product-eggplant-round.svg' },
    { code: 'SPU00078', sku: '100055', name: '长茄子 广茄', img: ASSET + 'product-eggplant-long.svg' },
    { code: 'SPU00088', sku: '100056', name: '红壳黄心鲜鸡蛋', img: ASSET + 'product-egg.svg' },
    { code: 'SPU00082', sku: '120001', name: '可口可乐摩登罐', img: ASSET + 'product-cola.svg' },
    { code: 'SPU00090', sku: '110001', name: '东北大米 5kg', img: ASSET + 'category-icon-grain.svg' },
    { code: 'SPU00067', sku: '100004', name: '普罗旺斯西红柿', img: ASSET + 'product-tomato.svg' }
  ];

  /** 一级 → 二级 → 三级 → 四级名称 */
  var TREE = [
    {
      name: '生鲜食品',
      icon: 'category-icon-veg.svg',
      children: [
        { name: '蔬菜', children: [
          { name: '叶菜类', children: ['生菜', '菠菜', '油麦菜'] },
          { name: '根茎类', children: ['土豆', '胡萝卜', '红薯'] },
          { name: '茄果瓜类', children: ['西红柿', '黄瓜', '茄子'] }
        ]},
        { name: '水果', children: [
          { name: '仁果类', children: ['苹果', '梨'] },
          { name: '柑橘类', children: ['橙子', '柚子'] }
        ]},
        { name: '肉禽水产', children: [
          { name: '猪肉', children: ['五花肉', '里脊', '排骨'] },
          { name: '禽类', children: ['鸡腿', '鸡翅'] }
        ]}
      ]
    },
    {
      name: '粮油调味',
      icon: 'category-icon-grain.svg',
      children: [
        { name: '米面', children: [
          { name: '大米', children: ['东北大米', '泰国香米'] },
          { name: '面粉', children: ['高筋面粉', '低筋面粉'] }
        ]},
        { name: '调味', children: [
          { name: '酱油醋', children: ['生抽', '老抽', '陈醋'] },
          { name: '香料', children: ['花椒', '八角'] }
        ]}
      ]
    },
    {
      name: '酒水饮料',
      icon: 'category-icon-drink.svg',
      status: 'off_shelf',
      children: [
        { name: '饮料', children: [
          { name: '碳酸饮料', children: ['可乐', '雪碧'] },
          { name: '饮用水', children: ['矿泉水', '纯净水'] }
        ]},
        { name: '酒类', children: [
          { name: '啤酒', children: ['工业啤酒', '精酿'] }
        ]}
      ]
    },
    {
      name: '餐厨用品',
      icon: 'category-icon-kitchenware.svg',
      children: [
        { name: '一次性用品', children: [
          { name: '餐具', children: ['纸杯', '纸巾'] }
        ]},
        { name: '清洁', children: [
          { name: '洗洁精', children: ['果蔬净', '餐具净'] },
          { name: '其他', children: [] }
        ]}
      ]
    }
  ];

  /** 一级类目扩展字段种子（扁平，无多级） */
  function extField(name, options, required, tip) {
    return {
      name: name,
      type: 'select',
      required: !!required,
      tip: tip || '',
      options: options || []
    };
  }

  var EXT_FIELD_SEED = {
    '生鲜食品': [
      extField('储存条件', ['冷藏', '常温', '冷冻'], true, '影响仓储与配送温层'),
      extField('配送时效', ['当日达', '次日达'], true, ''),
      extField('是否洗净', ['已洗净', '未洗净'], false, ''),
      extField('产地', ['本地', '外地'], true, '精确到市县，影响物流'),
      extField('果型', ['圆茄', '长茄', '大果', '小果'], false, ''),
      extField('成熟度', ['硬熟', '软熟', '适中'], false, ''),
      extField('规格', ['小', '中', '大'], false, '')
    ],
    '粮油调味': [
      extField('包装', ['袋装', '瓶装'], true, ''),
      extField('保质期', ['6个月', '12个月'], true, ''),
      extField('加工精度', ['精制', '粗制'], false, ''),
      extField('规格', ['5kg', '10kg', '1kg', '2.5kg'], true, ''),
      extField('产地', ['黑龙江', '吉林'], false, '')
    ],
    '酒水饮料': [
      extField('包装形式', ['瓶装', '罐装'], true, ''),
      extField('容量档', ['小', '中', '大'], true, ''),
      extField('饮用温度', ['常温', '冷藏'], false, ''),
      extField('容量', ['330ml', '500ml', '550ml', '1.5L'], true, ''),
      extField('是否含糖', ['有糖', '无糖'], false, '')
    ],
    '餐厨用品': [
      extField('材质', ['塑料', '纸质', '不锈钢'], true, ''),
      extField('是否重复使用', ['是', '否'], true, ''),
      extField('是否降解', ['可降解', '普通'], false, ''),
      extField('容量', ['250ml', '400ml', '500ml', '1L'], false, ''),
      extField('规格', ['标准', '加量'], false, '')
    ]
  };

  /** 一级分类演示商品单位（从全局枚举中挑选） */
  var GOODS_UNIT_SEED = {
    '生鲜食品': ['箱', '件', '斤', '个', '克', '袋', '包', '筐'],
    '粮油调味': ['箱', '件', '袋', '包', 'kg', '克', '瓶', '罐'],
    '酒水饮料': ['箱', '件', '瓶', '罐', '盒', 'ml', '提', '个'],
    '餐厨用品': ['箱', '件', '个', '包', '卷', '张', '套', '支']
  };

  /** 一级分类的扩展字段分组。names 命中的字段归入该组，未命中的归入最后一组 */
  var ATTR_GROUP_SEED = {
    '生鲜食品': [
      { name: '储存配送', sort: 10, names: ['储存条件', '配送时效'] },
      { name: '产地与规格', sort: 20, names: ['产地', '果型', '成熟度', '规格', '是否洗净'] },
      { name: '其他', sort: 30, names: [] }
    ],
    '粮油调味': [
      { name: '包装保质', sort: 10, names: ['包装', '保质期'] },
      { name: '规格产地', sort: 20, names: ['规格', '产地', '加工精度'] },
      { name: '其他', sort: 30, names: [] }
    ],
    '酒水饮料': [
      { name: '包装容量', sort: 10, names: ['包装形式', '容量档', '容量'] },
      { name: '口感成分', sort: 20, names: ['饮用温度', '是否含糖'] }
    ],
    '餐厨用品': [
      { name: '材质用途', sort: 10, names: ['材质', '是否重复使用', '是否降解'] },
      { name: '规格容量', sort: 20, names: ['容量', '规格'] }
    ]
  };

  var data = { categories: [], productBindings: {} };

  function slugKey(name) {
    var map = {
      '储存条件': 'storage', '配送时效': 'delivery', '是否洗净': 'washed', '产地': 'origin',
      '果型': 'fruitShape', '成熟度': 'ripeness', '规格': 'spec', '包装': 'packaging',
      '保质期': 'shelfLifeLabel', '加工精度': 'processLevel', '包装形式': 'packForm',
      '容量档': 'capacityTier', '饮用温度': 'drinkTemp', '容量': 'capacity', '是否含糖': 'sugar',
      '材质': 'material', '是否重复使用': 'reusable', '是否降解': 'degradable'
    };
    if (map[name]) return map[name];
    return 'f' + String(name || '').length + '_' + String(name || '').replace(/\s+/g, '');
  }

  function seedExtensionFieldsForL1(l1Name) {
    var list = EXT_FIELD_SEED[l1Name] || [];
    return list.map(function (item, index) {
      return {
        id: 'ext-seed-' + index + '-' + l1Name,
        name: item.name,
        key: slugKey(item.name),
        type: item.type || 'select',
        required: !!item.required,
        tip: item.tip || '',
        sort: (index + 1) * 10,
        options: (item.options || []).slice()
      };
    });
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function recomputeCounts(categories, bindings) {
    categories.forEach(function (c) {
      if (c.level === 4) c.product_count = (bindings[c.id] || []).length;
    });
    [3, 2, 1].forEach(function (level) {
      categories.forEach(function (c) {
        if (c.level !== level) return;
        c.product_count = categories
          .filter(function (x) { return x.parent_id === c.id; })
          .reduce(function (sum, x) { return sum + x.product_count; }, 0);
      });
    });
  }

  function buildFlatSeed() {
    var list = [];
    var bindings = {};
    var bindCursor = 0;
    var bindNames = { '茄子': true, '西红柿': true, '东北大米': true, '可乐': true };

    function segmentOf(index) {
      return String(10 + index);
    }

    function pushNode(spec) {
      var segment = spec.codeSegment;
      list.push({
        id: spec.id,
        name: spec.name,
        code_segment: segment,
        code: (spec.parentCode || '') + segment,
        level: spec.level,
        parent_id: spec.parentId,
        path: spec.path,
        path_ids: spec.pathIds,
        icon: spec.icon || '',
        sort: spec.sort,
        status: spec.status || 'on_shelf',
        is_leaf: spec.level === 4,
        product_count: 0,
        attributes: [],
        attribute_categories: [],
        goods_units: [],
        fieldModel: null,
        created_at: spec.createdAt
      });
    }

    TREE.forEach(function (l1, i1) {
      var l1Id = 'l1-' + i1;
      var l1Status = l1.status || 'on_shelf';
      var l1Code = segmentOf(i1);
      pushNode({
        id: l1Id,
        name: l1.name,
        codeSegment: l1Code,
        parentCode: '',
        level: 1,
        parentId: null,
        path: l1.name,
        pathIds: [l1Id],
        icon: ASSET + l1.icon,
        sort: (i1 + 1) * 10,
        status: l1Status,
        createdAt: '2024-08-' + pad(12 - i1) + ' 10:00'
      });

      (l1.children || []).forEach(function (l2, i2) {
        var l2Id = l1Id + '-l2-' + i2;
        var l2Code = l1Code + segmentOf(i2);
        pushNode({
          id: l2Id,
          name: l2.name,
          codeSegment: segmentOf(i2),
          parentCode: l1Code,
          level: 2,
          parentId: l1Id,
          path: l1.name + '/' + l2.name,
          pathIds: [l1Id, l2Id],
          sort: (i2 + 1) * 10,
          status: l1Status,
          createdAt: '2024-08-' + pad(8 + i2) + ' 11:00'
        });

        (l2.children || []).forEach(function (l3, i3) {
          var l3Id = l2Id + '-l3-' + i3;
          var l3Code = l2Code + segmentOf(i3);
          pushNode({
            id: l3Id,
            name: l3.name,
            codeSegment: segmentOf(i3),
            parentCode: l2Code,
            level: 3,
            parentId: l2Id,
            path: l1.name + '/' + l2.name + '/' + l3.name,
            pathIds: [l1Id, l2Id, l3Id],
            sort: (i3 + 1) * 10,
            status: l1Status,
            createdAt: '2024-07-' + pad(18 - (i3 % 10)) + ' 09:30'
          });

          (l3.children || []).forEach(function (l4Name, i4) {
            var l4Id = l3Id + '-l4-' + i4;
            pushNode({
              id: l4Id,
              name: l4Name,
              codeSegment: segmentOf(i4),
              parentCode: l3Code,
              level: 4,
              parentId: l3Id,
              path: l1.name + '/' + l2.name + '/' + l3.name + '/' + l4Name,
              pathIds: [l1Id, l2Id, l3Id, l4Id],
              sort: (i4 + 1) * 10,
              status: l1Status,
              createdAt: '2024-07-' + pad(10 + (i4 % 8)) + ' 14:00'
            });
            if (bindNames[l4Name]) {
              bindings[l4Id] = [DEMO_PRODUCTS[bindCursor % DEMO_PRODUCTS.length]];
              bindCursor += 1;
            }
          });
        });
      });
    });

    assignSeedAttributeCategories(list);
    assignSeedGoodsUnits(list);
    rollupFieldModels(list);
    recomputeCounts(list, bindings);
    return { categories: list, productBindings: bindings };
  }

  /** 一级挂载扁平字段模型；下级不持有字段定义 */
  function rollupFieldModels(categories) {
    var FieldModel = window.MasterDataFieldModel;
    var roots = categories.filter(function (node) { return node.level === 1; });
    roots.forEach(function (root) {
      var groups = (root.attribute_categories || []).map(function (item) {
        return FieldModel && FieldModel.cloneJson ? FieldModel.cloneJson(item) : JSON.parse(JSON.stringify(item));
      });
      var fields = seedExtensionFieldsForL1(root.name);
      var groupSpec = ATTR_GROUP_SEED[root.name] || [];
      var fallback = groups.length ? groups[groups.length - 1].id : '';
      fields.forEach(function (field) {
        var matched = '';
        for (var i = 0; i < groupSpec.length; i += 1) {
          if ((groupSpec[i].names || []).indexOf(field.name) >= 0 && groups[i]) {
            matched = groups[i].id;
            break;
          }
        }
        field.category_id = matched || fallback;
      });
      root.fieldModel = {
        systemFields: FieldModel && FieldModel.seedSystemFieldsForName
          ? FieldModel.seedSystemFieldsForName(root.name)
          : (FieldModel && FieldModel.defaultSystemFieldConfigs ? FieldModel.defaultSystemFieldConfigs() : []),
        groups: groups,
        fields: fields
      };
      root.attribute_categories = groups;
      root.attributes = fields;
    });

    categories.forEach(function (node) {
      if (node.level === 1) return;
      node.attributes = [];
      node.attribute_categories = [];
      node.fieldModel = null;
      node.goods_units = [];
    });
  }

  function assignSeedGoodsUnits(categories) {
    categories.forEach(function (node) {
      if (node.level !== 1) {
        node.goods_units = [];
        return;
      }
      var names = GOODS_UNIT_SEED[node.name] || ['箱', '件', '个'];
      node.goods_units = names.map(function (name, index) {
        return {
          id: 'gunit-' + node.id + '-' + index,
          name: name,
          sort: (index + 1) * 10
        };
      });
    });
  }

  function assignSeedAttributeCategories(categories) {
    categories.forEach(function (node) {
      if (node.level !== 1) return;
      var spec = ATTR_GROUP_SEED[node.name] || [{ name: '基础分组', sort: 10, names: [] }];
      node.attribute_categories = spec.map(function (item, index) {
        return {
          id: 'acat-' + node.id + '-' + index,
          name: item.name,
          sort: item.sort
        };
      });
    });
  }

  function rootCategory(id) {
    var node = getNode(id);
    while (node && node.parent_id) node = getNode(node.parent_id);
    return node;
  }

  function ensureFieldModel(root) {
    if (!root || root.level !== 1) return;
    var FieldModel = window.MasterDataFieldModel;
    if (!root.fieldModel) {
      root.fieldModel = {
        systemFields: FieldModel && FieldModel.seedSystemFieldsForName
          ? FieldModel.seedSystemFieldsForName(root.name)
          : (FieldModel && FieldModel.defaultSystemFieldConfigs ? FieldModel.defaultSystemFieldConfigs() : []),
        groups: Array.isArray(root.attribute_categories) ? root.attribute_categories.slice() : [],
        fields: Array.isArray(root.attributes) ? root.attributes.slice() : []
      };
    }
    if (!Array.isArray(root.fieldModel.systemFields)) {
      root.fieldModel.systemFields = FieldModel && FieldModel.defaultSystemFieldConfigs
        ? FieldModel.defaultSystemFieldConfigs()
        : [];
    }
    if (!Array.isArray(root.fieldModel.groups)) root.fieldModel.groups = [];
    if (!Array.isArray(root.fieldModel.fields)) root.fieldModel.fields = [];
    root.attribute_categories = root.fieldModel.groups;
    root.attributes = root.fieldModel.fields;
  }

  function getNode(id) {
    for (var i = 0; i < data.categories.length; i++) {
      if (data.categories[i].id === id) return data.categories[i];
    }
    return null;
  }

  function getChildren(parentId) {
    return data.categories
      .filter(function (c) { return c.parent_id === parentId; })
      .sort(function (a, b) { return a.sort - b.sort; });
  }

  function collectDescendantIds(id) {
    var ids = [id];
    getChildren(id).forEach(function (child) {
      ids = ids.concat(collectDescendantIds(child.id));
    });
    return ids;
  }

  function hasBindingsInTree(id) {
    return collectDescendantIds(id).some(function (did) {
      return (data.productBindings[did] || []).length > 0;
    });
  }

  function rebuildPath(node) {
    var names = [];
    var ids = [];
    var cur = node;
    while (cur) {
      names.unshift(cur.name);
      ids.unshift(cur.id);
      cur = cur.parent_id ? getNode(cur.parent_id) : null;
    }
    node.path = names.join('/');
    node.path_ids = ids;
    getChildren(node.id).forEach(rebuildPath);
  }

  function refreshCategoryCode(node) {
    var parent = node.parent_id ? getNode(node.parent_id) : null;
    var prefix = parent ? (parent.code || '') : '';
    node.code = prefix + (node.code_segment || '');
    getChildren(node.id).forEach(refreshCategoryCode);
  }

  var store = {
    BLOCK_MSG: '分类及下级分类已关联商品，请先解除绑定后再操作',

    load: function () {
      var seed = buildFlatSeed();
      data.categories = seed.categories;
      data.productBindings = seed.productBindings;
    },

    save: function () {
      recomputeCounts(data.categories, data.productBindings);
    },

    getCategories: function () { return data.categories; },
    getNode: getNode,
    getChildren: getChildren,

    getByLevel: function (level) {
      return data.categories
        .filter(function (c) { return c.level === level; })
        .sort(function (a, b) { return a.sort - b.sort; });
    },

    getBindings: function (id) {
      return (data.productBindings[id] || []).slice();
    },

    /** 扩展字段始终读所属一级 fieldModel.fields */
    getAttributes: function (id) {
      var root = rootCategory(id);
      ensureFieldModel(root);
      return root && root.fieldModel && Array.isArray(root.fieldModel.fields)
        ? root.fieldModel.fields.slice()
        : [];
    },

    rootCategory: rootCategory,

    getAttributeCategories: function (id) {
      var root = rootCategory(id);
      ensureFieldModel(root);
      var list = root && root.fieldModel && Array.isArray(root.fieldModel.groups)
        ? root.fieldModel.groups.slice()
        : [];
      return list.sort(function (a, b) {
        var aSort = parseInt(a.sort, 10);
        var bSort = parseInt(b.sort, 10);
        if (isNaN(aSort)) aSort = 0;
        if (isNaN(bSort)) bSort = 0;
        return aSort - bSort;
      });
    },

    setAttributeCategories: function (id, list) {
      var root = rootCategory(id);
      if (!root || root.level !== 1) return;
      ensureFieldModel(root);
      root.fieldModel.groups = list;
      root.attribute_categories = list;
      store.save();
    },

    getFieldModel: function (id) {
      var root = rootCategory(id);
      ensureFieldModel(root);
      if (!root || !root.fieldModel) {
        return window.MasterDataFieldModel
          ? window.MasterDataFieldModel.emptyFieldModel()
          : { systemFields: [], groups: [], fields: [] };
      }
      return window.MasterDataFieldModel && window.MasterDataFieldModel.cloneJson
        ? window.MasterDataFieldModel.cloneJson(root.fieldModel)
        : JSON.parse(JSON.stringify(root.fieldModel));
    },

    resolveFieldModel: function (id) {
      var FieldModel = window.MasterDataFieldModel;
      var raw = store.getFieldModel(id);
      return FieldModel && FieldModel.resolveFieldModel
        ? FieldModel.resolveFieldModel(raw)
        : { systemFields: [], groups: raw.groups || [], fields: raw.fields || [], byKey: {} };
    },

    setFieldModel: function (id, model) {
      var root = rootCategory(id);
      if (!root || root.level !== 1) return;
      var FieldModel = window.MasterDataFieldModel;
      var next = FieldModel && FieldModel.cloneJson
        ? FieldModel.cloneJson(model)
        : JSON.parse(JSON.stringify(model || {}));
      if (!next.systemFields) {
        next.systemFields = FieldModel && FieldModel.defaultSystemFieldConfigs
          ? FieldModel.defaultSystemFieldConfigs()
          : [];
      }
      if (!Array.isArray(next.groups)) next.groups = [];
      if (!Array.isArray(next.fields)) next.fields = [];
      root.fieldModel = next;
      root.attribute_categories = next.groups;
      root.attributes = next.fields;
      store.save();
    },

    setSystemFields: function (id, systemFields) {
      var root = rootCategory(id);
      if (!root || root.level !== 1) return;
      ensureFieldModel(root);
      root.fieldModel.systemFields = systemFields;
      store.save();
    },

    /** 从源一级深拷贝整份 fieldModel 覆盖目标一级 */
    copyFieldModel: function (targetId, sourceId) {
      var target = rootCategory(targetId);
      var source = rootCategory(sourceId);
      if (!target || target.level !== 1 || !source || source.level !== 1) return false;
      if (target.id === source.id) return false;
      ensureFieldModel(source);
      var FieldModel = window.MasterDataFieldModel;
      var copied = FieldModel && FieldModel.cloneJson
        ? FieldModel.cloneJson(source.fieldModel)
        : JSON.parse(JSON.stringify(source.fieldModel));
      // 重新生成 groups/fields id，避免跨类目引用冲突
      var groupIdMap = {};
      (copied.groups || []).forEach(function (group, index) {
        var oldId = group.id;
        group.id = 'acat-' + target.id + '-copy-' + index + '-' + Date.now().toString(36);
        if (oldId) groupIdMap[oldId] = group.id;
      });
      (copied.fields || []).forEach(function (field, index) {
        field.id = 'attr-' + target.id + '-copy-' + index + '-' + Date.now().toString(36);
        if (field.category_id && groupIdMap[field.category_id]) {
          field.category_id = groupIdMap[field.category_id];
        }
      });
      store.setFieldModel(target.id, copied);
      return true;
    },

    /** 一级分类维护的商品单位；传任意下级 id 时取所属一级 */
    getGoodsUnits: function (id) {
      var root = rootCategory(id);
      var list = root && Array.isArray(root.goods_units) ? root.goods_units.slice() : [];
      return list.sort(function (a, b) {
        var aSort = parseInt(a.sort, 10);
        var bSort = parseInt(b.sort, 10);
        if (isNaN(aSort)) aSort = 0;
        if (isNaN(bSort)) bSort = 0;
        return aSort - bSort;
      });
    },

    setGoodsUnits: function (id, list) {
      var root = rootCategory(id);
      if (!root || root.level !== 1) return;
      root.goods_units = list;
      store.save();
    },

    /** 已配置的单位名称（按排序）；未配置返回空数组 */
    listGoodsUnitNames: function (id) {
      return store.getGoodsUnits(id).map(function (item) { return item.name; }).filter(Boolean);
    },

    isAttributeCategoryUsed: function (l1Id, categoryId) {
      var root = rootCategory(l1Id);
      ensureFieldModel(root);
      if (!root || !root.fieldModel) return false;
      return (root.fieldModel.fields || []).some(function (attr) {
        return attr.category_id === categoryId;
      });
    },

    /**
     * 扩展字段统一来自所属一级 fieldModel；
     * 在非一级查看时标记 inherited，不可在本级增删改。
     */
    listAttributeRows: function (id) {
      var node = getNode(id);
      if (!node) return [];
      var root = rootCategory(id);
      ensureFieldModel(root);
      if (!root || !root.fieldModel) return [];
      var inherited = node.level !== 1;
      var rows = (root.fieldModel.fields || []).map(function (attr) {
        return {
          attr: attr,
          inherited: inherited,
          sourceId: root.id,
          sourceName: root.name,
          sourceLevel: 1
        };
      });
      rows.sort(function (a, b) {
        var aSort = parseInt(a.attr && a.attr.sort, 10);
        var bSort = parseInt(b.attr && b.attr.sort, 10);
        if (isNaN(aSort)) aSort = 0;
        if (isNaN(bSort)) bSort = 0;
        return aSort - bSort;
      });
      return rows;
    },

    setAttributes: function (id, list) {
      var root = rootCategory(id);
      if (!root || root.level !== 1) return;
      ensureFieldModel(root);
      root.fieldModel.fields = list;
      root.attributes = list;
      store.save();
    },

    unbindProduct: function (id, code) {
      if (!id || !code) return;
      data.productBindings[id] = (data.productBindings[id] || []).filter(function (p) {
        return p.code !== code;
      });
      store.save();
    },

    collectDescendantIds: collectDescendantIds,
    hasBindingsInTree: hasBindingsInTree,
    canDelete: function (id) { return !hasBindingsInTree(id); },
    rebuildPath: rebuildPath,

    addCategory: function (node) {
      if (node && node.level === 1) {
        var FieldModel = window.MasterDataFieldModel;
        if (!node.fieldModel) {
          node.fieldModel = FieldModel && FieldModel.emptyFieldModel
            ? FieldModel.emptyFieldModel()
            : { systemFields: [], groups: [], fields: [] };
        }
        if (!Array.isArray(node.attribute_categories)) node.attribute_categories = node.fieldModel.groups || [];
        if (!Array.isArray(node.attributes)) node.attributes = node.fieldModel.fields || [];
        if (!Array.isArray(node.goods_units)) node.goods_units = [];
      } else if (node) {
        node.attributes = [];
        node.attribute_categories = [];
        node.fieldModel = null;
        node.goods_units = [];
      }
      data.categories.push(node);
      store.save();
    },

    updateCategory: function (node) {
      rebuildPath(node);
      refreshCategoryCode(node);
      store.save();
    },

    removeCategoryTree: function (id) {
      var ids = collectDescendantIds(id);
      ids.forEach(function (did) { delete data.productBindings[did]; });
      data.categories = data.categories.filter(function (c) { return ids.indexOf(c.id) < 0; });
      store.save();
      return ids;
    },

    setCategoryStatus: function (id, status) {
      var node = getNode(id);
      if (!node) return;
      node.status = status;
      if (status === 'off_shelf' && node.level < 4) {
        collectDescendantIds(id).forEach(function (did) {
          var child = getNode(did);
          if (child) child.status = 'off_shelf';
        });
      }
      store.save();
    },

    /** 同级新增时取最大 sort + 10（主数据默认序；列表展示优先用账号个人排序） */
    nextSiblingSort: function (parentId) {
      var parentKey = parentId || null;
      var max = 0;
      data.categories.forEach(function (item) {
        if ((item.parent_id || null) !== parentKey) return;
        var s = parseInt(item.sort, 10);
        if (!isNaN(s) && s > max) max = s;
      });
      return max + 10;
    }
  };

  window.MasterDataCategoryStore = store;
})();
