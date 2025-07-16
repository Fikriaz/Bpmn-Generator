import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

export const bpmnApi = {
  uploadBpmn: (file) => {
    const formData = new FormData()
    formData.append("bpmn_file", file) // Adjust field name as needed
    return api.post("/bpmn/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  },

  generateScenarios: (bpmnId) => api.post(`/bpmn/${bpmnId}/generate-scenarios`),
  getBpmnDiagram: (id) => api.get(`/bpmn/diagram/${id}`),
  getScenarios: (bpmnId) => api.get(`/bpmn/${bpmnId}/scenarios`),
  getBpmnHistory: () => api.get("/bpmn/history"),
  deleteBpmn: (id) => api.delete(`/bpmn/${id}`),

  // Scenario Operations
  getScenarioDetail: (scenarioId) => api.get(`/scenarios/${scenarioId}`),

  updateScenario: (fileId, pathId, data) => api.patch(`/bpmn/files/${fileId}/scenarios/${pathId}`, data),

  downloadScenario: (scenarioId) =>
    api.get(`/scenarios/${scenarioId}/download`, {
      responseType: "blob",
    }),

  // Path Operations
  getPathDetails: (pathId) => api.get(`/paths/${pathId}`),
  downloadPath: (pathId) =>
    api.get(`/paths/${pathId}/download`, {
      responseType: "blob",
    }),

  deleteBpmnBatch: (ids) => api.post("/bpmn/delete-batch", { ids }),

  // Test Data Operations
  addTestData: (scenarioId, testData) => api.post(`/scenarios/${scenarioId}/test-data`, testData),
  getTestData: (scenarioId) => api.get(`/scenarios/${scenarioId}/test-data`),
}

export default api
