/**
 * 主数据 · 产品合规（模板 / 档案包 / 全局设置）
 * sessionStorage 持久化；新开会话恢复预置数据。
 */
(function () {
  var TPL_KEY = 'lf-master-data-compliance-templates-v1';
  var DOS_KEY = 'lf-master-data-compliance-dossiers-v1';
  var SET_KEY = 'lf-master-data-compliance-settings-v1';
  var GOODS_KEY = 'lf-master-data-compliance-goods-v1';

  var CERT_TYPES = ['营业执照', '生产许可证', '商标注册证', '法人证件人像面', '法人证件国徽面', '食品经营许可证', '其他'];
  var PLACEHOLDER =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160">' +
        '<rect fill="#eef2ff" width="240" height="160"/>' +
        '<text x="120" y="84" text-anchor="middle" fill="#5b6b8c" font-size="14" font-family="sans-serif">证照附件示意</text>' +
        '</svg>'
    );

  function todayStr() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function addDays(base, days) {
    var d = base ? new Date(base) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    d.setDate(d.getDate() + days);
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function seedTemplates() {
    return [
      {
        id: 'tpl1',
        code: 'COSMETIC_SPECIAL',
        name: '特殊化妆品',
        status: 'active',
        tip: '',
        updatedAt: todayStr(),
        items: [
          { code: 'PRINCIPAL_LICENSE', name: '委托方营业执照', source: 'subject_ref', role: '委托方', certTypes: ['营业执照'], required: true, expiryWarn: true },
          { code: 'MFG_LICENSE_BIZ', name: '生产方营业执照', source: 'subject_ref', role: '生产方', certTypes: ['营业执照'], required: true, expiryWarn: true },
          { code: 'MFG_PROD_PERMIT', name: '生产许可证', source: 'subject_ref', role: '生产方', certTypes: ['生产许可证'], required: true, expiryWarn: true },
          { code: 'REG_CERT', name: '特殊化妆品注册证', source: 'dossier_upload', role: '', certTypes: [], required: true, expiryWarn: true },
          { code: 'TEST_REPORT', name: '检测报告', source: 'dossier_upload', role: '', certTypes: [], required: false, expiryWarn: true },
          { code: 'TRADEMARK', name: '商标/Logo 材料', source: 'subject_ref', role: '委托方', certTypes: ['商标注册证'], required: false, expiryWarn: false }
        ]
      },
      {
        id: 'tpl2',
        code: 'COSMETIC_NORMAL',
        name: '普通化妆品',
        status: 'active',
        tip: '',
        updatedAt: todayStr(),
        items: [
          { code: 'PRINCIPAL_LICENSE', name: '委托方营业执照', source: 'subject_ref', role: '委托方', certTypes: ['营业执照'], required: true, expiryWarn: true },
          { code: 'MFG_LICENSE_BIZ', name: '生产方营业执照', source: 'subject_ref', role: '生产方', certTypes: ['营业执照'], required: true, expiryWarn: true },
          { code: 'MFG_PROD_PERMIT', name: '生产许可（备案用）', source: 'subject_ref', role: '生产方', certTypes: ['生产许可证'], required: true, expiryWarn: true },
          { code: 'FILING_INFO', name: '备案信息', source: 'dossier_upload', role: '', certTypes: [], required: true, expiryWarn: false },
          { code: 'TEST_REPORT', name: '检测报告', source: 'dossier_upload', role: '', certTypes: [], required: true, expiryWarn: true },
          { code: 'TRADEMARK', name: '商标/Logo 材料', source: 'subject_ref', role: '委托方', certTypes: ['商标注册证'], required: false, expiryWarn: false }
        ]
      }
    ];
  }

  function seedSettings() {
    return {
      warnDays: 60,
      allowIncompleteActive: true,
      gateSupplyEnable: false,
      gateGoodsEnable: false
    };
  }

  function seedGoodsFlags() {
    return {
      '8801001': { enabled: true, type: 'COSMETIC_SPECIAL' },
      '8801002': { enabled: true, type: 'COSMETIC_SPECIAL' },
      '8802001': { enabled: true, type: 'COSMETIC_NORMAL' },
      '8802002': { enabled: true, type: 'COSMETIC_NORMAL' }
    };
  }

  function seedDossiers() {
    var far = addDays(null, 400);
    var near = addDays(null, 40);
    return [
      {
        id: 'd1',
        code: 'CA000001',
        typeCode: 'COSMETIC_SPECIAL',
        certNo: '国妆特字202512255',
        productName: '汉言染护精华霜（植物调理型）-经典自然黑',
        alias: '经典自然黑',
        principalId: 's_hanyan',
        manufacturerId: 's_gexiu',
        issueDate: '2025-12-01',
        longTerm: false,
        validFrom: '2025-12-01',
        validTo: far,
        status: 'active',
        updatedAt: todayStr(),
        refs: {
          PRINCIPAL_LICENSE: 'c_hy_license',
          MFG_LICENSE_BIZ: 'c_gx_license',
          MFG_PROD_PERMIT: 'c_gx_permit',
          TRADEMARK: 'c_hy_tm'
        },
        uploads: {
          REG_CERT: [{ name: '注册证', url: PLACEHOLDER, materialNo: '国妆特字202512255', validTo: far }]
        },
        mappings: [{ sku: '8801001', specNote: '经典自然黑' }]
      },
      {
        id: 'd2',
        code: 'CA000002',
        typeCode: 'COSMETIC_SPECIAL',
        certNo: '国妆特字202512245',
        productName: '汉言染护精华霜（植物调理型）-丝润巧克力色',
        alias: '丝润巧克力色',
        principalId: 's_hanyan',
        manufacturerId: 's_gexiu',
        issueDate: '2025-12-01',
        longTerm: false,
        validFrom: '2025-12-01',
        validTo: far,
        status: 'active',
        updatedAt: todayStr(),
        refs: {
          PRINCIPAL_LICENSE: 'c_hy_license',
          MFG_LICENSE_BIZ: 'c_gx_license',
          MFG_PROD_PERMIT: 'c_gx_permit'
        },
        uploads: {
          REG_CERT: [{ name: '注册证', url: PLACEHOLDER, materialNo: '国妆特字202512245', validTo: far }]
        },
        mappings: [{ sku: '8801002', specNote: '丝润巧克力色' }]
      },
      {
        id: 'd3',
        code: 'CA000003',
        typeCode: 'COSMETIC_NORMAL',
        certNo: '粤G妆网备字2025XXXX01',
        productName: '汉言氨基酸洗发露[三代]',
        alias: '氨基酸洗发露',
        principalId: 's_hanyan',
        manufacturerId: 's_yinong',
        issueDate: '2025-06-01',
        longTerm: true,
        validFrom: '2025-06-01',
        validTo: '',
        status: 'active',
        updatedAt: todayStr(),
        refs: {
          PRINCIPAL_LICENSE: 'c_hy_license',
          MFG_LICENSE_BIZ: 'c_yn_license',
          MFG_PROD_PERMIT: 'c_yn_permit'
        },
        uploads: {
          FILING_INFO: [{ name: '备案信息表', url: PLACEHOLDER, materialNo: '', validTo: '' }],
          TEST_REPORT: [{ name: '检测报告', url: PLACEHOLDER, materialNo: 'TR-8802001', validTo: near }]
        },
        mappings: [{ sku: '8802001', specNote: '' }]
      },
      {
        id: 'd4',
        code: 'CA000004',
        typeCode: 'COSMETIC_NORMAL',
        certNo: '粤G妆网备字2025XXXX02',
        productName: '汉言懒人护发锦缎霜',
        alias: '懒人护发锦缎霜',
        principalId: 's_hanyan',
        manufacturerId: 's_yinong',
        issueDate: '2025-06-01',
        longTerm: true,
        validFrom: '2025-06-01',
        validTo: '',
        status: 'active',
        updatedAt: todayStr(),
        refs: {
          PRINCIPAL_LICENSE: 'c_hy_license',
          MFG_LICENSE_BIZ: 'c_yn_license',
          MFG_PROD_PERMIT: 'c_yn_permit'
        },
        uploads: {
          FILING_INFO: [{ name: '备案信息', url: PLACEHOLDER, materialNo: '', validTo: '' }],
          TEST_REPORT: [{ name: '检测报告', url: PLACEHOLDER, materialNo: 'TR-8802002', validTo: far }]
        },
        mappings: [{ sku: '8802002', specNote: '' }]
      }
    ];
  }

  function seedComplianceSuppliers() {
    return [
      {
        id: 's_hanyan',
        code: 'SUP9001',
        name: '汉言（品牌/委托方）',
        type: '品牌商',
        roles: ['委托方'],
        bizContact: '蓝小伟',
        bizPhone: '13800009001',
        warehouseContact: '蓝小伟',
        warehousePhone: '13800009001',
        region: '浙江省 / 杭州市 / 余杭区',
        detailAddress: '头皮管理产业园 1 号',
        status: 'active',
        docs: {},
        certificates: [
          { id: 'c_hy_license', type: '营业执照', name: '汉言营业执照', certNo: '91330100MA2XXXX01', issuer: '市监局', issueDate: '2020-01-01', longTerm: true, validFrom: '2020-01-01', validTo: '', files: [PLACEHOLDER], remark: '', status: 'active' },
          { id: 'c_hy_tm', type: '商标注册证', name: '汉言商标', certNo: '第XXXXXXX号', issuer: '商标局', issueDate: '2019-05-01', longTerm: true, validFrom: '2019-05-01', validTo: '', files: [PLACEHOLDER], remark: '', status: 'active' },
          { id: 'c_hy_legal_f', type: '法人证件人像面', name: '法人人像面', certNo: '', issuer: '', issueDate: '', longTerm: true, validFrom: '', validTo: '', files: [PLACEHOLDER], remark: '', status: 'active' },
          { id: 'c_hy_legal_b', type: '法人证件国徽面', name: '法人国徽面', certNo: '', issuer: '', issueDate: '', longTerm: true, validFrom: '', validTo: '', files: [PLACEHOLDER], remark: '', status: 'active' }
        ]
      },
      {
        id: 's_gexiu',
        code: 'SUP9002',
        name: '歌秀工厂',
        type: '品牌商',
        roles: ['生产方'],
        bizContact: '张工',
        bizPhone: '13800009002',
        warehouseContact: '李仓',
        warehousePhone: '13800009002',
        region: '广东省 / 广州市 / 白云区',
        detailAddress: '染膏产业园 A 栋',
        status: 'active',
        docs: {},
        certificates: [
          { id: 'c_gx_license', type: '营业执照', name: '歌秀营业执照', certNo: '91440100MA5XXXX02', issuer: '市监局', issueDate: '2018-03-01', longTerm: true, validFrom: '2018-03-01', validTo: '', files: [PLACEHOLDER], remark: '', status: 'active' },
          { id: 'c_gx_permit', type: '生产许可证', name: '化妆品生产许可证', certNo: '粤妆XXXXXX', issuer: '药监局', issueDate: '2022-01-01', longTerm: false, validFrom: '2022-01-01', validTo: addDays(null, 500), files: [PLACEHOLDER], remark: '', status: 'active' }
        ]
      },
      {
        id: 's_yinong',
        code: 'SUP9003',
        name: '广州依侬',
        type: '品牌商',
        roles: ['生产方'],
        bizContact: '王工',
        bizPhone: '13800009003',
        warehouseContact: '赵仓',
        warehousePhone: '13800009003',
        region: '广东省 / 广州市 / 花都区',
        detailAddress: '洗护产业园 B 区',
        status: 'active',
        docs: {},
        certificates: [
          { id: 'c_yn_license', type: '营业执照', name: '依侬营业执照', certNo: '91440100MA5XXXX03', issuer: '市监局', issueDate: '2017-08-01', longTerm: true, validFrom: '2017-08-01', validTo: '', files: [PLACEHOLDER], remark: '', status: 'active' },
          { id: 'c_yn_permit', type: '生产许可证', name: '生产许可（备案使用）', certNo: '粤妆YYYYYY', issuer: '药监局', issueDate: '2021-06-01', longTerm: false, validFrom: '2021-06-01', validTo: addDays(null, 300), files: [PLACEHOLDER], remark: '', status: 'active' }
        ]
      }
    ];
  }

  var templates = null;
  var dossiers = null;
  var settings = null;
  var goodsFlags = null;
  var suppliersMerged = false;

  function loadJson(key, seedFn) {
    try {
      var raw = sessionStorage.getItem(key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) return parsed;
      }
    } catch (err) {}
    return seedFn();
  }

  function saveJson(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (err) {}
  }

  function ensureTemplates() {
    if (!templates) {
      templates = loadJson(TPL_KEY, seedTemplates);
      if (!sessionStorage.getItem(TPL_KEY)) saveJson(TPL_KEY, templates);
    }
    return templates;
  }

  function ensureDossiers() {
    if (!dossiers) {
      dossiers = loadJson(DOS_KEY, seedDossiers);
      if (!sessionStorage.getItem(DOS_KEY)) saveJson(DOS_KEY, dossiers);
    }
    return dossiers;
  }

  function ensureSettings() {
    if (!settings) {
      settings = loadJson(SET_KEY, seedSettings);
      if (!sessionStorage.getItem(SET_KEY)) saveJson(SET_KEY, settings);
    }
    return settings;
  }

  function ensureGoodsFlags() {
    if (!goodsFlags) {
      goodsFlags = loadJson(GOODS_KEY, seedGoodsFlags);
      if (!sessionStorage.getItem(GOODS_KEY)) saveJson(GOODS_KEY, goodsFlags);
    }
    return goodsFlags;
  }

  function mergeDemoSuppliers() {
    if (suppliersMerged) return;
    suppliersMerged = true;
    var store = window.MasterDataSupplierStore;
    if (!store || !store.all) return;
    var list = store.all();
    var seeds = seedComplianceSuppliers();
    seeds.forEach(function (seed) {
      var exists = list.some(function (item) { return item.id === seed.id || item.code === seed.code; });
      if (!exists) list.push(JSON.parse(JSON.stringify(seed)));
    });
    list.forEach(function (item) {
      if (!Array.isArray(item.roles)) item.roles = [];
      if (!Array.isArray(item.certificates)) item.certificates = [];
    });
    if (store.save) store.save();
  }

  function findTemplate(codeOrId) {
    return ensureTemplates().find(function (t) {
      return t.id === codeOrId || t.code === codeOrId;
    }) || null;
  }

  function findDossier(id) {
    return ensureDossiers().find(function (d) { return d.id === id; }) || null;
  }

  function findSupplier(id) {
    mergeDemoSuppliers();
    var store = window.MasterDataSupplierStore;
    if (!store) return null;
    return store.all().find(function (s) { return s.id === id; }) || null;
  }

  function findCertificate(supplierId, certId) {
    var supplier = findSupplier(supplierId);
    if (!supplier || !Array.isArray(supplier.certificates)) return null;
    return supplier.certificates.find(function (c) { return c.id === certId; }) || null;
  }

  function warnDays() {
    var s = ensureSettings();
    var n = parseInt(s.warnDays, 10);
    return !n || n < 1 ? 60 : n;
  }

  function certExpiryStatus(cert) {
    if (!cert || cert.status === 'void') return 'void';
    if (cert.longTerm || !cert.validTo) return 'valid';
    var end = new Date(cert.validTo);
    if (isNaN(end.getTime())) return 'valid';
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (end < now) return 'expired';
    var limit = new Date(now);
    limit.setDate(limit.getDate() + warnDays());
    if (end <= limit) return 'expiring';
    return 'valid';
  }

  function dateExpiryStatus(validTo, longTerm) {
    if (longTerm || !validTo) return 'valid';
    return certExpiryStatus({ longTerm: false, validTo: validTo, status: 'active' });
  }

  function worseExpiry(a, b) {
    var rank = { expired: 3, expiring: 2, valid: 1, void: 4, '': 0 };
    return (rank[a] || 0) >= (rank[b] || 0) ? a : b;
  }

  function itemPass(dossier, item) {
    if (item.source === 'subject_ref') {
      var sid = item.role === '生产方' ? dossier.manufacturerId : dossier.principalId;
      var certId = dossier.refs && dossier.refs[item.code];
      if (!certId) return false;
      var cert = findCertificate(sid, certId);
      if (!cert || cert.status === 'void') return false;
      if (item.expiryWarn && certExpiryStatus(cert) === 'expired') return false;
      return true;
    }
    var files = dossier.uploads && dossier.uploads[item.code];
    if (!files || !files.length) return false;
    if (item.expiryWarn) {
      var allExpired = files.every(function (f) {
        return f.validTo && dateExpiryStatus(f.validTo, false) === 'expired';
      });
      if (allExpired) return false;
      var noDate = files.every(function (f) { return !f.validTo; });
      if (noDate) return false;
    }
    return true;
  }

  function dossierCompleteness(dossier) {
    if (!dossier || dossier.status === 'draft' || dossier.status === 'void') return '';
    var tpl = findTemplate(dossier.typeCode);
    if (!tpl) return 'missing';
    var required = (tpl.items || []).filter(function (it) { return it.required; });
    for (var i = 0; i < required.length; i++) {
      if (!itemPass(dossier, required[i])) return 'missing';
    }
    return 'complete';
  }

  function dossierExpiry(dossier) {
    if (!dossier || dossier.status === 'draft' || dossier.status === 'void') return '';
    if (dossierCompleteness(dossier) === 'missing') return '';
    var worst = dateExpiryStatus(dossier.validTo, dossier.longTerm);
    var tpl = findTemplate(dossier.typeCode);
    if (!tpl) return worst;
    (tpl.items || []).forEach(function (item) {
      if (!item.required || !item.expiryWarn) return;
      if (item.source === 'subject_ref') {
        var sid = item.role === '生产方' ? dossier.manufacturerId : dossier.principalId;
        var cert = findCertificate(sid, dossier.refs && dossier.refs[item.code]);
        if (cert) worst = worseExpiry(worst, certExpiryStatus(cert));
      } else {
        var files = (dossier.uploads && dossier.uploads[item.code]) || [];
        files.forEach(function (f) {
          if (f.validTo) worst = worseExpiry(worst, dateExpiryStatus(f.validTo, false));
        });
      }
    });
    return worst;
  }

  function goodsAggregate(sku) {
    var flags = ensureGoodsFlags()[sku];
    if (!flags || !flags.enabled) return { status: 'none', label: '不管控' };
    var related = ensureDossiers().filter(function (d) {
      if (d.status !== 'active') return false;
      return (d.mappings || []).some(function (m) { return m.sku === sku; });
    });
    if (!related.length) return { status: 'unfiled', label: '未建档' };
    var anyMissing = related.some(function (d) { return dossierCompleteness(d) === 'missing'; });
    if (anyMissing) return { status: 'missing', label: '缺失' };
    var worst = 'valid';
    related.forEach(function (d) {
      worst = worseExpiry(worst, dossierExpiry(d) || 'valid');
    });
    if (worst === 'expired') return { status: 'expired', label: '已过期' };
    if (worst === 'expiring') return { status: 'expiring', label: '即将过期' };
    return { status: 'complete', label: '齐全' };
  }

  function nextTemplateId() {
    var max = 0;
    ensureTemplates().forEach(function (t) {
      var n = parseInt(String(t.id || '').replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return 'tpl' + (max + 1);
  }

  function nextDossierId() {
    var max = 0;
    ensureDossiers().forEach(function (d) {
      var n = parseInt(String(d.id || '').replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return 'd' + (max + 1);
  }

  function nextDossierCode() {
    var max = 0;
    ensureDossiers().forEach(function (d) {
      var n = parseInt(String(d.code || '').replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    var next = max + 1;
    var str = String(next);
    while (str.length < 6) str = '0' + str;
    return 'CA' + str;
  }

  function nextCertId() {
    return 'c_' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
  }

  function demoCatalogGoods() {
    return [
      { sku: '8801001', spu: 'SPU880100', name: '汉言染护精华霜 经典自然黑', barcode: '6978801001001', category: '染膏', shelfLife: '1095', tempLayer: '常温', operateMode: '购销', purchasePrice: 28, purchaseUnit: '支', tone: 'blue', mark: '染', complianceEnabled: true, complianceType: 'COSMETIC_SPECIAL' },
      { sku: '8801002', spu: 'SPU880100', name: '汉言染护精华霜 丝润巧克力色', barcode: '6978801001002', category: '染膏', shelfLife: '1095', tempLayer: '常温', operateMode: '购销', purchasePrice: 28, purchaseUnit: '支', tone: 'orange', mark: '染', complianceEnabled: true, complianceType: 'COSMETIC_SPECIAL' },
      { sku: '8802001', spu: 'SPU880200', name: '汉言氨基酸洗发露[三代]', barcode: '6978802001001', category: '洗发', shelfLife: '1095', tempLayer: '常温', operateMode: '购销', purchasePrice: 36, purchaseUnit: '瓶', tone: 'green', mark: '洗', complianceEnabled: true, complianceType: 'COSMETIC_NORMAL' },
      { sku: '8802002', spu: 'SPU880200', name: '汉言懒人护发锦缎霜', barcode: '6978802001002', category: '护发', shelfLife: '1095', tempLayer: '常温', operateMode: '购销', purchasePrice: 42, purchaseUnit: '瓶', tone: 'blue', mark: '护', complianceEnabled: true, complianceType: 'COSMETIC_NORMAL' }
    ];
  }

  window.MasterDataComplianceStore = {
    CERT_TYPES: CERT_TYPES,
    PLACEHOLDER: PLACEHOLDER,
    mergeDemoSuppliers: mergeDemoSuppliers,
    templates: function () { return ensureTemplates(); },
    saveTemplates: function () { saveJson(TPL_KEY, ensureTemplates()); },
    dossiers: function () { return ensureDossiers(); },
    saveDossiers: function () { saveJson(DOS_KEY, ensureDossiers()); },
    settings: function () { return ensureSettings(); },
    saveSettings: function () { saveJson(SET_KEY, ensureSettings()); },
    goodsFlags: function () { return ensureGoodsFlags(); },
    saveGoodsFlags: function () { saveJson(GOODS_KEY, ensureGoodsFlags()); },
    getGoodsFlag: function (sku) {
      return ensureGoodsFlags()[sku] || { enabled: false, type: '' };
    },
    setGoodsFlag: function (sku, enabled, type) {
      var map = ensureGoodsFlags();
      if (!enabled) {
        map[sku] = { enabled: false, type: '' };
      } else {
        map[sku] = { enabled: true, type: type || '' };
      }
      saveJson(GOODS_KEY, map);
    },
    findTemplate: findTemplate,
    findDossier: findDossier,
    findSupplier: findSupplier,
    findCertificate: findCertificate,
    certExpiryStatus: certExpiryStatus,
    dateExpiryStatus: dateExpiryStatus,
    dossierCompleteness: dossierCompleteness,
    dossierExpiry: dossierExpiry,
    goodsAggregate: goodsAggregate,
    itemPass: itemPass,
    warnDays: warnDays,
    nextTemplateId: nextTemplateId,
    nextDossierId: nextDossierId,
    nextDossierCode: nextDossierCode,
    nextCertId: nextCertId,
    demoCatalogGoods: demoCatalogGoods,
    activeTemplates: function () {
      return ensureTemplates().filter(function (t) { return t.status !== 'disabled'; });
    },
    suppliersByRole: function (role) {
      mergeDemoSuppliers();
      var store = window.MasterDataSupplierStore;
      if (!store) return [];
      return store.all().filter(function (s) {
        return Array.isArray(s.roles) && s.roles.indexOf(role) >= 0;
      });
    },
    statsActive: function () {
      var list = ensureDossiers().filter(function (d) { return d.status === 'active'; });
      var stats = { expiring: 0, expired: 0, missing: 0, complete: 0 };
      list.forEach(function (d) {
        var c = dossierCompleteness(d);
        if (c === 'missing') stats.missing += 1;
        else if (c === 'complete') stats.complete += 1;
        var e = dossierExpiry(d);
        if (e === 'expiring') stats.expiring += 1;
        if (e === 'expired') stats.expired += 1;
      });
      return stats;
    }
  };

  mergeDemoSuppliers();
})();
