// src/utils/bpmnHighlight.js

/** ============================================================================
 *  Helper: tipe/alias elemen BPMN → untuk fallback pencarian
 *  - Event: startevent, intermediateevent, boundaryevent, endevent, messageevent, timerevent, signalevent, errorevent
 *  - Gateway: gateway
 *  - Task: task
 *  - SubProcess: subprocess
 * ============================================================================ */
export const getTypeAliases = (el) => {
  const bo = el.businessObject || {};
  const aliases = [];

  const t = bo.$type || "";
  if (t.endsWith("Event")) {
    aliases.push("event");
    if (t === "bpmn:StartEvent") aliases.push("startevent");
    if (t === "bpmn:EndEvent") aliases.push("endevent");
    if (t === "bpmn:IntermediateCatchEvent" || t === "bpmn:IntermediateThrowEvent") {
      aliases.push("intermediateevent");
    }
    if (t === "bpmn:BoundaryEvent") aliases.push("boundaryevent");

    // eventDefinitions → message/timer/signal/error
    (bo.eventDefinitions || []).forEach((ed) => {
      if (ed.$type === "bpmn:MessageEventDefinition") aliases.push("messageevent");
      if (ed.$type === "bpmn:TimerEventDefinition") aliases.push("timerevent");
      if (ed.$type === "bpmn:SignalEventDefinition") aliases.push("signalevent");
      if (ed.$type === "bpmn:ErrorEventDefinition") aliases.push("errorevent");
    });
  }

  if (t.endsWith("Gateway")) aliases.push("gateway");
  if (t.endsWith("Task")) aliases.push("task");
  if (t === "bpmn:SubProcess") aliases.push("subprocess");

  return [...new Set(aliases)];
};

/** ============================================================================
 *  addKey: simpan mapping dengan normalisasi lowercase
 * ============================================================================ */
const addKey = (map, key, id) => {
  if (!key) return;
  const k = String(key).trim();
  if (!k) return;
  map[k.toLowerCase()] = id;
};

/** ============================================================================
 *  Cari Lane/Pool (Participant) dari sebuah elemen
 * ============================================================================ */
const getLaneOrPool = (el, all) => {
  // Lane by flowNodeRef
  const lanes = all.filter((x) => x.type === "bpmn:Lane");
  for (const ln of lanes) {
    const refs = ln?.businessObject?.flowNodeRef || [];
    if (refs.some((n) => n?.id === el.businessObject?.id)) {
      return ln.businessObject?.name || ln.id;
    }
  }
  // Pool/Participant by processRef
  let p = el.businessObject;
  while (p && p.$type && p.$type !== "bpmn:Process") p = p.$parent;
  const procId = p?.id;
  if (procId) {
    const parts = all.filter((x) => x.type === "bpmn:Participant");
    const found = parts.find((pt) => pt.businessObject?.processRef?.id === procId);
    if (found) return found.businessObject?.name || found.id;
  }
  return null;
};

/** ============================================================================
 *  buildElementMapping(viewer)
 *  - Mapping nama → id, termasuk variasi:
 *    "Nama", "[Lane] Nama", "[System] Nama", "[System] [Lane] Nama"
 *  - Alias tipe (task/gateway/event/dll) HANYA ditambahkan bila elemen TIDAK punya bo.name
 *    supaya gak bikin konflik “task/gateway” ke elemen yang salah.
 * ============================================================================ */
export const buildElementMapping = (viewer) => {
  const reg = viewer.get("elementRegistry");
  const elements = reg.getAll();
  const mapping = {};

  elements.forEach((el) => {
    const id = el.id;
    const bo = el.businessObject || {};
    const laneOrPool = getLaneOrPool(el, elements);
    const aliases = getTypeAliases(el);

    // Nama aslinya (kalau ada)
    if (bo.name) {
      addKey(mapping, bo.name, id);
      if (laneOrPool) addKey(mapping, `[${laneOrPool}] ${bo.name}`, id);
      addKey(mapping, `[System] ${bo.name}`, id);
      if (laneOrPool) addKey(mapping, `[System] [${laneOrPool}] ${bo.name}`, id);
    } else {
      // HANYA kalau tidak ada nama → baru kasih alias tipe untuk key generik
      aliases.forEach((alias) => {
        addKey(mapping, alias, id);
        if (laneOrPool) addKey(mapping, `[${laneOrPool}] ${alias}`, id);
        addKey(mapping, `[System] ${alias}`, id);
        if (laneOrPool) addKey(mapping, `[System] [${laneOrPool}] ${alias}`, id);
      });
    }
  });

  return mapping;
};

/** ============================================================================
 *  Normalisasi label (hapus prefix [Lane] & [System], trim, lowercase)
 * ============================================================================ */
const normalizeKey = (s) =>
  String(s || "")
    .replace(/^\[[^\]]+\]\s*/g, "") // hapus 1x [Lane/Pool] di depan
    .replace(/^\[System\]\s*/i, "") // hapus [System] jika ada
    .trim()
    .toLowerCase();

/** ============================================================================
 *  convertToActualIds(displayNames, mapping)
 *  - Urutan coba:
 *    1) exact (lowercase)
 *    2) hapus [Lane]/[System] → coba lagi
 *  - Kalau tetap ga ketemu → null (dibuang oleh filter(Boolean))
 * ============================================================================ */
export const convertToActualIds = (displayNames, mapping) => {
  if (!Array.isArray(displayNames)) return [];

  const tryGet = (key) => mapping[String(key || "").trim().toLowerCase()];

  return displayNames
    .map((name) => {
      // 1) exact
      if (tryGet(name)) return tryGet(name);

      // 2) remove [Lane]/[System]
      const soft = normalizeKey(name);
      if (tryGet(soft)) return tryGet(soft);

      // 3) remove hanya [Lane] (barangkali [System] tidak ada)
      const noLane = String(name || "").replace(/^\[[^\]]+\]\s*/, "");
      if (tryGet(noLane)) return tryGet(noLane);

      // 4) remove hanya [System]
      const noSystem = String(name || "").replace(/^\[System\]\s*/i, "");
      if (tryGet(noSystem)) return tryGet(noSystem);

      // miss
      return null;
    })
    .filter(Boolean);
};

/** ============================================================================
 *  findFlowIdsBetween(viewer, fromId, toId)
 *  - cari SequenceFlow/MessageFlow langsung yang menghubungkan from → to
 * ============================================================================ */
export const findFlowIdsBetween = (viewer, fromId, toId) => {
  try {
    const reg = viewer.get("elementRegistry");
    const from = reg.get(fromId);
    if (!from || !from.outgoing) return [];
    return from.outgoing.filter((f) => f?.target?.id === toId).map((f) => f.id);
  } catch {
    return [];
  }
};

/** ============================================================================
 *  highlightPath(viewer, actualIds)
 *  - reset semua marker
 *  - mark node jalur (subprocess diberi marker berbeda)
 *  - mark edge antar node bertetangga
 *  - fit viewport
 * ============================================================================ */
export const highlightPath = (viewer, actualIds) => {
  if (!viewer || !Array.isArray(actualIds) || !actualIds.length) return;
  const canvas = viewer.get("canvas");
  const reg = viewer.get("elementRegistry");

  // reset
  reg.getAll().forEach((el) => {
    canvas.removeMarker(el.id, "highlight-path");
    canvas.removeMarker(el.id, "highlight-subprocess");
  });

  // valid nodes
  const valid = actualIds
    .map((id) => {
      const element = reg.get(id);
      if (!element) return null;
      const isSub = element.parent && element.parent.type === "bpmn:SubProcess";
      return { id, element, isSub };
    })
    .filter(Boolean);

  if (!valid.length) {
    canvas.zoom("fit-viewport");
    return;
  }

  // node mark
  valid.forEach(({ id, isSub }) => {
    canvas.addMarker(id, isSub ? "highlight-subprocess" : "highlight-path");
  });

  // edge mark (sequence/message)
  for (let i = 0; i < valid.length - 1; i++) {
    const fromId = valid[i].id;
    const toId = valid[i + 1].id;
    findFlowIdsBetween(viewer, fromId, toId).forEach((fid) => {
      canvas.addMarker(fid, "highlight-path");
    });
  }

  canvas.zoom("fit-viewport");
};
