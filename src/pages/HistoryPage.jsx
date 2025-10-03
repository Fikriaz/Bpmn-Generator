// HistoryBPMN.jsx
"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Trash2, FileText, Calendar } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import Checkbox from "../components/ui/Checkbox"
import Button from "../components/ui/Button"
import { authFetch, API_BASE } from "../utils/auth"

export default function HistoryBPMN() {
  const [bpmnFiles, setBpmnFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchBpmnHistory()
  }, [])

  const fetchBpmnHistory = async () => {
    try {
      setLoading(true)
      // kalau kamu punya endpoint ringan: /api/bpmn/files/list — silakan ganti ke itu
      const response = await authFetch(`${API_BASE}/api/bpmn/files`, {}, { onUnauthorizedRedirectTo: "/login" })
      if (response.status === 401) return
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      setBpmnFiles(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching BPMN history:", error)
      setBpmnFiles([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectItem = (id) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedItems(prev => {
      if (prev.size === bpmnFiles.length) return new Set()
      return new Set(bpmnFiles.map(f => f.id))
    })
  }

  // ⬇️ PERBAIKAN PENTING: bulk delete via 1 request
const handleDelete = async () => {
  if (selectedItems.size === 0) {
    alert("Please select items to delete")
    return
  }
  if (!confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)) return

  setDeleting(true)
  try {
    const ids = Array.from(selectedItems)
    console.log("🗑️ Attempting to delete IDs:", ids)
    
    const res = await authFetch(
      `${API_BASE}/api/bpmn/files`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      },
      { onUnauthorizedRedirectTo: "/login" }
    )

    console.log("📡 Response status:", res.status)
    console.log("📡 Response OK:", res.ok)

    if (res.status === 401) return

    // Baca response sekali
    let data
    const contentType = res.headers.get("content-type")
    console.log("📄 Content-Type:", contentType)
    
    try {
      if (contentType && contentType.includes("application/json")) {
        data = await res.json()
      } else {
        const text = await res.text()
        data = { message: text }
      }
      console.log("📦 Response data:", data)
    } catch (parseError) {
      console.error("❌ Parse error:", parseError)
      data = { error: "Failed to parse response" }
    }

    if (!res.ok) {
      const errorMsg = data.error || data.message || "Delete failed. Please try again."
      console.error("❌ Delete failed:", errorMsg)
      alert(errorMsg)
      return
    }

    // Success
    console.log("✅ Delete success:", data)
    setBpmnFiles(prev => prev.filter(f => !selectedItems.has(f.id)))
    setSelectedItems(new Set())
    alert(`Successfully deleted ${ids.length} file(s)`)
    
  } catch (err) {
    console.error("💥 Delete error:", err)
    alert(`Delete failed: ${err.message}`)
  } finally {
    setDeleting(false)
  }
}
  // ---- helpers tampilan ----
  const groupFilesByDate = (files) => {
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today); lastWeek.setDate(lastWeek.getDate() - 7)

    const groups = []
    const todayFiles = [], yesterdayFiles = [], lastWeekFiles = [], olderFiles = []

    files.forEach((file) => {
      const fileDate = new Date(file.uploadedAt)
      if (fileDate.toDateString() === today.toDateString()) todayFiles.push(file)
      else if (fileDate.toDateString() === yesterday.toDateString()) yesterdayFiles.push(file)
      else if (fileDate >= lastWeek) lastWeekFiles.push(file)
      else olderFiles.push(file)
    })

    if (todayFiles.length) groups.push({ date: `Today ${today.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`, processes: todayFiles })
    if (yesterdayFiles.length) groups.push({ date: `Yesterday ${yesterday.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`, processes: yesterdayFiles })
    if (lastWeekFiles.length) groups.push({ date: "Last Week", processes: lastWeekFiles })
    if (olderFiles.length) groups.push({ date: "Older", processes: olderFiles })

    return groups
  }

  const processGroups =
    bpmnFiles && bpmnFiles.length > 0
      ? groupFilesByDate([...bpmnFiles].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)))
      : []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading history...</p>
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
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
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

              <nav className="hidden md:flex space-x-6">
                <Link to="/" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors rounded-md hover:bg-gray-50">
                  Upload BPMN
                </Link>
                {/* <Link to="/scenario" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors rounded-md hover:bg-gray-50">
Flow Test                
</Link> */}
                <div className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md">
                  History BPMN
                </div>
              </nav>
            </div>

            {selectedItems.size > 0 && (
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-all duration-200 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleting ? "Deleting..." : `Delete (${selectedItems.size})`}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/scenario" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <h1 className="text-2xl font-bold text-gray-900">BPMN History</h1>
              </div>
            </div>

            {bpmnFiles.length > 0 && (
              <div className="text-sm text-gray-500">Total: {bpmnFiles.length} files</div>
            )}
          </div>
        </div>

        {bpmnFiles.length > 0 && (
          <div className="mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="select-all"
                  checked={selectedItems.size === bpmnFiles.length && bpmnFiles.length > 0}
                  onChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                  Select All Files
                </label>
                <span className="text-sm text-gray-500">
                  {selectedItems.size > 0 ? `${selectedItems.size} selected` : `${bpmnFiles.length} items`}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {processGroups.length > 0 ? (
            processGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-800">{group.date}</h3>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {group.processes.length} files
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-100">
                    {group.processes.map((file, processIndex) => (
                      <div
                        key={file.id}
                        className={`flex items-center p-4 transition-all duration-200 ${selectedItems.has(file.id) ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <Checkbox
                            id={`${groupIndex}-${processIndex}`}
                            checked={selectedItems.has(file.id)}
                            onChange={() => handleSelectItem(file.id)}
                          />
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedItems.has(file.id) ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                              <FileText className="w-5 h-5" />
                            </div>
                          </div>

                          <Link to={`/scenario?fileId=${file.id}`} state={{ fileId: file.id }} className="flex-1 min-w-0">
                            <div className="cursor-pointer group">
                              <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                {file.originalFileName || `BPMN Process ${file.id}`}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                Uploaded at {new Date(file.uploadedAt).toLocaleString("en-GB")}
                              </p>
                            </div>
                          </Link>

                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              BPMN
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No BPMN files found</h3>
              <p className="text-gray-500 mb-6">Upload your first BPMN file to get started</p>
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Upload BPMN File
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
