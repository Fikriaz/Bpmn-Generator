"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import Button from "../components/ui/Button"
import { API_BASE } from "../utils/auth"

export default function RegisterPage() {
  const [formData, setFormData] = useState({ username: "", password: "", confirmPassword: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.username || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields"); return
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match"); return
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long"); return
    }

    setLoading(true); setError("")
    try {
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formData.username, password: formData.password }),
      })
      if (resp.ok) {
        alert("Account created successfully! Please sign in.")
        navigate("/login")
      } else {
        const data = await resp.json().catch(() => ({}))
        setError(data.message || "Registration failed. Please try again.")
      }
    } catch (err) {
      console.error("Registration error:", err)
      setError("Registration failed. Please try again.")
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

                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Account</h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="text-left">
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                        <input
                          type="text" id="username" name="username" value={formData.username} onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          placeholder="Choose a username" required
                        />
                      </div>
                      <div className="text-left">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <input
                          type="password" id="password" name="password" value={formData.password} onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          placeholder="Create a password" required
                        />
                      </div>
                      <div className="text-left">
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                        <input
                          type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          placeholder="Confirm your password" required
                        />
                      </div>
                    </div>

                    {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg text-center">{error}</div>}

                    <Button
                      type="submit" disabled={loading}
                      className="w-full text-white px-12 py-4 text-lg font-medium transition-colors disabled:opacity-50"
                      style={{ backgroundColor: loading ? "#9ca3af" : "#2185D5", borderRadius: "12px" }}
                      onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "#1D5D9B")}
                      onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = "#2185D5")}
                    >
                      {loading ? "Creating Account..." : "Create Account"}
                    </Button>

                    <div className="text-center">
                      <p className="text-gray-600 text-sm">
                        Already have an account?{" "}
                        <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors">
                          Sign in here
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
                 Register now and turn your BPMN diagrams into ready to use<br/>test scenario
                </p>
              </div>
              <div className="flex justify-center">
                <div className="rounded-2xl overflow-hidden shadow-lg w/full max-w-lg">
                  <img src="/images/register.jpg" alt="Business team collaborating" className="w-full h-auto object-cover" style={{ height: "300px" }} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
