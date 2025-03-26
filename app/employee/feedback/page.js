"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { MessageSquare, ThumbsUp } from "lucide-react"

export default function FeedbackPage() {
  const { user } = useAuth()
  const [feedbackType, setFeedbackType] = useState("general")
  const [assetName, setAssetName] = useState("")
  const [feedbackText, setFeedbackText] = useState("")
  const [rating, setRating] = useState("5")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)

      // Reset form after 3 seconds
      setTimeout(() => {
        setFeedbackType("general")
        setAssetName("")
        setFeedbackText("")
        setRating("5")
        setIsSuccess(false)
      }, 3000)
    }, 1000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">Share your thoughts and suggestions about the asset management system</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Submit Feedback
            </CardTitle>
            <CardDescription>Your feedback helps us improve our services</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {isSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <ThumbsUp className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold">Thank You!</h3>
                  <p className="text-muted-foreground">Your feedback has been submitted successfully.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="feedback-type">Feedback Type</Label>
                    <Select value={feedbackType} onValueChange={setFeedbackType}>
                      <SelectTrigger id="feedback-type">
                        <SelectValue placeholder="Select feedback type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Feedback</SelectItem>
                        <SelectItem value="asset">Asset Specific Feedback</SelectItem>
                        <SelectItem value="suggestion">Suggestion</SelectItem>
                        <SelectItem value="complaint">Complaint</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {feedbackType === "asset" && (
                    <div className="space-y-2">
                      <Label htmlFor="asset-name">Asset Name</Label>
                      <Input
                        id="asset-name"
                        value={assetName}
                        onChange={(e) => setAssetName(e.target.value)}
                        placeholder="Enter the asset name"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="feedback">Your Feedback</Label>
                    <Textarea
                      id="feedback"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Share your thoughts, suggestions, or concerns..."
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rating">Rating</Label>
                    <Select value={rating} onValueChange={setRating}>
                      <SelectTrigger id="rating">
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">★★★★★ (Excellent)</SelectItem>
                        <SelectItem value="4">★★★★☆ (Good)</SelectItem>
                        <SelectItem value="3">★★★☆☆ (Average)</SelectItem>
                        <SelectItem value="2">★★☆☆☆ (Below Average)</SelectItem>
                        <SelectItem value="1">★☆☆☆☆ (Poor)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              {!isSuccess && (
                <Button type="submit" className="w-full" disabled={isSubmitting || !feedbackText}>
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback Guidelines</CardTitle>
            <CardDescription>Tips for providing effective feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Be Specific</h3>
                <p className="text-sm text-muted-foreground">
                  Provide specific details about your experience to help us understand the context.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Be Constructive</h3>
                <p className="text-sm text-muted-foreground">
                  Focus on how things can be improved rather than just pointing out problems.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Include Examples</h3>
                <p className="text-sm text-muted-foreground">
                  When possible, include examples to illustrate your points.
                </p>
              </div>
              <div>
                <h3 className="font-medium">Suggest Solutions</h3>
                <p className="text-sm text-muted-foreground">
                  If you have ideas for how to address an issue, please share them.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

