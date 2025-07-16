"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import Checkbox from "../components/ui/Checkbox"
import Button from "../components/ui/Button"

export default function HistoryBPMN() {
  const [bpmnFiles, setBpmnFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchBpmnHistory()
  }, [])

  const fetchBpmnHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:8080/api/bpmn/files")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
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
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedItems.size === bpmnFiles.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(bpmnFiles.map((file) => file.id)))
    }
  }

  const handleDelete = async () => {
    if (selectedItems.size === 0) {
      alert("Please select items to delete")
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)) {
      return
    }

    setDeleting(true)
    try {
      const deletePromises = Array.from(selectedItems).map((fileId) =>
        fetch(`http://localhost:8080/api/bpmn/files/${fileId}`, {
          method: "DELETE",
        }),
      )

      await Promise.all(deletePromises)
      setSelectedItems(new Set())
      await fetchBpmnHistory()
      alert("Items deleted successfully!")
    } catch (err) {
      console.error("Delete failed:", err)
      alert("Delete failed. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  const groupFilesByDate = (files) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    const groups = []
    const todayFiles = []
    const yesterdayFiles = []
    const lastWeekFiles = []
    const olderFiles = []

    files.forEach((file) => {
      const fileDate = new Date(file.uploadedAt)
      const fileDateString = fileDate.toDateString()

      if (fileDateString === today.toDateString()) {
        todayFiles.push(file)
      } else if (fileDateString === yesterday.toDateString()) {
        yesterdayFiles.push(file)
      } else if (fileDate >= lastWeek) {
        lastWeekFiles.push(file)
      } else {
        olderFiles.push(file)
      }
    })

    if (todayFiles.length > 0) {
      groups.push({
        date: `Today ${today.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
        processes: todayFiles,
      })
    }

    if (yesterdayFiles.length > 0) {
      groups.push({
        date: `Yesterday ${yesterday.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
        processes: yesterdayFiles,
      })
    }

    if (lastWeekFiles.length > 0) {
      groups.push({
        date: "Last Week",
        processes: lastWeekFiles,
      })
    }

    if (olderFiles.length > 0) {
      groups.push({
        date: "Older",
        processes: olderFiles,
      })
    }

    return groups
  }

  const processGroups =
    bpmnFiles && bpmnFiles.length > 0
      ? groupFilesByDate(bpmnFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)))
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
      {/* Header - Top Navbar */}
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
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hover:text-[#5CC2F2]"
                >
                  Upload BPMN
                </Link>
                <Link
                  to="/scenario"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hover:text-[#5CC2F2]"
                >
                  Alur Skenario
                </Link>
                <div
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md"
                  style={{ backgroundColor: "#2185D5" }}
                >
                  History BPMN
                </div>
              </nav>
            </div>

            {/* Delete Button in Header */}
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleDelete}
                disabled={selectedItems.size === 0 || deleting}
                className="flex items-center space-x-2 text-white transition-all duration-200 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: selectedItems.size === 0 || deleting ? "#9ca3af" : "#2185D5",
                }}
                onMouseEnter={(e) => {
                  if (selectedItems.size > 0 && !deleting) {
                    e.currentTarget.style.backgroundColor = "#1D5D9B"
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedItems.size > 0 && !deleting) {
                    e.currentTarget.style.backgroundColor = "#2185D5"
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {deleting ? "Deleting..." : `Delete ${selectedItems.size > 0 ? `(${selectedItems.size})` : ""}`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <Link
            to="/scenario"
            className="flex items-center space-x-2 text-gray-600 hover:text-[#5CC2F2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </div>

        {/* Select All Option */}
        {bpmnFiles.length > 0 && (
          <div className="mb-6 flex items-center space-x-3 bg-white p-4 rounded-lg border border-gray-200 min-h-[60px]">
            <Checkbox
              id="select-all"
              checked={selectedItems.size === bpmnFiles.length && bpmnFiles.length > 0}
              onChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium text-gray-700 cursor-pointer">
              Select All ({bpmnFiles.length} items)
            </label>
          </div>
        )}

        {/* Process History Groups */}
        <div className="max-w-4xl space-y-8">
          {processGroups.length > 0 ? (
            processGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-4">
                <h3 className="text-gray-500 font-medium text-sm">{group.date}</h3>
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <div className="space-y-4">
                    {group.processes.map((file, processIndex) => (
                      <div
                        key={file.id}
                        className={`
                          flex items-center space-x-3 p-4 rounded-lg transition-colors min-h-[60px]
                          ${selectedItems.has(file.id) ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}
                        `}
                      >
                        <Checkbox
                          id={`${groupIndex}-${processIndex}`}
                          checked={selectedItems.has(file.id)}
                          onChange={() => handleSelectItem(file.id)}
                        />

                        <span className="text-xs text-gray-500 min-w-[50px] font-medium">
                          {new Date(file.uploadedAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        <Link to={`/scenario?fileId=${file.id}`} state={{ fileId: file.id }} className="flex-1">
                          <div className="text-gray-700 font-medium cursor-pointer hover:text-[#2185D5] transition-colors py-2">
                            {file.originalFileName || `BPMN Process ${file.id}`}
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No BPMN history found</p>
              <Link
                to="/"
                className="inline-block text-white px-6 py-3 rounded cursor-pointer transition-all duration-200 font-medium hover:shadow-lg"
                style={{ backgroundColor: "#2185D5" }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
              >
                Upload Your First BPMN
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
