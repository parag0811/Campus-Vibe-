"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/common/toast";

// Base URL from environment
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Create the context
const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const { toast } = useToast();

  // Check if user is logged in - using useCallback to maintain reference
  const checkAuth = useCallback(async () => {
    if (!navigator.onLine) {
      console.log("Offline: Skipping auth check");
      setLoading(false);
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/check-login`, {
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      
      if (!res.ok) {
        setUser(null);
        setLoading(false);
        setAuthChecked(true);
        return false;
      }
      
      const data = await res.json();
      
      if (data.loggedIn) {
        setUser({
          id: data.userId,
          role: data.userRole
        });
        setLoading(false);
        setAuthChecked(true);
        return true;
      } else {
        setUser(null);
        setLoading(false);
        setAuthChecked(true);
        return false;
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      setLoading(false);
      setAuthChecked(true);
      return false;
    }
  }, []);

  // Login function
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login-user`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Login failed. Please try again.");
        setLoading(false);
        return false;
      }

      toast.success(data.message || "Login successful!");
      await checkAuth(); // Refresh user state
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Network error. Please try again later.");
      setLoading(false);
      return false;
    }
  }, [toast, checkAuth]);

  // Logout function
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message || "Logout failed. Please try again.");
        setLoading(false);
        return false;
      }

      setUser(null);
      toast.success("Logged out successfully");
      setLoading(false);
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Network error. Please try again later.");
      setLoading(false);
      return false;
    }
  }, [toast]);

  // Check auth status on initial load
  useEffect(() => {
    let isMounted = true;
    
    const initialAuthCheck = async () => {
      if (isMounted) {
        await checkAuth();
      }
    };

    initialAuthCheck();
    
    return () => {
      isMounted = false;
    };
  }, [checkAuth]);

  // Value to provide through the context
  const value = {
    user,
    loading,
    authChecked,
    login,
    logout,
    isAuthenticated: !!user,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Export the context as default
export default AuthContext;