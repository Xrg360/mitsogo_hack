"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Search, AlertTriangle, Filter } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"

export default function MyAssetsPage() {
  const { user } = useAuth()
  const [myAssets, setMyAssets] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [issueDescription, setIssueDescription] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    types: [],
    models: [],
    conditions: [],
    specifications: [],
  })
  const [availableFilters, setAvailableFilters] = useState({
    types: [],
    models: [],
    conditions: ["Good", "Fair", "Needs Repair"],
    specifications: [],
  })

  useEffect(() => {
    const fetchMyAssets = async () => {
      if (!user?.id) return

      try {
        // Query assets assigned to the user
        const assetsQuery = query(collection(db, "assets"), where("assignedTo", "==", user.id))
        const assetsSnapshot = await getDocs(assetsQuery)
        const assetsData = assetsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Query assets assigned to teams the user belongs to
        let teamAssetsData = []
        if (user.teams && user.teams.length > 0) {
          for (const teamId of user.teams) {
            const teamAssetsQuery = query(collection(db, "assets"), where("assignedToTeam", "==", teamId))
            const teamAssetsSnapshot = await getDocs(teamAssetsQuery)
            const teamAssets = teamAssetsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              isTeamAsset: true,
              teamId,
            }))
            teamAssetsData = [...teamAssetsData, ...teamAssets]
          }
        }

        // Combine personal and team assets
        const allAssets = [...assetsData, ...teamAssetsData]
        setMyAssets(allAssets)

        // Extract unique values for filters
        const types = [...new Set(allAssets.map((asset) => asset.type).filter(Boolean))]
        const models = [...new Set(allAssets.map((asset) => asset.model).filter(Boolean))]

        // Extract all specification keys across all assets
        const allSpecs = new Set()
        allAssets.forEach((asset) => {
          if (asset.specifications) {
            Object.keys(asset.specifications).forEach((key) => allSpecs.add(key))
          }
        })

        setAvailableFilters((prev) => ({
          ...prev,
          types,
          models,
          specifications: [...allSpecs],
        }))
      } catch (error) {
        console.error("Error fetching assets:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMyAssets()
  }, [user])

  const toggleFilter = (category, value) => {
    setFilters((prev) => {
      const updated = { ...prev }
      if (updated[category].includes(value)) {
        updated[category] = updated[category].filter((item) => item !== value)
      } else {
        updated[category] = [...updated[category], value]
      }
      return updated
    })
  }

  const filteredAssets = myAssets.filter((asset) => {
    // Search query filter
    const matchesSearch =
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    // Apply category filters
    if (filters.types.length > 0 && !filters.types.includes(asset.type)) return false
    if (filters.models.length > 0 && !filters.models.includes(asset.model)) return false
    if (filters.conditions.length > 0 && !filters.conditions.includes(asset.condition)) return false

    // Specification filters
    if (filters.specifications.length > 0) {
      // Check if asset has any of the filtered specifications
      const assetSpecs = asset.specifications || {}
      const hasMatchingSpec = filters.specifications.some((spec) => {
        const [key, value] = spec.split(":")
        return assetSpecs[key] === value
      })
      if (!hasMatchingSpec) return false
    }

    return true
  })

  const handleReportIssue = async () => {
    if (!selectedAsset || !issueDescription) {
      alert("Please describe the issue")
      return
    }

    try {
      // Create maintenance record
      await addDoc(collection(db, "maintenance"), {
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        assetType: selectedAsset.type,
        reportedBy: user.id,
        reportedByName: user.name,
        reportDate: new Date().toISOString(),
        status: "Pending",
        issue: issueDescription,
        priority: "Medium",
        notes: `Reported by ${user.name}`,
      })

      // Update asset condition
      await updateDoc(doc(db, "assets", selectedAsset.id), {
        condition: "Needs Repair",
        status: "Maintenance Requested",
      })

      // Update local state
      setMyAssets(
        myAssets.map((asset) =>
          asset.id === selectedAsset.id
            ? { ...asset, condition: "Needs Repair", status: "Maintenance Requested" }
            : asset,
        ),
      )

      setSelectedAsset(null)
      setIssueDescription("")
      setIsReportDialogOpen(false)
    } catch (error) {
      console.error("Error reporting issue:", error)
      alert("Failed to report issue. Please try again.")
    }
  }

  const openReportDialog = (asset) => {
    setSelectedAsset(asset)
    setIsReportDialogOpen(true)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "Active":
      case "In Use":
        return <Badge className="bg-green-500">Active</Badge>
      case "Maintenance":
      case "Maintenance Requested":
        return <Badge className="bg-amber-500">Maintenance Requested</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getConditionBadge = (condition) => {
    switch (condition) {
      case "Good":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            Good
          </Badge>
        )
      case "Fair":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            Fair
          </Badge>
        )
      case "Needs Repair":
        return (
          <Badge variant="outline" className="border-red-500 text-red-500">
            Needs Repair
          </Badge>
        )
      default:
        return <Badge variant="outline">{condition}</Badge>
    }
  }

  // Extract all specification values for filtering
  const getSpecificationValues = () => {
    const specValues = []
    myAssets.forEach((asset) => {
      if (asset.specifications) {
        Object.entries(asset.specifications).forEach(([key, value]) => {
          const specOption = `${key}:${value}`
          if (!specValues.includes(specOption)) {
            specValues.push(specOption)
          }
        })
      }
    })
    return specValues
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Assets</h1>
        <p className="text-muted-foreground">View and manage assets assigned to you</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Assets</CardTitle>
          <CardDescription>Assets currently in your possession</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {Object.values(filters).flat().length > 0 && (
                      <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                        {Object.values(filters).flat().length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-4">
                    <h4 className="font-medium">Filter Assets</h4>

                    {/* Type filter */}
                    {availableFilters.types.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Asset Type</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {availableFilters.types.map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={`type-${type}`}
                                checked={filters.types.includes(type)}
                                onCheckedChange={() => toggleFilter("types", type)}
                              />
                              <label htmlFor={`type-${type}`} className="text-sm">
                                {type}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Model filter */}
                    {availableFilters.models.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Model</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {availableFilters.models.map((model) => (
                            <div key={model} className="flex items-center space-x-2">
                              <Checkbox
                                id={`model-${model}`}
                                checked={filters.models.includes(model)}
                                onCheckedChange={() => toggleFilter("models", model)}
                              />
                              <label htmlFor={`model-${model}`} className="text-sm">
                                {model}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Condition filter */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Condition</h5>
                      <div className="grid grid-cols-2 gap-2">
                        {availableFilters.conditions.map((condition) => (
                          <div key={condition} className="flex items-center space-x-2">
                            <Checkbox
                              id={`condition-${condition}`}
                              checked={filters.conditions.includes(condition)}
                              onCheckedChange={() => toggleFilter("conditions", condition)}
                            />
                            <label htmlFor={`condition-${condition}`} className="text-sm">
                              {condition}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Specifications filter */}
                    {getSpecificationValues().length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Specifications</h5>
                        <div className="grid grid-cols-1 gap-2">
                          {getSpecificationValues().map((spec) => {
                            const [key, value] = spec.split(":")
                            return (
                              <div key={spec} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`spec-${spec}`}
                                  checked={filters.specifications.includes(spec)}
                                  onCheckedChange={() => toggleFilter("specifications", spec)}
                                />
                                <label htmlFor={`spec-${spec}`} className="text-sm">
                                  {key}: {value}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {Object.values(filters).flat().length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFilters({
                            types: [],
                            models: [],
                            conditions: [],
                            specifications: [],
                          })
                        }
                        className="w-full"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {Object.values(filters).flat().length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.types.map((type) => (
                  <Badge key={`badge-type-${type}`} variant="outline" className="flex items-center gap-1">
                    Type: {type}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFilter("types", type)}
                      className="h-4 w-4 p-0 ml-1"
                    >
                      ×
                    </Button>
                  </Badge>
                ))}

                {filters.models.map((model) => (
                  <Badge key={`badge-model-${model}`} variant="outline" className="flex items-center gap-1">
                    Model: {model}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFilter("models", model)}
                      className="h-4 w-4 p-0 ml-1"
                    >
                      ×
                    </Button>
                  </Badge>
                ))}

                {filters.conditions.map((condition) => (
                  <Badge key={`badge-condition-${condition}`} variant="outline" className="flex items-center gap-1">
                    Condition: {condition}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFilter("conditions", condition)}
                      className="h-4 w-4 p-0 ml-1"
                    >
                      ×
                    </Button>
                  </Badge>
                ))}

                {filters.specifications.map((spec) => {
                  const [key, value] = spec.split(":")
                  return (
                    <Badge key={`badge-spec-${spec}`} variant="outline" className="flex items-center gap-1">
                      {key}: {value}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFilter("specifications", spec)}
                        className="h-4 w-4 p-0 ml-1"
                      >
                        ×
                      </Button>
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-md border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Specifications</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading assets...
                    </TableCell>
                  </TableRow>
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No assets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div className="font-medium">{asset.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {asset.type} {asset.model ? `- ${asset.model}` : ""}
                        </div>
                        {asset.isTeamAsset && (
                          <Badge variant="outline" className="mt-1">
                            Team Asset
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {asset.specifications && Object.keys(asset.specifications).length > 0 ? (
                          <div className="text-xs">
                            {Object.entries(asset.specifications).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {value}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No specifications</span>
                        )}
                      </TableCell>
                      <TableCell>{asset.serialNumber}</TableCell>
                      <TableCell>{asset.dueDate ? new Date(asset.dueDate).toLocaleDateString() : "N/A"}</TableCell>
                      <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                      <TableCell className="text-right">
                        {asset.condition !== "Needs Repair" && !asset.isTeamAsset && (
                          <Button variant="outline" size="sm" onClick={() => openReportDialog(asset)}>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Report Issue
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Report Issue Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Asset Issue</DialogTitle>
            <DialogDescription>Describe the issue you're experiencing with this asset.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedAsset && (
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right font-medium">Asset:</div>
                <div className="col-span-3">
                  <div>{selectedAsset.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedAsset.type} {selectedAsset.model ? `- ${selectedAsset.model}` : ""}
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-right font-medium">Issue:</div>
              <Textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="col-span-3"
                placeholder="Describe the issue in detail..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReportIssue}>Submit Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

