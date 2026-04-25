"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Network,
  BarChart3,
  Shield,
  Sparkles,
  ArrowRight,
  Globe,
  Layers,
  Cable,
  Users,
  Target,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">GPON Dashboard</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#benefits" className="text-sm font-medium hover:text-primary transition-colors">
              Benefits
            </Link>
            <Link href="#contact" className="text-sm font-medium hover:text-primary transition-colors">
              Contact
            </Link>
          </nav>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20 md:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              Next-Gen Network Management
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Intelligent GPON
              <span className="text-primary"> Network Planning</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Design, visualize, and optimize your fiber optic network with real-time mapping, 
              smart suggestions, and powerful analytics.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to manage your GPON network
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful tools to plan, deploy, and maintain fiber infrastructure
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardHeader>
                <MapPin className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">Interactive Map</CardTitle>
                <CardDescription>
                  Visualize OLTs, OCCs, ODPs, and HODPs on an interactive leaflet map with real-time filters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Drag, zoom, and click nodes to edit properties or create links.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <Cable className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">Smart Link Suggestions</CardTitle>
                <CardDescription>
                  Automatically generate optimal fiber connections following OLT → OCC → ODP → HODP hierarchy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Based on geographical distance – save planning time and reduce errors.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">Real-time Analytics</CardTitle>
                <CardDescription>
                  Dashboard with node/link counts, category distribution, unconnected nodes, and fiber length summaries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track network coverage and identify gaps instantly.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <Layers className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">Bulk Import/Export</CardTitle>
                <CardDescription>
                  Upload CSV files to add or update hundreds of nodes and links at once.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Download templates, validate data, and preview changes before committing.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <Shield className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">Proximity Protection</CardTitle>
                <CardDescription>
                  Prevent duplicate nodes within configurable radius (default 5 meters) to avoid overlaps.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Automatically blocks location updates that are too close to existing infrastructure.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader>
                <Globe className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">Multi‑region Support</CardTitle>
                <CardDescription>
                  Organize nodes by region, DGM, and status (existing/proposed) for better planning.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Filter views by region and status to focus on specific rollouts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="bg-muted/50 py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why choose GPON Dashboard?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Designed for network engineers, planners, and ISPs
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Zap className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Faster Planning</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reduce design time by 70% with automated suggestions and bulk operations.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Target className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Accurate Deployments</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Proximity checks and validation rules eliminate duplicate or overlapping nodes.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Team Collaboration</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Centralized database with real-time updates for distributed teams.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to transform your network planning?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join hundreds of network engineers who trust GPON Dashboard.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link href="/register">
                <Button size="lg">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 md:py-12">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              <span className="font-semibold">GPON Dashboard</span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} GPON Dashboard. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:underline">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:underline">
                Terms
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:underline">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}