"use client"

import { Upload } from "lucide-react"
import { useRef, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import Button from "../components/ui/Button"
import UserMenu from "../components/ui/UserMenu"
import { authFetch, API_BASE } from "../utils/auth"

export default function HomePage() {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

 const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".bpmn")) {
      alert("⚠️ Please select a valid BPMN file (.bpmn)")
      e.target.value = ""
      return
    }
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      alert("⚠️ File size exceeds 5MB limit")
      e.target.value = ""
      return
    }

    // ===== TAMBAH DEBUG LOG =====
    const token = localStorage.getItem('authToken')
    console.log('=== UPLOAD DEBUG ===')
    console.log('Token exists:', !!token)
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'NONE')
    console.log('File:', file.name)
    // ===========================

    const formData = new FormData()
    formData.append("file", file)

    setUploading(true)
    try {
      const resp = await authFetch(`${API_BASE}/api/bpmn/upload`, {
        method: "POST",
        body: formData,
      }, { onUnauthorizedRedirectTo: "/login" })

      console.log('Response status:', resp.status) // TAMBAH INI

      if (resp.status === 401) return

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err?.error || err?.message || `Upload failed (HTTP ${resp.status})`)
      }
      const data = await resp.json()
      if (data && data.fileName) {
        navigate("/upload-bpmn", { state: { result: data } })
      } else {
        alert("⚠️ Upload berhasil, tetapi respons tidak sesuai ekspektasi.")
        console.log("Response:", data)
      }
    } catch (err) {
      alert("❌ Gagal upload: " + (err?.message || "Unknown error"))
      console.error("Upload error:", err)
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ""
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
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#2185D5" }}
                >
                  <div className="text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="font-bold text-gray-900">BPMN TESTING</div>
                  <div className="text-xs text-gray-500">Automation</div>
                </div>
              </div>
              <nav className="flex space-x-8">
                <div
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                  style={{ backgroundColor: "#2185D5" }}
                >
                  Upload BPMN
                </div>
                <Link
                  to="/scenario"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-500 transition-colors rounded-lg hover:bg-gray-100"
                >
                  Flow Test
                </Link>
                <Link
                  to="/history"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-500 transition-colors rounded-lg hover:bg-gray-100"
                >
                  History BPMN
                </Link>
              </nav>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl p-16 shadow-lg min-h-[700px]" style={{ backgroundColor: "#E5E5E5" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto h-full">
            <div className="flex justify-center items-center h-full">
              <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 w-full max-w-md">
                <div className="text-center space-y-8">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".bpmn"
                    className="hidden"
                  />
                  <Button
                    className="text-white px-12 py-4 text-lg font-medium w-full transition-colors rounded-xl border-2"
                    style={{
                      backgroundColor: uploading ? "#A0AEC0" : "#2185D5",
                      borderColor: uploading ? "#A0AEC0" : "#2185D5",
                    }}
                    onClick={handleUploadClick}
                    disabled={uploading}
                    onMouseEnter={(e) => {
                      if (!uploading) {
                        e.currentTarget.style.backgroundColor = "#1D5D9B"
                        e.currentTarget.style.borderColor = "#1D5D9B"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!uploading) {
                        e.currentTarget.style.backgroundColor = "#2185D5"
                        e.currentTarget.style.borderColor = "#2185D5"
                      }
                    }}
                  >
                    <Upload className="w-5 h-5 mr-3" />
                    {uploading ? "Uploading..." : "Upload BPMN"}
                  </Button>
                  <p className="text-base text-gray-400 leading-relaxed">
                    Click to upload BPMN
                    <br />file (5 MB max)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-10 h-full">
              <div className="text-center space-y-6">
                <h1 className="text-5xl font-bold text-gray-700 leading-tight">BPMN TESTING SCENARIO</h1>
                <p className="text-gray-400 text-xl leading-relaxed">
                  Create testing automation from your Business
                  <br />process models
                </p>
              </div>
              <div className="flex justify-center">
                <div className="rounded-2xl overflow-hidden shadow-lg w-full max-w-lg border border-gray-200">
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
