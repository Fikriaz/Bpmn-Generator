// utils/bpmnHighlight.js

/* eslint-disable no-console */

const LOG_PREFIX = "[bpmnHighlight]";

// --- 1) Normalizer -----------------------------------------------------------
const TYPE_WORDS = [
  "startevent","endevent","intermediateevent","boundaryevent","timerEvent","timer",
  "errorEvent","signalEvent","conditionalEvent","messageEvent","event",
  "task","usertask","servicetask","manualtask","scripttask","businessruletask",
  "messagetask","sendtask","receivetask",
  "activity","callactivity","subprocess","sub-process",
  "gateway","exclusivegateway","parallelgateway","inclusivegateway","eventbasedgateway",
  "sequenceflow","messageflow","association","textannotation","dataobject","datastore",
];

function normalizeName(s) {
  if (!s) return "";
  let t = String(s);

  // buang prefix dalam kurung siku: [Lane] / [Pool]
  t = t.replace(/^\s*\[[^\]]*\]\s*/g, "");

  // buang kode di depan seperti [id] Nama
  t = t.replace(/^\s*\([^)]+\)\s*/g, "");

  // lowercase basic
  t = t.toLowerCase().trim();

  // ganti underscore & multiple spaces
  t = t.replace(/_/g, " ").replace(/\s+/g, " ");

  // buang kata jenis BPMN yang sering nongol di rawPath
  TYPE_WORDS.forEach(w => {
    t = t.replace(new RegExp(`\\b${w}\\b`, "g"), "");
  });

  // buang sisa tanda baca
  t = t.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim();
  return t;
}

// --- 2) Build mapping --------------------------------------------------------
export function buildElementMapping(viewer) {
  const reg = viewer.get("elementRegistry");
  const all = reg.getAll();

  // Map: key(normalized) -> elementId
  const nameToId = new Map();
  // Untuk fuzzy: simpan daftar kandidat [normName, id, rawName]
  const candidates = [];

  all.forEach(el => {
    const id = el.id;
    const bo = el.businessObject || {};
    const rawName = bo.name || bo.id || id;

    // kunci-kunci yang mungkin berguna
    const keys = new Set([
      normalizeName(rawName),
      normalizeName(id),
      normalizeName(bo.id || ""),
      normalizeName((bo.$type || "").replace(/^bpmn:/, "")),
    ]);

    // Tambahkan kombinasi: "<name> <type>"
    if (bo.name && bo.$type) {
      keys.add(normalizeName(`${bo.name} ${String(bo.$type).replace(/^bpmn:/, "")}`));
    }

    keys.forEach(k => {
      if (k) {
        if (!nameToId.has(k)) nameToId.set(k, id);
        candidates.push([k, id, String(rawName)]);
      }
    });
  });

  console.log(LOG_PREFIX, `Created ${all.length} elements, ${nameToId.size} keys`);
  return { nameToId, candidates };
}

// --- 3) Converter: display names -> actual IDs -------------------------------
export function convertToActualIds(rawPath = [], mapping) {
  if (!Array.isArray(rawPath)) return [];
  const ids = [];
  let ok = 0, fail = 0;

  rawPath.forEach((label, i) => {
    const key = normalizeName(label);
    let id = mapping.nameToId.get(key);

    if (!id) {
      // Fuzzy: cari kandidat yang mengandung key
      const hit = mapping.candidates.find(([k]) => k.includes(key) || key.includes(k));
      if (hit) id = hit[1];
    }

    if (id) {
      ids.push(id);
      ok++;
    } else {
      fail++;
      console.log(LOG_PREFIX, `Could not map #${i}: "${label}" (norm: "${key}")`);
    }
  });

  console.log(LOG_PREFIX, `Converted ${ok}/${rawPath.length} names`);
  return ids;
}

// --- 4) Clear all highlights -------------------------------------------------
export function clearAllHighlights(viewer) {
  if (!viewer) return;
  const canvas = viewer.get("canvas");
  const reg = viewer.get("elementRegistry");
  reg.getAll().forEach(el => {
    canvas.removeMarker(el.id, "highlight-path");
    canvas.removeMarker(el.id, "highlight-subprocess");
  });
  console.log(LOG_PREFIX, "Cleared all highlights");
}

// --- 5) Resolve connecting edges (sequence/message flow) ---------------------
function findConnectingEdge(reg, aId, bId) {
  const a = reg.get(aId);
  const b = reg.get(bId);
  if (!a || !b) return null;

  // direct outgoing match
  const out = a.outgoing || [];
  for (const flow of out) {
    if (flow.target && flow.target.id === b.id) return flow.id;
  }

  // kadang arah kebalik jika path di data terbalik (fallback)
  const incoming = a.incoming || [];
  for (const flow of incoming) {
    if (flow.source && flow.source.id === b.id) return flow.id;
  }

  return null;
}

// --- 6) Highlighter ----------------------------------------------------------
export function highlightPath(viewer, elementIds = []) {
  if (!viewer || !elementIds?.length) return;

  // clear dulu biar nggak numpuk
  clearAllHighlights(viewer);

  const canvas = viewer.get("canvas");
  const reg = viewer.get("elementRegistry");

  // highlight node
  elementIds.forEach(id => {
    const el = reg.get(id);
    if (!el) return;
    const isSub = String(el.type || "").toLowerCase().includes("subprocess");
    canvas.addMarker(id, isSub ? "highlight-subprocess" : "highlight-path");
  });

  // cari edge antar pasangan berurutan
  let edgeCount = 0;
  for (let i = 0; i < elementIds.length - 1; i++) {
    const edgeId = findConnectingEdge(reg, elementIds[i], elementIds[i + 1]);
    if (edgeId) {
      canvas.addMarker(edgeId, "highlight-path");
      edgeCount++;
    }
  }

  console.log(LOG_PREFIX, `Highlighting ${elementIds.length} elements`);
  console.log(LOG_PREFIX, `Highlighted ${edgeCount} edges`);
}
