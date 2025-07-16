"use client"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function BPMNScenarioView() {
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
                  <div className="text-white font-bold text-xs">
                    <div className="transform rotate-45 w-3 h-3 bg-white"></div>
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
                <button
                  className="px-4 py-2 text-sm font-medium text-white rounded-md"
                  style={{ backgroundColor: "#2185D5" }}
                >
                  Atur Skenario
                </button>
                <Link
                  href="/history"
                  className="px-4 py-2 text-sm font-medium text-gray-600 transition-colors"
                  style={{ color: "inherit" }}
                  onMouseEnter={(e) => (e.target.style.color = "#5CC2F2")}
                  onMouseLeave={(e) => (e.target.style.color = "inherit")}
                >
                  History BPMN
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* BPMN Diagram Container */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="w-full h-80 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center relative overflow-hidden">
            {/* BPMN Diagram SVG with Highlighted Path */}
            <svg viewBox="0 0 800 320" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Background grid */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Start Event - Highlighted */}
              <circle cx="80" cy="160" r="15" fill="#22c55e" stroke="#16a34a" strokeWidth="3" />
              <text x="80" y="185" textAnchor="middle" fontSize="10" fill="#666">
                Start Event
              </text>

              {/* Login Task - Highlighted */}
              <rect x="140" y="140" width="80" height="40" rx="5" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
              <text x="180" y="165" textAnchor="middle" fontSize="10" fill="#333">
                Login Task
              </text>

              {/* Gateway */}
              <polygon points="280,160 300,140 320,160 300,180" fill="none" stroke="#333" strokeWidth="2" />

              {/* Verification Task - Highlighted */}
              <rect x="360" y="140" width="80" height="40" rx="5" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
              <text x="400" y="165" textAnchor="middle" fontSize="10" fill="#333">
                VerifikasiOTP
              </text>

              {/* Another Gateway */}
              <polygon points="500,160 520,140 540,160 520,180" fill="none" stroke="#333" strokeWidth="2" />

              {/* End Event - Highlighted */}
              <circle cx="600" cy="160" r="15" fill="#22c55e" stroke="#16a34a" strokeWidth="4" />
              <text x="600" y="185" textAnchor="middle" fontSize="10" fill="#666">
                End Event
              </text>

              {/* Alternative paths (not highlighted) */}
              <rect x="360" y="200" width="80" height="40" rx="5" fill="none" stroke="#ccc" strokeWidth="1" />
              <text x="400" y="225" textAnchor="middle" fontSize="10" fill="#999">
                Alternative Task
              </text>

              {/* Highlighted Path Arrows */}
              <path d="M 95 160 L 140 160" stroke="#f59e0b" strokeWidth="4" markerEnd="url(#highlightArrow)" />
              <path d="M 220 160 L 280 160" stroke="#f59e0b" strokeWidth="4" markerEnd="url(#highlightArrow)" />
              <path d="M 320 160 L 360 160" stroke="#f59e0b" strokeWidth="4" markerEnd="url(#highlightArrow)" />
              <path d="M 440 160 L 500 160" stroke="#f59e0b" strokeWidth="4" markerEnd="url(#highlightArrow)" />
              <path d="M 540 160 L 585 160" stroke="#f59e0b" strokeWidth="4" markerEnd="url(#highlightArrow)" />

              {/* Regular arrows */}
              <path d="M 320 170 L 360 210" stroke="#ccc" strokeWidth="2" markerEnd="url(#regularArrow)" />
              <path d="M 440 220 L 500 170" stroke="#ccc" strokeWidth="2" markerEnd="url(#regularArrow)" />

              {/* Arrow marker definitions */}
              <defs>
                <marker id="highlightArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
                </marker>
                <marker id="regularArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ccc" />
                </marker>
              </defs>

              {/* Swim lanes */}
              <line x1="60" y1="100" x2="60" y2="280" stroke="#ddd" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="60" y1="280" x2="720" y2="280" stroke="#ddd" strokeWidth="1" strokeDasharray="5,5" />

              {/* Lane labels */}
              <text x="30" y="190" textAnchor="middle" fontSize="10" fill="#999" transform="rotate(-90, 30, 190)">
                User Interface
              </text>
              <text x="30" y="300" textAnchor="middle" fontSize="10" fill="#999" transform="rotate(-90, 30, 300)">
                Backend Process
              </text>
            </svg>
          </div>
        </div>

        {/* Path Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 mb-1">Path id : 001</div>
              <div className="text-sm text-gray-600">StartEvent → LoginTask → VerifikasiOTP → EndEvent</div>
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <Button
            variant="outline"
            className="flex-1 text-white border-0 transition-colors"
            style={{ backgroundColor: "#2185D5" }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
          >
            Reset Highlight
          </Button>
          <Button
            className="flex-1 text-white transition-colors"
            style={{ backgroundColor: "#2185D5" }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
          >
            Download Skenario
          </Button>
        </div>

        {/* Scenario Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-medium">Path Id</TableHead>
                <TableHead className="font-medium">Skenario Overview</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">001</TableCell>
                <TableCell className="max-w-md">
                  Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                </TableCell>
                <TableCell>
                  <span className="text-green-600 font-medium">Pesanan Berhasil</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href="/scenario/detail">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-0 text-white transition-colors"
                        style={{ backgroundColor: "#2185D5" }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
                      >
                        View Detail
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="text-white transition-colors"
                      style={{ backgroundColor: "#2185D5" }}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
                    >
                      Download Path
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">002</TableCell>
                <TableCell className="max-w-md">
                  Lorem Ipsum is simply dummy text of the printing and typesetting industry.ry.
                </TableCell>
                <TableCell>
                  <span className="text-red-600 font-medium">Pesanan Gagal</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href="/scenario/detail">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-0 text-white transition-colors"
                        style={{ backgroundColor: "#2185D5" }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
                      >
                        View Detail
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="text-white transition-colors"
                      style={{ backgroundColor: "#2185D5" }}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
                    >
                      Download Path
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  )
}
