"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Download, RotateCcw, FileText, Eye, MapPin, AlertCircle } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import UserMenu from "../components/ui/UserMenu"
import DownloadPopup from "../components/DownloadPopup"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table"
import BpmnViewer from "bpmn-js/lib/NavigatedViewer"
import { API_BASE, authFetch } from "../utils/auth"

// Import BPMN CSS at component level
import "bpmn-js/dist/assets/diagram-js.css"
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css"
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css"
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css"

export default function ScenarioPage() {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const overlayIdsRef = useRef([])
  const elementMappingRef = useRef({})

  const location = useLocation()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [currentPathIndex, setCurrentPathIndex] = useState(0)
  const [elementNames, setElementNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const [showDownloadPopup, setShowDownloadPopup] = useState(false)
  const [downloadMode, setDownloadMode] = useState("single")
  const [selectedScenarioForDownload, setSelectedScenarioForDownload] = useState(null)

  const fileId = location.state?.fileId || new URLSearchParams(location.search).get("fileId")

  const getScenarios = (d) =>
    (d?.testScenariosJson && Array.isArray(d.testScenariosJson)
      ? d.testScenariosJson
      : Array.isArray(d?.testScenarios)
        ? d.testScenarios
        : []) || []

  const scenarios = useMemo(() => getScenarios(data), [data])

  useEffect(() => {
    if (!fileId) {
      navigate("/")
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log("Fetching BPMN file:", fileId)

        const res = await authFetch(
          `${API_BASE}/api/bpmn/files/${fileId}`,
          { method: "GET" },
          { onUnauthorizedRedirectTo: "/login" },
        )

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

        const json = await res.json()
        console.log("Received BPMN data:", json)

        if (!json.bpmnXml) {
          throw new Error("No BPMN XML found in response")
        }

        setData(json)

        // NEW: Retry mechanism for container initialization
        let retryCount = 0
        const maxRetries = 5
        const checkContainer = () => {
          console.log("Checking container availability, attempt:", retryCount + 1)

          if (containerRef.current) {
            console.log("Container found, initializing BPMN viewer")
            initializeBpmnViewer(json.bpmnXml, json)
          } else if (retryCount < maxRetries) {
            retryCount++
            console.log("Container not ready, retrying in 300ms")
            setTimeout(checkContainer, 300)
          } else {
            console.error("Container initialization failed after", maxRetries, "attempts")
            setError("Container not ready - please try refreshing the page")
            setLoading(false)
          }
        }

        // Start checking for container
        checkContainer()
      } catch (err) {
        console.error("Error in fetchData:", err)
        setError(err.message || "Failed to load BPMN diagram")
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy()
        } catch (e) {
          console.warn("Error destroying viewer:", e)
        }
      }
    }
  }, [fileId, navigate])

  useEffect(() => {
    if (scenarios.length && viewerRef.current) {
      const actualIds = convertToActualIds(scenarios[currentPathIndex]?.rawPath || [])
      highlightPath(actualIds)
    }
  }, [currentPathIndex, scenarios.length])

  const buildElementMapping = (viewer, data) => {
    const registry = viewer.get("elementRegistry")
    const elements = registry.getAll()
    const mapping = {}

    console.log("Building element mapping from", elements.length, "elements")

    if (data.elementsJson && Array.isArray(data.elementsJson)) {
      data.elementsJson.forEach((elem) => {
        if (elem?.id) {
          if (elem.lane && elem.name) {
            mapping[`[${elem.lane}] ${elem.name}`] = elem.id
          }
          if (elem.name) {
            mapping[elem.name] = elem.id
            mapping[`[System] ${elem.name}`] = elem.id
          }
        }
      })
    }

    elements.forEach((el) => {
      const bo = el.businessObject
      if (bo && bo.name) {
        mapping[bo.name] = el.id

        if (el.parent && el.parent.type === "bpmn:SubProcess") {
          mapping[`[System] ${bo.name}`] = el.id
        }

        const laneName = findElementLaneName(el, elements)
        if (laneName) {
          mapping[`[${laneName}] ${bo.name}`] = el.id
        }
      }
    })

    console.log("Element mapping built:", Object.keys(mapping).length, "entries")
    elementMappingRef.current = mapping
  }

  const findElementLaneName = (element, allElements) => {
    const lanes = allElements.filter((el) => el.type === "bpmn:Lane")
    for (const lane of lanes) {
      const flowNodes = lane?.businessObject?.flowNodeRef || []
      const isInLane = flowNodes.some((n) => n && element.businessObject && n.id === element.businessObject.id)
      if (isInLane) return lane.businessObject?.name || lane.id
    }
    return null
  }

  const convertToActualIds = (displayNames) => {
    const mapping = elementMappingRef.current
    return (displayNames || [])
      .map((displayName) => {
        let actualId = mapping[displayName]

        if (!actualId && /\[.*?\]\s+/.test(displayName)) {
          const withoutBracket = displayName.replace(/^\[.*?\]\s*/, "")
          actualId = mapping[withoutBracket]
        }

        if (!actualId && displayName.startsWith("[System]")) {
          const clean = displayName.replace(/^\[.*?\]\s*/, "")
          actualId = mapping[clean]
        }

        if (!actualId) {
          console.warn(`No mapping found for: ${displayName}`)
          return displayName
        }
        return actualId
      })
      .filter(Boolean)
  }

  const typeClassFor = (el) => {
    const t = el?.type || el?.businessObject?.$type || ""
    if (t.includes("SequenceFlow")) return "type-seq"
    if (t.includes("MessageFlow")) return "type-msg"
    if (t.includes("Task") || t.includes("Activity")) return "type-task"
    if (t.includes("Event")) return "type-event"
    if (t.includes("Gateway")) return "type-gateway"
    return "type-other"
  }

  const fixTextStyling = () => {
    const viewer = viewerRef.current
    if (!viewer) return

    try {
      const canvasContainer = viewer.get("canvas").getContainer()
      const texts = canvasContainer.querySelectorAll(".djs-label text, .djs-visual text")
      texts.forEach((t) => {
        t.removeAttribute("stroke")
        t.removeAttribute("stroke-width")
        t.style.stroke = "none"
        t.style.strokeWidth = "0"
        t.style.paintOrder = "normal"
        t.style.fontWeight = "normal"
        t.style.fill = "black"
        t.style.vectorEffect = "non-scaling-stroke"
        t.style.shapeRendering = "geometricPrecision"
        t.style.fontFamily = "Arial, sans-serif"
        t.style.fontSize = "12px"
      })
    } catch (e) {
      console.warn("Error fixing text styling:", e)
    }
  }

  const extractElementNames = (viewer) => {
    const registry = viewer.get("elementRegistry")
    const elements = registry.getAll()
    const nameMap = {}
    elements.forEach((el) => {
      const bo = el.businessObject
      nameMap[el.id] = (bo && (bo.name || bo.id)) || el.id
    })
    setElementNames(nameMap)
  }

  const findFlowIdsBetween = (fromId, toId) => {
    const viewer = viewerRef.current
    if (!viewer) return []
    const reg = viewer.get("elementRegistry")
    const from = reg.get(fromId)
    if (!from || !from.outgoing) return []
    return from.outgoing.filter((f) => f && f.target && f.target.id === toId).map((f) => f.id)
  }

  const clearHighlights = () => {
    const viewer = viewerRef.current
    if (!viewer) return

    const canvas = viewer.get("canvas")
    const reg = viewer.get("elementRegistry")
    const overlays = viewer.get("overlays")

    reg.getAll().forEach((el) => {
      canvas.removeMarker(el.id, "highlight-path")
      canvas.removeMarker(el.id, "highlight-subprocess")
      canvas.removeMarker(el.id, "type-task")
      canvas.removeMarker(el.id, "type-event")
      canvas.removeMarker(el.id, "type-gateway")
      canvas.removeMarker(el.id, "type-seq")
      canvas.removeMarker(el.id, "type-msg")
      canvas.removeMarker(el.id, "type-other")
    })

    try {
      overlayIdsRef.current.forEach((id) => overlays.remove(id))
    } catch (e) {
      console.warn("Error removing overlays:", e)
    }
    overlayIdsRef.current = []

    const customStyles = document.querySelectorAll(".bpmn-highlight-style")
    customStyles.forEach((style) => style.remove())
  }

  const highlightPath = (actualIds) => {
    const viewer = viewerRef.current
    if (!viewer || !Array.isArray(actualIds) || actualIds.length === 0) {
      console.warn("Invalid path for highlighting:", actualIds)
      return
    }

    console.log("Highlighting path with IDs:", actualIds)

    clearHighlights()

    const canvas = viewer.get("canvas")
    const reg = viewer.get("elementRegistry")

    const validElements = actualIds
      .map((id) => {
        const element = reg.get(id)
        if (!element) {
          console.warn(`Element not found: ${id}`)
          return null
        }
        return {
          id,
          element,
          isSubprocessElement: element.parent && element.parent.type === "bpmn:SubProcess",
        }
      })
      .filter(Boolean)

    if (validElements.length === 0) {
      console.warn("No valid elements to highlight")
      canvas.zoom("fit-viewport")
      return
    }

    console.log("Highlighting", validElements.length, "elements")

    validElements.forEach(({ id, element, isSubprocessElement }) => {
      canvas.addMarker(id, isSubprocessElement ? "highlight-subprocess" : "highlight-path")
      canvas.addMarker(id, typeClassFor(element))
    })

    for (let i = 0; i < validElements.length - 1; i++) {
      const fromId = validElements[i].id
      const toId = validElements[i + 1].id
      const flowIds = findFlowIdsBetween(fromId, toId)
      flowIds.forEach((fid) => {
        canvas.addMarker(fid, "highlight-path")
        canvas.addMarker(fid, "type-seq")
      })
    }

    canvas.zoom("fit-viewport")
    setTimeout(fixTextStyling, 100)
  }

  const handlePrev = () => {
    if (!scenarios.length) return
    setCurrentPathIndex((i) => (i === 0 ? scenarios.length - 1 : i - 1))
  }

  const handleNext = () => {
    if (!scenarios.length) return
    setCurrentPathIndex((i) => (i === scenarios.length - 1 ? 0 : i + 1))
  }

  const handleRowClick = (index) => {
    setCurrentPathIndex(index)
    const actualIds = convertToActualIds(scenarios[index]?.rawPath || [])
    highlightPath(actualIds)
  }

  const getReadableScenarioPath = (pathArray) => {
    if (!Array.isArray(pathArray)) return "-"
    return pathArray.map((displayName) => displayName.replace(/^\[.*?\]\s*/, "")).join(" → ")
  }

  const getStatusDisplay = (scenario) => {
    let expectedResult = ""

    if (scenario?.expected_result) {
      if (typeof scenario.expected_result === "object" && scenario.expected_result.message) {
        expectedResult = scenario.expected_result.message.trim()
      } else if (typeof scenario.expected_result === "string") {
        expectedResult = scenario.expected_result.trim()
      }
    }

    if (expectedResult && expectedResult !== "") {
      return {
        text: expectedResult,
        color: "text-green-600",
        bgColor: "bg-green-100",
      }
    }

    return {
      text: "No expected result",
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    }
  }

  const resetHighlight = () => {
    clearHighlights()
    setTimeout(fixTextStyling, 50)
  }

  const getActionSteps = (scenarioStep) => {
    if (!scenarioStep) return []
    const steps = scenarioStep
      .split("\n")
      .map((step) => step.trim())
      .filter((step) => step.match(/^\d+\.\s+/) || step.startsWith("->"))
      .map((step) =>
        step
          .replace(/^\d+\.\s*/, "")
          .replace(/^->\s*/, "")
          .trim(),
      )
      .filter((step) => step.length > 0)
    return steps
  }

  const handleDownloadAllScenarios = () => {
    setDownloadMode("all")
    setSelectedScenarioForDownload(null)
    setShowDownloadPopup(true)
  }

  const handleDownloadPath = (scenario, index) => {
    setDownloadMode("single")
    setSelectedScenarioForDownload(scenario)
    setShowDownloadPopup(true)
  }

  const handleDownload = async (downloadOptions) => {
    const { format, includeTesterName, testerName } = downloadOptions

    try {
      setDownloading(true)

      if (downloadMode === "all") {
        const downloadData = {
          format,
          includeTester: includeTesterName,
          testerName: includeTesterName ? testerName : "",
        }

        const res = await authFetch(
          `${API_BASE}/api/bpmn/files/${fileId}/download-all`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(downloadData),
          },
          { onUnauthorizedRedirectTo: "/login" },
        )

        if (!res.ok) throw new Error("Failed to download")

        const contentDisposition = res.headers.get("Content-Disposition")
        let filename = `all-test-scenarios.${format === "pdf" ? "pdf" : "xlsx"}`
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
          if (filenameMatch) filename = filenameMatch[1]
        }

        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        const scenario = selectedScenarioForDownload

        const processedTestData = []
        if (scenario.input_data && typeof scenario.input_data === "object") {
          Object.entries(scenario.input_data).forEach(([key, value]) => {
            const cleanKey = key
              .replace(/_/g, " ")
              .replace(/([A-Z])/g, " $1")
              .trim()
              .toLowerCase()
              .replace(/\b\w/g, (l) => l.toUpperCase())

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
                    }
                  }
                  return { id: `${key}_${index}`, index, value: String(item) }
                })
                processedTestData.push({ id: key, label: cleanKey, value: arrayItems, type: "array" })
              } else {
                const objectItems = Object.entries(value).map(([subKey, subValue]) => ({
                  key: subKey,
                  value: String(subValue),
                }))
                processedTestData.push({ id: key, label: cleanKey, value: objectItems, type: "object" })
              }
            } else {
              processedTestData.push({ id: key, label: cleanKey, value: String(value), type: "primitive" })
            }
          })
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
          testerName: includeTesterName ? testerName : null,
        }

        const response = await authFetch(
          `${API_BASE}/api/bpmn/files/download/${fileId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(downloadData),
          },
          { onUnauthorizedRedirectTo: "/login" },
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Server error: ${response.status} - ${errorText}`)
        }

        const blob = await response.blob()
        if (blob.size === 0) throw new Error("Received empty file from server")

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `test-scenario-${scenario?.path_id || "detail"}.${format === "pdf" ? "pdf" : "xlsx"}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }

      setShowDownloadPopup(false)
    } catch (err) {
      console.error("Download error:", err)
      alert("Gagal download. Silakan coba lagi.")
    } finally {
      setDownloading(false)
    }
  }

  const initializeBpmnViewer = async (bpmnXml, jsonData) => {
    try {
      console.log("Creating BPMN viewer instance")

      // Create viewer with explicit configuration
      const viewer = new BpmnViewer({
        container: containerRef.current,
        width: "100%",
        height: "520px",
      })

      viewerRef.current = viewer

      console.log("Importing BPMN XML...")

      // Import XML with error handling
      const importResult = await viewer.importXML(bpmnXml)

      if (importResult.warnings && importResult.warnings.length > 0) {
        console.warn("BPMN import warnings:", importResult.warnings)
      }

      console.log("BPMN XML imported successfully")

      // Build element mapping
      buildElementMapping(viewer, jsonData)
      extractElementNames(viewer)

      // Get canvas and force resize
      const canvas = viewer.get("canvas")

      // Force canvas to render
      canvas.resized()

      // Fit viewport
      setTimeout(() => {
        canvas.zoom("fit-viewport")
        console.log("Canvas zoomed to fit viewport")
      }, 300)

      // Event listeners
      const bus = viewer.get("eventBus")
      bus.on("import.render.complete", () => {
        console.log("Render complete")
        fixTextStyling()
      })
      bus.on("import.done", () => {
        console.log("Import done")
        fixTextStyling()
      })

      // Highlight first path
      const list = getScenarios(jsonData)
      if (list.length > 0) {
        setTimeout(() => {
          const actualIds = convertToActualIds(list[0]?.rawPath || [])
          console.log("Highlighting first path:", actualIds)
          highlightPath(actualIds)
        }, 500)
      }

      setLoading(false)
    } catch (err) {
      console.error("Error initializing BPMN viewer:", err)
      setError("Failed to initialize BPMN viewer: " + (err.message || "Unknown error"))
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading BPMN diagram...</p>
        </div>
      </div>
    )
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
          <Button
            onClick={() => navigate("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: "#2185D5" }}
                >
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
                <Link
                  to="/"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                >
                  Upload BPMN
                </Link>
                <div
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm"
                  style={{ backgroundColor: "#2185D5" }}
                >
                  Flow Test
                </div>
                <Link
                  to="/history"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                >
                  History BPMN
                </Link>
              </nav>
            </div>

            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div
              id="bpmn-container"
              ref={containerRef}
              className="w-full rounded-lg border border-gray-200 overflow-hidden bg-white"
              style={{
                height: "520px",
                minHeight: "520px",
                display: "block", // Ensure it's visible
                position: "relative", // Helps with positioning internal elements
              }}
            />
          </div>
        </div>

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
                    const status = getStatusDisplay(scenario)
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
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}
                          >
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
                                e.stopPropagation()
                                handleDownloadPath(scenario, index)
                              }}
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
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
        /* ===== CRITICAL: Container sizing ===== */
        .djs-container { 
          width: 100% !important; 
          height: 520px !important;
          min-height: 520px !important;
        }

        /* ===== Z-INDEX HIERARCHY (PALING PENTING) ===== */
        /* Lane dan Participant harus di bawah */
        .djs-element[data-element-id*="Lane"],
        .djs-element[data-element-id*="Participant"],
        .djs-element[class*="Lane"],
        .djs-element[class*="Participant"] {
          z-index: 1 !important;
        }

        /* Element biasa di layer tengah */
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

        /* Highlighted elements HARUS di atas semua */
        .djs-element.highlight-path,
        .djs-element.highlight-subprocess {
          z-index: 10000 !important;
          position: relative;
        }

        /* Connection highlights juga di atas */
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

        /* ===== EVENTS - #98E9DD (Cyan tosca) ===== */
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

        /* ===== TASKS - #FFFFBD (Yellow) ===== */
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

        /* ===== MESSAGE/RECEIVE TASK - #96DF67 (Light green) ===== */
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

        /* ===== GATEWAYS - #E0E0E0 (Light gray) ===== */
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

        /* ===== SUBPROCESS - transparent cyan ===== */
        .djs-element.highlight-subprocess .djs-visual > rect,
        .djs-element.highlight-subprocess .djs-visual > circle,
        .djs-element.highlight-subprocess .djs-visual > polygon,
        .djs-element.highlight-subprocess .djs-visual > path {
          fill: rgba(152, 233, 221, 0.3) !important;
          stroke: #000000 !important;
          stroke-width: 2 !important;
        }

        /* SubProcess container */
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

        /* ===== FALLBACK untuk element tanpa ID/class spesifik ===== */
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

        /* SubProcess pointer events */
        .djs-element[data-element-id*="SubProcess"] .djs-visual,
        .djs-element[class*="SubProcess"] .djs-visual {
          pointer-events: none;
        }

        /* ===== TEXT PADA HIGHLIGHTED ELEMENT ===== */
        .djs-element.highlight-path .djs-label text,
        .djs-element.highlight-subprocess .djs-label text {
          stroke: none !important;
          font-weight: normal !important;
          fill: black !important;
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
  )
}
