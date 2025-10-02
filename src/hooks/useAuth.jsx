// hooks/useAuth.js - untuk API Integration
import { useState, useEffect } from "react"

const API_BASE_URL = "http://localhost:8080/api" // Your backend API
// atau bisa juga direct ke third-party API
// const API_BASE_URL = "https://your-auth-service.com/api"

const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  // Fungsi untuk validasi token ke API
  const validateToken = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/validate`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        return {
          success: true,
          user: data.user || data.data,
          token: token
        }
      } else {
        // Token expired atau invalid
        console.log("Token validation failed:", response.status)
        return { success: false }
      }
    } catch (error) {
      console.error("Token validation error:", error)
      return { success: false }
    }
  }

  // Check authentication saat aplikasi dimuat
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Cek apakah ada token tersimpan
        const token = localStorage.getItem("authToken")
        const savedUser = localStorage.getItem("user")

        if (!token) {
          setIsAuthenticated(false)
          setLoading(false)
          return
        }

        // Validasi token ke API
        const validation = await validateToken(token)
        
        if (validation.success) {
          setIsAuthenticated(true)
          setUser(validation.user)
          
          // Update localStorage jika ada data terbaru
          if (validation.user) {
            localStorage.setItem("user", JSON.stringify(validation.user))
          }
        } else {
          // Token tidak valid, clear localStorage
          localStorage.removeItem("authToken")
          localStorage.removeItem("user")
          setIsAuthenticated(false)
          setUser(null)
        }
      } catch (error) {
        console.error("Auth check error:", error)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Login function
  const login = async (credentials) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Simpan token dan user data
        const token = data.token || data.access_token
        const userData = data.user || data.data

        localStorage.setItem("authToken", token)
        localStorage.setItem("user", JSON.stringify(userData))
        
        setIsAuthenticated(true)
        setUser(userData)
        
        return { 
          success: true, 
          message: data.message || "Login successful",
          user: userData 
        }
      } else {
        return { 
          success: false, 
          message: data.message || "Login failed" 
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      return { 
        success: false, 
        message: "Network error. Please try again." 
      }
    } finally {
      setLoading(false)
    }
  }

  // Register function
  const register = async (userData) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        return { 
          success: true, 
          message: data.message || "Registration successful" 
        }
      } else {
        return { 
          success: false, 
          message: data.message || "Registration failed" 
        }
      }
    } catch (error) {
      console.error("Registration error:", error)
      return { 
        success: false, 
        message: "Network error. Please try again." 
      }
    } finally {
      setLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("authToken")
      
      // Optional: Inform API about logout
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
      }
    } catch (error) {
      console.error("Logout API call failed:", error)
    } finally {
      // Clear localStorage regardless of API call result
      localStorage.removeItem("authToken")
      localStorage.removeItem("user")
      
      setIsAuthenticated(false)
      setUser(null)
      setLoading(false)
    }
  }

  // Fungsi untuk refresh token (jika API support)
  const refreshToken = async () => {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return false

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        const newToken = data.token || data.access_token
        
        localStorage.setItem("authToken", newToken)
        return true
      }
      
      return false
    } catch (error) {
      console.error("Token refresh error:", error)
      return false
    }
  }

  return {
    isAuthenticated,
    loading,
    user,
    login,
    register,
    logout,
    refreshToken
  }
}

export default useAuth