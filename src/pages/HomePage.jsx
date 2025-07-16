"use client"

import { Upload } from "lucide-react"
import { useRef, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import axios from "axios"
import Button from "../components/ui/Button"

export default function HomePage() {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  const handleUploadClick = () => {
    fileInputRef.current.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".bpmn")) {
      alert("⚠️ Please select a valid BPMN file (.bpmn)")
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      alert("⚠️ File size exceeds 5MB limit")
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    setUploading(true)

    try {
      const res = await axios.post("http://localhost:8080/api/bpmn/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      if (res.data && res.data.fileName) {
        navigate("/upload-bpmn", { state: { result: res.data } })
      } else {
        alert("⚠️ Upload berhasil tapi tidak menerima data yang diharapkan.")
        console.log("Respon:", res.data)
      }
    } catch (err) {
      alert("❌ Gagal upload: " + err.message)
      console.error("Upload error:", err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
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
                <div
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md"
                  style={{ backgroundColor: "#2185D5" }}
                >
                  Upload BPMN
                </div>
                <Link
                  to="/scenario"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#5CC2F2")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
                >
                  Alur Skenario
                </Link>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl p-16 shadow-lg min-h-[700px]" style={{ backgroundColor: "#E5E5E5" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto h-full">
            {/* Upload Section */}
            <div className="flex justify-center items-center h-full">
              <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 w-full max-w-md">
                <div className="text-center space-y-8">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".bpmn"
                    style={{ display: "none" }}
                  />

                  <Button
                    className="text-white px-12 py-4 text-lg font-medium w-full transition-colors"
                    style={{
                      backgroundColor: uploading ? "#A0AEC0" : "#2185D5",
                      borderRadius: "8px",
                    }}
                    onClick={handleUploadClick}
                    disabled={uploading}
                    onMouseEnter={(e) => {
                      if (!uploading) e.currentTarget.style.backgroundColor = "#1D5D9B"
                    }}
                    onMouseLeave={(e) => {
                      if (!uploading) e.currentTarget.style.backgroundColor = "#2185D5"
                    }}
                  >
                    <Upload className="w-5 h-5 mr-3" />
                    {uploading ? "Uploading..." : "Upload BPMN"}
                  </Button>

                  <p className="text-base text-gray-400 leading-relaxed">
                    Click to upload BPMN
                    <br />
                    file (5 mb max)
                  </p>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col justify-center space-y-10 h-full">
              <div className="text-center space-y-6">
                <h1 className="text-5xl font-bold text-gray-700 leading-tight">BPMN GENERATOR</h1>
                <p className="text-gray-400 text-xl leading-relaxed">
                  Automate test generation from your Business
                  <br />
                  process models
                </p>
              </div>

              <div className="flex justify-center">
                <div className="rounded-2xl overflow-hidden shadow-lg w-full max-w-lg">
                  <img
                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop&crop=center"
                    alt="Business team collaborating"
                    className="w-full h-auto object-cover"
                    style={{ height: "300px" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
