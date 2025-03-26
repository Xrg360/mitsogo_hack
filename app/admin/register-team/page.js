"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { collection, addDoc, doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function RegisterTeamPage() {
  const [name, setName] = useState("")
  const [department, setDepartment] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const departments = ["IT", "HR", "Finance", "Marketing", "Sales", "Operations", "Customer Support", "Other"]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!name || !department) {
      setError("Team name and department are required")
      return
    }

    setIsLoading(true)

    try {
      // Create team document in Firestore
      const teamData = {
        name,
        department,
        description,
        members: user ? [user.id] : [],
        createdBy: user?.id,
        createdAt: new Date().toISOString(),
        status: "Active",
      }

      const docRef = await addDoc(collection(db, "teams"), teamData)

      // If user is logged in, add this team to their teams array
      if (user) {
        // Get the user's current teams
        const userRef = doc(db, "users", user.id)

        // Update the user's teams array to include this new team
        // Note: In a real app, you'd use a transaction to ensure data consistency
        const userTeams = user.teams || []
        userTeams.push(docRef.id)

        // Update the user document
        await setDoc(userRef, { teams: userTeams }, { merge: true })
      }

      setSuccess(true)

      // Redirect after 2 seconds
      setTimeout(() => {
        if (user?.role === "Admin") {
          router.push("/admin/teams")
        } else {
          router.push("/employee/dashboard")
        }
      }, 2000)
    } catch (error) {
      console.error("Team registration failed:", error)
      setError("Failed to create team. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create a Team</CardTitle>
          <CardDescription>Register a new team for asset management</CardDescription>
        </CardHeader>
        {success ? (
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <AlertDescription>Team created successfully! Redirecting...</AlertDescription>
            </Alert>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  placeholder="Engineering Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Team description and purpose"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating team..." : "Create Team"}
              </Button>
            </CardFooter>
          </form>
        )}
        <div className="px-8 pb-6 text-center text-sm">
          <Link
            href={user?.role === "Admin" ? "/admin/teams" : "/employee/dashboard"}
            className="text-primary underline-offset-4 hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </Card>
    </div>
  )
}

