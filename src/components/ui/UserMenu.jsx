"use client"

import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, User, LogOut } from "lucide-react"

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState(null)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Get user info from localStorage
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        console.log("User loaded:", parsedUser)
      }
    } catch (err) {
      console.error("Error parsing user data:", err)
    }
  }, [])

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem("authToken")
    localStorage.removeItem("user")

    // Close menu
    setIsOpen(false)

    // Redirect to login page
    navigate("/login")

    // Force page refresh to update auth state
    window.location.reload()
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100">
        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-gray-700">Guest</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* User Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700">{user.username || "User"}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {/* User Info */}
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{user.username}</p>
              <p className="text-xs text-gray-500">
                Logged in: {user.loginTime ? new Date(user.loginTime).toLocaleDateString() : "Today"}
              </p>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
