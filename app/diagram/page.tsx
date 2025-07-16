import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function BPMNDiagramView() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-black rounded flex items-center justify-center">
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
                <Link href="/" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                  Upload BPMN
                </Link>
                <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md">
                  Atur Skenario
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                  History BPMN
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* BPMN Diagram Container */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8 shadow-sm">
          <div className="w-full h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden">
            {/* BPMN Diagram SVG */}
            <svg viewBox="0 0 800 400" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Background grid */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Start Event */}
              <circle cx="80" cy="120" r="15" fill="none" stroke="#333" strokeWidth="2" />
              <text x="80" y="145" textAnchor="middle" fontSize="10" fill="#666">
                Start Process
              </text>

              {/* First Task */}
              <rect x="140" y="100" width="80" height="40" rx="5" fill="none" stroke="#333" strokeWidth="2" />
              <text x="180" y="125" textAnchor="middle" fontSize="10" fill="#333">
                Verify Customer Data
              </text>

              {/* Gateway */}
              <polygon points="280,120 300,100 320,120 300,140" fill="none" stroke="#333" strokeWidth="2" />
              <text x="300" y="155" textAnchor="middle" fontSize="10" fill="#666">
                Gateway
              </text>

              {/* Second Task */}
              <rect x="360" y="80" width="80" height="40" rx="5" fill="none" stroke="#333" strokeWidth="2" />
              <text x="400" y="105" textAnchor="middle" fontSize="10" fill="#333">
                Process Order
              </text>

              {/* Third Task */}
              <rect x="360" y="140" width="80" height="40" rx="5" fill="none" stroke="#333" strokeWidth="2" />
              <text x="400" y="165" textAnchor="middle" fontSize="10" fill="#333">
                Send Notification
              </text>

              {/* Another Gateway */}
              <polygon points="500,120 520,100 540,120 520,140" fill="none" stroke="#333" strokeWidth="2" />

              {/* Final Task */}
              <rect x="580" y="100" width="80" height="40" rx="5" fill="none" stroke="#333" strokeWidth="2" />
              <text x="620" y="125" textAnchor="middle" fontSize="10" fill="#333">
                Complete Process
              </text>

              {/* End Event */}
              <circle cx="720" cy="120" r="15" fill="none" stroke="#333" strokeWidth="3" />
              <text x="720" y="145" textAnchor="middle" fontSize="10" fill="#666">
                End Process
              </text>

              {/* Arrows/Flow */}
              <path d="M 95 120 L 140 120" stroke="#333" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 220 120 L 280 120" stroke="#333" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 320 110 L 360 100" stroke="#333" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 320 130 L 360 160" stroke="#333" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 440 100 L 500 110" stroke="#333" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 440 160 L 500 130" stroke="#333" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 540 120 L 580 120" stroke="#333" strokeWidth="2" markerEnd="url(#arrowhead)" />
              <path d="M 660 120 L 705 120" stroke="#333" strokeWidth="2" markerEnd="url(#arrowhead)" />

              {/* Arrow marker definition */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
                </marker>
              </defs>

              {/* Swim lanes */}
              <line x1="60" y1="60" x2="60" y2="180" stroke="#ddd" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="60" y1="180" x2="750" y2="180" stroke="#ddd" strokeWidth="1" strokeDasharray="5,5" />

              {/* Lane labels */}
              <text x="30" y="120" textAnchor="middle" fontSize="10" fill="#999" transform="rotate(-90, 30, 120)">
                Customer Service
              </text>
              <text x="30" y="240" textAnchor="middle" fontSize="10" fill="#999" transform="rotate(-90, 30, 240)">
                Backend System
              </text>
            </svg>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <Link href="/scenario">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white px-12 py-3 text-lg font-medium rounded-lg">
              Generate BPMN
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
