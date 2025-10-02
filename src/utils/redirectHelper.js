// utils/redirectHelper.js
export const redirectHelper = {
  // Set intended destination before redirecting to login
  setRedirectPath: (path) => {
    if (path && path !== "/login" && path !== "/register") {
      localStorage.setItem("redirectAfterLogin", path)
    }
  },

  // Get intended destination after login
  getRedirectPath: () => {
    return localStorage.getItem("redirectAfterLogin")
  },

  // Clear redirect path
  clearRedirectPath: () => {
    localStorage.removeItem("redirectAfterLogin")
  },

  // Get default destination for authenticated users
  getDefaultDestination: () => {
    // You can customize this based on user role or preferences
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    
    // Example: redirect based on user role or last visited page
    if (user.role === "admin") {
      return "/admin-dashboard"
    }
    
    // Default destination - you can change this
    // return "/upload-bpmn" // Always go to upload BPMN
    // return "/home" // Always go to home
    // return "/history" // Always go to history
    
    return "/home" // Current default
  },

  // Handle smart redirect after login
  handlePostLoginRedirect: (navigate) => {
    const redirectPath = redirectHelper.getRedirectPath()
    let destination

    if (redirectPath && redirectPath !== "/login" && redirectPath !== "/register") {
      destination = redirectPath
    } else {
      destination = redirectHelper.getDefaultDestination()
    }

    redirectHelper.clearRedirectPath()
    navigate(destination, { replace: true })
  }
}

// Custom hook for redirect logic
export const useSmartRedirect = () => {
  const setRedirect = (path) => redirectHelper.setRedirectPath(path)
  const getRedirect = () => redirectHelper.getRedirectPath()
  const clearRedirect = () => redirectHelper.clearRedirectPath()
  const getDefault = () => redirectHelper.getDefaultDestination()
  
  return {
    setRedirect,
    getRedirect,
    clearRedirect,
    getDefault,
    handlePostLogin: redirectHelper.handlePostLoginRedirect
  }
}