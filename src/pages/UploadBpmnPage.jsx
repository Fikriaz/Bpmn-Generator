"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Button from "../components/ui/Button";
import BpmnViewer from "bpmn-js/lib/NavigatedViewer";
import { API_BASE, authFetch } from "../utils/auth";

export default function UploadBpmnPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState(null);

  // Loading overlay states
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("");

  // BPMN viewer
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  // timers
  const progressTimerRef = useRef(null);
  const minDisplayTimerRef = useRef(null);

  useEffect(() => {
    const result = location.state?.result;
    if (!result) {
      navigate("/");
      return;
    }
    setData(result);

    const initViewer = async () => {
      if (!containerRef.current || !result.bpmnXml) return;

      if (!viewerRef.current) {
        viewerRef.current = new BpmnViewer({ container: containerRef.current });
      }

      try {
        await viewerRef.current.importXML(result.bpmnXml);
        const canvas = viewerRef.current.get("canvas");
        canvas.zoom("fit-viewport");
      } catch (error) {
        console.error("❌ Gagal render diagram:", error);
      }
    };

    const t = setTimeout(initViewer, 100);
    return () => clearTimeout(t);
  }, [location.state, navigate]);

  // --- Progress simulation: stop at 90% until backend selesai ---
  const startProgressUntil90 = () => {
    // naik pelan sampai 90, lalu hold
    setProgress(0);
    setLoadingText("Menganalisis diagram BPMN...");
    const started = Date.now();

    progressTimerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p < 30) {
          setLoadingText("Memetakan alur proses...");
          return Math.min(p + 2, 30);
        }
        if (p < 55) {
          setLoadingText("Mengidentifikasi path eksekusi...");
          return Math.min(p + 2, 55);
        }
        if (p < 75) {
          setLoadingText("Mengenerate skenario testing...");
          return Math.min(p + 2, 75);
        }
        if (p < 90) {
          setLoadingText("Memvalidasi hasil...");
          return Math.min(p + 1, 90);
        }
        // tahan di 90 sambil nunggu backend/LLM
        return 90;
      });
    }, 200);

    // jaga overlay tampil minimal 2.5s biar nggak “kedip”
    minDisplayTimerRef.current = setTimeout(() => {}, 2500);
  };

  const clearProgressTimers = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (minDisplayTimerRef.current) clearTimeout(minDisplayTimerRef.current);
    progressTimerRef.current = null;
    minDisplayTimerRef.current = null;
  };

  const handleGenerate = async () => {
    if (!data?.id) return;
    setLoading(true);
    startProgressUntil90();

    try {
      const response = await authFetch(
        `${API_BASE}/api/bpmn/files/${data.id}/generateScenario`,
        { method: "POST" },
        { onUnauthorizedRedirectTo: "/login" }
      );

      if (!response.ok) throw new Error("Gagal generate skenario");

      // dorong dari 90 -> 100 dengan teks finalisasi & navigasi
      setLoadingText("Memfinalisasi hasil...");
      setProgress(95);

      // kasih sedikit transisi agar terasa natural
      setTimeout(() => {
        setProgress(100);
        setLoadingText("Navigasi ke halaman skenario...");

        // pastikan overlay tampil minimal sebentar
        setTimeout(() => {
          clearProgressTimers();
          navigate(`/scenario?fileId=${data.id}`, {
            replace: true,
            state: { fileId: data.id },
          });
        }, 600);
      }, 600);
    } catch (error) {
      console.error("❌ Error generate skenario:", error);
      clearProgressTimers();
      setLoading(false);
      setProgress(0);
      alert("Gagal generate skenario. Coba lagi.");
    }
  };

  useEffect(() => {
    return () => {
      clearProgressTimers();
      if (viewerRef.current) viewerRef.current.destroy();
    };
  }, []);

  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        </div>
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Generating Test Scenarios</h3>
          <p className="text-gray-600">{loadingText}</p>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Mohon tunggu, proses generate dapat lebih lama tergantung kompleksitas diagram BPMN Anda.
          </p>
        </div>
      </div>
    </div>
  );

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Memuat data BPMN...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-lg">BT</span>
                  </div>
                  <span className="font-bold text-xl text-gray-900">BPMN TESTING</span>
                </div>
                <nav className="hidden md:flex">
                  <span className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-sm">
                    Upload BPMN
                  </span>
                </nav>
              </div>
              <button
                onClick={() => navigate("/")}
                disabled={loading}
                className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">BPMN Diagram Viewer</h1>
              <p className="text-gray-600">Review your BPMN diagram and generate test scenario</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{data.fileName}</h2>
                    <p className="text-sm text-gray-500">BPMN Diagram File</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div
                  ref={containerRef}
                  className="w-full h-[600px] border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden hover:border-gray-400 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[200px]"
              >
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate Scenario</span>
                </div>
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Tentang Generate Scenario</h3>
                  <p className="text-blue-800 text-sm leading-relaxed">
                    Proses ini akan menganalisis diagram BPMN Anda dan menggenerate skenario testing otomatis.
                    Sistem akan mengidentifikasi semua kemungkinan path eksekusi dan membuat test case yang sesuai.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {loading && <LoadingOverlay />}
    </>
  );
}
