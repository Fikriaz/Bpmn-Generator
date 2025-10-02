"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  FileText,
  Eye,
  MapPin,
  AlertCircle
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import UserMenu from "../components/ui/UserMenu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../components/ui/Table";
import BpmnViewer from "bpmn-js/lib/NavigatedViewer";
import { API_BASE, authFetch } from "../utils/auth";

export default function ScenarioPage() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const overlayIdsRef = useRef([]);
  const elementMappingRef = useRef({});

  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [elementNames, setElementNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fileId =
    location.state?.fileId || new URLSearchParams(location.search).get("fileId");

  const getScenarios = (d) =>
    (d?.testScenariosJson && Array.isArray(d.testScenariosJson)
      ? d.testScenariosJson
      : Array.isArray(d?.testScenarios)
      ? d.testScenarios
      : []) || [];

  const scenarios = useMemo(() => getScenarios(data), [data]);

  useEffect(() => {
    if (!fileId) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await authFetch(
          `${API_BASE}/api/bpmn/files/${fileId}`,
          { method: "GET" },
          { onUnauthorizedRedirectTo: "/login" }
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const json = await res.json();
        setData(json);

        if (containerRef.current) {
          const viewer = new BpmnViewer({ container: containerRef.current });
          viewerRef.current = viewer;

          await viewer.importXML(json.bpmnXml);

          buildElementMapping(viewer, json);
          extractElementNames(viewer);

          const canvas = viewer.get("canvas");
          canvas.zoom("fit-viewport");

          const bus = viewer.get("eventBus");
          bus.on("import.render.complete", () => fixTextStyling());
          bus.on("import.done", () => fixTextStyling());

          const list = getScenarios(json);
          if (list.length > 0) {
            const actualIds = convertToActualIds(list[0]?.rawPath || []);
            highlightPath(actualIds);
          }
        }
      } catch (err) {
        console.error("Gagal fetch/import BPMN:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (viewerRef.current) viewerRef.current.destroy();
    };
  }, [fileId, navigate]);

  useEffect(() => {
    if (scenarios.length && viewerRef.current) {
      const actualIds = convertToActualIds(scenarios[currentPathIndex]?.rawPath || []);
      highlightPath(actualIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPathIndex, scenarios.length]);

  /* ===== Helpers ===== */

  const buildElementMapping = (viewer, data) => {
    const registry = viewer.get("elementRegistry");
    const elements = registry.getAll();
    const mapping = {};

    // Mapping dari backend (elementsJson)
    if (data.elementsJson && Array.isArray(data.elementsJson)) {
      data.elementsJson.forEach((elem) => {
        if (elem?.id) {
          if (elem.lane && elem.name) {
            mapping[`[${elem.lane}] ${elem.name}`] = elem.id;
          }
          if (elem.name) {
            mapping[elem.name] = elem.id;
            mapping[`[System] ${elem.name}`] = elem.id; // fallback
          }
        }
      });
    }

    // Fallback mapping dari diagram
    elements.forEach((el) => {
      const bo = el.businessObject;
      if (bo && bo.name) {
        mapping[bo.name] = el.id;

        // Markas System di dalam SubProcess (opsional)
        if (el.parent && el.parent.type === "bpmn:SubProcess") {
          mapping[`[System] ${bo.name}`] = el.id;
        }

        const laneName = findElementLaneName(el, elements);
        if (laneName) {
          mapping[`[${laneName}] ${bo.name}`] = el.id;
        }
      }
    });

    elementMappingRef.current = mapping;
  };

  const findElementLaneName = (element, allElements) => {
    const lanes = allElements.filter((el) => el.type === "bpmn:Lane");
    for (const lane of lanes) {
      const flowNodes = lane?.businessObject?.flowNodeRef || [];
      // flowNodeRef berisi BO nodes, bukan string id → bandingkan dengan businessObject
      const isInLane = flowNodes.some((n) => n && element.businessObject && n.id === element.businessObject.id);
      if (isInLane) return lane.businessObject?.name || lane.id;
    }
    return null;
    // Catatan: ini pendekatan sederhana; kalau pakai LaneSet / Participant kompleks, backend mapping sudah bantu.
  };

  const convertToActualIds = (displayNames) => {
    const mapping = elementMappingRef.current;
    return (displayNames || [])
      .map((displayName) => {
        let actualId = mapping[displayName];

        if (!actualId && /\[.*?\]\s+/.test(displayName)) {
          const withoutBracket = displayName.replace(/^\[.*?\]\s*/, "");
          actualId = mapping[withoutBracket];
        }

        if (!actualId && displayName.startsWith("[System]")) {
          const clean = displayName.replace(/^\[.*?\]\s*/, "");
          actualId = mapping[clean];
        }

        if (!actualId) {
          console.warn(`No mapping found for display name: ${displayName}`);
          return displayName; // fallback id = displayName (biar ga blank)
        }
        return actualId;
      })
      .filter(Boolean);
  };

  const typeClassFor = (el) => {
    const t = el?.type || el?.businessObject?.$type || "";
    if (t.includes("SequenceFlow")) return "type-seq";
    if (t.includes("MessageFlow")) return "type-msg";
    if (t.includes("Task") || t.includes("Activity")) return "type-task";
    if (t.includes("Event")) return "type-event";
    if (t.includes("Gateway")) return "type-gateway";
    return "type-other";
  };

  const fixTextStyling = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const canvasContainer = viewer.get("canvas").getContainer();
    const texts = canvasContainer.querySelectorAll(".djs-label text, .djs-visual text");
    texts.forEach((t) => {
      t.removeAttribute("stroke");
      t.removeAttribute("stroke-width");
      t.style.stroke = "none";
      t.style.strokeWidth = "0";
      t.style.paintOrder = "normal";
      t.style.fontWeight = "normal";
      t.style.fill = "black";
      t.style.vectorEffect = "non-scaling-stroke";
      t.style.shapeRendering = "geometricPrecision";
      t.style.fontFamily = "Arial, sans-serif";
      t.style.fontSize = "12px";
    });
  };

  const extractElementNames = (viewer) => {
    const registry = viewer.get("elementRegistry");
    const elements = registry.getAll();
    const nameMap = {};
    elements.forEach((el) => {
      const bo = el.businessObject;
      nameMap[el.id] = (bo && (bo.name || bo.id)) || el.id;
    });
    setElementNames(nameMap);
  };

  const findFlowIdsBetween = (fromId, toId) => {
    const viewer = viewerRef.current;
    if (!viewer) return [];
    const reg = viewer.get("elementRegistry");
    const from = reg.get(fromId);
    if (!from || !from.outgoing) return [];
    return from.outgoing
      .filter((f) => f && f.target && f.target.id === toId)
      .map((f) => f.id);
  };

  const clearHighlights = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const canvas = viewer.get("canvas");
    const reg = viewer.get("elementRegistry");
    const overlays = viewer.get("overlays");

    reg.getAll().forEach((el) => {
      canvas.removeMarker(el.id, "highlight-path");
      canvas.removeMarker(el.id, "highlight-subprocess");
      canvas.removeMarker(el.id, "type-task");
      canvas.removeMarker(el.id, "type-event");
      canvas.removeMarker(el.id, "type-gateway");
      canvas.removeMarker(el.id, "type-seq");
      canvas.removeMarker(el.id, "type-msg");
      canvas.removeMarker(el.id, "type-other");
    });

    try {
      overlayIdsRef.current.forEach((id) => overlays.remove(id));
    } catch (e) {
      console.warn("Error removing overlays:", e);
    }
    overlayIdsRef.current = [];

    const customStyles = document.querySelectorAll(".bpmn-highlight-style");
    customStyles.forEach((style) => style.remove());
  };

  const highlightPath = (actualIds) => {
    const viewer = viewerRef.current;
    if (!viewer || !Array.isArray(actualIds) || actualIds.length === 0) {
      console.warn("Invalid path for highlighting:", actualIds);
      return;
    }

    clearHighlights();

    const canvas = viewer.get("canvas");
    const reg = viewer.get("elementRegistry");

    const validElements = actualIds
      .map((id) => {
        const element = reg.get(id);
        if (!element) {
          console.warn(`Element not found: ${id}`);
          return null;
        }
        return {
          id,
          element,
          isSubprocessElement: element.parent && element.parent.type === "bpmn:SubProcess"
        };
      })
      .filter(Boolean);

    if (validElements.length === 0) {
      canvas.zoom("fit-viewport");
      return;
    }

    validElements.forEach(({ id, element, isSubprocessElement }) => {
      canvas.addMarker(id, isSubprocessElement ? "highlight-subprocess" : "highlight-path");
      canvas.addMarker(id, typeClassFor(element));
    });

    for (let i = 0; i < validElements.length - 1; i++) {
      const fromId = validElements[i].id;
      const toId = validElements[i + 1].id;
      const flowIds = findFlowIdsBetween(fromId, toId);
      flowIds.forEach((fid) => {
        canvas.addMarker(fid, "highlight-path");
        canvas.addMarker(fid, "type-seq");
      });
    }

    canvas.zoom("fit-viewport");
    setTimeout(fixTextStyling, 100);
  };

  /* ===== Events ===== */

  const handlePrev = () => {
    if (!scenarios.length) return;
    setCurrentPathIndex((i) => (i === 0 ? scenarios.length - 1 : i - 1));
  };

  const handleNext = () => {
    if (!scenarios.length) return;
    setCurrentPathIndex((i) => (i === scenarios.length - 1 ? 0 : i + 1));
  };

  const handleRowClick = (index) => {
    setCurrentPathIndex(index);
    const actualIds = convertToActualIds(scenarios[index]?.rawPath || []);
    highlightPath(actualIds);
  };

  const getReadableScenarioPath = (pathArray) => {
    if (!Array.isArray(pathArray)) return "-";
    return pathArray.map((displayName) => displayName.replace(/^\[.*?\]\s*/, "")).join(" → ");
  };

  const getStatusDisplay = (scenario) => {
    if (scenario?.rawPath && scenario.rawPath.length > 0) {
      const lastRawPath = scenario.rawPath[scenario.rawPath.length - 1];
      const cleanText = String(lastRawPath).replace(/^\[.*?\]\s*/, "").trim();
      return { text: cleanText, color: "text-green-600", bgColor: "bg-green-100" };
    }
    const pathStr = scenario?.scenario_path?.trim();
    if (pathStr) {
      const steps = pathStr.split("->").map((s) => s.trim()).filter(Boolean);
      if (steps.length > 0) {
        const lastStep = steps[steps.length - 1].replace(/^\[.*?\]\s*/, "").trim();
        return { text: lastStep, color: "text-green-600", bgColor: "bg-green-100" };
      }
    }
    return { text: "Ready", color: "text-blue-600", bgColor: "bg-blue-100" };
  };

  const resetHighlight = () => {
    clearHighlights();
    setTimeout(fixTextStyling, 50);
  };

  const handleDownloadScenario = () => {
    const list = scenarios;
    if (!list.length) return;
    const dataStr = JSON.stringify(list, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `scenarios_${fileId}.json`;
    const a = document.createElement("a");
    a.setAttribute("href", dataUri);
    a.setAttribute("download", exportFileDefaultName);
    a.click();
  };

  const handleDownloadPath = (scenario, index) => {
    const pathData = {
      path_id: scenario.path_id || `P${index + 1}`,
      rawPath: scenario.rawPath,
      readable_description: scenario.readable_description,
      expected_result: scenario.expected_result
    };
    const dataStr = JSON.stringify(pathData, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `path_${pathData.path_id}.json`;
    const a = document.createElement("a");
    a.setAttribute("href", dataUri);
    a.setAttribute("download", exportFileDefaultName);
    a.click();
  };

  /* ===== UI ===== */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading BPMN diagram...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading BPMN</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: "#2185D5" }}>
                  <div className="text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg">BPMN TESTING</div>
                  <div className="text-xs text-gray-500 font-medium">Automation</div>
                </div>
              </div>

              <nav className="flex space-x-1">
                <Link to="/" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100">
                  Upload BPMN
                </Link>
                <div className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm" style={{ backgroundColor: "#2185D5" }}>
                  Flow Test
                </div>
                <Link to="/history" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100">
                  History BPMN
                </Link>
              </nav>
            </div>

            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Diagram */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">BPMN Diagram</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                <span>Interactive View</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div ref={containerRef} className="w-full h-[520px] rounded-lg border border-gray-200 overflow-hidden bg-gray-50" />
          </div>
        </div>

        {/* Path Navigation */}
        {scenarios.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Path Navigation</h3>
              <p className="text-sm text-gray-500 mt-1">Navigate through different scenario paths</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <button
                  onClick={handlePrev}
                  disabled={!scenarios.length}
                  className="p-3 hover:bg-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>

                <div className="text-center flex-1 px-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-sm font-medium text-blue-600 mb-2">
                      Path {currentPathIndex + 1} of {scenarios.length}
                    </div>
                    <div className="font-semibold text-gray-900 mb-2">
                      {scenarios[currentPathIndex]?.path_id || `P${currentPathIndex + 1}`}
                    </div>
                    <div className="text-sm text-gray-600 break-words">
                      {getReadableScenarioPath(scenarios[currentPathIndex]?.rawPath)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  disabled={!scenarios.length}
                  className="p-3 hover:bg-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Button
            className="flex items-center justify-center space-x-2 bg-white border-2 border-[#2185D5] text-[#2185D5] hover:bg-blue-50 transition-all duration-200 py-3 px-6 rounded-lg font-medium"
            onClick={resetHighlight}
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reset Highlight</span>
          </Button>
          <Button
            className="flex items-center justify-center space-x-2 bg-[#2185D5] hover:bg-[#1D5D9B] text-white transition-all duration-200 py-3 px-6 rounded-lg font-medium shadow-md hover:shadow-lg"
            onClick={handleDownloadScenario}
          >
            <Download className="w-5 h-5" />
            <span>Download All Scenarios</span>
          </Button>
        </div>

        {/* Scenario Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Test Scenarios</h3>
                <p className="text-sm text-gray-500 mt-1">{scenarios.length} scenario paths available</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-900 py-4">Path ID</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-4">Scenario Overview</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-4">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900 py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.length ? (
                  scenarios.map((scenario, index) => {
                    const status = getStatusDisplay(scenario);
                    return (
                      <TableRow
                        key={index}
                        className={`cursor-pointer transition-all duration-200 border-l-4 ${
                          currentPathIndex === index
                            ? "bg-blue-50 border-[#2185D5] shadow-sm"
                            : "hover:bg-gray-50 border-transparent hover:border-gray-200"
                        }`}
                        onClick={() => handleRowClick(index)}
                      >
                        <TableCell className="font-semibold text-[#2185D5] py-4">
                          {scenario.path_id || `P${index + 1}`}
                        </TableCell>
                        <TableCell className="py-4 max-w-md">
                          <div className="space-y-2">
                            <div className="text-sm text-gray-900 font-medium line-clamp-2">
                              {scenario.summary && scenario.summary.trim() !== "" ? scenario.summary : "No summary available"}
                            </div>
                            <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">
                              {scenario.rawPath?.length || 0} steps
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                            {status.text}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex gap-2">
                            <Link
                              to="/scenario/detail"
                              state={{ fileId, pathIndex: index, scenarioId: scenario.path_id || `P${index + 1}` }}
                            >
                              <Button
                                size="sm"
                                className="flex items-center space-x-1 bg-[#2185D5] hover:bg-[#1D5D9B] text-white text-xs px-3 py-2 rounded-md transition-colors duration-200"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Detail</span>
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              className="flex items-center space-x-1 bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded-md transition-colors duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPath(scenario, index);
                              }}
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No scenarios available</h3>
                      <p className="text-gray-500 mb-6">Please upload a BPMN file to generate test scenarios</p>
                      <Link
                        to="/"
                        className="inline-flex items-center px-6 py-3 bg-[#2185D5] hover:bg-[#1D5D9B] text-white font-medium rounded-lg transition-colors duration-200"
                      >
                        Upload BPMN File
                      </Link>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      {/* Flexible, type-based highlighting CSS */}
      <style>{`
        .djs-label text, .djs-visual text {
          stroke: none !important;
          paint-order: normal !important;
          font-weight: normal !important;
          fill: black !important;
          vector-effect: non-scaling-stroke !important;
          shape-rendering: geometricPrecision !important;
          font-family: Arial, sans-serif !important;
          font-size: 12px !important;
        }

        .highlight-path { stroke-width: 3 !important; }
        .highlight-subprocess { stroke-width: 2 !important; }

        .djs-element.highlight-path.type-task .djs-visual > rect {
          fill: #FFFFBD !important;
          stroke: #000 !important;
          stroke-width: 2 !important;
        }
        .djs-element.highlight-path.type-event .djs-visual > circle {
          fill: #98E9DD !important;
          stroke: #000 !important;
          stroke-width: 2 !important;
        }
        .djs-element.highlight-path.type-gateway .djs-visual > polygon {
          fill: #E0E0E0 !important;
          stroke: #000 !important;
          stroke-width: 2 !important;
        }

        .djs-element.highlight-subprocess .djs-visual > rect,
        .djs-element.highlight-subprocess .djs-visual > circle,
        .djs-element.highlight-subprocess .djs-visual > polygon,
        .djs-element.highlight-subprocess .djs-visual > path {
          fill: rgba(152, 233, 221, 0.3) !important;
          stroke: #000 !important;
        }

        .djs-connection.highlight-path .djs-visual > path {
          stroke: #000 !important;
          stroke-width: 3px !important;
        }

        .djs-element[data-element-id*="Lane"],
        .djs-element[data-element-id*="Participant"] { z-index: 1 !important; }
        .djs-element.highlight-path { position: relative; z-index: 99999 !important; }
        .djs-element.highlight-subprocess { position: relative; z-index: 100000 !important; }

        .djs-element.highlight-path .djs-visual,
        .djs-element.highlight-subprocess .djs-visual {
          opacity: 1 !important;
          visibility: visible !important;
        }
      `}</style>
    </div>
  );
}
