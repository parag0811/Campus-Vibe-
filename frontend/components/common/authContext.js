"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useToast } from "@/components/common/toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const { toast } = useToast();

  // FIXED checkAuth
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/check-login`, {
        credentials: "include",
        headers: { "Cache-Control": "no-cache" },
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
          role: data.userRole,
        });
      } else {
        setUser(null);
      }

      setLoading(false);
      setAuthChecked(true);
      return data.loggedIn;
    } catch (err) {
      console.error("Auth check failed:", err);
      setUser(null);
      setLoading(false);
      setAuthChecked(true);
      return false;
    }
  }, []); 

  const login = useCallback(
    async (email, password) => {
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
          toast.error(data.message || "Login failed.");
          setLoading(false);
          return false;
        }

        toast.success("Login successful!");
        await checkAuth(); 
        return true;
      } catch (err) {
        console.error("Login error:", err);
        toast.error("Network error.");
        setLoading(false);
        return false;
      }
    },
    [toast, checkAuth]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message || "Logout failed.");
        setLoading(false);
        return false;
      }

      setUser(null);
      toast.success("Logged out.");
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Network error.");
      setLoading(false);
      return false;
    }
  }, [toast]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authChecked,
        login,
        logout,
        isAuthenticated: !!user,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
