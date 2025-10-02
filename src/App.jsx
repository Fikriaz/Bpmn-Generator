"use client"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useState, useEffect } from "react"
import HomePage from "./pages/HomePage"
import ScenarioPage from "./pages/ScenarioPage"
import HistoryPage from "./pages/HistoryPage"
import UploadBpmnPage from "./pages/UploadBpmnPage"
import ViewDetailPage from "./pages/ViewDetailPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import "./App.css"

// Simple authentication check
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("authToken")
    const user = localStorage.getItem("user")

    // Simulate auth check
    setTimeout(() => {
      setIsAuthenticated(!!(token && user))
      setLoading(false)
    }, 100)
  }, [])

  return { isAuthenticated, loading }
}

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// Public Route Component (redirect to home if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return !isAuthenticated ? children : <Navigate to="/" replace />
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes - Only accessible when NOT authenticated */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* Protected Routes - Only accessible when authenticated */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scenario"
            element={
              <ProtectedRoute>
                <ScenarioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scenario/detail"
            element={
              <ProtectedRoute>
                <ViewDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload-bpmn"
            element={
              <ProtectedRoute>
                <UploadBpmnPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App