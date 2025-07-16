"use client"

import { useState, useEffect } from "react"
import { bpmnApi } from "../services/api"

export const useBpmn = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const uploadBpmn = async (file) => {
    setLoading(true)
    setError(null)
    try {
      const response = await bpmnApi.uploadBpmn(file)
      setLoading(false)
      return response.data
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed")
      setLoading(false)
      throw err
    }
  }

  const generateScenarios = async (bpmnId) => {
    setLoading(true)
    setError(null)
    try {
      const response = await bpmnApi.generateScenarios(bpmnId)
      setLoading(false)
      return response.data
    } catch (err) {
      setError(err.response?.data?.message || "Generation failed")
      setLoading(false)
      throw err
    }
  }

  return {
    loading,
    error,
    uploadBpmn,
    generateScenarios,
    clearError: () => setError(null),
  }
}

export const useScenarios = (fileId) => {
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (fileId) {
      fetchScenarios()
    }
  }, [fileId])

  const fetchScenarios = async () => {
    setLoading(true)
    try {
      const response = await bpmnApi.getScenarios(fileId)
      setScenarios(response.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch scenarios")
    } finally {
      setLoading(false)
    }
  }

  return { scenarios, loading, error, refetch: fetchScenarios }
}

export const useHistory = () => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await bpmnApi.getBpmnHistory()
      setHistory(response.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch history")
    } finally {
      setLoading(false)
    }
  }

  const deleteBpmn = async (ids) => {
    try {
      await bpmnApi.deleteBpmnBatch(ids)
      await fetchHistory() // Refresh after delete
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete items")
      throw err
    }
  }

  return { history, loading, error, deleteBpmn, refetch: fetchHistory }
}
