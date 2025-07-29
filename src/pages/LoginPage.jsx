"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (error) setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.username || !formData.password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError("")

    try {
      // For development/testing - you can replace this with actual API call
      const response = await fetch("http://localhost:8080/api/bpmn/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Store authentication token if provided
        if (data.token) {
          localStorage.setItem("authToken", data.token)
        } else {
          // Fallback token for development
          localStorage.setItem("authToken", "dev-token-" + Date.now())
        }

        // Store user info
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: formData.username,
            loginTime: new Date().toISOString(),
          }),
        )

        // Redirect to HomePage
        navigate("/")
        window.location.reload() // Force refresh to update auth state
      } else {
        const data = await response.json()
        setError(data.message || "Login failed. Please check your credentials.")
      }
    } catch (err) {
      console.error("Login error:", err)

      // For development - allow login without backend
      if (formData.username === "admin" && formData.password === "admin") {
        localStorage.setItem("authToken", "dev-token-" + Date.now())
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: formData.username,
            loginTime: new Date().toISOString(),
          }),
        )
        navigate("/")
        window.location.reload()
      } else {
        setError("Network error. For testing, use username: admin, password: admin")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-16 shadow-lg min-h-[700px]" style={{ backgroundColor: "#E5E5E5" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto h-full">
            {/* Left Column - Login Form */}
            <div className="flex justify-center items-center h-full">
              <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 w-full max-w-md">
                <div className="text-center space-y-8">
                  {/* Logo */}
                  <div className="flex items-center justify-center space-x-2 mb-8">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{ backgroundColor: "#2185D5" }}
                    >
                      <span className="text-white font-bold text-sm">BT</span>
                    </div>
                    <span className="font-semibold text-gray-900">BLUE TECH</span>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

                  {/* Login Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="text-left">
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          id="username"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          placeholder="Enter your username"
                          required
                        />
                      </div>

                      <div className="text-left">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          placeholder="Enter your password"
                          required
                        />
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg text-center">{error}</div>}

                    {/* Development Notice */}
                    <div className="text-blue-600 text-xs bg-blue-50 p-3 rounded-lg text-center">
                      <strong>Development Mode:</strong> Use username: <code>admin</code>, password: <code>admin</code>
                    </div>

                    {/* Login Button */}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full text-white px-12 py-4 text-lg font-medium transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: loading ? "#9ca3af" : "#2185D5",
                        borderRadius: "12px",
                      }}
                      onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "#1D5D9B")}
                      onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = "#2185D5")}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>

                    {/* Register Link */}
                    <div className="text-center">
                      <p className="text-gray-600 text-sm">
                        Don't have an account?{" "}
                        <Link
                          to="/register"
                          className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors"
                        >
                          Sign up here
                        </Link>
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Right Column - Title and Image */}
            <div className="flex flex-col justify-center space-y-10 h-full">
              {/* Title and Subtitle */}
              <div className="text-center space-y-6">
                <h1 className="text-5xl font-bold text-gray-700 leading-tight">BPMN GENERATOR</h1>
                <p className="text-gray-400 text-xl leading-relaxed">
                  Automate test generation from your Business
                  <br />
                  process models
                </p>
              </div>

              {/* Image */}
              <div className="flex justify-center">
                <div className="rounded-2xl overflow-hidden shadow-lg w-full max-w-lg">
                  <img
                    src="/placeholder.svg?height=300&width=600"
                    alt="Business team collaborating"
                    className="w-full h-auto object-cover"
                    style={{ height: "300px" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
