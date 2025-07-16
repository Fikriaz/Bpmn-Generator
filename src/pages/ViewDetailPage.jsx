"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Download, Save, Edit2, Plus, X, Trash2, ChevronDown } from "lucide-react"
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import BpmnViewer from "bpmn-js/dist/bpmn-navigated-viewer.production.min.js"
import { bpmnApi } from "../services/api"

export default function ViewDetailPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const viewerRef = useRef(null)

  // Get parameters from URL and location state
  const scenarioId = searchParams.get("scenarioId")
  const fileId = location.state?.fileId || searchParams.get("fileId")
  const pathIndex = location.state?.pathIndex || 0

  const [data, setData] = useState(null)
  const [scenario, setScenario] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [elementNames, setElementNames] = useState({})
  const [editingTestData, setEditingTestData] = useState(false)
  const [testDataList, setTestDataList] = useState([])
  const [originalTestData, setOriginalTestData] = useState([])
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false)

  useEffect(() => {
    if (fileId) {
      fetchScenarioDetail()
    } else {
      setError("No file ID provided")
      setLoading(false)
    }

    // Cleanup function
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
      }
    }
  }, [fileId, scenarioId])

  const fetchScenarioDetail = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch BPMN file data with scenarios
      const response = await fetch(`http://localhost:8080/api/bpmn/files/${fileId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const bpmnData = await response.json()
      setData(bpmnData)

      // Find the specific scenario
      let selectedScenario = null
      if (bpmnData.testScenariosJson?.length > 0) {
        if (scenarioId) {
          // Find by scenario ID
          selectedScenario = bpmnData.testScenariosJson.find(
            (s) => s.path_id === scenarioId || s.path_id === `P${scenarioId}`,
          )
        }
        // Fallback to index or first scenario
        if (!selectedScenario) {
          selectedScenario = bpmnData.testScenariosJson[pathIndex] || bpmnData.testScenariosJson[0]
        }
      }

      setScenario(selectedScenario)

      // Process test data into a readable format
      if (selectedScenario?.input_data) {
        const processedTestData = processInputDataGrouped(selectedScenario.input_data)
        setTestDataList(processedTestData)
        setOriginalTestData(JSON.parse(JSON.stringify(processedTestData))) // Deep copy
      }

      // Initialize BPMN viewer
      if (bpmnData.bpmnXml && containerRef.current) {
        // Clean up existing viewer
        if (viewerRef.current) {
          viewerRef.current.destroy()
        }

        const viewer = new BpmnViewer({ container: containerRef.current })
        viewerRef.current = viewer

        await viewer.importXML(bpmnData.bpmnXml)
        extractElementNames(viewer)

        // Highlight the selected path
        if (selectedScenario?.rawPath) {
          highlightPath(selectedScenario.rawPath)
        }

        // 🟢 Tambahkan listener event 'rendered' supaya styling diterapkan saat diagram sudah muncul
        viewer.get("eventBus").on("rendered", () => {
          const canvasContainer = viewer.get("canvas").getContainer()
          const texts = canvasContainer.querySelectorAll(".djs-label text")
          texts.forEach((el) => {
            el.removeAttribute("stroke")
            el.style.stroke = "none"
            el.style.paintOrder = "normal"
            el.style.fontWeight = "normal"
            el.style.fill = "black"
            el.style.vectorEffect = "non-scaling-stroke"
            el.style.shapeRendering = "geometricPrecision"
          })
        })
      }
    } catch (err) {
      console.error("Failed to fetch scenario details:", err)
      setError(err.message || "Failed to fetch scenario details")
    } finally {
      setLoading(false)
    }
  }

  const processInputDataGrouped = (inputData) => {
    const testDataArray = []

    Object.entries(inputData).forEach(([key, value]) => {
      const cleanKey = key
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())

      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          // Handle arrays - group items together
          const arrayItems = value.map((item, index) => {
            if (typeof item === "object") {
              return {
                id: `${key}_${index}`,
                index: index,
                properties: Object.entries(item).map(([subKey, subValue]) => ({
                  key: subKey,
                  value: String(subValue),
                })),
              }
            }
            return {
              id: `${key}_${index}`,
              index: index,
              value: String(item),
            }
          })

          testDataArray.push({
            id: key,
            label: cleanKey,
            value: arrayItems,
            type: "array",
          })
        } else {
          // Handle objects - group properties together
          const objectItems = Object.entries(value).map(([subKey, subValue]) => ({
            key: subKey,
            value: String(subValue),
          }))

          testDataArray.push({
            id: key,
            label: cleanKey,
            value: objectItems,
            type: "object",
          })
        }
      } else {
        // Handle primitive values
        testDataArray.push({
          id: key,
          label: cleanKey,
          value: String(value),
          type: "primitive",
        })
      }
    })

    return testDataArray
  }

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

  const getReadableScenarioPath = (pathArray) => {
    if (!Array.isArray(pathArray)) return "-"
    return pathArray.map((id) => elementNames[id] || id).join(" → ")
  }

  const getStatusDisplay = (scenario) => {
    if (!scenario) return "-"
    const message = scenario?.expected_result?.message?.trim()
    return message || "-"
  }

  const getActionSteps = (scenarioStep) => {
    if (!scenarioStep) return []
    const steps = scenarioStep
      .split("\n")
      .map((step) => step.trim())
      .filter(
        (step) => step.match(/^\d+\.\s+/) || step.startsWith("->"), // support "1. " atau "-> "
      )
      .map((step) =>
        step
          .replace(/^\d+\.\s*/, "")
          .replace(/^->\s*/, "")
          .trim(),
      )
      .filter((step) => step.length > 0)
    return steps
  }

  const formatTestDataForTable = (testDataList) => {
    let formattedData = ""
    testDataList.forEach((item, index) => {
      if (item.type === "array") {
        formattedData += `${index + 1}. ${item.label}:\n`
        item.value.forEach((arrayItem, arrayIndex) => {
          if (arrayItem.properties) {
            const props = arrayItem.properties.map((prop) => `${prop.key}: ${prop.value}`).join(", ")
            formattedData += `   - Item ${arrayIndex + 1}: ${props}\n`
          } else {
            formattedData += `   - Item ${arrayIndex + 1}: ${arrayItem.value}\n`
          }
        })
      } else if (item.type === "object") {
        formattedData += `${index + 1}. ${item.label}:\n`
        item.value.forEach((objItem) => {
          formattedData += `   - ${objItem.key}: ${objItem.value}\n`
        })
      } else {
        formattedData += `${index + 1}. ${item.label}: ${item.value}\n`
      }
    })
    return formattedData
  }
    
const handleDownloadExcel = async () => {
  try {
    const response = await fetch(`/api/bpmn/download/${fileId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Gagal mengunduh file Excel.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenarios_export.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
};


  const handleDownloadPDF = async () => {
    try {
      setShowDownloadDropdown(false)

      // Call the download API endpoint
      const response = await fetch(`http://localhost:8080/api/bpmn/download/${fileId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Format test data for PDF
      const formatTestDataForPDF = (testDataList) => {
        if (!testDataList || testDataList.length === 0) return "No test data available"

        return testDataList
          .map((item, index) => {
            if (item.type === "array") {
              const arrayData = item.value
                .map((arrayItem, arrayIndex) => {
                  if (arrayItem.properties) {
                    const props = arrayItem.properties.map((prop) => `${prop.key}: ${prop.value}`).join(", ")
                    return `<li><strong>Item ${arrayIndex + 1}:</strong> ${props}</li>`
                  }
                  return `<li><strong>Item ${arrayIndex + 1}:</strong> ${arrayItem.value}</li>`
                })
                .join("")
              return `<div><strong>${item.label}:</strong><ul>${arrayData}</ul></div>`
            } else if (item.type === "object") {
              const objData = item.value
                .map((objItem) => `<li><strong>${objItem.key}:</strong> ${objItem.value}</li>`)
                .join("")
              return `<div><strong>${item.label}:</strong><ul>${objData}</ul></div>`
            } else {
              return `<div><strong>${item.label}:</strong> ${item.value}</div>`
            }
          })
          .join("<br>")
      }

      // Format action steps for PDF
      const formatActionStepsForPDF = (steps) => {
        if (!steps || steps.length === 0) return "No actions specified"
        return steps.map((step, index) => `<div>${index + 1}. ${step}</div>`).join("")
      }

      // Create HTML content for PDF
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Scenario - ${scenario?.path_id || "Detail"}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: white;
            font-size: 12px;
        }
        .container {
            max-width: 100%;
            margin: 0 auto;
        }
        h1 {
            color: #2185D5;
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 3px solid #2185D5;
            padding-bottom: 10px;
            font-size: 24px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 10px;
        }
        th {
            background-color: #2185D5;
            color: white;
            padding: 8px 6px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
            font-size: 10px;
        }
        td {
            padding: 8px 6px;
            border: 1px solid #ddd;
            vertical-align: top;
            line-height: 1.3;
            font-size: 9px;
        }
        .path-id {
            font-weight: bold;
            color: #2185D5;
            text-align: center;
        }
        .summary {
            max-width: 150px;
            word-wrap: break-word;
        }
        .actions {
            max-width: 120px;
        }
        .test-data {
            max-width: 180px;
            font-size: 8px;
        }
        .expected-result {
            max-width: 120px;
            word-wrap: break-word;
        }
        .input-field {
            width: 100%;
            min-height: 30px;
            border: 1px solid #ccc;
            padding: 4px;
            font-size: 9px;
        }
        ul {
            margin: 3px 0;
            padding-left: 12px;
        }
        li {
            margin: 1px 0;
        }
        .header-info {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            border-left: 4px solid #2185D5;
            font-size: 11px;
        }
        .instructions {
            margin-top: 20px;
            padding: 10px;
            background-color: #e8f4fd;
            border-radius: 5px;
            font-size: 10px;
        }
        .instructions h3 {
            color: #2185D5;
            margin-top: 0;
            font-size: 12px;
        }
        .instructions ul {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Test Scenario Report</h1>
        
        <div class="header-info">
            <strong>File ID:</strong> ${fileId}<br>
            <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
            <strong>Scenario Path:</strong> ${scenario?.path_id || "N/A"}
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="width: 60px;">Path ID</th>
                    <th style="width: 150px;">Summary Step</th>
                    <th style="width: 120px;">Action Performed</th>
                    <th style="width: 180px;">Data Uji</th>
                    <th style="width: 120px;">Expected Result</th>
                    <th style="width: 100px;">Actual Result</th>
                    <th style="width: 80px;">Tester</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="path-id">${scenario?.path_id || "-"}</td>
                    <td class="summary">${scenario?.readable_description || "No description available"}</td>
                    <td class="actions">${formatActionStepsForPDF(getActionSteps(scenario?.scenario_step))}</td>
                    <td class="test-data">${formatTestDataForPDF(testDataList)}</td>
                    <td class="expected-result">${getStatusDisplay(scenario) || "No expected result specified"}</td>
                    <td><div class="input-field">_________________</div></td>
                    <td><div class="input-field">_________</div></td>
                </tr>
            </tbody>
        </table>
        
        <div class="instructions">
            <h3>Instructions:</h3>
            <ul>
                <li>Fill in the "Actual Result" field with the observed outcome</li>
                <li>Enter the tester's name in the "Tester" field</li>
                <li>Compare actual results with expected results to determine test status</li>
                <li>Mark as PASS/FAIL based on comparison</li>
            </ul>
        </div>
    </div>
</body>
</html>`

      // Use html2pdf library
      const html2pdf = (await import("https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/+esm")).default

      const opt = {
        margin: 0.5,
        filename: `test-scenario-${scenario?.path_id || "detail"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
      }

      // Create a temporary div to hold the HTML
      const tempDiv = document.createElement("div")
      tempDiv.innerHTML = htmlContent
      tempDiv.style.position = "absolute"
      tempDiv.style.left = "-9999px"
      document.body.appendChild(tempDiv)

      // Generate PDF
      await html2pdf().set(opt).from(tempDiv).save()

      // Clean up
      document.body.removeChild(tempDiv)

      console.log("PDF download completed successfully")
    } catch (err) {
      console.error("PDF download failed:", err)
      alert("PDF download failed. Please try again.")
    }
  }

  const handleEditTestData = () => {
    setEditingTestData(true)
    setSaveSuccess(false) // Reset success status when entering edit mode
  }

  const handleSaveChanges = async () => {
    // If not editing, redirect to scenario page
    if (!editingTestData) {
      navigate("/scenario", {
        state: { fileId },
        replace: true,
      })
      return
    }

    // If editing, save the data
    setSaving(true)
    setSaveSuccess(false)

    try {
      // Convert edited test data to API format
      const convertedData = convertTestDataToApiFormat(testDataList)

      // Determine pathId to use
      const pathId = scenario?.path_id || scenarioId || `P${pathIndex + 1}`

      console.log("Saving test data:", {
        fileId,
        pathId,
        data: convertedData,
      })

      // API call to updateScenario endpoint
      const response = await bpmnApi.updateScenario(fileId, pathId, {
        input_data: convertedData,
      })

      console.log("Save response:", response.data)

      // Update original data in state to match what was saved
      setOriginalTestData(JSON.parse(JSON.stringify(testDataList)))
      setEditingTestData(false) // Exit edit mode
      setSaveSuccess(true)

      // Show success message briefly, then allow user to click again to redirect
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000) // Reset success message after 3 seconds
    } catch (err) {
      console.error("Save failed:", err)
      const errorMessage =
        err.response?.data?.message || err.response?.data?.error || err.message || "Save failed. Please try again."
      alert(`Save failed: ${errorMessage}`)
      setSaveSuccess(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingTestData(false)
    setSaveSuccess(false)
    setTestDataList(JSON.parse(JSON.stringify(originalTestData)))
  }

  // BPMN Viewer Controls
  const handleZoomFit = () => {
    if (viewerRef.current) {
      const canvas = viewerRef.current.get("canvas")
      canvas.zoom("fit-viewport")
    }
  }

  const handleZoomIn = () => {
    if (viewerRef.current) {
      const canvas = viewerRef.current.get("canvas")
      canvas.zoom(canvas.zoom() + 0.1)
    }
  }

  const handleZoomOut = () => {
    if (viewerRef.current) {
      const canvas = viewerRef.current.get("canvas")
      canvas.zoom(canvas.zoom() - 0.1)
    }
  }

  const handleResetHighlight = () => {
    if (!viewerRef.current) return

    const canvas = viewerRef.current.get("canvas")
    const elementRegistry = viewerRef.current.get("elementRegistry")

    // Clear all highlights
    elementRegistry.getAll().forEach((el) => {
      canvas.removeMarker(el.id, "highlight-path")
    })
  }

  // Update functions for different data types
  const updatePrimitiveValue = (id, newValue) => {
    setTestDataList(testDataList.map((item) => (item.id === id ? { ...item, value: newValue } : item)))
    setSaveSuccess(false) // Reset success status when data changes
  }

  const updatePrimitiveLabel = (id, newLabel) => {
    setTestDataList(testDataList.map((item) => (item.id === id ? { ...item, label: newLabel } : item)))
    setSaveSuccess(false)
  }

  const updateObjectProperty = (itemId, propIndex, field, newValue) => {
    setTestDataList(
      testDataList.map((item) => {
        if (item.id === itemId && item.type === "object") {
          const newValue_copy = [...item.value]
          newValue_copy[propIndex] = { ...newValue_copy[propIndex], [field]: newValue }
          return { ...item, value: newValue_copy }
        }
        return item
      }),
    )
    setSaveSuccess(false)
  }

  const addObjectProperty = (itemId) => {
    setTestDataList(
      testDataList.map((item) => {
        if (item.id === itemId && item.type === "object") {
          return {
            ...item,
            value: [...item.value, { key: "new_property", value: "" }],
          }
        }
        return item
      }),
    )
    setSaveSuccess(false)
  }

  const removeObjectProperty = (itemId, propIndex) => {
    setTestDataList(
      testDataList.map((item) => {
        if (item.id === itemId && item.type === "object") {
          return {
            ...item,
            value: item.value.filter((_, index) => index !== propIndex),
          }
        }
        return item
      }),
    )
    setSaveSuccess(false)
  }

  const updateArrayItemProperty = (itemId, arrayIndex, propIndex, field, newValue) => {
    setTestDataList(
      testDataList.map((item) => {
        if (item.id === itemId && item.type === "array") {
          const newArrayValue = [...item.value]
          if (newArrayValue[arrayIndex].properties) {
            newArrayValue[arrayIndex].properties[propIndex] = {
              ...newArrayValue[arrayIndex].properties[propIndex],
              [field]: newValue,
            }
          }
          return { ...item, value: newArrayValue }
        }
        return item
      }),
    )
    setSaveSuccess(false)
  }

  const addArrayItem = (itemId) => {
    setTestDataList(
      testDataList.map((item) => {
        if (item.id === itemId && item.type === "array") {
          const newIndex = item.value.length
          const newItem = {
            id: `${itemId}_${newIndex}`,
            index: newIndex,
            properties: [{ key: "new_property", value: "" }],
          }
          return {
            ...item,
            value: [...item.value, newItem],
          }
        }
        return item
      }),
    )
    setSaveSuccess(false)
  }

  const removeArrayItem = (itemId, arrayIndex) => {
    setTestDataList(
      testDataList.map((item) => {
        if (item.id === itemId && item.type === "array") {
          return {
            ...item,
            value: item.value.filter((_, index) => index !== arrayIndex),
          }
        }
        return item
      }),
    )
    setSaveSuccess(false)
  }

  const addNestedField = (parentId = null, type = "primitive") => {
    const newItem = {
      id: `new_${Date.now()}`,
      label: "New Field",
      value: type === "array" ? [] : type === "object" ? [] : "",
      type: type,
      parentId: parentId,
      level: parentId ? getItemLevel(parentId) + 1 : 0,
    }
    setTestDataList([...testDataList, newItem])
    setSaveSuccess(false)
  }

  const getItemLevel = (itemId) => {
    const item = testDataList.find((item) => item.id === itemId)
    return item ? item.level || 0 : 0
  }

  const addSubField = (parentId, type = "primitive") => {
    const parentItem = testDataList.find((item) => item.id === parentId)
    if (!parentItem) return

    const newItem = {
      id: `${parentId}_sub_${Date.now()}`,
      label: "New Sub Field",
      value: type === "array" ? [] : type === "object" ? [] : "",
      type: type,
      parentId: parentId,
      level: (parentItem.level || 0) + 1,
    }
    setTestDataList([...testDataList, newItem])
    setSaveSuccess(false)
  }

  const removeTestDataItem = (id) => {
    setTestDataList(testDataList.filter((item) => item.id !== id))
    setSaveSuccess(false)
  }

  const renderTestDataItem = (item, index) => {
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
      )
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
      )
    }

    // Primitive type
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
    )
  }

  const renderEditTestDataItem = (item, index) => {
    const indentLevel = (item.level || 0) * 20 // 20px per level

    if (item.type === "array") {
      return (
        <div
          key={item.id}
          className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg"
          style={{ marginLeft: `${indentLevel}px` }}
        >
          <div className="flex items-start">
            <span className="mr-3 text-blue-600 font-bold text-lg">{index + 1}.</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updatePrimitiveLabel(item.id, e.target.value)}
                  className="font-semibold text-blue-800 bg-transparent border-b border-blue-300 focus:border-blue-500 outline-none"
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => addSubField(item.id, "primitive")}
                    className="text-blue-600 hover:text-blue-800 p-1 text-xs"
                    title="Add Sub Field"
                  >
                    + Field
                  </button>
                  <button
                    onClick={() => addSubField(item.id, "object")}
                    className="text-green-600 hover:text-green-800 p-1 text-xs"
                    title="Add Sub Object"
                  >
                    + Object
                  </button>
                  <button
                    onClick={() => addSubField(item.id, "array")}
                    className="text-purple-600 hover:text-purple-800 p-1 text-xs"
                    title="Add Sub Array"
                  >
                    + Array
                  </button>
                  <button onClick={() => removeTestDataItem(item.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {item.value.map((arrayItem, arrayIndex) => (
                  <div key={arrayItem.id} className="bg-white p-3 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-600 font-medium text-sm">Item {arrayIndex + 1}</span>
                      <button
                        onClick={() => removeArrayItem(item.id, arrayIndex)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {arrayItem.properties ? (
                      <div className="space-y-1">
                        {arrayItem.properties.map((prop, propIndex) => (
                          <div key={propIndex} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={prop.key}
                              onChange={(e) =>
                                updateArrayItemProperty(item.id, arrayIndex, propIndex, "key", e.target.value)
                              }
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="Property name"
                            />
                            <span className="text-gray-500">:</span>
                            <input
                              type="text"
                              value={prop.value}
                              onChange={(e) =>
                                updateArrayItemProperty(item.id, arrayIndex, propIndex, "value", e.target.value)
                              }
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="Value"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={arrayItem.value}
                        onChange={(e) => {
                          const newArrayValue = [...item.value]
                          newArrayValue[arrayIndex] = { ...newArrayValue[arrayIndex], value: e.target.value }
                          setTestDataList(
                            testDataList.map((testItem) =>
                              testItem.id === item.id ? { ...testItem, value: newArrayValue } : testItem,
                            ),
                          )
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        placeholder="Value"
                      />
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem(item.id)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (item.type === "object") {
      return (
        <div
          key={item.id}
          className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg"
          style={{ marginLeft: `${indentLevel}px` }}
        >
          <div className="flex items-start">
            <span className="mr-3 text-green-600 font-bold text-lg">{index + 1}.</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updatePrimitiveLabel(item.id, e.target.value)}
                  className="font-semibold text-green-800 bg-transparent border-b border-green-300 focus:border-green-500 outline-none"
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => addSubField(item.id, "primitive")}
                    className="text-blue-600 hover:text-blue-800 p-1 text-xs"
                    title="Add Sub Field"
                  >
                    + Field
                  </button>
                  <button
                    onClick={() => addSubField(item.id, "object")}
                    className="text-green-600 hover:text-green-800 p-1 text-xs"
                    title="Add Sub Object"
                  >
                    + Object
                  </button>
                  <button
                    onClick={() => addSubField(item.id, "array")}
                    className="text-purple-600 hover:text-purple-800 p-1 text-xs"
                    title="Add Sub Array"
                  >
                    + Array
                  </button>
                  <button onClick={() => removeTestDataItem(item.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {item.value.map((objItem, objIndex) => (
                  <div key={objIndex} className="bg-white p-2 rounded flex items-center space-x-2">
                    <input
                      type="text"
                      value={objItem.key}
                      onChange={(e) => updateObjectProperty(item.id, objIndex, "key", e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Property name"
                    />
                    <span className="text-gray-500">:</span>
                    <input
                      type="text"
                      value={objItem.value}
                      onChange={(e) => updateObjectProperty(item.id, objIndex, "value", e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Value"
                    />
                    <button
                      onClick={() => removeObjectProperty(item.id, objIndex)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addObjectProperty(item.id)}
                  className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-sm"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Property</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Primitive type
    return (
      <div
        key={item.id}
        className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-lg"
        style={{ marginLeft: `${indentLevel}px` }}
      >
        <div className="flex items-start">
          <span className="mr-3 text-gray-600 font-bold text-lg">{index + 1}.</span>
          <div className="flex-1 flex items-center space-x-2">
            <input
              type="text"
              value={item.label}
              onChange={(e) => updatePrimitiveLabel(item.id, e.target.value)}
              className="font-semibold text-gray-800 bg-transparent border-b border-gray-300 focus:border-gray-500 outline-none"
              placeholder="Field name"
            />
            <span className="text-gray-500">:</span>
            <input
              type="text"
              value={item.value}
              onChange={(e) => updatePrimitiveValue(item.id, e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Value"
            />
            <div className="flex items-center space-x-1">
              <button
                onClick={() => addSubField(item.id, "primitive")}
                className="text-blue-600 hover:text-blue-800 p-1 text-xs"
                title="Add Sub Field"
              >
                + Field
              </button>
              <button
                onClick={() => addSubField(item.id, "object")}
                className="text-green-600 hover:text-green-800 p-1 text-xs"
                title="Add Sub Object"
              >
                + Obj
              </button>
              <button
                onClick={() => addSubField(item.id, "array")}
                className="text-purple-600 hover:text-purple-800 p-1 text-xs"
                title="Add Sub Array"
              >
                + Arr
              </button>
              <button onClick={() => removeTestDataItem(item.id)} className="text-red-500 hover:text-red-700 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const convertTestDataToApiFormat = (testDataList) => {
    const apiData = {}

    testDataList.forEach((item) => {
      // Convert the clean label back to API key format
      const apiKey = item.id.startsWith("new_") ? item.label.toLowerCase().replace(/\s+/g, "_") : item.id

      if (item.type === "primitive") {
        // Simple key-value pair
        apiData[apiKey] = item.value
      } else if (item.type === "object") {
        // Convert object properties back to nested object
        const objectData = {}
        item.value.forEach((prop) => {
          objectData[prop.key] = prop.value
        })
        apiData[apiKey] = objectData
      } else if (item.type === "array") {
        // Convert array items back to array format
        const arrayData = item.value.map((arrayItem) => {
          if (arrayItem.properties) {
            // Array of objects
            const itemData = {}
            arrayItem.properties.forEach((prop) => {
              itemData[prop.key] = prop.value
            })
            return itemData
          } else {
            // Array of primitives
            return arrayItem.value
          }
        })
        apiData[apiKey] = arrayData
      }
    })

    return apiData
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scenario details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/scenario" state={{ fileId }}>
            <Button className="bg-[#2185D5] hover:bg-[#1D5D9B] text-white">Go Back to Scenarios</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Main Content */}
      <div className="max-w-5xl mx-auto p-6 bg-white">
        {/* Back Button */}
        <div className="mb-8">
          <Link to="/scenario" state={{ fileId }}>
            <button
              className="flex items-center space-x-2 text-gray-600 transition-colors bg-transparent border-none cursor-pointer"
              onMouseEnter={(e) => (e.currentTarget.style.color = "#5CC2F2")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </Link>
        </div>

        <div className="space-y-6">
          {/* BPMN Path */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">BPMN Path</label>
            </div>
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50 min-h-[400px] flex items-center justify-center">
              <div ref={containerRef} className="w-full h-[400px] rounded-lg overflow-hidden bg-white" />
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 gap-12 items-start">
            <div className="col-span-1">
              <label className="text-sm font-medium text-gray-500">Deskripsi Skenario</label>
            </div>
            <div className="col-span-3">
              <div className="text-sm text-gray-700 leading-relaxed">
                {scenario?.readable_description ||
                  "Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type. It was popularised in the 1960s with the release of Letraset sheets containing Lorem ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem ipsum."}
              </div>
            </div>
          </div>

          {/* Action Performed - Fixed formatting */}
          <div className="grid grid-cols-4 gap-12 items-start">
            <div className="col-span-1">
              <label className="text-sm font-medium text-gray-500">Action Performed</label>
            </div>
            <div className="col-span-3">
              <div className="text-sm text-gray-600 space-y-2">
                {getActionSteps(scenario?.scenario_step).length > 0 ? (
                  getActionSteps(scenario?.scenario_step).map((step, index) => (
                    <div key={index} className="flex items-start">
                      <span className="mr-3 text-blue-600 font-medium">{index + 1}.</span>
                      <span className="flex-1">{step}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 italic">Langkah skenario tidak tersedia.</p>
                )}
              </div>
            </div>
          </div>

          {/* Data Pengujian - Enhanced grouped display with full edit functionality */}
          <div className="grid grid-cols-4 gap-12 items-start">
            <div className="col-span-1">
              <label className="text-sm font-medium text-gray-500">Data Pengujian</label>
            </div>
            <div className="col-span-3">
              {!editingTestData ? (
                // Display mode
                <div className="space-y-4">
                  <div className="space-y-3">
                    {testDataList.length > 0 ? (
                      testDataList.map((item, index) => renderTestDataItem(item, index))
                    ) : (
                      <p className="text-gray-400 italic">Data pengujian tidak tersedia.</p>
                    )}
                  </div>
                  <Button
                    onClick={handleEditTestData}
                    className="text-white text-sm px-4 py-2 transition-colors"
                    style={{ backgroundColor: "#2185D5" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1D5D9B")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2185D5")}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Data Uji
                  </Button>
                </div>
              ) : (
                // Edit mode - Full functionality with nested support
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-3">Add New Data Fields</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => addNestedField(null, "primitive")}
                        className="text-sm px-3 py-2 bg-white border-blue-300 text-blue-700 hover:bg-blue-50 border"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Field
                      </Button>
                      <Button
                        onClick={() => addNestedField(null, "object")}
                        className="text-sm px-3 py-2 bg-white border-green-300 text-green-700 hover:bg-green-50 border"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Object
                      </Button>
                      <Button
                        onClick={() => addNestedField(null, "array")}
                        className="text-sm px-3 py-2 bg-white border-purple-300 text-purple-700 hover:bg-purple-50 border"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Array
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {testDataList.map((item, index) => renderEditTestDataItem(item, index))}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <Button
                      onClick={handleCancelEdit}
                      className="text-sm px-4 py-2 bg-transparent border-gray-300 text-gray-700 border"
                    >
                      Cancel
                    </Button>
                    <div className="text-sm text-gray-500">
                      Use + Field, + Object, + Array buttons to create nested structures
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expected Result */}
          <div className="grid grid-cols-4 gap-12 items-start">
            <div className="col-span-1">
              <label className="text-sm font-medium text-gray-500">Expected Result</label>
            </div>
            <div className="col-span-3">
              <div className="text-sm text-gray-700 py-2">{getStatusDisplay(scenario)}</div>
            </div>
          </div>

          {/* Action Buttons - Single Download Button with Dropdown and Save */}
          <div className="flex justify-between items-center space-x-3 pt-6 border-t border-gray-200">
            {/* Download Dropdown Button */}
            <div className="relative">
              <Button
                onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                className="flex items-center space-x-2 text-sm text-white border-0 transition-colors bg-transparent"
                style={{ backgroundColor: "#28a745" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#218838")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#28a745")}
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
                <ChevronDown className="w-4 h-4" />
              </Button>

              {/* Dropdown Menu */}
              {showDownloadDropdown && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={handleDownloadExcel}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <span className="mr-3">📊</span>
                      <span>Download Excel</span>
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <span className="mr-3">📄</span>
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveChanges}
              disabled={saving}
              className="flex items-center space-x-2 text-white text-sm px-6 py-2 transition-colors font-medium"
              style={{ backgroundColor: saving ? "#A0AEC0" : "#2185D5" }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.backgroundColor = "#1D5D9B"
                }
              }}
              onMouseLeave={(e) => {
                if (!saving) {
                  e.currentTarget.style.backgroundColor = "#2185D5"
                }
              }}
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? "Saving..."
                  : editingTestData
                    ? "Save Changes"
                    : saveSuccess
                      ? "Data Updated! Click to Continue"
                      : "Save Changes"}
              </span>
            </Button>
          </div>

          {/* Success Message */}
          {saveSuccess && !editingTestData && (
            <div className="text-center py-4">
              <div className="text-green-600 font-medium mb-2">✓ Data updated successfully!</div>
              <div className="text-sm text-gray-500">Click "Save Changes" again to go back to scenario page</div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showDownloadDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowDownloadDropdown(false)} />}

      {/* Enhanced CSS for BPMN highlighting */}
      <style>{`
/* Enhanced CSS for BPMN highlighting - ONLY highlight elements in the selected path */
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

.djs-label text {
  stroke: none !important;
  paint-order: normal !important;
  font-weight: normal !important;
  fill: black !important;
  vector-effect: non-scaling-stroke !important;
  shape-rendering: geometricPrecision !important;
}
`}</style>
    </div>
  )
}
