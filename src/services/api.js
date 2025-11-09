import axios from "axios"

//hosting
//const API_BASE_URL = "https://automation-test.up.railway.app/api"

//lokal
 const API_BASE_URL = "http://localhost:8081/api"


// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log("🚀 API Request:", {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL}${config.url}`,
      data: config.data,
      headers: config.headers,
    })

    const token = localStorage.getItem("authToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error("❌ Request Error:", error)
    return Promise.reject(error)
  },
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", {
      status: response.status,
      url: response.config.url,
      data: response.data,
    })
    return response
  },
  (error) => {
    console.error("❌ API Error:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
    })

    if (error.response?.status === 401) {
      localStorage.removeItem("authToken")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

export const bpmnApi = {
  // Upload BPMN file
  uploadBpmn: (file) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiClient.post("/bpmn/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  },

  // Generate scenarios
  generateScenarios: (fileId) => {
    return apiClient.post(`/bpmn/files/${fileId}/generateScenario`)
  },

  // Get BPMN diagram
  getBpmnDiagram: (fileId) => {
    return apiClient.get(`/bpmn/files/${fileId}/diagram`)
  },

  // Get scenarios
  getScenarios: (fileId) => apiClient.get(`/bpmn/files/${fileId}/scenarios`),

  // Get BPMN history
  getBpmnHistory: () => apiClient.get("/bpmn/history"),

  // Delete BPMN
  deleteBpmn: (id) => apiClient.delete(`/bpmn/files/${id}`),

  // Scenario Operations
  getScenarioDetail: (scenarioId) => apiClient.get(`/scenarios/${scenarioId}`),

  updateScenario: (fileId, pathId, data) => {
    return apiClient.put(`/bpmn/files/${fileId}/scenarios/${pathId}`, data)
  },

  // Update scenario test data - Based on your Postman success
  updateScenarioTestData: async (fileId, pathId, testData) => {
    console.log("🔄 Attempting to update test data:", { fileId, pathId, testData })

    // Since Postman works, let's try the exact same endpoint patterns
    const endpointOptions = [
      // Try the most likely endpoints based on your existing API structure
      `/bpmn/files/${fileId}/scenarios/${pathId}`, // PATCH
      `/scenarios/${pathId}`, // PATCH
      `/bpmn/files/${fileId}/scenarios/${pathId}/test-data`, // PATCH
      `/scenarios/${pathId}/test-data`, // PATCH
    ]

    const methodOptions = ["patch", "put", "post"] // Try different HTTP methods

    for (const endpoint of endpointOptions) {
      for (const method of methodOptions) {
        try {
          console.log(`🔍 Trying ${method.toUpperCase()} ${endpoint}`)
          const response = await apiClient[method](endpoint, testData)
          console.log(`✅ Success with ${method.toUpperCase()} ${endpoint}`)
          return response
        } catch (error) {
          console.log(`❌ Failed ${method.toUpperCase()} ${endpoint}:`, error.message)
          // Continue to next option
        }
      }
    }

    // If all options fail, throw the last error
    throw new Error("All endpoint options failed. Please check your backend API documentation.")
  },

  // Simplified test connection - just try to get history
  testConnection: () => {
    console.log("🔍 Testing API connection...")
    return apiClient.get("/bpmn/history")
  },

  downloadScenario: (scenarioId) =>
    apiClient.get(`/scenarios/${scenarioId}/download`, {
      responseType: "blob",
    }),

  // Path Operations
  getPathDetails: (pathId) => apiClient.get(`/paths/${pathId}`),

  downloadPath: (pathId) =>
    apiClient.get(`/paths/${pathId}/download`, {
      responseType: "blob",
    }),

  deleteBpmnBatch: (ids) => apiClient.post("/bpmn/delete-batch", { ids }),

  // Test Data Operations
  addTestData: (scenarioId, testData) => apiClient.post(`/scenarios/${scenarioId}/test-data`, testData),

  getTestData: (scenarioId) => apiClient.get(`/scenarios/${scenarioId}/test-data`),
}

// Auth API
export const authApi = {
  login: (credentials) => {
    return apiClient.post("/auth/login", credentials)
  },

  register: (userData) => {
    return apiClient.post("/auth/register", userData)
  },

  logout: () => {
    return apiClient.post("/auth/logout")
  },
}

export default apiClient
