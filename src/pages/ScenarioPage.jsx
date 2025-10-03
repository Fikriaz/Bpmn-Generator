"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

import Button from "../components/ui/Button";
import UserMenu from "../components/ui/UserMenu";
import DownloadPopup from "../components/DownloadPopup";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../components/ui/Table";
import { API_BASE, authFetch } from "../utils/auth";

// ✅ Import dari utils
import {
  buildElementMapping,
  convertToActualIds,
  highlightPath,
  clearAllHighlights
} from "../utils/bpmnHighlight";

// CSS wajib bpmn-js
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";

// ✅ Dynamic import viewer
let BpmnViewer = null;

export default function ScenarioPage() {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const elementMappingRef = useRef({});

  const [containerReady, setContainerReady] = useState(false);
  const [containerSized, setContainerSized] = useState(false);
  const [bpmnReady, setBpmnReady] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [downloadMode, setDownloadMode] = useState("single");
  const [selectedScenarioForDownload, setSelectedScenarioForDownload] = useState(null);

  const fileId = location.state?.fileId || new URLSearchParams(location.search).get("fileId");

  // ✅ Callback ref untuk container
  const setContainer = (el) => {
    containerRef.current = el;
    setContainerReady(!!el);
  };

  // ✅ Check container size
  useLayoutEffect(() => {
    if (!containerReady) return;
    const el = containerRef.current;
    const check = () => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setContainerSized(true);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerReady]);

  // ✅ Lazy-load BPMN viewer
  useEffect(() => {
    (async () => {
      try {
        const M = await import("bpmn-js/lib/NavigatedViewer");
        BpmnViewer = M.default;
      } catch {
        const M = await import("bpmn-js");
        BpmnViewer = M.default;
      }
      setBpmnReady(true);
    })();
  }, []);

  // ✅ Fetch BPMN file
  useEffect(() => {
    if (!fileId) {
      navigate("/");
      return;
    }

    let cancelled = false;

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
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [fileId, navigate]);

  const getScenarios = (d) =>
    (d?.testScenariosJson && Array.isArray(d.testScenariosJson)
      ? d.testScenariosJson
      : Array.isArray(d?.testScenarios)
      ? d.testScenarios
      : []) || [];

  const scenarios = useMemo(() => getScenarios(data), [data]);

  // ✅ Init viewer setelah semua siap
  useEffect(() => {
    if (!bpmnReady || !containerSized || !data?.bpmnXml || !BpmnViewer) return;

    try {
      viewerRef.current?.destroy();
    } catch {}

    const init = async () => {
      const viewer = new BpmnViewer({
        container: containerRef.current,
        width: "100%",
        height: "520px"
      });
      viewerRef.current = viewer;

      await viewer.importXML(data.bpmnXml);

      // ✅ Build mapping sekali
      const mapping = buildElementMapping(viewer);
      elementMappingRef.current = mapping;

      const canvas = viewer.get("canvas");
      const bus = viewer.get("eventBus");

      const fit = () => {
        try {
          canvas.resized();
          canvas.zoom("fit-viewport");
        } catch {}
      };

      fit();
      bus.on("import.done", fit);
      bus.on("import.render.complete", fit);

      // ✅ Highlight path pertama
      const list = getScenarios(data);
      if (list.length > 0) {
        const ids = convertToActualIds(list[0]?.rawPath || [], mapping);
        highlightPath(viewer, ids);
      }
    };

    init();

    return () => {
      try {
        viewerRef.current?.destroy();
      } catch {}
    };
  }, [bpmnReady, containerSized, data]);

  // ✅ Re-highlight saat path berubah
  useEffect(() => {
    if (!scenarios.length || !viewerRef.current) return;
    const mapping = elementMappingRef.current;
    const ids = convertToActualIds(scenarios[currentPathIndex]?.rawPath || [], mapping);
    highlightPath(viewerRef.current, ids);
  }, [currentPathIndex, scenarios, scenarios.length]);

  // ✅ UI Handlers
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
    const mapping = elementMappingRef.current;
    const ids = convertToActualIds(scenarios[index]?.rawPath || [], mapping);
    highlightPath(viewerRef.current, ids);
  };

  const resetHighlight = () => {
    clearAllHighlights(viewerRef.current);
  };

  const getReadableScenarioPath = (pathArray) => {
    if (!Array.isArray(pathArray)) return "-";
    return pathArray.map((displayName) => displayName.replace(/^\[.*?\]\s*/, "")).join(" → ");
  };

  const getStatusDisplay = (scenario) => {
    let expectedResult = "";
    if (scenario?.expected_result) {
      if (typeof scenario.expected_result === "object" && scenario.expected_result.message) {
        expectedResult = scenario.expected_result.message.trim();
      } else if (typeof scenario.expected_result === "string") {
        expectedResult = scenario.expected_result.trim();
      }
    }
    if (expectedResult) {
      return { text: expectedResult, color: "text-green-600", bgColor: "bg-green-100" };
    }
    return { text: "No expected result", color: "text-gray-600", bgColor: "bg-gray-100" };
  };

  const getActionSteps = (scenarioStep) => {
    if (!scenarioStep) return [];
    return scenarioStep
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.match(/^\d+\.\s+/) || s.startsWith("->"))
      .map((s) => s.replace(/^\d+\.\s*/, "").replace(/^->\s*/, "").trim())
      .filter((s) => s.length > 0);
  };

  const handleDownloadAllScenarios = () => {
    setDownloadMode("all");
    setSelectedScenarioForDownload(null);
    setShowDownloadPopup(true);
  };

  const handleDownloadPath = (scenario) => {
    setDownloadMode("single");
    setSelectedScenarioForDownload(scenario);
    setShowDownloadPopup(true);
  };

  const handleDownload = async (downloadOptions) => {
    const { format, includeTesterName, testerName } = downloadOptions;
    try {
      setDownloading(true);

      if (downloadMode === "all") {
        const downloadData = {
          format,
          includeTester: includeTesterName,
          testerName: includeTesterName ? testerName : ""
        };

        const res = await authFetch(
          `${API_BASE}/api/bpmn/files/${fileId}/download-all`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(downloadData)
          },
          { onUnauthorizedRedirectTo: "/login" }
        );

        if (!res.ok) throw new Error("Failed to download");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `all-test-scenarios.${format === "pdf" ? "pdf" : "xlsx"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const scenario = selectedScenarioForDownload;

        const processedTestData = [];
        if (scenario?.input_data && typeof scenario.input_data === "object") {
          Object.entries(scenario.input_data).forEach(([key, value]) => {
            const cleanKey = key
              .replace(/_/g, " ")
              .replace(/([A-Z])/g, " $1")
              .trim()
              .toLowerCase()
              .replace(/\b\w/g, (l) => l.toUpperCase());

            if (typeof value === "object" && value !== null) {
              if (Array.isArray(value)) {
                const arrayItems = value.map((item, index) => {
                  if (typeof item === "object") {
                    return {
                      id: `${key}_${index}`,
                      index,
                      properties: Object.entries(item).map(([subKey, subValue]) => ({
                        key: subKey,
                        value: String(subValue)
                      }))
                    };
                  }
                  return { id: `${key}_${index}`, index, value: String(item) };
                });
                processedTestData.push({ id: key, label: cleanKey, value: arrayItems, type: "array" });
              } else {
                const objectItems = Object.entries(value).map(([subKey, subValue]) => ({
                  key: subKey,
                  value: String(subValue)
                }));
                processedTestData.push({ id: key, label: cleanKey, value: objectItems, type: "object" });
              }
            } else {
              processedTestData.push({ id: key, label: cleanKey, value: String(value), type: "primitive" });
            }
          });
        }

        const downloadData = {
          format,
          pathId: scenario?.path_id || "-",
          description: scenario?.readable_description || scenario?.summary || "No description available",
          actionSteps: getActionSteps(scenario?.scenario_step),
          testData: processedTestData,
          expectedResult: scenario?.expected_result || "No expected result",
          fileName: data?.originalFileName || data?.fileName || "BPMN File",
          includeTester: includeTesterName,
          testerName: includeTesterName ? testerName : null
        };

        const response = await authFetch(
          `${API_BASE}/api/bpmn/files/download/${fileId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(downloadData)
          },
          { onUnauthorizedRedirectTo: "/login" }
        );

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const blob = await response.blob();
        if (blob.size === 0) throw new Error("Received empty file from server");

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `test-scenario-${scenario?.path_id || "detail"}.${format === "pdf" ? "pdf" : "xlsx"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      setShowDownloadPopup(false);
    } catch (err) {
      console.error("Download error:", err);
      alert("Gagal download. Silakan coba lagi.");
    } finally {
      setDownloading(false);
    }
  };

  // ✅ Loading
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

  // ✅ Error
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
            <div ref={setContainer} className="w-full h-[520px] rounded-lg border border-gray-200 overflow-hidden bg-gray-50" />
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
                      {scenarios[currentPathIndex]?.rawPath
                        ? getReadableScenarioPath(scenarios[currentPathIndex].rawPath)
                        : "-"}
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
            className="flex items-center justify-center space-x-2 bg-[#2185D5] hover:bg-[#1D5D9B] text-white transition-all duration-200 py-3 px-6 rounded-lg font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleDownloadAllScenarios}
            disabled={downloading || !scenarios.length}
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download All Scenario</span>
              </>
            )}
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
                              {scenario.readable_description ||
                                scenario.summary ||
                                getReadableScenarioPath(scenario.rawPath) ||
                                "No description available"}
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
                                handleDownloadPath(scenario);
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

      <DownloadPopup
        isOpen={showDownloadPopup}
        onClose={() => setShowDownloadPopup(false)}
        onDownload={handleDownload}
        scenario={downloadMode === "single" ? selectedScenarioForDownload : null}
        fileId={fileId}
      />

      <style>{`
/* ============================================================================
   BPMN Highlight CSS - Complete Version
   Untuk ScenarioPage.jsx dan ViewDetailPage.jsx
   ============================================================================ */

/* ===== 1. LAYOUT & CONTAINER ===== */
.djs-container {
  width: 100% !important;
  height: 100% !important;
}

/* ===== 2. Z-INDEX HIERARCHY ===== */
/* Lane/Pool (background) - paling belakang */
.djs-element[data-element-id*="Lane"],
.djs-element[data-element-id*="Participant"],
.djs-element[class*="Lane"],
.djs-element[class*="Participant"] {
  z-index: 1 !important;
}

/* Element biasa (Task/Event/Gateway) - di tengah */
.djs-element[data-element-id*="Task"],
.djs-element[data-element-id*="Activity"],
.djs-element[data-element-id*="Event"],
.djs-element[data-element-id*="Gateway"],
.djs-element[class*="Task"],
.djs-element[class*="Activity"],
.djs-element[class*="Event"],
.djs-element[class*="Gateway"] {
  z-index: 10 !important;
}

/* Highlighted elements - paling depan */
.djs-element.highlight-path,
.djs-element.highlight-subprocess {
  z-index: 10000 !important;
  position: relative;
}

/* Highlighted connections */
.djs-connection.highlight-path {
  z-index: 9999 !important;
}

/* ===== 3. TEXT STYLING (FIX STROKE ISSUE) ===== */
.djs-label text,
.djs-visual text {
  stroke: none !important;
  stroke-width: 0 !important;
  paint-order: normal !important;
  font-weight: normal !important;
  fill: black !important;
  font-family: Arial, sans-serif !important;
  font-size: 12px !important;
  vector-effect: non-scaling-stroke !important;
  shape-rendering: geometricPrecision !important;
}

/* Text pada highlighted element harus tetap readable */
.djs-element.highlight-path .djs-label text,
.djs-element.highlight-subprocess .djs-label text {
  stroke: none !important;
  font-weight: normal !important;
  fill: black !important;
}

/* Label z-index - selalu di atas shapes */
.djs-label {
  z-index: 100001 !important;
  pointer-events: none !important;
}

.highlight-path .djs-label,
.highlight-subprocess .djs-label {
  z-index: 100002 !important;
}

/* ===== 4. EVENTS (Circle) - #98E9DD ===== */
/* Start Event, End Event, Intermediate Event, Boundary Event */
.djs-element.highlight-path[data-element-id*="StartEvent"] .djs-visual > circle,
.djs-element.highlight-path[data-element-id*="EndEvent"] .djs-visual > circle,
.djs-element.highlight-path[data-element-id*="Event_"] .djs-visual > circle,
.djs-element.highlight-path[data-element-id*="IntermediateCatchEvent"] .djs-visual > circle,
.djs-element.highlight-path[data-element-id*="IntermediateThrowEvent"] .djs-visual > circle,
.djs-element.highlight-path[data-element-id*="BoundaryEvent"] .djs-visual > circle,
.djs-element.highlight-path[class*="StartEvent"] .djs-visual > circle,
.djs-element.highlight-path[class*="EndEvent"] .djs-visual > circle,
.djs-element.highlight-path[class*="IntermediateEvent"] .djs-visual > circle,
.djs-element.highlight-path[class*="BoundaryEvent"] .djs-visual > circle {
  fill: #98E9DD !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* Icon di dalam event (amplop, jam, dll) - tetap hitam untuk kontras */
.djs-element.highlight-path .djs-visual > path {
  stroke: #000000 !important;
  stroke-width: 1.5px !important;
  fill: none !important;
}

/* ===== 5. TASKS (Rectangle) - #FFFFBD ===== */
/* User Task, Service Task, Manual Task, Script Task, Business Rule Task */
.djs-element.highlight-path[data-element-id*="Task"] .djs-visual > rect,
.djs-element.highlight-path[data-element-id*="Activity_"] .djs-visual > rect,
.djs-element.highlight-path[data-element-id*="UserTask"] .djs-visual > rect,
.djs-element.highlight-path[data-element-id*="ServiceTask"] .djs-visual > rect,
.djs-element.highlight-path[data-element-id*="ManualTask"] .djs-visual > rect,
.djs-element.highlight-path[data-element-id*="ScriptTask"] .djs-visual > rect,
.djs-element.highlight-path[data-element-id*="BusinessRuleTask"] .djs-visual > rect,
.djs-element.highlight-path[class*="Task"] .djs-visual > rect,
.djs-element.highlight-path[class*="Activity"] .djs-visual > rect,
.djs-element.highlight-path[class*="UserTask"] .djs-visual > rect,
.djs-element.highlight-path[class*="ServiceTask"] .djs-visual > rect {
  fill: #FFFFBD !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* ===== 6. MESSAGE/RECEIVE TASK - #96DF67 (Hijau Muda) ===== */
.djs-element.highlight-path[data-element-id*="MessageTask"] .djs-visual > rect,
.djs-element.highlight-path[data-element-id*="ReceiveTask"] .djs-visual > rect,
.djs-element.highlight-path[data-element-id*="SendTask"] .djs-visual > rect,
.djs-element.highlight-path[class*="MessageTask"] .djs-visual > rect,
.djs-element.highlight-path[class*="ReceiveTask"] .djs-visual > rect,
.djs-element.highlight-path[class*="SendTask"] .djs-visual > rect {
  fill: #96DF67 !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* ===== 7. GATEWAYS (Diamond/Polygon) - #E0E0E0 ===== */
/* Exclusive Gateway, Parallel Gateway, Inclusive Gateway, Event-Based Gateway */
.djs-element.highlight-path[data-element-id*="Gateway"] .djs-visual > polygon,
.djs-element.highlight-path[data-element-id*="Gateway"] .djs-visual > circle,
.djs-element.highlight-path[class*="Gateway"] .djs-visual > polygon,
.djs-element.highlight-path[class*="Gateway"] .djs-visual > circle,
.djs-element.highlight-path[class*="ExclusiveGateway"] .djs-visual > polygon,
.djs-element.highlight-path[class*="ParallelGateway"] .djs-visual > polygon,
.djs-element.highlight-path[class*="InclusiveGateway"] .djs-visual > polygon,
.djs-element.highlight-path[class*="EventBasedGateway"] .djs-visual > polygon {
  fill: #E0E0E0 !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* ===== 8. SUBPROCESS - Semi-transparent #98E9DD ===== */
.djs-element.highlight-subprocess .djs-visual > rect,
.djs-element.highlight-subprocess .djs-visual > circle,
.djs-element.highlight-subprocess .djs-visual > polygon,
.djs-element.highlight-subprocess .djs-visual > path {
  fill: rgba(152, 233, 221, 0.3) !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* SubProcess yang tidak di-highlight */
.djs-element[data-element-id*="SubProcess"] .djs-visual > rect,
.djs-element[class*="SubProcess"] .djs-visual > rect {
  fill: rgba(255, 255, 255, 0.8) !important;
  stroke: #dddddd !important;
  stroke-width: 1px !important;
}

/* SubProcess yang di-highlight */
.djs-element[data-element-id*="SubProcess"].highlight-subprocess .djs-visual > rect,
.djs-element[class*="SubProcess"].highlight-subprocess .djs-visual > rect {
  fill: rgba(152, 233, 221, 0.15) !important;
  stroke: #000000 !important;
  stroke-width: 2px !important;
}

/* ===== 9. CONNECTIONS (Sequence Flow & Message Flow) ===== */
/* Sequence Flow */
.djs-connection.highlight-path .djs-visual > path,
.djs-connection.highlight-path .djs-visual > polyline {
  stroke: #000000 !important;
  stroke-width: 3px !important;
}

/* Message Flow (dashed) */
.djs-connection.highlight-path[class*="MessageFlow"] .djs-visual > path,
.djs-connection.type-bpmn\:MessageFlow.highlight-path .djs-visual > path {
  stroke: #000000 !important;
  stroke-width: 2px !important;
  stroke-dasharray: 8, 4 !important;
}

/* ===== 10. SPECIAL EVENT TYPES ===== */
/* Timer Event - Orange */
.djs-element.highlight-path[data-element-id*="TimerEvent"] .djs-visual > circle {
  fill: #FFD580 !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* Signal Event - Light Green */
.djs-element.highlight-path[data-element-id*="SignalEvent"] .djs-visual > circle {
  fill: #A5D6A7 !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* Error Event - Light Red */
.djs-element.highlight-path[data-element-id*="ErrorEvent"] .djs-visual > circle {
  fill: #FF8A80 !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* Conditional Event - Light Yellow */
.djs-element.highlight-path[data-element-id*="ConditionalEvent"] .djs-visual > circle {
  fill: #FFF59D !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* Message Event - Light Blue */
.djs-element.highlight-path[data-element-id*="MessageEvent"] .djs-visual > circle {
  fill: #81D4FA !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* ===== 11. CALL ACTIVITY - Light Blue ===== */
.djs-element.highlight-path[data-element-id*="CallActivity"] .djs-visual > rect,
.djs-element.highlight-path[class*="CallActivity"] .djs-visual > rect {
  fill: #B3E5FC !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* ===== 12. DATA OBJECTS & ANNOTATIONS ===== */
.djs-element.highlight-path[class*="DataObject"] .djs-visual > path,
.djs-element.highlight-path[class*="DataStore"] .djs-visual > path {
  fill: #E0E0E0 !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

.djs-element.highlight-path[class*="TextAnnotation"] .djs-visual > path {
  stroke: #000000 !important;
  stroke-width: 1.5 !important;
  fill: #FFFACD !important;
}

/* ===== 13. VISIBILITY & OPACITY ===== */
.djs-element.highlight-path .djs-visual,
.djs-element.highlight-subprocess .djs-visual {
  opacity: 1 !important;
  visibility: visible !important;
}

/* SubProcess tidak menghalangi pointer events */
.djs-element[data-element-id*="SubProcess"] .djs-visual,
.djs-element[class*="SubProcess"] .djs-visual {
  pointer-events: none;
}

/* ===== 14. FALLBACK STYLES ===== */
/* Jika ada element yang belum ter-cover, gunakan warna default */
.djs-element.highlight-path .djs-visual > circle {
  fill: #98E9DD !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

.djs-element.highlight-path .djs-visual > rect {
  fill: #FFFFBD !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

.djs-element.highlight-path .djs-visual > polygon {
  fill: #E0E0E0 !important;
  stroke: #000000 !important;
  stroke-width: 2 !important;
}

/* ===== 15. ANIMATION (Optional) ===== */
/* Uncomment untuk menambahkan animasi pulse pada highlighted elements */
/*
@keyframes highlight-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

.djs-element.highlight-path .djs-visual,
.djs-connection.highlight-path .djs-visual {
  animation: highlight-pulse 2s ease-in-out infinite;
}
*/

/* ===== 16. PRINT STYLES ===== */
@media print {
  .djs-element.highlight-path .djs-visual,
  .djs-connection.highlight-path .djs-visual {
    animation: none !important;
  }
}
      `}</style>
    </div>
  );
}