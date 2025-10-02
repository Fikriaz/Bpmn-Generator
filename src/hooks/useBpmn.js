"use client"

import { useState, useEffect } from "react"

export const useBpmn = () => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const uploadFile = async (file) => {
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("http://localhost:8080/api/bpmn/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const fetchFiles = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("http://localhost:8080/api/bpmn/files")
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`)
      }

      const data = await response.json()
      setFiles(data || [])
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const fetchFileById = async (fileId) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`http://localhost:8080/api/bpmn/files/${fileId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteFile = async (fileId) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`http://localhost:8080/api/bpmn/files/${fileId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`)
      }

      // Remove from local state
      setFiles(files.filter((file) => file.id !== fileId))
      return true
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  return {
    files,
    loading,
    error,
    uploadFile,
    fetchFiles,
    fetchFileById,
    deleteFile,
  }
}
