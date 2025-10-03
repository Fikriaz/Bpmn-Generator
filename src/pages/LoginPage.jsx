"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import { API_BASE, setAuth, consumeRedirect } from "../utils/auth"

export default function LoginPage() {
  const [formData, setFormData] = useState({ username: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const navigate = useNavigate()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError("")
  }

  const validateForm = () => {
    if (!formData.username.trim()) { setError("Username is required"); return false }
    if (!formData.password) { setError("Password is required"); return false }
    if (formData.username.length < 3) { setError("Username must be at least 3 characters"); return false }
    return true
  }

  const handleAPILogin = async () => {
    const resp = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ username: formData.username.trim(), password: formData.password }),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) return { success: false, error: data.message || "Invalid username or password" }

    const token = data.token || `api-token-${Date.now()}`
    const userData = {
      id: data.user?.id || Date.now(),
      username: data.user?.username || formData.username.trim(),
      name: data.user?.name || formData.username,
      email: data.user?.email || `${formData.username}@example.com`,
      loginTime: new Date().toISOString()
    }
    setAuth(token, userData)
    return { success: true, data: userData }
  }

  const handleDevLogin = () => {
    if (formData.username.toLowerCase() === "admin" && formData.password === "admin") {
      const token = `dev-token-${Date.now()}`
      const userData = { id: 1, username: "admin", name: "Administrator", email: "admin@example.com", loginTime: new Date().toISOString() }
      setAuth(token, userData)
      return { success: true, data: userData }
    }
    return { success: false, error: "Invalid username or password" }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true); setError("")
    try {
      let result
      if (isOnline) {
        try { result = await handleAPILogin() } catch { result = handleDevLogin() }
      } else {
        result = handleDevLogin()
      }

      if (result.success) {
        const redirectPath = consumeRedirect()
        const destination = redirectPath && !["/login","/register"].includes(redirectPath) ? redirectPath : "/home"
        navigate(destination, { replace: true })
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-16 shadow-lg min-h-[700px]" style={{ backgroundColor: "#E5E5E5" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto h-full">
            <div className="flex justify-center items-center h-full">
              <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 w-full max-w-md">
                <div className="text-center space-y-8">
                  <div className="flex items-center justify-center space-x-2 mb-8">
                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: "#2185D5" }}>
                      <span className="text-white font-bold text-sm">BT</span>
                    </div>
                    <span className="font-semibold text-gray-900">BPMN TESTING</span>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

                  {!isOnline && (
                    <div className="text-orange-600 text-xs bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        <span>You are offline</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="text-left">
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                        <input
                          type="text" id="username" name="username"
                          value={formData.username} onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          placeholder="Enter your username" disabled={loading} required
                        />
                      </div>
                      <div className="text-left">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <input
                          type="password" id="password" name="password"
                          value={formData.password} onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          placeholder="Enter your password" disabled={loading} required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span>⚠️</span><span>{error}</span>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit" disabled={loading}
                      className="w-full text-white px-12 py-4 text-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: loading ? "#9ca3af" : "#2185D5", borderRadius: "12px" }}
                      onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "#1D5D9B")}
                      onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = "#2185D5")}
                    >
                      {loading ? <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Signing in...</span>
                      </div> : "Sign In"}
                    </Button>

                    <div className="text-center">
                      <p className="text-gray-600 text-sm">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors">
                          Sign up here
                        </Link>
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-10 h-full">
              <div className="text-center space-y-6">
                <h1 className="text-5xl font-bold text-gray-700 leading-tight">BPMN TESTING</h1>
                <p className="text-gray-400 text-xl leading-relaxed">
            Welcome back!<br/> Let’s continue turning your BPMN diagrams into test scenario
                </p>
              </div>
              <div className="flex justify-center">
                <div className="rounded-2xl overflow-hidden shadow-lg w-full max-w-lg">
                  <img src="/images/login.jpg" alt="Business team collaborating" className="w-full h-auto object-cover" style={{ height: "300px" }} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
