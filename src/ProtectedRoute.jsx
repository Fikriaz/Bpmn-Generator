// src/routes/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken, setRedirect } from "../utils/auth";

export default function ProtectedRoute({ children }) {
  const token = getToken();
  const location = useLocation();

  if (!token) {
    setRedirect(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  return children;
}
