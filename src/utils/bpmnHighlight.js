// src/utils/bpmnHighlight.js

/** ============================================================================
 *  Helper: tipe/alias elemen BPMN → untuk fallback pencarian
 *  - Event: startevent, intermediateevent, boundaryevent, endevent, etc
 *  - Gateway: gateway
 *  - Task: task
 *  - SubProcess: subprocess
 * ============================================================================ */
export const getTypeAliases = (el) => {
  const bo = el.businessObject || {};
  const aliases = [];

  const t = bo.$type || "";
  
  // Events
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

  // Gateways
  if (t.endsWith("Gateway")) aliases.push("gateway");
  
  // Tasks
  if (t.endsWith("Task")) aliases.push("task");
  
  // SubProcess
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
  while (p && p.$type && p.$type !== "bpmn:Process") {
    p = p.$parent;
  }
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
 *    "Nama", "[Lane] Nama", "[System] Nama", "id"
 *  - Alias tipe (task/gateway/event) hanya ditambahkan bila elemen tidak punya name
 * ============================================================================ */
export const buildElementMapping = (viewer) => {
  if (!viewer) return {};
  
  try {
    const reg = viewer.get("elementRegistry");
    const elements = reg.getAll();
    const mapping = {};

    elements.forEach((el) => {
      const id = el.id;
      const bo = el.businessObject || {};
      const laneOrPool = getLaneOrPool(el, elements);
      const aliases = getTypeAliases(el);

      // Mapping ID → ID (always)
      addKey(mapping, id, id);

      // Nama asli (kalau ada)
      if (bo.name) {
        addKey(mapping, bo.name, id);
        if (laneOrPool) {
          addKey(mapping, `[${laneOrPool}] ${bo.name}`, id);
        }
        addKey(mapping, `[System] ${bo.name}`, id);
        if (laneOrPool) {
          addKey(mapping, `[System] [${laneOrPool}] ${bo.name}`, id);
        }
      } else {
        // HANYA kalau tidak ada nama → kasih alias tipe
        aliases.forEach((alias) => {
          addKey(mapping, alias, id);
          if (laneOrPool) {
            addKey(mapping, `[${laneOrPool}] ${alias}`, id);
          }
          addKey(mapping, `[System] ${alias}`, id);
          if (laneOrPool) {
            addKey(mapping, `[System] [${laneOrPool}] ${alias}`, id);
          }
        });
      }
    });

    console.log(`[buildElementMapping] Created ${Object.keys(mapping).length} mappings`);
    return mapping;
    
  } catch (error) {
    console.error("[buildElementMapping] Error:", error);
    return {};
  }
};

/** ============================================================================
 *  Normalisasi label (hapus prefix [Lane] & [System], trim, lowercase)
 * ============================================================================ */
const normalizeKey = (s) =>
  String(s || "")
    .replace(/^\[[^\]]+\]\s*/g, "") // hapus [Lane/Pool]
    .replace(/^\[System\]\s*/i, "") // hapus [System]
    .trim()
    .toLowerCase();

/** ============================================================================
 *  convertToActualIds(displayNames, mapping)
 *  - Urutan coba:
 *    1) exact match (lowercase)
 *    2) hapus [Lane]/[System] → coba lagi
 *    3) coba berbagai variasi
 * ============================================================================ */
export const convertToActualIds = (displayNames, mapping) => {
  if (!Array.isArray(displayNames) || !mapping) {
    console.warn("[convertToActualIds] Invalid input");
    return [];
  }

  const tryGet = (key) => {
    if (!key) return null;
    const k = String(key).trim().toLowerCase();
    return mapping[k] || null;
  };

  const results = displayNames
    .map((name, index) => {
      // 1) Exact match
      let id = tryGet(name);
      if (id) return id;

      // 2) Remove [Lane]/[System]
      const soft = normalizeKey(name);
      id = tryGet(soft);
      if (id) return id;

      // 3) Remove only [Lane]
      const noLane = String(name || "").replace(/^\[[^\]]+\]\s*/, "");
      id = tryGet(noLane);
      if (id) return id;

      // 4) Remove only [System]
      const noSystem = String(name || "").replace(/^\[System\]\s*/i, "");
      id = tryGet(noSystem);
      if (id) return id;

      // Miss
      console.warn(`[convertToActualIds] Could not map #${index}: "${name}"`);
      return null;
    })
    .filter(Boolean);

  console.log(`[convertToActualIds] Converted ${results.length}/${displayNames.length} names`);
  return results;
};

/** ============================================================================
 *  findFlowIdsBetween(viewer, fromId, toId)
 *  - cari SequenceFlow/MessageFlow yang menghubungkan from → to
 * ============================================================================ */
export const findFlowIdsBetween = (viewer, fromId, toId) => {
  try {
    const reg = viewer.get("elementRegistry");
    const from = reg.get(fromId);
    if (!from || !from.outgoing) return [];
    
    return from.outgoing
      .filter((flow) => flow?.target?.id === toId)
      .map((flow) => flow.id);
      
  } catch (error) {
    console.error("[findFlowIdsBetween] Error:", error);
    return [];
  }
};

/** ============================================================================
 *  clearAllHighlights(viewer)
 *  - Hapus semua marker highlight
 * ============================================================================ */
export const clearAllHighlights = (viewer) => {
  if (!viewer) return;
  
  try {
    const canvas = viewer.get("canvas");
    const reg = viewer.get("elementRegistry");
    
    reg.getAll().forEach((el) => {
      canvas.removeMarker(el.id, "highlight-path");
      canvas.removeMarker(el.id, "highlight-subprocess");
    });
    
    console.log("[clearAllHighlights] Cleared all highlights");
    
  } catch (error) {
    console.error("[clearAllHighlights] Error:", error);
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
  if (!viewer) {
    console.warn("[highlightPath] No viewer");
    return;
  }
  
  if (!Array.isArray(actualIds) || !actualIds.length) {
    console.warn("[highlightPath] No IDs to highlight");
    clearAllHighlights(viewer);
    return;
  }

  try {
    const canvas = viewer.get("canvas");
    const reg = viewer.get("elementRegistry");

    // Reset all highlights first
    clearAllHighlights(viewer);

    // Validate and get elements
    const valid = actualIds
      .map((id) => {
        const element = reg.get(id);
        if (!element) {
          console.warn(`[highlightPath] Element not found: ${id}`);
          return null;
        }
        
        // Check if element is SubProcess
        const isSubProcess = element.type === "bpmn:SubProcess";
        
        return { id, element, isSubProcess };
      })
      .filter(Boolean);

    if (!valid.length) {
      console.warn("[highlightPath] No valid elements found");
      canvas.zoom("fit-viewport");
      return;
    }

    console.log(`[highlightPath] Highlighting ${valid.length} elements`);

    // Mark nodes
    valid.forEach(({ id, isSubProcess }) => {
      const marker = isSubProcess ? "highlight-subprocess" : "highlight-path";
      canvas.addMarker(id, marker);
    });

    // Mark edges (sequence flows / message flows)
    let edgeCount = 0;
    for (let i = 0; i < valid.length - 1; i++) {
      const fromId = valid[i].id;
      const toId = valid[i + 1].id;
      const flowIds = findFlowIdsBetween(viewer, fromId, toId);
      
      flowIds.forEach((flowId) => {
        canvas.addMarker(flowId, "highlight-path");
        edgeCount++;
      });
    }

    console.log(`[highlightPath] Highlighted ${edgeCount} edges`);

    // Fit viewport
    try {
      canvas.zoom("fit-viewport");
    } catch (error) {
      console.warn("[highlightPath] Could not fit viewport:", error);
    }
    
  } catch (error) {
    console.error("[highlightPath] Error:", error);
  }
};

/** ============================================================================
 *  debugListElements(viewer)
 *  - Debug helper: list semua elemen dengan detail
 * ============================================================================ */
export const debugListElements = (viewer) => {
  if (!viewer) {
    console.warn("[debugListElements] No viewer");
    return;
  }
  
  try {
    const reg = viewer.get("elementRegistry");
    const elements = reg.getAll();
    
    console.log("=== BPMN Elements Debug ===");
    console.log(`Total elements: ${elements.length}`);
    
    elements.forEach((el, index) => {
      const bo = el.businessObject;
      const laneOrPool = getLaneOrPool(el, elements);
      
      console.log(`#${index + 1}`, {
        id: bo.id,
        name: bo.name || "(no name)",
        type: el.type,
        lane: laneOrPool || "(no lane)",
        hasOutgoing: el.outgoing?.length || 0,
        hasIncoming: el.incoming?.length || 0
      });
    });
    
    console.log("===========================");
    
  } catch (error) {
    console.error("[debugListElements] Error:", error);
  }
};

/** ============================================================================
 *  debugTestMapping(viewer, rawPath)
 *  - Test apakah rawPath bisa di-convert ke IDs dengan benar
 * ============================================================================ */
export const debugTestMapping = (viewer, rawPath) => {
  if (!viewer || !Array.isArray(rawPath)) {
    console.warn("[debugTestMapping] Invalid input");
    return;
  }
  
  console.log("=== Debug Test Mapping ===");
  console.log("Raw Path:", rawPath);
  
  const mapping = buildElementMapping(viewer);
  console.log("Mapping keys:", Object.keys(mapping).length);
  
  const ids = convertToActualIds(rawPath, mapping);
  console.log("Converted IDs:", ids);
  console.log("Success rate:", `${ids.length}/${rawPath.length}`);
  
  // Detail per item
  rawPath.forEach((name, i) => {
    const id = ids[i];
    console.log(`${i + 1}. "${name}" → ${id || "NOT FOUND"}`);
  });
  
  console.log("==========================");
  
  return ids;
};