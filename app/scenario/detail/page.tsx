"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Download, Save } from "lucide-react"
import Link from "next/link"

export default function BPMNWorkflow() {
  const [activeTab, setActiveTab] = useState("Alur Skenario")
  const [description, setDescription] = useState(
    `Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type. It was popularised in the 1960s with the release of Letraset sheets containing Lorem ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem ipsum.`,
  )

  const tabs = ["Upload BPMN", "Alur Skenario", "History BPMN"]

  const actionItems = [
    "Shipment Needed",
    "Order 3 Offers",
    "Choose Offering",
    "Preparing for pick up by logistic company",
    "Shipment prepared",
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="flex items-center px-6 py-4">
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
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 border-b-2 transition-colors ${
                    activeTab === tab ? "font-medium text-white" : "border-transparent text-gray-600"
                  }`}
                  style={activeTab === tab ? { borderColor: "#2185D5", color: "#2185D5" } : {}}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab) {
                      e.target.style.color = "#5CC2F2"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab) {
                      e.target.style.color = "#6b7280"
                    }
                  }}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto p-6 bg-white">
        {/* Back Button */}
        <Link href="/scenario">
          <Button
            variant="ghost"
            className="flex items-center space-x-2 text-gray-600 p-0 mb-6 transition-colors"
            style={{ color: "inherit" }}
            onMouseEnter={(e) => (e.target.style.color = "#5CC2F2")}
            onMouseLeave={(e) => (e.target.style.color = "inherit")}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
        </Link>

        <div className="space-y-6">
          {/* BPMN Path */}
          <div>
            <Label htmlFor="bpmn-path" className="text-sm font-medium text-gray-700 mb-2 block">
              BPMN Path
            </Label>
            <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50 min-h-[400px] flex items-center justify-center">
              {/* BPMN Diagram SVG with Highlighted Path */}
              <svg viewBox="0 0 700 300" className="w-full h-full max-w-2xl" xmlns="http://www.w3.org/2000/svg">
                {/* Background grid */}
                <defs>
                  <pattern id="grid" width="15" height="15" patternUnits="userSpaceOnUse">
                    <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#f0f0f0" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Start Event - Highlighted */}
                <circle cx="60" cy="150" r="12" fill="#22c55e" stroke="#16a34a" strokeWidth="3" />
                <text x="60" y="175" textAnchor="middle" fontSize="9" fill="#666">
                  Start Event
                </text>

                {/* Login Task - Highlighted */}
                <rect x="110" y="130" width="70" height="35" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
                <text x="145" y="152" textAnchor="middle" fontSize="9" fill="#333">
                  Login Task
                </text>

                {/* Gateway */}
                <polygon points="220,150 235,135 250,150 235,165" fill="none" stroke="#333" strokeWidth="2" />

                {/* Verification Task - Highlighted */}
                <rect x="280" y="130" width="70" height="35" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
                <text x="315" y="152" textAnchor="middle" fontSize="9" fill="#333">
                  Verify OTP
                </text>

                {/* Another Gateway */}
                <polygon points="390,150 405,135 420,150 405,165" fill="none" stroke="#333" strokeWidth="2" />

                {/* Process Task - Highlighted */}
                <rect x="450" y="130" width="70" height="35" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
                <text x="485" y="152" textAnchor="middle" fontSize="9" fill="#333">
                  Process Order
                </text>

                {/* End Event - Highlighted */}
                <circle cx="580" cy="150" r="12" fill="#22c55e" stroke="#16a34a" strokeWidth="4" />
                <text x="580" y="175" textAnchor="middle" fontSize="9" fill="#666">
                  End Event
                </text>

                {/* Alternative path (not highlighted) */}
                <rect x="280" y="190" width="70" height="35" rx="4" fill="none" stroke="#ccc" strokeWidth="1" />
                <text x="315" y="212" textAnchor="middle" fontSize="9" fill="#999">
                  Error Handler
                </text>

                {/* Highlighted Path Arrows */}
                <path d="M 72 150 L 110 150" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#highlightArrow)" />
                <path d="M 180 150 L 220 150" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#highlightArrow)" />
                <path d="M 250 150 L 280 150" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#highlightArrow)" />
                <path d="M 350 150 L 390 150" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#highlightArrow)" />
                <path d="M 420 150 L 450 150" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#highlightArrow)" />
                <path d="M 520 150 L 568 150" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#highlightArrow)" />

                {/* Regular arrows */}
                <path d="M 235 165 L 315 190" stroke="#ccc" strokeWidth="2" markerEnd="url(#regularArrow)" />
                <path d="M 350 207 L 405 165" stroke="#ccc" strokeWidth="2" markerEnd="url(#regularArrow)" />

                {/* Arrow marker definitions */}
                <defs>
                  <marker id="highlightArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
                  </marker>
                  <marker id="regularArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#ccc" />
                  </marker>
                </defs>

                {/* Swim lanes */}
                <line x1="40" y1="100" x2="40" y2="250" stroke="#ddd" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="40" y1="250" x2="620" y2="250" stroke="#ddd" strokeWidth="1" strokeDasharray="3,3" />

                {/* Lane labels */}
                <text x="20" y="175" textAnchor="middle" fontSize="8" fill="#999" transform="rotate(-90, 20, 175)">
                  User Process
                </text>
                <text x="20" y="270" textAnchor="middle" fontSize="8" fill="#999" transform="rotate(-90, 20, 270)">
                  System Process
                </text>
              </svg>
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 gap-12 items-start">
            <div className="col-span-1">
              <Label className="text-sm font-medium text-gray-500">Deskripsi Skenario</Label>
            </div>
            <div className="col-span-3">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] text-sm border-none p-0 resize-none bg-transparent"
                readOnly
              />
            </div>
          </div>

          {/* Action Performed */}
          <div className="grid grid-cols-4 gap-12 items-start">
            <div className="col-span-1">
              <Label className="text-sm font-medium text-gray-500">Action Performed</Label>
            </div>
            <div className="col-span-3">
              <div className="text-sm text-gray-600 space-y-1">
                {actionItems.map((item, index) => (
                  <div key={index} className="flex">
                    <span className="mr-2">{index + 1}.</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data Pengujian */}
          <div className="grid grid-cols-4 gap-12 items-start">
            <div className="col-span-1">
              <Label className="text-sm font-medium text-gray-500">Data Pengujian</Label>
            </div>
            <div className="col-span-3">
              <div className="text-sm text-gray-600 space-y-1 mb-3">
                <div className="flex">
                  <span className="mr-2">1.</span>
                  <span>Order id: 12312312</span>
                </div>
                <div className="flex">
                  <span className="mr-2">2.</span>
                  <span>shipment: cuzfreight</span>
                </div>
                <div className="flex">
                  <span className="mr-2">3.</span>
                  <span>destination: jalan kemana</span>
                </div>
              </div>
              <Button
                className="text-white text-sm px-4 py-2 transition-colors"
                style={{ backgroundColor: "#2185D5" }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
              >
                Tambah Data Uji
              </Button>
            </div>
          </div>

          {/* Expected Result */}
          <div className="grid grid-cols-4 gap-12 items-start">
            <div className="col-span-1">
              <Label className="text-sm font-medium text-gray-500">Expected Result</Label>
            </div>
            <div className="col-span-3">
              <Input id="expected-result" placeholder="Pesanan berhasil dikirim" className="text-sm" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              className="flex items-center space-x-2 text-sm text-white border-0 transition-colors"
              style={{ backgroundColor: "#2185D5" }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </Button>
            <Button
              className="flex items-center space-x-2 text-white text-sm transition-colors"
              style={{ backgroundColor: "#2185D5" }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#1D5D9B")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#2185D5")}
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
