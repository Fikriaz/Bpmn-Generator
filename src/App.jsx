import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import HomePage from "./pages/HomePage"
import ScenarioPage from "./pages/ScenarioPage"
import HistoryPage from "./pages/HistoryPage"
import UploadBpmnPage from "./pages/UploadBpmnPage"
import ViewDetailPage from "./pages/ViewDetailPage"
import "./App.css"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scenario" element={<ScenarioPage />} />
        <Route path="/scenario/detail" element={<ViewDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/upload-bpmn" element={<UploadBpmnPage />} />
      </Routes>
    </Router>
  )
}

export default App
