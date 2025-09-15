"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const Toast = ({ id, message, type, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const getToastStyles = () => {
    const baseStyles = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "1rem 1.25rem",
      marginBottom: "0.75rem",
      borderRadius: "0.75rem",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
      minWidth: "300px",
      maxWidth: "400px",
      fontSize: "0.95rem",
      fontWeight: "500",
      animation: "slideInDown 0.3s ease-out",
      position: "relative",
      overflow: "hidden",
    };

    switch (type) {
      case "success":
        return {
          ...baseStyles,
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "white",
          border: "1px solid #059669",
        };
      case "error":
        return {
          ...baseStyles,
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          color: "white",
          border: "1px solid #dc2626",
        };
      case "info":
        return {
          ...baseStyles,
          background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          color: "white",
          border: "1px solid #2563eb",
        };
      default:
        return {
          ...baseStyles,
          background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
          color: "white",
          border: "1px solid #4b5563",
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "info":
        return "ℹ️";
      default:
        return "📝";
    }
  };

  return (
    <div style={getToastStyles()}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.1rem" }}>{getIcon()}</span>
        <span>{message}</span>
      </div>
      <button
        onClick={() => onRemove(id)}
        style={{
          background: "rgba(255, 255, 255, 0.2)",
          border: "none",
          borderRadius: "50%",
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "white",
          fontSize: "1rem",
          fontWeight: "bold",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.2)";
        }}
      >
        ×
      </button>
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => (
  <>
    <style jsx>{`
      @keyframes slideInDown {
        from {
          opacity: 0;
          transform: translateY(-100px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `}</style>
    <div
      style={{
        position: "fixed",
        top: "2rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: "auto" }}>
          <Toast
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onRemove={removeToast}
          />
        </div>
      ))}
    </div>
  </>
);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const toast = {
    success: (message) => addToast(message, "success"),
    error: (message) => addToast(message, "error"),
    info: (message) => addToast(message, "info"),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export default ToastProvider;
