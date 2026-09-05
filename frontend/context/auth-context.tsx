"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export type UserRole =
  | "ADMIN"
  | "SALES_REP"
  | "SALES_MANAGER"
  | "FINANCE"
  | "CUSTOMER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  signup: (
    name: string,
    email: string,
    password: string,
    extraData?: {
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    }
  ) => Promise<{ success: boolean; error?: string; verificationToken?: string }>;
  verifyEmailToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    setIsLoading(true);
    const token = apiClient.getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const res = await apiClient.get<User>("/auth/me");
    if (res.data && !res.error) {
      setUser(res.data);
    } else {
      setUser(null);
      apiClient.setAccessToken(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const res = await apiClient.post<{ user: User; accessToken: string }>("/auth/login", {
      email,
      password,
    });

    if (res.data && res.data.accessToken) {
      apiClient.setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      setIsLoading(false);
      return { success: true, role: res.data.user.role };
    }

    setIsLoading(false);
    return { success: false, error: res.error || "Login failed" };
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    extraData?: {
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    }
  ) => {
    setIsLoading(true);
    const res = await apiClient.post<{ user: User; accessToken: string; verificationToken?: string }>(
      "/auth/register",
      { name, email, password, ...extraData }
    );

    if (res.data && res.data.accessToken) {
      apiClient.setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      setIsLoading(false);
      return {
        success: true,
        verificationToken: res.data.verificationToken,
      };
    }

    setIsLoading(false);
    return { success: false, error: res.error || "Registration failed" };
  };

  const verifyEmailToken = async (token: string) => {
    const res = await apiClient.get<{ user: User }>(`/auth/verify-email?token=${token}`);
    if (res.data) {
      if (user) {
        setUser({ ...user, isVerified: true });
      }
      return { success: true };
    }
    return { success: false, error: res.error || "Verification failed" };
  };

  const logout = async () => {
    setIsLoading(true);
    await apiClient.post("/auth/logout");
    apiClient.setAccessToken(null);
    setUser(null);
    setIsLoading(false);
  };

  const refreshMe = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        verifyEmailToken,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
