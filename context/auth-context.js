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
      try {
        if (firebaseUser) {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))

          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || userData.name,
              email: firebaseUser.email,
              role: userData.role || "employee",
              department: userData.department || "",
              teams: userData.teams || [],
              status: userData.status || "Active",
            })
            console.log("User authenticated and data fetched:", userData)
          } else {
            // If user document doesn't exist, create it
            const newUserData = {
              name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
              email: firebaseUser.email,
              role: firebaseUser.email.includes("admin") ? "admin" : "employee",
              department: "",
              status: "Active",
              joinedDate: new Date().toISOString(),
              teams: [],
            }

            await setDoc(doc(db, "users", firebaseUser.uid), newUserData)
            console.log("Created new user document:", newUserData)

            setUser({
              id: firebaseUser.uid,
              ...newUserData,
            })
          }
        } else {
          setUser(null)
          console.log("No user authenticated")
        }
      } catch (error) {
        console.error("Error in authentication state change:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // Handle route protection
  useEffect(() => {
    if (loading) return

    // Public routes that don't require authentication
    const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/admin-register"]
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
      console.log("Attempting registration for:", email)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Update profile with display name
      await updateProfile(firebaseUser, { displayName: name })

      // Determine role based on email (admin emails contain "admin")
      const role = email.includes("admin") ? "admin" : "employee"
      console.log("User role determined as:", role)

      // Create user document in Firestore
      const userData = {
        name,
        email,
        role,
        department: "",
        status: "Active",
        joinedDate: new Date().toISOString(),
        teams: [],
      }

      await setDoc(doc(db, "users", firebaseUser.uid), userData)
      console.log("User document created successfully")

      return firebaseUser
    } catch (error) {
      console.error("Registration failed:", error.code, error.message)
      throw error
    }
  }

  const login = async (email, password) => {
    try {
      console.log("Attempting login for:", email)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log("Login successful:", userCredential.user.uid)

      // Fetch fresh user data after login
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))
      let userData

      if (!userDoc.exists()) {
        console.log("User document doesn't exist, creating one")
        // Create user document if it doesn't exist
        userData = {
          name: userCredential.user.displayName || email.split("@")[0],
          email: email,
          role: email.includes("admin") ? "admin" : "employee",
          department: "",
          status: "Active",
          joinedDate: new Date().toISOString(),
          teams: [],
        }
        await setDoc(doc(db, "users", userCredential.user.uid), userData)
      } else {
        userData = userDoc.data()
      }

      // Redirect based on role
      if (userData.role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/employee/dashboard")
      }

      return userCredential.user
    } catch (error) {
      console.error("Login failed:", error.code, error.message)
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

