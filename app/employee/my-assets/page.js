"use client"

import { useState } from "react"
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
import { Search, AlertTriangle } from "lucide-react"
import { useAuth } from "@/context/auth-context"

// Mock data for my assets
const initialMyAssets = [
  {
    id: "asset-1",
    name: "Dell XPS 15",
    type: "Laptop",
    serialNumber: "XPS-12345",
    assignedDate: "2023-01-15",
    dueDate: "2023-04-20",
    status: "Active",
    condition: "Good",
  },
  {
    id: "asset-2",
    name: "iPhone 13 Pro",
    type: "Mobile Phone",
    serialNumber: "IP13-67890",
    assignedDate: "2023-02-10",
    dueDate: "2023-05-15",
    status: "Active",
    condition: "Good",
  },
  {
    id: "asset-3",
    name: "Logitech MX Master 3",
    type: "Mouse",
    serialNumber: "LMX-54321",
    assignedDate: "2023-01-15",
    dueDate: "2023-04-20",
    status: "Active",
    condition: "Fair",
  },
]

export default function MyAssetsPage() {
  const { user } = useAuth()
  const [myAssets, setMyAssets] = useState(initialMyAssets)
  const [searchQuery, setSearchQuery] = useState("")
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [issueDescription, setIssueDescription] = useState("")

  const filteredAssets = myAssets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleReportIssue = () => {
    if (!selectedAsset || !issueDescription) {
      alert("Please describe the issue")
      return
    }

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
  }

  const openReportDialog = (asset) => {
    setSelectedAsset(asset)
    setIsReportDialogOpen(true)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-500">Active</Badge>
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
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
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
                        <div className="text-sm text-muted-foreground">{asset.type}</div>
                      </TableCell>
                      <TableCell>{asset.serialNumber}</TableCell>
                      <TableCell>{new Date(asset.assignedDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(asset.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                      <TableCell className="text-right">
                        {asset.condition !== "Needs Repair" && (
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
                  <div className="text-sm text-muted-foreground">{selectedAsset.type}</div>
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

