"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Download, RotateCcw } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table"
import BpmnViewer from "bpmn-js/dist/bpmn-navigated-viewer.production.min.js"

export default function ScenarioPage() {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [currentPathIndex, setCurrentPathIndex] = useState(0)
  const [elementNames, setElementNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get fileId from location state or URL params
  const fileId = location.state?.fileId || new URLSearchParams(location.search).get("fileId")

  useEffect(() => {
    if (!fileId) return navigate("/")

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`http://localhost:8080/api/bpmn/files/${fileId}`)

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const json = await res.json()
        setData(json)

        // Initialize BPMN viewer
        if (containerRef.current) {
          const viewer = new BpmnViewer({ container: containerRef.current })
          viewerRef.current = viewer

          await viewer.importXML(json.bpmnXml)
          extractElementNames(viewer)

          // Highlight the first path by default
          if (json.testScenariosJson?.length > 0) {
            highlightPath(json.testScenariosJson[0]?.rawPath || [])
          }
        }
      } catch (err) {
        console.error("Gagal fetch atau import BPMN:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Cleanup function
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
      }
    }
  }, [fileId, navigate])

  useEffect(() => {
    if (data?.testScenariosJson?.length && viewerRef.current) {
      const rawPath = data.testScenariosJson[currentPathIndex]?.rawPath || []
      highlightPath(rawPath)
    }
  }, [currentPathIndex, data])

  const extractElementNames = (viewer) => {
    const registry = viewer.get("elementRegistry")
    const elements = registry.getAll()
    const nameMap = {}

    elements.forEach((el) => {
      nameMap[el.id] = el.businessObject?.name || el.id
    })

    setElementNames(nameMap)
  }

  const highlightPath = (rawPath) => {
    if (!viewerRef.current || !rawPath) return

    const canvas = viewerRef.current.get("canvas")
    const elementRegistry = viewerRef.current.get("elementRegistry")

    // Clear all existing highlights
    elementRegistry.getAll().forEach((el) => {
      canvas.removeMarker(el.id, "highlight-path")
      canvas.removeMarker(el.id, "highlight-element")
    })

    // Add highlight for elements in rawPath
    rawPath.forEach((id) => {
      const element = elementRegistry.get(id)
      if (element) {
        canvas.addMarker(id, "highlight-path")
      }
    })

    canvas.zoom("fit-viewport")
  }

  const handlePrev = () => {
    if (!data?.testScenariosJson?.length) return
    const newIndex = currentPathIndex === 0 ? data.testScenariosJson.length - 1 : currentPathIndex - 1
    setCurrentPathIndex(newIndex)
  }

  const handleNext = () => {
    if (!data?.testScenariosJson?.length) return
    const newIndex = currentPathIndex === data.testScenariosJson.length - 1 ? 0 : currentPathIndex + 1
    setCurrentPathIndex(newIndex)
  }

  const handleRowClick = (index) => {
    setCurrentPathIndex(index)
    const rawPath = data.testScenariosJson[index]?.rawPath || []
    highlightPath(rawPath)
  }

  const getReadableScenarioPath = (pathArray) => {
    if (!Array.isArray(pathArray)) return "-"
    return pathArray.map((id) => elementNames[id] || id).join(" -> ")
  }

  const getStatusDisplay = (scenario) => {
  const pathStr = scenario?.scenario_path?.trim();
  if (pathStr) {
    const steps = pathStr.split("->").map((s) => s.trim()).filter(Boolean);
    const lastStep = steps.length > 0 ? steps[steps.length - 1] : "-";
    return { text: lastStep, color: "text-gray-600" };
  }

  return { text: "-", color: "text-gray-600" };
};


  const resetHighlight = () => {
    if (!viewerRef.current) return

    const canvas = viewerRef.current.get("canvas")
    const elementRegistry = viewerRef.current.get("elementRegistry")

    // Clear all highlights
    elementRegistry.getAll().forEach((el) => {
      canvas.removeMarker(el.id, "highlight-path")
      canvas.removeMarker(el.id, "highlight-element")
    })
  }

  const handleDownloadScenario = () => {
    if (!data?.testScenariosJson) return

    const dataStr = JSON.stringify(data.testScenariosJson, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = `scenarios_${fileId}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  const handleDownloadPath = (scenario, index) => {
    const pathData = {
      path_id: scenario.path_id || `P${index + 1}`,
      rawPath: scenario.rawPath,
      readable_description: scenario.readable_description,
      expected_result: scenario.expected_result,
    }

    const dataStr = JSON.stringify(pathData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = `path_${pathData.path_id}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
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
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading BPMN: {error}</p>
          <Button onClick={() => navigate("/")} className="bg-[#2185D5] hover:bg-[#1D5D9B] text-white">
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Navbar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div
                  className="w-10 h-10 rounded flex items-center justify-center"
                  style={{ backgroundColor: "#2185D5" }}
                >
                  <div className="text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="font-bold text-gray-900">FLOW TEST</div>
                  <div className="text-xs text-gray-500">BPMN GENERATOR</div>
                </div>
              </div>
              <nav className="flex space-x-8">
                <Link
                  to="/"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#5CC2F2")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
                >
                  Upload BPMN
                </Link>
                <div
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md"
                  style={{ backgroundColor: "#2185D5" }}
                >
                  Alur Skenario
                </div>
                <Link
                  to="/history"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#5CC2F2")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
                >
                  History BPMN
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* BPMN Diagram Container */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div
            ref={containerRef}
            className="w-full h-[500px] rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
          />
        </div>

        {/* Path Navigation */}
        {data?.testScenariosJson?.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={!data?.testScenariosJson?.length}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              <div className="text-center flex-1 px-4">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  Path id : {data?.testScenariosJson?.[currentPathIndex]?.path_id || `P${currentPathIndex + 1}`}
                </div>
                <div className="text-sm text-gray-600 break-words">
                  {getReadableScenarioPath(data?.testScenariosJson?.[currentPathIndex]?.rawPath)}
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!data?.testScenariosJson?.length}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <Button
            className="flex-1 text-white border-0 transition-colors bg-transparent"
            style={{ backgroundColor: "#2185D5" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1D5D9B")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2185D5")}
            onClick={resetHighlight}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Highlight
          </Button>
          <Button
            className="flex-1 text-white transition-colors"
            style={{ backgroundColor: "#2185D5" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1D5D9B")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2185D5")}
            onClick={handleDownloadScenario}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Skenario
          </Button>
        </div>

        {/* Scenario Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-medium">Path Id</TableHead>
                <TableHead className="font-medium">Skenario Overview</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.testScenariosJson?.length > 0 ? (
                data.testScenariosJson.map((scenario, index) => {
                  const status = getStatusDisplay(scenario)
                  return (
                    <TableRow
                      key={index}
                      className={`cursor-pointer transition-colors ${
                        currentPathIndex === index ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleRowClick(index)}
                    >
                      <TableCell className="font-medium ">{scenario.path_id || `P${index + 1}`}</TableCell>
           <TableCell className="align-top max-w-md p-2">
  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
    {scenario.summary && scenario.summary.trim() !== "" 
      ? scenario.summary 
      : "-"}
  </div>
</TableCell>


                      <TableCell>
                        <span className={`font-medium ${status.color}`}>{status.text}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link
                            to={`/scenario/detail?scenarioId=${scenario.path_id || `P${index + 1}`}&fileId=${fileId}`}
                            state={{
                              fileId: fileId,
                              pathIndex: index,
                              scenarioId: scenario.path_id || `P${index + 1}`,
                            }}
                          >
                            <Button
                              size="sm"
                              className="border-0 text-white transition-colors bg-transparent text-xs px-3 py-1"
                              style={{ backgroundColor: "#2185D5" }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1D5D9B")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2185D5")}
                            >
                              View Detail
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            className="text-white transition-colors text-xs px-3 py-1"
                            style={{ backgroundColor: "#2185D5" }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1D5D9B")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2185D5")}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadPath(scenario, index)
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download Path
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No scenarios available. Please upload a BPMN file first.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Enhanced CSS for better highlighting */}
      <style>{`
  /* Start Events - Light Teal - ONLY when highlighted */
  .djs-element.highlight-path[data-element-id*="StartEvent"] .djs-visual > circle,
  .djs-element.highlight-path[data-element-id*="Event_"] .djs-visual > circle {
    fill: #98E9DD !important;
    stroke: #000000 !important;
    stroke-width: 2 !important;
  }
  
  /* End Events - Light Teal - ONLY when highlighted */
  .djs-element.highlight-path[data-element-id*="EndEvent"] .djs-visual > circle {
    fill: #98E9DD !important;
    stroke: #000000 !important;
    stroke-width: 2 !important;
  }
  
  /* General Tasks - Light Yellow Background - ONLY when highlighted */
  .djs-element.highlight-path[data-element-id*="Task"] .djs-visual > rect,
  .djs-element.highlight-path[data-element-id*="Activity_"] .djs-visual > rect {
    fill: #FFFFBD !important;
    stroke: #000000 !important;
    stroke-width: 2 !important;
  }
  
  /* Message Task / Receive Task - Light Green - ONLY when highlighted */
  .djs-element.highlight-path[data-element-id*="MessageTask"] .djs-visual > rect,
  .djs-element.highlight-path[data-element-id*="ReceiveTask"] .djs-visual > rect {
    fill: #96DF67 !important;
    stroke: #000000 !important;
    stroke-width: 2 !important;
  }
  
  /* Path highlighting - enhanced for better visibility */
  .highlight-path {
    stroke: #000000 !important;
    stroke-width: 3 !important;
  }
  
  /* BPMN specific styling for highlighted paths */
  .djs-element.highlight-path .djs-visual > :nth-child(1) {
    stroke: #000000 !important;
    stroke-width: 3 !important;
  }
  
  /* Sequence flows (arrows) - ONLY when highlighted */
  .djs-element.highlight-path .djs-visual > path {
    stroke: #000000 !important;
    stroke-width: 2 !important;
  }
  
  /* Gateways - ONLY when highlighted */
  .djs-element.highlight-path .djs-visual > polygon {
    fill: #E0E0E0 !important;
    stroke: #000000 !important;
    stroke-width: 2 !important;
  }
  
  /* Table row selection styling */
  .table-row-selected {
    background-color: #eff6ff !important;
    border-left: 4px solid #3b82f6 !important;
  }
`}</style>
    </div>
  )
}
