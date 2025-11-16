"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Plus, Search, Building2, MapPin, DollarSign, Bed, Bath, Square } from "lucide-react";

interface PropertyGuruImportProps {
  onPropertyImported?: () => void;
}

export default function PropertyGuruImport({ onPropertyImported }: PropertyGuruImportProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Search parameters
  const [searchParams, setSearchParams] = useState({
    propertyType: "condo",
    bedrooms: 2,
    priceMin: 3000,
    priceMax: 8000,
    location: "Singapore"
  });

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Property imported successfully: ${data.property.title}`);
        setUrl("");
        onPropertyImported?.();
      } else {
        setError(data.error || "Failed to import property");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchImport = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/propertyguru/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchParams
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Successfully imported ${data.properties.length} properties from search`);
        onPropertyImported?.();
      } else {
        setError(data.error || "Failed to import properties");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Import from Property Portals
        </CardTitle>
        <CardDescription>
          Import property listings by URL (PropertyGuru or 99.co). Bulk search is supported for PropertyGuru.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Property</TabsTrigger>
            <TabsTrigger value="search">Bulk Search</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single" className="space-y-4 mt-6">
            <form onSubmit={handleImport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="property-url">Listing URL</Label>
                <Input
                  id="property-url"
                  type="url"
                  placeholder="https://www.propertyguru.com.sg/... or https://www.99.co/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Paste a PropertyGuru or 99.co listing URL
                </p>
              </div>
              <Button type="submit" disabled={loading || !url} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Import Property
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="search" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select 
                    value={searchParams.propertyType} 
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, propertyType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="condo">Condo</SelectItem>
                      <SelectItem value="hdb">HDB</SelectItem>
                      <SelectItem value="landed">Landed</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Bedrooms</Label>
                  <Select 
                    value={searchParams.bedrooms.toString()} 
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, bedrooms: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Bedroom</SelectItem>
                      <SelectItem value="2">2 Bedrooms</SelectItem>
                      <SelectItem value="3">3 Bedrooms</SelectItem>
                      <SelectItem value="4">4 Bedrooms</SelectItem>
                      <SelectItem value="5">5+ Bedrooms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Price (S$)</Label>
                  <Input
                    type="number"
                    placeholder="3000"
                    value={searchParams.priceMin}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, priceMin: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max Price (S$)</Label>
                  <Input
                    type="number"
                    placeholder="8000"
                    value={searchParams.priceMax}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, priceMax: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="Singapore, Orchard, Marina Bay..."
                  value={searchParams.location}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4" />
                  <span className="font-medium text-sm">Search Preview</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>• {searchParams.propertyType.charAt(0).toUpperCase() + searchParams.propertyType.slice(1)} properties</div>
                  <div>• {searchParams.bedrooms} bedroom{searchParams.bedrooms > 1 ? 's' : ''}</div>
                  <div>• S${searchParams.priceMin.toLocaleString()} - S${searchParams.priceMax.toLocaleString()}</div>
                  <div>• Location: {searchParams.location}</div>
                </div>
              </div>
              
              <Button 
                onClick={handleSearchImport} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching & Importing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search & Import Properties
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
