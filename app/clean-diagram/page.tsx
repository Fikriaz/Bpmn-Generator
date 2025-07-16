"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CleanBPMNDiagram() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                  href="/"
                  className="px-4 py-2 text-sm font-medium text-gray-600 transition-colors"
                  style={{ color: "inherit" }}
                  onMouseEnter={(e) => (e.target.style.color = "#5CC2F2")}
                  onMouseLeave={(e) => (e.target.style.color = "inherit")}
                >
                  Upload BPMN
                </Link>
                <Link
                  href="/scenario"
                  className="px-4 py-2 text-sm font-medium text-gray-600 transition-colors"
                  style={{ color: "inherit" }}
                  onMouseEnter={(e) => (e.target.style.color = "#5CC2F2")}
                  onMouseLeave={(e) => (e.target.style.color = "inherit")}
                >
                  Atur Skenario
                </Link>
                <button
                  className="px-4 py-2 text-sm font-medium text-white rounded-md"
                  style={{ backgroundColor: "#2185D5" }}
                >
                  History BPMN
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* BPMN Diagram Container */}
        <div className="bg-white rounded-3xl border border-gray-200 p-8 mb-8 shadow-sm">
          <div className="w-full h-96 bg-white rounded-2xl border border-gray-300 flex items-center justify-center relative overflow-hidden">
            {/* Clean BPMN Diagram SVG */}
            <svg viewBox="0 0 900 400" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Background */}
              <rect width="100%" height="100%" fill="white" />

              {/* Swim Lane Dividers */}
              <line x1="80" y1="50" x2="80" y2="350" stroke="#e5e7eb" strokeWidth="1" />
              <line x1="80" y1="150" x2="820" y2="150" stroke="#e5e7eb" strokeWidth="1" />
              <line x1="80" y1="250" x2="820" y2="250" stroke="#e5e7eb" strokeWidth="1" />

              {/* Lane Labels */}
              <text x="40" y="100" textAnchor="middle" fontSize="12" fill="#6b7280" transform="rotate(-90, 40, 100)">
                User Interface
              </text>
              <text x="40" y="200" textAnchor="middle" fontSize="12" fill="#6b7280" transform="rotate(-90, 40, 200)">
                Business Logic
              </text>
              <text x="40" y="300" textAnchor="middle" fontSize="12" fill="#6b7280" transform="rotate(-90, 40, 300)">
                Data Processing
              </text>

              {/* Start Event */}
              <circle cx="130" cy="100" r="12" fill="none" stroke="#374151" strokeWidth="2" />
              <text x="130" y="125" textAnchor="middle" fontSize="10" fill="#6b7280">
                Start Process
              </text>

              {/* First Task */}
              <rect x="180" y="80" width="90" height="40" rx="5" fill="none" stroke="#374151" strokeWidth="2" />
              <text x="225" y="105" textAnchor="middle" fontSize="11" fill="#374151">
                User Login
              </text>

              {/* First Gateway */}
              <polygon points="310,100 330,80 350,100 330,120" fill="none" stroke="#374151" strokeWidth="2" />

              {/* Validation Task */}
              <rect x="380" y="80" width="90" height="40" rx="5" fill="none" stroke="#374151" strokeWidth="2" />
              <text x="425" y="105" textAnchor="middle" fontSize="11" fill="#374151">
                Validate Data
              </text>

              {/* Second Gateway */}
              <polygon points="510,100 530,80 550,100 530,120" fill="none" stroke="#374151" strokeWidth="2" />

              {/* Process Order Task */}
              <rect x="380" y="180" width="90" height="40" rx="5" fill="none" stroke="#374151" strokeWidth="2" />
              <text x="425" y="205" textAnchor="middle" fontSize="11" fill="#374151">
                Process Order
              </text>

              {/* Third Gateway */}
              <polygon points="510,200 530,180 550,200 530,220" fill="none" stroke="#374151" strokeWidth="2" />

              {/* Database Task */}
              <rect x="280" y="280" width="90" height="40" rx="5" fill="none" stroke="#374151" strokeWidth="2" />
              <text x="325" y="305" textAnchor="middle" fontSize="11" fill="#374151">
                Save Data
              </text>

              {/* Final Task */}
              <rect x="580" y="180" width="90" height="40" rx="5" fill="none" stroke="#374151" strokeWidth="2" />
              <text x="625" y="205" textAnchor="middle" fontSize="11" fill="#374151">
                Send Response
              </text>

              {/* End Event */}
              <circle cx="720" cy="200" r="12" fill="none" stroke="#374151" strokeWidth="3" />
              <text x="720" y="225" textAnchor="middle" fontSize="10" fill="#6b7280">
                End Process
              </text>

              {/* Flow Arrows */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
                </marker>
              </defs>

              {/* Connecting Lines */}
              <path d="M 142 100 L 180 100" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 270 100 L 310 100" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 350 100 L 380 100" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 470 100 L 510 100" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 530 120 L 425 180" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 470 200 L 510 200" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 425 220 L 325 280" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 550 200 L 580 200" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 670 200 L 708 200" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 370 300 L 580 220" stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
            </svg>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <Link href="/scenario">
            <Button
              className="text-white px-16 py-4 text-lg font-medium rounded-xl transition-colors"
              style={{ backgroundColor: "#2185D5" }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
            >
              Generate BPMN
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
