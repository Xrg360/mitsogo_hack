"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Check if user is authenticated on initial load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName,
              email: firebaseUser.email,
              role: userData.role || "employee",
              department: userData.department,
              teams: userData.teams || [],
            })
          } else {
            // If user document doesn't exist, create it
            await setDoc(doc(db, "users", firebaseUser.uid), {
              name: firebaseUser.displayName,
              email: firebaseUser.email,
              role: "employee",
              department: "",
              status: "Active",
              joinedDate: new Date().toISOString(),
              teams: [],
            })

            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName,
              email: firebaseUser.email,
              role: "employee",
              department: "",
              teams: [],
            })
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Handle route protection
  useEffect(() => {
    if (loading) return

    // Public routes that don't require authentication
    const publicRoutes = ["/", "/login", "/register", "/forgot-password"]
    const isPublicRoute = publicRoutes.some((route) => pathname === route)

    if (!user && !isPublicRoute) {
      router.push("/login")
      return
    }

    // Redirect based on role
    if (user) {
      const isAdminRoute = pathname.startsWith("/admin")
      const isEmployeeRoute = pathname.startsWith("/employee")

      if (isAdminRoute && user.role !== "admin") {
        router.push("/employee/dashboard")
        return
      }

      if (isEmployeeRoute && user.role === "admin") {
        router.push("/admin/dashboard")
        return
      }
    }
  }, [user, loading, pathname, router])

  const register = async (name, email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Update profile with display name
      await updateProfile(firebaseUser, { displayName: name })

      // Determine role based on email (admin emails contain "admin")
      const role = email.includes("admin") ? "admin" : "employee"

      // Create user document in Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), {
        name,
        email,
        role,
        department: "",
        status: "Active",
        joinedDate: new Date().toISOString(),
        teams: [],
      })

      return firebaseUser
    } catch (error) {
      throw error
    }
  }

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return userCredential.user
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

