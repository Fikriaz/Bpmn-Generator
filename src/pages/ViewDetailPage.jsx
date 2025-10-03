"use client";

import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Save,
  Edit2,
  Plus,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import Button from "../components/ui/Button";
import UserMenu from "../components/ui/UserMenu";
import DownloadPopup from "../components/DownloadPopup";
import { API_BASE, authFetch } from "../utils/auth";

// Import BPMN viewer
let BpmnViewer = null;

export default function ViewDetailPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const elementMappingRef = useRef({});

  // Get parameters
  const scenarioId = searchParams.get("scenarioId");
  const fileId = location.state?.fileId || searchParams.get("fileId");
  const pathIndex = location.state?.pathIndex || 0;

  const [data, setData] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [elementNames, setElementNames] = useState({});
  const [editingTestData, setEditingTestData] = useState(false);
  const [testDataList, setTestDataList] = useState([]);
  const [originalTestData, setOriginalTestData] = useState([]);
  const [bpmnViewerReady, setBpmnViewerReady] = useState(false);

  // Download popup state
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);

  // Edit sections state
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingExpectedResult, setEditingExpectedResult] = useState(false);
  const [editingActionSteps, setEditingActionSteps] = useState(false);
  const [tempDescription, setTempDescription] = useState("");
  const [tempExpectedResult, setTempExpectedResult] = useState("");
  const [tempActionSteps, setTempActionSteps] = useState([]);

  /* ------------------------ Test Data – Add/Edit support ------------------------ */
  const [newField, setNewField] = useState({
    type: "primitive",
    label: "",
    value: "",
  });

  const slugKey = (text) =>
    (text || "")
      .toString()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w_]/g, "")
      .toLowerCase();

  const nextId = (prefix = "f") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

  // primitive
  const updatePrimitive = (id, value) => {
    setTestDataList((list) => list.map((it) => (it.id === id ? { ...it, value } : it)));
  };

  // object
  const addObjectProp = (id) => {
    setTestDataList((list) =>
      list.map((it) =>
        it.id === id
          ? {
              ...it,
              value: [...it.value, { key: `key_${it.value.length + 1}`, value: "" }],
            }
          : it
      )
    );
  };
  const updateObjectProp = (id, idx, key, value) => {
    setTestDataList((list) =>
      list.map((it) =>
        it.id === id
          ? {
              ...it,
              value: it.value.map((p, i) => (i === idx ? { key, value } : p)),
            }
          : it
      )
    );
  };
  const removeObjectProp = (id, idx) => {
    setTestDataList((list) =>
      list.map((it) => (it.id === id ? { ...it, value: it.value.filter((_, i) => i !== idx) } : it))
    );
  };

  // array
  const addArrayItem = (id, asObject = false) => {
    setTestDataList((list) =>
      list.map((it) =>
        it.id === id
          ? {
              ...it,
              value: [
                ...it.value,
                asObject
                  ? { id: nextId("arr"), index: it.value.length, properties: [{ key: "key_1", value: "" }] }
                  : { id: nextId("arr"), index: it.value.length, value: "" },
              ],
            }
          : it
      )
    );
  };
  const updateArrayItemValue = (id, idx, value) => {
    setTestDataList((list) =>
      list.map((it) =>
        it.id === id
          ? { ...it, value: it.value.map((v, i) => (i === idx ? { ...v, value } : v)) }
          : it
      )
    );
  };
  const addArrayItemProp = (id, idx) => {
    setTestDataList((list) =>
      list.map((it) =>
        it.id === id
          ? {
              ...it,
              value: it.value.map((v, i) =>
                i === idx
                  ? {
                      ...v,
                      properties: [...(v.properties || []), { key: `key_${(v.properties?.length || 0) + 1}`, value: "" }],
                    }
                  : v
              ),
            }
          : it
      )
    );
  };
  const updateArrayItemProp = (id, idx, pidx, key, value) => {
    setTestDataList((list) =>
      list.map((it) =>
        it.id === id
          ? {
              ...it,
              value: it.value.map((v, i) =>
                i === idx
                  ? {
                      ...v,
                      properties: v.properties.map((p, pi) => (pi === pidx ? { key, value } : p)),
                    }
                  : v
              ),
            }
          : it
      )
    );
  };
  const removeArrayItem = (id, idx) => {
    setTestDataList((list) =>
      list.map((it) => (it.id === id ? { ...it, value: it.value.filter((_, i) => i !== idx) } : it))
    );
  };

  const removeField = (id) => setTestDataList((list) => list.filter((it) => it.id !== id));

  const handleAddNewField = () => {
    const label = newField.label.trim();
    if (!label) return;

    const id = nextId("fld");
    const key = slugKey(label);

    if (newField.type === "primitive") {
      setTestDataList((list) => [...list, { id, label, value: newField.value ?? "", type: "primitive", key }]);
    } else if (newField.type === "object") {
      setTestDataList((list) => [
        ...list,
        { id, label, type: "object", key, value: [{ key: "key_1", value: "" }] },
      ]);
    } else {
      setTestDataList((list) => [
        ...list,
        {
          id,
          label,
          type: "array",
          key,
          value: [{ id: nextId("arr"), index: 0, value: "" }],
        },
      ]);
    }

    setNewField({ type: "primitive", label: "", value: "" });
  };

  // ✅ Helper function to save to backend
  const saveToBackend = async (updatedData) => {
    try {
      const response = await authFetch(
        `${API_BASE}/api/bpmn/files/${fileId}/scenarios/${scenario.path_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        },
        { onUnauthorizedRedirectTo: '/login' }
      );

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`);
      }

      return true;
    } catch (err) {
      console.error("Save failed:", err);
      throw err;
    }
  };

  // Mapping displayName -> elementId
  const buildElementMapping = (viewer, data) => {
    const registry = viewer.get("elementRegistry");
    const elements = registry.getAll();
    const mapping = {};

    if (data.elementsJson && Array.isArray(data.elementsJson)) {
      data.elementsJson.forEach((elem) => {
        if (elem.lane && elem.name) {
          const displayName = `[${elem.lane}] ${elem.name}`;
          mapping[displayName] = elem.id;
        } else if (elem.name) {
          mapping[elem.name] = elem.id;
          mapping[`[System] ${elem.name}`] = elem.id;
        }
      });
    }

    elements.forEach((el) => {
      const bo = el.businessObject;
      if (bo && bo.name) {
        mapping[bo.name] = el.id;
        if (el.parent && el.parent.type === "bpmn:SubProcess") {
          mapping[`[System] ${bo.name}`] = el.id;
        }
        const lane = findElementLane(el, elements);
        if (lane) mapping[`[${lane}] ${bo.name}`] = el.id;
      }
    });

    elementMappingRef.current = mapping;
  };

  const findElementLane = (element, allElements) => {
    const lanes = allElements.filter((el) => el.type === "bpmn:Lane");
    for (const lane of lanes) {
      if (lane.businessObject?.flowNodeRef && lane.businessObject.flowNodeRef.includes(element.id)) {
        return lane.businessObject.name || lane.id;
      }
    }
    return null;
  };

  const convertToActualIds = (displayNames) => {
    if (!Array.isArray(displayNames)) return [];
    const mapping = elementMappingRef.current;
    return displayNames
      .map((displayName) => {
        let actualId = mapping[displayName];
        if (!actualId && displayName.includes("[System]")) {
          const cleanName = displayName.replace(/^\[.*?\]\s*/, "");
          actualId = mapping[cleanName];
        }
        if (!actualId && displayName.includes("]")) {
          const withoutLane = displayName.replace(/^\[.*?\]\s*/, "");
          actualId = mapping[withoutLane];
        }
        if (!actualId) {
          console.warn(`No mapping found for display name: ${displayName}`);
          return displayName;
        }
        return actualId;
      })
      .filter(Boolean);
  };

  const findFlowIdsBetween = (fromId, toId) => {
    if (!viewerRef.current) return [];
    try {
      const reg = viewerRef.current.get("elementRegistry");
      const from = reg.get(fromId);
      if (!from || !from.outgoing) return [];
      return from.outgoing.filter((f) => f?.target?.id === toId).map((f) => f.id);
    } catch {
      return [];
    }
  };

  // Initialize BPMN viewer
  useEffect(() => {
    const init = async () => {
      if (typeof window !== "undefined" && !BpmnViewer) {
        try {
          const BpmnJS = await import("bpmn-js/lib/NavigatedViewer");
          BpmnViewer = BpmnJS.default;
          setBpmnViewerReady(true);
        } catch (error) {
          try {
            const BpmnJS = await import("bpmn-js");
            BpmnViewer = BpmnJS.default;
            setBpmnViewerReady(true);
          } catch (fallbackError) {
            console.warn("BPMN viewer not available:", fallbackError);
            setBpmnViewerReady(false);
          }
        }
      } else if (BpmnViewer) {
        setBpmnViewerReady(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (fileId) {
      fetchScenarioDetail();
    } else {
      setError("No file ID provided");
      setLoading(false);
    }
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch {}
      }
    };
  }, [fileId, scenarioId]);

  const fetchScenarioDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authFetch(
        `${API_BASE}/api/bpmn/files/${fileId}`,
        { method: "GET" },
        { onUnauthorizedRedirectTo: "/login" }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const bpmnData = await response.json();
      setData(bpmnData);

      let selectedScenario = null;
      if (bpmnData.testScenariosJson?.length > 0) {
        if (scenarioId) {
          selectedScenario = bpmnData.testScenariosJson.find(
            (s) => s.path_id === scenarioId || s.path_id === `P${scenarioId}`
          );
        }
        if (!selectedScenario) {
          selectedScenario = bpmnData.testScenariosJson[pathIndex] || bpmnData.testScenariosJson[0];
        }
      }
      setScenario(selectedScenario);

      if (selectedScenario?.input_data) {
        const processed = processInputDataGrouped(selectedScenario.input_data);
        setTestDataList(processed);
        setOriginalTestData(JSON.parse(JSON.stringify(processed)));
      }

      if (bpmnViewerReady && BpmnViewer && bpmnData.bpmnXml && containerRef.current) {
        await initializeBpmnDiagram(bpmnData.bpmnXml, selectedScenario);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch scenario details");
    } finally {
      setLoading(false);
    }
  };

  const initializeBpmnDiagram = async (bpmnXml, selectedScenario) => {
    try {
      if (viewerRef.current) viewerRef.current.destroy();

      const viewer = new BpmnViewer({
        container: containerRef.current,
        width: "100%",
        height: "500px",
      });
      viewerRef.current = viewer;

      await viewer.importXML(bpmnXml);

      buildElementMapping(viewer, data);
      extractElementNames(viewer);

      if (selectedScenario?.rawPath) {
        const actualIds = convertToActualIds(selectedScenario.rawPath);
        highlightPath(actualIds);
      }

      viewer.get("eventBus").on("rendered", () => {
        const canvasContainer = viewer.get("canvas").getContainer();
        const texts = canvasContainer.querySelectorAll(".djs-label text");
        texts.forEach((el) => {
          el.removeAttribute("stroke");
          el.style.stroke = "none";
          el.style.paintOrder = "normal";
          el.style.fontWeight = "normal";
          el.style.fill = "black";
          el.style.vectorEffect = "non-scaling-stroke";
          el.style.shapeRendering = "geometricPrecision";
        });
      });

      viewer.get("canvas").zoom("fit-viewport");
    } catch (bpmnError) {
      console.error("Error initializing BPMN viewer:", bpmnError);
    }
  };

  useEffect(() => {
    if (bpmnViewerReady && data?.bpmnXml && containerRef.current && !viewerRef.current) {
      initializeBpmnDiagram(data.bpmnXml, scenario);
    }
  }, [bpmnViewerReady, data, scenario]);

  const processInputDataGrouped = (inputData) => {
    const testDataArray = [];
    Object.entries(inputData).forEach(([key, value]) => {
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
                  value: String(subValue),
                })),
              };
            }
            return { id: `${key}_${index}`, index, value: String(item) };
          });
          testDataArray.push({ id: key, label: cleanKey, value: arrayItems, type: "array" });
        } else {
          const objectItems = Object.entries(value).map(([subKey, subValue]) => ({
            key: subKey,
            value: String(subValue),
          }));
          testDataArray.push({ id: key, label: cleanKey, value: objectItems, type: "object" });
        }
      } else {
        testDataArray.push({ id: key, label: cleanKey, value: String(value), type: "primitive" });
      }
    });
    return testDataArray;
  };

  const extractElementNames = (viewer) => {
    try {
      const registry = viewer.get("elementRegistry");
      const elements = registry.getAll();
      const nameMap = {};
      elements.forEach((el) => {
        nameMap[el.id] = el.businessObject?.name || el.id;
      });
      setElementNames(nameMap);
    } catch {}
  };

  const highlightPath = (actualIds) => {
    if (!viewerRef.current || !Array.isArray(actualIds) || actualIds.length === 0) return;

    try {
      const canvas = viewerRef.current.get("canvas");
      const registry = viewerRef.current.get("elementRegistry");

      registry.getAll().forEach((el) => {
        canvas.removeMarker(el.id, "highlight-path");
        canvas.removeMarker(el.id, "highlight-subprocess");
      });

      const valid = actualIds
        .map((id) => {
          const element = registry.get(id);
          if (!element) return null;
          return {
            id,
            element,
            isSubprocessElement: element.parent && element.parent.type === "bpmn:SubProcess",
          };
        })
        .filter(Boolean);

      if (!valid.length) {
        canvas.zoom("fit-viewport");
        return;
      }

      valid.forEach(({ id, isSubprocessElement }) => {
        const marker = isSubprocessElement ? "highlight-subprocess" : "highlight-path";
        canvas.addMarker(id, marker);
      });

      for (let i = 0; i < valid.length - 1; i++) {
        const flowIds = findFlowIdsBetween(valid[i].id, valid[i + 1].id);
        flowIds.forEach((fid) => canvas.addMarker(fid, "highlight-path"));
      }

      canvas.zoom("fit-viewport");
    } catch (error) {
      console.warn("Error highlighting path:", error);
    }
  };

  const getActionSteps = (scenarioStep) => {
    if (!scenarioStep) return [];
    const steps = scenarioStep
      .split("\n")
      .map((step) => step.trim())
      .filter((step) => step.match(/^\d+\.\s+/) || step.startsWith("->"))
      .map((step) => step.replace(/^\d+\.\s*/, "").replace(/^->\s*/, "").trim())
      .filter((step) => step.length > 0);
    return steps;
  };

  const getStatusDisplay = (scenario) => {
    if (!scenario) return "-";
    const message = scenario?.expected_result?.message?.trim();
    return message || "-";
  };

  // BPMN Viewer Controls
  const handleZoomFit = () => {
    if (viewerRef.current) {
      const canvas = viewerRef.current.get("canvas");
      canvas.zoom("fit-viewport");
    }
  };
  const handleZoomIn = () => {
    if (viewerRef.current) {
      const canvas = viewerRef.current.get("canvas");
      canvas.zoom(canvas.zoom() + 0.1);
    }
  };
  const handleZoomOut = () => {
    if (viewerRef.current) {
      const canvas = viewerRef.current.get("canvas");
      canvas.zoom(canvas.zoom() - 0.1);
    }
  };
  const handleResetHighlight = () => {
    if (!viewerRef.current) return;
    const canvas = viewerRef.current.get("canvas");
    const elementRegistry = viewerRef.current.get("elementRegistry");
    elementRegistry.getAll().forEach((el) => {
      canvas.removeMarker(el.id, "highlight-path");
      canvas.removeMarker(el.id, "highlight-subprocess");
    });
  };

  // ✅ FIXED: Edit handlers with backend save
  const handleEditDescription = () => {
    setEditingDescription(true);
    setTempDescription(scenario?.readable_description || "");
  };

  const handleSaveDescription = async () => {
    setSaving(true);
    try {
      const updatedInputData = {};
      testDataList.forEach(item => {
        if (item.type === 'primitive') {
          updatedInputData[item.id] = item.value;
        } else if (item.type === 'object') {
          const obj = {};
          item.value.forEach(prop => {
            obj[prop.key] = prop.value;
          });
          updatedInputData[item.id] = obj;
        } else if (item.type === 'array') {
          const arr = item.value.map(arrItem => {
            if (arrItem.properties) {
              const obj = {};
              arrItem.properties.forEach(prop => {
                obj[prop.key] = prop.value;
              });
              return obj;
            }
            return arrItem.value;
          });
          updatedInputData[item.id] = arr;
        }
      });

      await saveToBackend({
        input_data: updatedInputData,
        readable_description: tempDescription,
        scenario_step: scenario.scenario_step,
        expected_result: scenario.expected_result
      });

      setScenario((prev) => ({ ...prev, readable_description: tempDescription }));
      setEditingDescription(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert("Failed to save description: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelDescription = () => {
    setEditingDescription(false);
    setTempDescription("");
  };

  const handleEditExpectedResult = () => {
    setEditingExpectedResult(true);
    setTempExpectedResult(scenario?.expected_result?.message || "");
  };

  const handleSaveExpectedResult = async () => {
    setSaving(true);
    try {
      const updatedInputData = {};
      testDataList.forEach(item => {
        if (item.type === 'primitive') {
          updatedInputData[item.id] = item.value;
        } else if (item.type === 'object') {
          const obj = {};
          item.value.forEach(prop => {
            obj[prop.key] = prop.value;
          });
          updatedInputData[item.id] = obj;
        } else if (item.type === 'array') {
          const arr = item.value.map(arrItem => {
            if (arrItem.properties) {
              const obj = {};
              arrItem.properties.forEach(prop => {
                obj[prop.key] = prop.value;
              });
              return obj;
            }
            return arrItem.value;
          });
          updatedInputData[item.id] = arr;
        }
      });

      await saveToBackend({
        input_data: updatedInputData,
        readable_description: scenario.readable_description,
        scenario_step: scenario.scenario_step,
        expected_result: { ...scenario.expected_result, message: tempExpectedResult }
      });

      setScenario((prev) => ({
        ...prev,
        expected_result: { ...prev?.expected_result, message: tempExpectedResult },
      }));
      setEditingExpectedResult(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert("Failed to save expected result: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelExpectedResult = () => {
    setEditingExpectedResult(false);
    setTempExpectedResult("");
  };

  const handleEditActionSteps = () => {
    setEditingActionSteps(true);
    const currentSteps = getActionSteps(scenario?.scenario_step);
    setTempActionSteps(currentSteps.length > 0 ? currentSteps : [""]);
  };

  const handleSaveActionSteps = async () => {
    setSaving(true);
    try {
      const formattedSteps = tempActionSteps
        .filter((step) => step.trim() !== "")
        .map((step, index) => `${index + 1}. ${step}`)
        .join("\n");

      const updatedInputData = {};
      testDataList.forEach(item => {
        if (item.type === 'primitive') {
          updatedInputData[item.id] = item.value;
        } else if (item.type === 'object') {
          const obj = {};
          item.value.forEach(prop => {
            obj[prop.key] = prop.value;
          });
          updatedInputData[item.id] = obj;
        } else if (item.type === 'array') {
          const arr = item.value.map(arrItem => {
            if (arrItem.properties) {
              const obj = {};
              arrItem.properties.forEach(prop => {
                obj[prop.key] = prop.value;
              });
              return obj;
            }
            return arrItem.value;
          });
          updatedInputData[item.id] = arr;
        }
      });

      await saveToBackend({
        input_data: updatedInputData,
        readable_description: scenario.readable_description,
        scenario_step: formattedSteps,
        expected_result: scenario.expected_result
      });

      setScenario((prev) => ({ ...prev, scenario_step: formattedSteps }));
      setEditingActionSteps(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert("Failed to save action steps: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelActionSteps = () => {
    setEditingActionSteps(false);
    setTempActionSteps([]);
  };

  const addActionStep = () => setTempActionSteps([...tempActionSteps, ""]);
  const removeActionStep = (index) => setTempActionSteps(tempActionSteps.filter((_, i) => i !== index));
  const updateActionStep = (index, value) => {
    const newSteps = [...tempActionSteps];
    newSteps[index] = value;
    setTempActionSteps(newSteps);
  };

  const handleEditTestData = () => {
    setEditingTestData(true);
    setSaveSuccess(false);
  };

  const handleSaveChanges = async () => {
    if (!editingTestData) {
      navigate("/scenario", { state: { fileId }, replace: true });
      return;
    }
    
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      const updatedInputData = {};
      testDataList.forEach(item => {
        if (item.type === 'primitive') {
          updatedInputData[item.id] = item.value;
        } else if (item.type === 'object') {
          const obj = {};
          item.value.forEach(prop => {
            obj[prop.key] = prop.value;
          });
          updatedInputData[item.id] = obj;
        } else if (item.type === 'array') {
          const arr = item.value.map(arrItem => {
            if (arrItem.properties) {
              const obj = {};
              arrItem.properties.forEach(prop => {
                obj[prop.key] = prop.value;
              });
              return obj;
            }
            return arrItem.value;
          });
          updatedInputData[item.id] = arr;
        }
      });

      await saveToBackend({
        input_data: updatedInputData,
        readable_description: scenario.readable_description,
        scenario_step: scenario.scenario_step,
        expected_result: scenario.expected_result
      });

      setOriginalTestData(JSON.parse(JSON.stringify(testDataList)));
      setEditingTestData(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      
    } catch (err) {
      alert("Save failed: " + err.message);
      setSaveSuccess(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTestData(false);
    setSaveSuccess(false);
    setTestDataList(JSON.parse(JSON.stringify(originalTestData)));
  };

  const handleDownload = async (downloadOptions) => {
    const { format, includeTesterName, testerName } = downloadOptions;
    if (!fileId) throw new Error("File ID not found");

    const downloadData = {
      format,
      pathId: scenario?.path_id || "-",
      description: scenario?.readable_description || "No description available",
      actionSteps: getActionSteps(scenario?.scenario_step),
      testData: testDataList,
      expectedResult: getStatusDisplay(scenario),
      fileName: data?.fileName || "BPMN File",
      includeTester: includeTesterName,
      testerName: includeTesterName ? testerName : null,
    };

    const response = await authFetch(
      `${API_BASE}/api/bpmn/files/download/${fileId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(downloadData),
      },
      { onUnauthorizedRedirectTo: "/login" }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) throw new Error("Received empty file from server");

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-scenario-${scenario?.path_id || "detail"}.${format === "pdf" ? "pdf" : "xlsx"}`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Render test data item
  const renderTestDataItem = (item, index) => {
    if (editingTestData) {
      if (item.type === "primitive") {
        return (
          <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="w-6 text-gray-600 font-semibold">{index + 1}.</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800 mb-2">{item.label}</div>
                <input
                  className="w-full px-3 py-2 border rounded-md"
                  value={item.value}
                  onChange={(e) => updatePrimitive(item.id, e.target.value)}
                  placeholder="Value..."
                />
              </div>
              <button
                onClick={() => removeField(item.id)}
                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                title="Remove field"
              >
                Hapus
              </button>
            </div>
          </div>
        );
      }

      if (item.type === "object") {
        return (
          <div key={item.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="w-6 text-green-600 font-semibold">{index + 1}.</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-green-800">{item.label}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addObjectProp(item.id)}
                      className="px-2 py-1 text-green-700 hover:bg-green-100 rounded"
                    >
                      + Property
                    </button>
                    <button
                      onClick={() => removeField(item.id)}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      Hapus Field
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {item.value.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="w-44 px-3 py-2 border rounded-md"
                        value={p.key}
                        onChange={(e) => updateObjectProp(item.id, i, e.target.value, p.value)}
                        placeholder="key"
                      />
                      <input
                        className="flex-1 px-3 py-2 border rounded-md"
                        value={p.value}
                        onChange={(e) => updateObjectProp(item.id, i, p.key, e.target.value)}
                        placeholder="value"
                      />
                      <button
                        onClick={() => removeObjectProp(item.id, i)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // array
      return (
        <div key={item.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="w-6 text-blue-600 font-semibold">{index + 1}.</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-blue-800">{item.label}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addArrayItem(item.id, false)}
                    className="px-2 py-1 text-blue-700 hover:bg-blue-100 rounded"
                  >
                    + Item (text)
                  </button>
                  <button
                    onClick={() => addArrayItem(item.id, true)}
                    className="px-2 py-1 text-blue-700 hover:bg-blue-100 rounded"
                  >
                    + Item (object)
                  </button>
                  <button
                    onClick={() => removeField(item.id)}
                    className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Hapus Field
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {item.value.map((v, i) => {
                  if (v.properties) {
                    return (
                      <div key={v.id} className="bg-white border rounded p-3 space-y-2">
                        <div className="text-xs text-gray-500">Item {i + 1} (object)</div>
                        {(v.properties || []).map((pp, pi) => (
                          <div key={pi} className="flex gap-2">
                            <input
                              className="w-44 px-3 py-2 border rounded-md"
                              value={pp.key}
                              onChange={(e) => updateArrayItemProp(item.id, i, pi, e.target.value, pp.value)}
                              placeholder="key"
                            />
                            <input
                              className="flex-1 px-3 py-2 border rounded-md"
                              value={pp.value}
                              onChange={(e) => updateArrayItemProp(item.id, i, pi, pp.key, e.target.value)}
                              placeholder="value"
                            />
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button
                            onClick={() => addArrayItemProp(item.id, i)}
                            className="px-2 py-1 text-blue-700 hover:bg-blue-100 rounded"
                          >
                            + Property
                          </button>
                          <button
                            onClick={() => removeArrayItem(item.id, i)}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            Hapus Item
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={v.id} className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-2 border rounded-md bg-white"
                        value={v.value}
                        onChange={(e) => updateArrayItemValue(item.id, i, e.target.value)}
                        placeholder={`Item ${i + 1}`}
                      />
                      <button
                        onClick={() => removeArrayItem(item.id, i)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        Hapus
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // VIEW mode (non-editable)
    if (item.type === "array") {
      return (
        <div key={item.id} className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
          <div className="flex items-start">
            <span className="mr-3 text-blue-600 font-bold text-lg">{index + 1}.</span>
            <div className="flex-1">
              <div className="font-semibold text-blue-800 mb-2">{item.label}</div>
              <div className="space-y-1">
                {item.value.map((arrayItem, arrayIndex) => (
                  <div key={arrayItem.id} className="bg-white p-2 rounded text-sm">
                    <span className="text-blue-600 font-medium">Item {arrayIndex + 1}:</span>
                    <span className="ml-2 text-gray-700">
                      {arrayItem.properties
                        ? arrayItem.properties.map((prop) => `${prop.key}: ${prop.value}`).join(", ")
                        : arrayItem.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (item.type === "object") {
      return (
        <div key={item.id} className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
          <div className="flex items-start">
            <span className="mr-3 text-green-600 font-bold text-lg">{index + 1}.</span>
            <div className="flex-1">
              <div className="font-semibold text-green-800 mb-2">{item.label}</div>
              <div className="grid grid-cols-1 gap-1">
                {item.value.map((objItem, objIndex) => (
                  <div key={objIndex} className="bg-white p-2 rounded text-sm">
                    <span className="text-green-600 font-medium">
                      {objItem.key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:
                    </span>
                    <span className="ml-2 text-gray-700">{objItem.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div key={item.id} className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-lg">
        <div className="flex items-start">
          <span className="mr-3 text-gray-600 font-bold text-lg">{index + 1}.</span>
          <div className="flex-1">
            <span className="font-semibold text-gray-800">{item.label}:</span>
            <span className="ml-2 text-gray-700">{item.value}</span>
          </div>
        </div>
      </div>
    );
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading scenario details...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <p className="text-red-600 font-medium mb-2">Error Loading Scenario</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
          <Link to="/scenario" state={{ fileId }}>
            <Button className="bg-[#2185D5] hover:bg-[#1D5D9B] text-white rounded-lg px-6 py-2 transition-colors">
              Go Back to Scenarios
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Main render
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

      {/* Main */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header Section */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link to="/scenario" state={{ fileId }}>
                  <button className="flex items-center space-x-2 text-gray-600 hover:text-[#2185D5] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-medium">Back to Scenarios</span>
                  </button>
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Test Scenario Details</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Scenario ID: <span className="font-medium">{scenario?.path_id || "N/A"}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* BPMN Diagram Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">BPMN Diagram</h2>
                <div className="flex items-center space-x-2">
                  <button onClick={handleZoomOut} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Zoom Out" disabled={!bpmnViewerReady}>
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button onClick={handleZoomIn} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Zoom In" disabled={!bpmnViewerReady}>
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={handleZoomFit} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Fit to View" disabled={!bpmnViewerReady}>
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button onClick={handleResetHighlight} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors" disabled={!bpmnViewerReady}>
                    Reset Highlight
                  </button>
                </div>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <div ref={containerRef} className="w-full h-[500px] rounded-xl overflow-hidden bg-white">
                  {!bpmnViewerReady && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"></div>
                        <p className="text-lg font-medium">Loading BPMN Viewer...</p>
                        <p className="text-sm mt-2">Please wait while we initialize the diagram viewer</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              {/* Description */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Scenario Description</h3>
                  {!editingDescription && (
                    <Button
                      onClick={handleEditDescription}
                      className="flex items-center space-x-2 text-[#2185D5] hover:text-[#1D5D9B] hover:bg-blue-50 border border-[#2185D5] hover:border-[#1D5D9B] bg-transparent px-3 py-2 rounded-lg transition-colors text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>

                {!editingDescription ? (
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <p className="text-gray-700 leading-relaxed">
                      {scenario?.readable_description ||
                        "Lorem ipsum is simply dummy text of the printing and typesetting industry."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.target.value)}
                      className="w-full p-4 border border-gray-300 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-[#2185D5] focus:border-transparent resize-none"
                      rows={6}
                      placeholder="Enter scenario description..."
                    />
                    <div className="flex space-x-3">
                      <Button 
                        onClick={handleSaveDescription} 
                        disabled={saving}
                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                        style={{ opacity: saving ? 0.6 : 1 }}
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                      </Button>
                      <Button onClick={handleCancelDescription} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* Action Steps */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Action Steps</h3>
                  {!editingActionSteps && (
                    <Button
                      onClick={handleEditActionSteps}
                      className="flex items-center space-x-2 text-[#2185D5] hover:text-[#1D5D9B] hover:bg-blue-50 border border-[#2185D5] hover:border-[#1D5D9B] bg-transparent px-3 py-2 rounded-lg transition-colors text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>

                {!editingActionSteps ? (
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    {getActionSteps(scenario?.scenario_step).length > 0 ? (
                      <ol className="space-y-2">
                        {getActionSteps(scenario?.scenario_step).map((step, index) => (
                          <li key={index} className="flex items-start space-x-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-[#2185D5] text-white text-xs font-medium rounded-full flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className="text-gray-700 leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-gray-400 italic">No action steps available.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {tempActionSteps.map((step, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-gray-400 text-white text-xs font-medium rounded-full flex items-center justify-center">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={step}
                            onChange={(e) => updateActionStep(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2185D5] focus:border-transparent"
                            placeholder={`Action step ${index + 1}...`}
                          />
                          <button onClick={() => removeActionStep(index)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button onClick={addActionStep} className="flex items-center space-x-2 text-[#2185D5] hover:text-[#1D5D9B] hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors text-sm">
                      <Plus className="w-4 h-4" />
                      <span>Add Step</span>
                    </button>

                    <div className="flex space-x-3 pt-2 border-t border-gray-200">
                      <Button 
                        onClick={handleSaveActionSteps} 
                        disabled={saving}
                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                        style={{ opacity: saving ? 0.6 : 1 }}
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                      </Button>
                      <Button onClick={handleCancelActionSteps} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* Test Data */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Test Data</h3>
                  {!editingTestData && (
                    <Button
                      onClick={handleEditTestData}
                      className="flex items-center space-x-2 text-[#2185D5] hover:text-[#1D5D9B] hover:bg-blue-50 border border-[#2185D5] hover:border-[#1D5D9B] bg-transparent px-3 py-2 rounded-lg transition-colors text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>

                {!editingTestData ? (
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    {testDataList.length > 0 ? (
                      <div className="space-y-4">{testDataList.map((item, index) => renderTestDataItem(item, index))}</div>
                    ) : (
                      <p className="text-gray-400 italic">No test data available.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Add New Field */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Type</label>
                          <select
                            className="w-full px-3 py-2 border rounded-md"
                            value={newField.type}
                            onChange={(e) => setNewField((s) => ({ ...s, type: e.target.value }))}
                          >
                            <option value="primitive">Primitive</option>
                            <option value="object">Object</option>
                            <option value="array">Array</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Label</label>
                          <input
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="e.g. Delivery Address"
                            value={newField.label}
                            onChange={(e) => setNewField((s) => ({ ...s, label: e.target.value }))}
                          />
                        </div>
                        {newField.type === "primitive" && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Initial Value</label>
                            <input
                              className="w-full px-3 py-2 border rounded-md"
                              placeholder="e.g. 123 Pizza Street"
                              value={newField.value}
                              onChange={(e) => setNewField((s) => ({ ...s, value: e.target.value }))}
                            />
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={handleAddNewField}
                          className="px-3 py-2 bg-[#2185D5] hover:bg-[#1D5D9B] text-white rounded-md text-sm"
                        >
                          + Add Field
                        </button>
                      </div>
                    </div>

                    {/* Editable list */}
                    <div className="space-y-4">{testDataList.map((item, index) => renderTestDataItem(item, index))}</div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <Button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          setSaving(true);
                          try {
                            const updatedInputData = {};
                            testDataList.forEach(item => {
                              if (item.type === 'primitive') {
                                updatedInputData[item.id] = item.value;
                              } else if (item.type === 'object') {
                                const obj = {};
                                item.value.forEach(prop => {
                                  obj[prop.key] = prop.value;
                                });
                                updatedInputData[item.id] = obj;
                              } else if (item.type === 'array') {
                                const arr = item.value.map(arrItem => {
                                  if (arrItem.properties) {
                                    const obj = {};
                                    arrItem.properties.forEach(prop => {
                                      obj[prop.key] = prop.value;
                                    });
                                    return obj;
                                  }
                                  return arrItem.value;
                                });
                                updatedInputData[item.id] = arr;
                              }
                            });

                            await saveToBackend({
                              input_data: updatedInputData,
                              readable_description: scenario.readable_description,
                              scenario_step: scenario.scenario_step,
                              expected_result: scenario.expected_result
                            });

                            setEditingTestData(false);
                            setOriginalTestData(JSON.parse(JSON.stringify(testDataList)));
                            setSaveSuccess(true);
                            setTimeout(() => setSaveSuccess(false), 2500);
                          } catch (error) {
                            alert('Failed to save: ' + error.message);
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="flex items-center space-x-2 bg-[#2185D5] hover:bg-[#1D5D9B] text-white px-6 py-2 rounded-lg transition-colors text-sm"
                        style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save Test Data'}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* Expected Result */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Expected Result</h3>
                  {!editingExpectedResult && (
                    <Button
                      onClick={handleEditExpectedResult}
                      className="flex items-center space-x-2 text-[#2185D5] hover:text-[#1D5D9B] hover:bg-blue-50 border border-[#2185D5] hover:border-[#1D5D9B] bg-transparent px-3 py-2 rounded-lg transition-colors text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>

                {!editingExpectedResult ? (
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <p className="text-gray-700 leading-relaxed">{getStatusDisplay(scenario)}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={tempExpectedResult}
                      onChange={(e) => setTempExpectedResult(e.target.value)}
                      className="w-full p-4 border border-gray-300 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-[#2185D5] focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Enter expected result..."
                    />
                    <div className="flex space-x-3">
                      <Button 
                        onClick={handleSaveExpectedResult} 
                        disabled={saving}
                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                        style={{ opacity: saving ? 0.6 : 1 }}
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                      </Button>
                      <Button onClick={handleCancelExpectedResult} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between pt-8 border-t border-gray-200">
              <Button
                onClick={() => setShowDownloadPopup(true)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                <span>Download Report</span>
              </Button>

              <Button
                onClick={handleSaveChanges}
                disabled={saving}
                className="flex items-center space-x-2 text-white px-8 py-3 rounded-lg transition-colors font-medium shadow-sm"
                style={{ backgroundColor: saving ? "#A0AEC0" : "#2185D5", cursor: saving ? "not-allowed" : "pointer" }}
              >
                <Save className="w-5 h-5" />
                <span>{saving ? "Saving..." : editingTestData ? "Save Changes" : saveSuccess ? "Changes Saved!" : "Save Changes"}</span>
              </Button>
            </div>

            {saveSuccess && !editingTestData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center space-x-2 text-green-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">Changes saved successfully!</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Download Popup */}
      <DownloadPopup
        isOpen={showDownloadPopup}
        onClose={() => setShowDownloadPopup(false)}
        onDownload={handleDownload}
        scenario={scenario}
        fileId={fileId}
      />

      <style>{`
  /* ===== Z-INDEX HIERARCHY ===== */
  .djs-element[data-element-id*="Lane"],
  .djs-element[data-element-id*="Participant"],
  .djs-element[class*="Lane"],
  .djs-element[class*="Participant"] {
    z-index: 1 !important;
  }

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

  .djs-element.highlight-path,
  .djs-element.highlight-subprocess {
    z-index: 10000 !important;
    position: relative;
  }

  .djs-connection.highlight-path {
    z-index: 9999 !important;
  }

  /* ===== TEXT RESET ===== */
  .djs-label text, 
  .djs-visual text {
    stroke: none !important;
    stroke-width: 0 !important;
    paint-order: normal !important;
    font-weight: normal !important;
    fill: black !important;
    font-family: Arial, sans-serif !important;
    font-size: 12px !important;
  }

  /* ===== TEXT PADA HIGHLIGHTED ELEMENT ===== */
  .djs-element.highlight-path .djs-label text,
  .djs-element.highlight-subprocess .djs-label text {
    stroke: none !important;
    font-weight: normal !important;
    fill: black !important;
  }

  /* ===== ENSURE TEXT APPEARS ABOVE SHAPES ===== */
  .djs-label {
    z-index: 100001 !important;
    pointer-events: none !important;
  }

  .highlight-path .djs-label,
  .highlight-subprocess .djs-label {
    z-index: 100002 !important;
  }

  /* ===== EVENTS - #98E9DD ===== */
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

  /* ===== TASKS - #FFFFBD ===== */
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

  /* ===== MESSAGE/RECEIVE TASK - #96DF67 ===== */
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

  /* ===== GATEWAYS - #E0E0E0 ===== */
  /* Circle di dalam gateway juga abu-abu */
.djs-element.highlight-path[data-element-id*="Gateway"] .djs-visual > circle,
.djs-element.highlight-path[class*="Gateway"] .djs-visual > circle,
  .djs-element.highlight-path[data-element-id*="Gateway"] .djs-visual > polygon,
  .djs-element.highlight-path[class*="Gateway"] .djs-visual > polygon,
  .djs-element.highlight-path[class*="ExclusiveGateway"] .djs-visual > polygon,
  .djs-element.highlight-path[class*="ParallelGateway"] .djs-visual > polygon,
  .djs-element.highlight-path[class*="InclusiveGateway"] .djs-visual > polygon {
    fill: #E0E0E0 !important;
    stroke: #000000 !important;
    stroke-width: 2 !important;
  }

  /* ===== SUBPROCESS ===== */
  .djs-element.highlight-subprocess .djs-visual > rect,
  .djs-element.highlight-subprocess .djs-visual > circle,
  .djs-element.highlight-subprocess .djs-visual > polygon,
  .djs-element.highlight-subprocess .djs-visual > path {
    fill: rgba(152, 233, 221, 0.3) !important;
    stroke: #000000 !important;
    stroke-width: 2 !important;
  }

  .djs-element[data-element-id*="SubProcess"] .djs-visual > rect,
  .djs-element[class*="SubProcess"] .djs-visual > rect {
    fill: rgba(255, 255, 255, 0.8) !important;
    stroke: #ddd !important;
    stroke-width: 1px !important;
  }

  .djs-element[data-element-id*="SubProcess"].highlight-subprocess .djs-visual > rect,
  .djs-element[class*="SubProcess"].highlight-subprocess .djs-visual > rect {
    fill: rgba(152, 233, 221, 0.15) !important;
    stroke: #000000 !important;
    stroke-width: 2px !important;
  }

  /* ===== CONNECTIONS ===== */
  .djs-connection.highlight-path .djs-visual > path,
  .djs-connection.highlight-path .djs-visual > polyline {
    stroke: #000000 !important;
    stroke-width: 3px !important;
  }

  .djs-connection.highlight-path[class*="MessageFlow"] .djs-visual > path {
    stroke: #000000 !important;
    stroke-width: 2px !important;
    stroke-dasharray: 8, 4 !important;
  }

  /* ===== FALLBACK ===== */
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

  /* ===== VISIBILITY ===== */
  .djs-element.highlight-path .djs-visual,
  .djs-element.highlight-subprocess .djs-visual {
    opacity: 1 !important;
    visibility: visible !important;
  }

  .djs-element[data-element-id*="SubProcess"] .djs-visual,
  .djs-element[class*="SubProcess"] .djs-visual {
    pointer-events: none;
  }

  /* ===== DATA OBJECTS & ANNOTATIONS ===== */
  .djs-element.highlight-path[class*="DataObject"] .djs-visual > path,
  .djs-element.highlight-path[class*="DataStore"] .djs-visual > path {
    fill: #E0E0E0 !important;
    stroke: #000000 !important;
    stroke-width: 2 !important;
  }

  .djs-element.highlight-path[class*="TextAnnotation"] .djs-visual > path {
    stroke: #000000 !important;
    stroke-width: 1.5 !important;
  }
`}</style>
    </div>
  );
}