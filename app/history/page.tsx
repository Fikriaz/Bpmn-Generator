"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

export default function HistoryBPMN() {
  const processGroups = [
    {
      date: "Today 16 mei 2025",
      processes: ["Proses Pengolahan Data", "Penyimpanan Data", "Validasi Proses", "Proses Masukan"],
    },
    {
      date: "Yesterday 15 mei 2025",
      processes: ["Penyimpanan Data", "Validasi Proses", "Proses Masukan", "Proses Ekspor"],
    },
    {
      date: "Last Week",
      processes: ["Alur Proses Data", "Proses Simulasi"],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded flex items-center justify-center" style={{ backgroundColor: "#2185D5" }}>
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
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-6">
          <div className="space-y-2">
            <Link
              href="/"
              className="block px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
              style={{ color: "inherit" }}
              onMouseEnter={(e) => (e.target.style.color = "#5CC2F2")}
              onMouseLeave={(e) => (e.target.style.color = "inherit")}
            >
              Upload BPMN
            </Link>
            <Link
              href="/scenario"
              className="block px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors"
              style={{ color: "inherit" }}
              onMouseEnter={(e) => (e.target.style.color = "#5CC2F2")}
              onMouseLeave={(e) => (e.target.style.color = "inherit")}
            >
              Alur Skenario
            </Link>
            <div className="px-4 py-3 text-red-600 bg-red-50 rounded-lg font-medium border-l-4 border-red-600">
              History BPMN
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">History BPMN</h1>
            <Button
              className="text-white transition-colors"
              style={{ backgroundColor: "#2185D5" }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
            >
              Delete
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 py-8">
          {/* Back Button */}
          <div className="mb-8">
            <Link href="/scenario">
              <Button
                variant="ghost"
                className="flex items-center space-x-2 text-gray-600 transition-colors"
                style={{ color: "inherit" }}
                onMouseEnter={(e) => (e.target.style.color = "#5CC2F2")}
                onMouseLeave={(e) => (e.target.style.color = "inherit")}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
            </Link>
          </div>

          {/* Process History Groups */}
          <div className="max-w-4xl space-y-8">
            {processGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-4">
                <h3 className="text-gray-500 font-medium text-sm">{group.date}</h3>

                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <div className="space-y-4">
                    {group.processes.map((process, processIndex) => (
                      <div key={processIndex} className="flex items-center space-x-3">
                        <Checkbox id={`${groupIndex}-${processIndex}`} />
                        <label
                          htmlFor={`${groupIndex}-${processIndex}`}
                          className="text-gray-700 font-medium cursor-pointer flex-1"
                        >
                          {process}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
