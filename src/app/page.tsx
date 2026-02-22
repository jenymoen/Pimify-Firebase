'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Check,
  Image as ImageIcon,
  Layers,
  Link as LinkIcon,
  Package,
  ShoppingBag,
  Zap,
  Menu,
  X
} from 'lucide-react';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="w-full px-6 py-4 flex justify-between items-center border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">PIM Solutions</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Features
          </Link>
          <Link href="#integrations" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Integrations
          </Link>
          <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Pricing
          </Link>
          <Link href="#resources" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Resources
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Log in
          </Link>
          <Link href="/auth/register">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-6">
              Start Free Trial
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b px-6 py-4 space-y-4">
          <Link href="#features" className="block text-gray-600 hover:text-gray-900">Features</Link>
          <Link href="#integrations" className="block text-gray-600 hover:text-gray-900">Integrations</Link>
          <Link href="#pricing" className="block text-gray-600 hover:text-gray-900">Pricing</Link>
          <Link href="#resources" className="block text-gray-600 hover:text-gray-900">Resources</Link>
          <div className="pt-4 border-t space-y-2">
            <Link href="/auth/login" className="block text-gray-600">Log in</Link>
            <Link href="/auth/register">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-white py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                  <Zap className="h-4 w-4" />
                  New: AI-Powered Descriptions
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                  Scale Your E-commerce with{' '}
                  <span className="text-emerald-500">Ease</span>
                </h1>
                <p className="text-lg text-gray-600 mb-8 max-w-xl">
                  Centralize your product data, and seamlessly syndicate
                  inventory across Shopify, Amazon, and numerous systems. The
                  ultimate source of truth for modern retailers.
                </p>
                <div className="flex flex-wrap gap-4 mb-8">
                  <Link href="/auth/register">
                    <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-8">
                      Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button size="lg" variant="outline" className="rounded-full px-8">
                      Watch Demo
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    No credit card
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    14-day free trial
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-2xl p-6 border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Live Demo Mode</div>
                      <div className="text-xs text-gray-500">Experience the full platform</div>
                    </div>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Product Dashboard Preview</p>
                    </div>
                  </div>
                </div>
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3 border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <ShoppingBag className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-xs">
                      <div className="font-medium">Shopify</div>
                      <div className="text-emerald-500">Connected</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Visual Media Management */}
        <section id="features" className="py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-gray-400" />
                  </div>
                  <div className="bg-emerald-100 rounded-xl aspect-square flex items-center justify-center">
                    <Package className="h-16 w-16 text-emerald-500" />
                  </div>
                  <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center col-span-2">
                    <div className="text-center p-4">
                      <Layers className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Drag & drop media library</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Visual Media Management
                </h2>
                <p className="text-gray-600 mb-8">
                  Organize your entire creative library with an intuitive drag-and-drop interface.
                  Our system automatically optimizes, resizes, and formats images for Shopify, Amazon,
                  and your custom storefronts.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">Centralized Asset Library</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">Automatic Channel Formatting</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">Bulk Meta-data Tagging</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Bulk Variant Editing */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Bulk Variant Editing
                </h2>
                <p className="text-gray-600 mb-8">
                  Stop wasting time on repetitive product edits. Manage thousands of SKUs
                  in minutes with our intuitive bulk edit interface. Update colors,
                  sizes, materials, and pricing across your entire catalog with a
                  single click.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-emerald-500" />
                      <span className="font-semibold text-gray-900">Grid Interface</span>
                    </div>
                    <p className="text-sm text-gray-600">Excel-like spreadsheet for power users.</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-5 w-5 text-emerald-500" />
                      <span className="font-semibold text-gray-900">Global Updates</span>
                    </div>
                    <p className="text-sm text-gray-600">Mass-update across multiple channels.</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="bg-white rounded-2xl shadow-xl p-6 border">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Product Name</span>
                      <span className="text-sm font-medium">Premium T-Shirt</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">SKU</span>
                      <span className="text-sm font-medium">TSH-001-BLK</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Price</span>
                      <span className="text-sm font-medium">$49.99</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Stock</span>
                      <span className="text-sm font-medium">1,234 units</span>
                    </div>
                    <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white mt-4">
                      Update 12 Items
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ecosystem Integration */}
        <section id="integrations" className="py-16 md:py-24">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Seamless Ecosystem Integration
            </h2>
            <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
              Connect your core business systems. Our PIM sits at the center, ensuring your data flows
              effortlessly from ERP to global marketplaces.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Package className="h-8 w-8 text-gray-600" />
                </div>
                <span className="text-sm text-gray-600">Oracle NetSuite</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <div className="text-white text-center">
                    <LinkIcon className="h-8 w-8 mx-auto" />
                    <span className="text-xs font-bold mt-1 block">PIM Hub</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-green-600" />
                </div>
                <span className="text-sm text-gray-600">Shopify</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Package className="h-8 w-8 text-orange-600" />
                </div>
                <span className="text-sm text-gray-600">Amazon</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to transform your product operations?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Join 1,200+ fast-growing brands using PIM Solutions to scale their
              digital footprint. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-full px-6"
              />
              <Link href="/auth/register">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-8 whitespace-nowrap">
                  Start Free Trial
                </Button>
              </Link>
            </div>
            <div className="flex justify-center gap-6 mt-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                No setup fee
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                Cancel anytime
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                24/7 Support
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">PIM Solutions</span>
              </div>
              <p className="text-sm mb-4">
                Modern product information management. Built to scale, easy to use.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Integrations</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Community</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Glossary</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2026 PIM Solutions Inc. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
              <Link href="#" className="hover:text-white transition-colors">LinkedIn</Link>
              <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
