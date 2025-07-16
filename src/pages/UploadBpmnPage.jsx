"use client"

import { useLocation, useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import Button from "../components/ui/Button"
import BpmnViewer from "bpmn-js/lib/NavigatedViewer"

export default function UploadBpmnPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)
  const viewerRef = useRef(null)

  useEffect(() => {
    const result = location.state?.result
    if (!result) {
      navigate("/")
      return
    }

    setData(result)

    const initViewer = async () => {
      if (!containerRef.current || !result.bpmnXml) return

      if (!viewerRef.current) {
        viewerRef.current = new BpmnViewer({
          container: containerRef.current,
        })
      }

      try {
        await viewerRef.current.importXML(result.bpmnXml)
        const canvas = viewerRef.current.get("canvas")
        canvas.zoom("fit-viewport")
      } catch (error) {
        console.error("❌ Gagal render diagram:", error)
      }
    }

    setTimeout(() => {
      initViewer()
    }, 100)
  }, [location.state, navigate])

  const handleGenerate = async () => {
    if (!data?.id) return
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:8080/api/bpmn/files/${data.id}/generateScenario`, {
        method: "POST",
      })

      if (!res.ok) throw new Error("Gagal generate skenario")

      navigate("/scenario", { state: { fileId: data.id } })
    } catch (err) {
      console.error("❌ Error generate skenario:", err)
      alert("Gagal generate skenario. Coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-start h-16">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: "#2185D5" }}>
                  <span className="text-white font-bold text-sm">BT</span>
                </div>
                <span className="font-semibold text-gray-900">BLUE TECH</span>
              </div>
              <nav className="flex space-x-4">
                <span className="px-4 py-2 text-sm font-medium text-white rounded-md" style={{ backgroundColor: "#2185D5" }}>
                  Upload BPMN
                </span>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {data ? (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-center">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">📄 {data.fileName}</h2>
              <div ref={containerRef} className="w-full h-[500px] border rounded-xl bg-white overflow-hidden" />
            </div>

            <div className="flex justify-center">
              <Button
                className="text-white px-10 py-3 text-md font-medium rounded-xl transition-colors"
                style={{ backgroundColor: "#2185D5" }}
                onClick={handleGenerate}
                disabled={loading}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1D5D9B")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2185D5")}
              >
                {loading ? "Generating..." : "Generate BPMN"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center">Memuat data BPMN...</p>
        )}
      </main>
    </div>
  )
}
