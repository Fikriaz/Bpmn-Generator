"use client"

import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function BPMNGenerator() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div
                  className="w-8 h-8 rounded flex items-center justify-center"
                  style={{ backgroundColor: "#2185D5" }}
                >
                  <span className="text-white font-bold text-sm">BT</span>
                </div>
                <span className="font-semibold text-gray-900">BLUE TECH</span>
              </div>

              <nav className="flex space-x-8">
                <button
                  className="px-4 py-2 text-sm font-medium text-white rounded-md"
                  style={{ backgroundColor: "#2185D5" }}
                >
                  Upload BPMN
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  style={{ color: "inherit" }}
                  onMouseEnter={(e) => (e.target.style.color = "#5CC2F2")}
                  onMouseLeave={(e) => (e.target.style.color = "inherit")}
                >
                  Run Standards
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  style={{ color: "inherit" }}
                  onMouseEnter={(e) => (e.target.style.color = "#5CC2F2")}
                  onMouseLeave={(e) => (e.target.style.color = "inherit")}
                >
                  History BPMN
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Gray Background Shape Container */}
        <div className="rounded-3xl p-16 shadow-lg" style={{ backgroundColor: "#E7E7E7" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
            {/* Left Column - Short Upload Card */}
            <div className="flex flex-col">
              {/* Title positioned above upload card */}
              <div className="text-left space-y-3 mb-8">
                <h1 className="text-5xl font-bold text-gray-800">BPMN GENERATOR</h1>
                <p className="text-gray-500 text-lg max-w-lg">
                  Automate test generation from your Business process models
                </p>
              </div>

              {/* Short Upload Card aligned with subtitle */}
              <div className="flex justify-start">
                <div className="bg-white rounded-[39px] p-8 shadow-sm border border-gray-100 w-full max-w-sm">
                  <div className="text-center space-y-4">
                    <Link href="/clean-diagram">
                      <Button
                        className="text-white px-8 py-3 text-base font-medium rounded-full w-full transition-colors"
                        style={{ backgroundColor: "#2185D5" }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        Upload BPMN
                      </Button>
                    </Link>

                    <p className="text-sm text-gray-400">
                      click button to Upload BPMN
                      <br />
                      file (5 mb max)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Wide Image */}
            <div className="flex justify-center items-center h-full">
              <div className="rounded-2xl overflow-hidden shadow-lg w-full">
                <Image
                  src="/placeholder.svg?height=280&width=600"
                  alt="Business team collaborating in a meeting room with presentation screens"
                  width={600}
                  height={280}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
