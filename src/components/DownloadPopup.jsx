"use client"
import { useState, useEffect } from "react"
import { X, Download, FileText, FileSpreadsheet } from "lucide-react"
import Button from "./ui/Button"

export default function DownloadPopup({ isOpen, onClose, onDownload, scenario, fileId }) {
  const [selectedFormat, setSelectedFormat] = useState("excel")
  const [includeTesterName, setIncludeTesterName] = useState(false)
  const [testerName, setTesterName] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  // Fix localStorage access issue - use in-memory storage instead
  useEffect(() => {
    // Since localStorage is not available in Claude.ai artifacts,
    // we'll simulate user data or use a default
    const mockUser = {
      username: "defaultUser",
      name: "Default User"
    }
    setCurrentUser(mockUser)
  }, [])

  if (!isOpen) return null

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      console.log("Starting download with:", {
        format: selectedFormat,
        includeTesterName,
        testerName: includeTesterName ? testerName : "",
        scenario: scenario?.path_id,
        fileId
      })

      await onDownload({
        format: selectedFormat,
        includeTesterName,
        testerName: includeTesterName ? testerName : "",
      })
      onClose()
    } catch (error) {
      console.error("Download failed:", error)
      
      let userMessage = "Download failed"
      
      if (error.message.includes("Failed to fetch") || error.name === 'TypeError') {
        userMessage = "Cannot connect to server. Please check:\n1. Server is running on localhost:8080\n2. CORS is configured correctly\n3. Network connection is active"
      } else if (error.message.includes("500")) {
        userMessage = "Server error. Check server logs for details."
      } else if (error.message.includes("404")) {
        userMessage = "Download endpoint not found. Verify backend API is correct."
      } else {
        userMessage = `Download failed: ${error.message}`
      }
      
      alert(userMessage)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleQuickFillTester = () => {
    if (currentUser?.username) {
      setTesterName(currentUser.username)
      setIncludeTesterName(true)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Download Test Scenario</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Format</label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={selectedFormat === "excel"}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="mr-3"
                />
                <FileSpreadsheet className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">Excel (.xlsx)</div>
                  <div className="text-sm text-gray-500">Structured spreadsheet format</div>
                </div>
              </label>
              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={selectedFormat === "pdf"}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="mr-3"
                />
                <FileText className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">PDF (.pdf)</div>
                  <div className="text-sm text-gray-500">Printable document format</div>
                </div>
              </label>
            </div>
          </div>

          {/* Tester Name Option */}
          <div>
            <label className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                checked={includeTesterName}
                onChange={(e) => setIncludeTesterName(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Include Tester Name</span>
            </label>
            {includeTesterName && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={testerName}
                  onChange={(e) => setTesterName(e.target.value)}
                  placeholder="Enter tester name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {currentUser?.username && (
                  <button
                    type="button"
                    onClick={handleQuickFillTester}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Use current user: {currentUser.username}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Scenario Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Scenario Details</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <strong>Path ID:</strong> {scenario?.path_id || "N/A"}
              </div>
              <div>
                <strong>File ID:</strong> {fileId || "N/A"}
              </div>
              {includeTesterName && testerName && (
                <div>
                  <strong>Tester:</strong> {testerName}
                </div>
              )}
            </div>
          </div>

          {/* Download Progress */}
          {isDownloading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-700 font-medium">
                  Preparing {selectedFormat.toUpperCase()} file...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            disabled={isDownloading}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading || (includeTesterName && !testerName.trim())}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? "Downloading..." : "Download"}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}