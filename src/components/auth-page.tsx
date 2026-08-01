'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingBag, Truck, Store, Shield, Eye, EyeOff, Package } from 'lucide-react'

export function AuthPage() {
  const { login, signup } = useAuthStore()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showSignupPw, setShowSignupPw] = useState(false)
  const [signupRole, setSignupRole] = useState('customer')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const r = await login(fd.get('email') as string, fd.get('password') as string)
    if (!r.success) setError(r.error || 'Login failed')
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const fd = new FormData(e.currentTarget)
    const pw = fd.get('password') as string
    if (pw.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const r = await signup({
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      mobile: fd.get('mobile') as string,
      password: pw,
      role: signupRole,
      address: fd.get('address') as string || ''
    })
    if (!r.success) setError(r.error || 'Signup failed')
    else if (r.message) setSuccess(r.message)
    setLoading(false)
  }

  const roles = [
    { id: 'customer', label: 'Customer', icon: ShoppingBag, desc: 'Buy products & create needs', color: 'emerald', note: 'Instant Access' },
    { id: 'delivery', label: 'Delivery Boy', icon: Truck, desc: 'Deliver orders', color: 'amber', note: 'Admin Approval Required' },
    { id: 'shop', label: 'Shop Owner', icon: Store, desc: 'Sell your products', color: 'rose', note: 'Admin Approval Required' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl border bg-white">
        {/* Left Welcome */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-8 md:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Package className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold">GrocerApp</h1>
          </div>
          <p className="text-emerald-100 mb-8 text-lg leading-relaxed">
            Your one-stop solution for all grocery shopping and delivery needs.
          </p>
          <ul className="space-y-3">
            {['Shop from multiple stores', 'Fast home delivery', 'Best prices guaranteed', 'Quality products', 'Secure payments'].map(f => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-8 p-4 bg-white/10 rounded-xl text-sm">
            <p className="font-semibold mb-1">Quick Access</p>
            <p className="text-emerald-200">Customer — Start immediately</p>
            <p className="text-emerald-200">Shop/Delivery — Admin approval needed</p>
          </div>
        </div>

        {/* Right Forms */}
        <div className="p-6 md:p-8">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{error}</div>}
          {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200">{success}</div>}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" placeholder="Enter your email" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="login-pw">Password</Label>
                  <div className="relative mt-1">
                    <Input id="login-pw" name="password" type={showPw ? 'text' : 'password'} placeholder="Enter password" required />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login to Account'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Demo: admin@example.com / rahul@gmail.com / priya@gmail.com<br/>Password: password123
                </p>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label>Role</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {roles.map(r => (
                      <button key={r.id} type="button" onClick={() => setSignupRole(r.id)}
                        className={`p-3 rounded-lg border-2 text-center transition-all text-xs font-medium ${signupRole === r.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300'}`}>
                        <r.icon className="w-5 h-5 mx-auto mb-1" />
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="s-name">Full Name</Label>
                  <Input id="s-name" name="name" placeholder="Enter your name" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="s-email">Email</Label>
                  <Input id="s-email" name="email" type="email" placeholder="Enter email" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="s-mobile">Mobile Number</Label>
                  <Input id="s-mobile" name="mobile" placeholder="Enter mobile number" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="s-pw">Password</Label>
                  <div className="relative mt-1">
                    <Input id="s-pw" name="password" type={showSignupPw ? 'text' : 'password'} placeholder="Min 6 characters" required />
                    <button type="button" onClick={() => setShowSignupPw(!showSignupPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSignupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {signupRole !== 'customer' && (
                  <div>
                    <Label htmlFor="s-addr">Address</Label>
                    <Input id="s-addr" name="address" placeholder="Your address" className="mt-1" />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
                {signupRole !== 'customer' && (
                  <p className="text-xs text-amber-600 text-center">Admin approval required before you can log in.</p>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}