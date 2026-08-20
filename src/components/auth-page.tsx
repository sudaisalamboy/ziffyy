'use client'

// TODO: This file is large (~1050 lines). Consider splitting into:
//   - AuthPage (layout + tab switching)
//   - LoginForm (login form component)
//   - SignupForm (signup form component)
//   - LandingHero (landing page hero section)

import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Leaf, ShoppingCart, Truck, Store, Package, Eye, EyeOff, Phone, Mail, MapPin,
  ShieldCheck, Smartphone, CreditCard, HeadphonesIcon, Zap, Star, Users,
  ChevronRight, Menu, ShoppingBag, Heart, CheckCircle2, Clock, Award, Sparkles, ArrowUpRight
} from 'lucide-react'
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'

/* --------- DATA --------- */
const navLinks = [
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

const stats = [
  { value: 10000, suffix: '+', label: 'Happy Customers' },
  { value: 500, suffix: '+', label: 'Products' },
  { value: 50, suffix: '+', label: 'Local Shops' },
  { value: 4.9, suffix: '\u2605', label: 'App Rating', decimal: true },
]

const aboutCards = [
  { icon: Leaf, title: 'Farm Fresh Quality', desc: 'We source directly from local farmers and verified suppliers to ensure the freshest produce reaches your kitchen.', color: 'from-emerald-400 to-teal-500' },
  { icon: Truck, title: 'Lightning Fast Delivery', desc: 'Our efficient delivery network ensures your groceries arrive at your doorstep within 30 minutes of ordering.', color: 'from-amber-400 to-orange-500' },
  { icon: ShieldCheck, title: '100% Quality Assured', desc: 'Every product goes through rigorous quality checks. Not satisfied? Get a full refund, no questions asked.', color: 'from-rose-400 to-pink-500' },
]

const features = [
  { icon: Smartphone, title: 'Easy to Use App', desc: 'Order your groceries in just a few taps with our intuitive interface.', color: 'from-emerald-400 to-teal-500' },
  { icon: Store, title: 'Local Shop Partners', desc: 'We partner with 50+ local shops to bring you the best products.', color: 'from-violet-400 to-purple-500' },
  { icon: CreditCard, title: 'Secure Payments', desc: 'Multiple secure payment options including UPI, cards, and net banking.', color: 'from-amber-400 to-orange-500' },
  { icon: MapPin, title: 'Live Order Tracking', desc: 'Track your order in real-time from the shop to your doorstep.', color: 'from-sky-400 to-blue-500' },
  { icon: HeadphonesIcon, title: '24/7 Support', desc: 'Our customer support team is always available to help you.', color: 'from-rose-400 to-pink-500' },
  { icon: Zap, title: 'Express Delivery', desc: 'Get your groceries delivered in as little as 30 minutes.', color: 'from-yellow-400 to-amber-500' },
]

const steps = [
  { num: '01', icon: Package, title: 'Browse & Select', desc: 'Browse from 500+ products across multiple categories from your favorite local shops.' },
  { num: '02', icon: ShoppingCart, title: 'Place Your Order', desc: 'Add items to cart, choose your delivery slot, and pay securely online.' },
  { num: '03', icon: Truck, title: 'Get It Delivered', desc: 'Our verified delivery partner delivers your groceries right to your doorstep.' },
]

const testimonials = [
  { name: 'Priya Sharma', role: 'Regular Customer', text: 'FreshKart has completely changed how I shop for groceries. The produce is always fresh, and delivery is super fast!', rating: 5 },
  { name: 'Rajesh Kumar', role: 'Shop Owner', text: 'Partnering with FreshKart has increased my sales by 40%. The platform is easy to use and the support team is great.', rating: 5 },
  { name: 'Amit Patel', role: 'Delivery Partner', text: 'I love delivering for FreshKart. The app is intuitive, earnings are good, and I get to help my community.', rating: 4 },
]

const faqs = [
  { q: 'What is FreshKart?', a: 'FreshKart is an online grocery delivery platform that connects you with local shops. Browse products, place orders, and get fresh groceries delivered to your doorstep within minutes.' },
  { q: 'How do I place an order?', a: 'Simply browse our products, add items to your cart, proceed to checkout, choose a delivery slot, and pay online. Your order will be delivered to your doorstep by our delivery partner.' },
  { q: 'What are the delivery charges?', a: 'Delivery is free on orders above \u20b9299. For orders below \u20b9299, a nominal delivery fee of \u20b929 is charged. Express delivery (within 30 minutes) may have an additional charge.' },
  { q: 'What payment methods do you accept?', a: 'We accept UPI (Google Pay, PhonePe, Paytm), credit/debit cards, net banking, and wallets. All payments are processed securely through our platform.' },
  { q: 'How long does delivery take?', a: 'Standard delivery takes 30-45 minutes. You can also schedule a delivery for a specific time slot up to 24 hours in advance.' },
  { q: 'Can I schedule a delivery?', a: 'Yes! During checkout, you can choose a preferred delivery time slot. We offer slots throughout the day, and you can schedule up to 24 hours in advance.' },
  { q: 'What if I receive damaged items?', a: 'We take quality very seriously. If you receive any damaged or incorrect items, contact our support team immediately. We offer full refunds or free replacements \u2014 no questions asked.' },
  { q: 'How can I become a delivery partner?', a: 'You can sign up as a delivery partner on our platform. Just create an account, select "Delivery Boy" as your role, complete the verification process, and start earning!' },
]

const contactInfo = [
  { icon: Phone, title: 'Phone', value: '+91 98765 43210', desc: 'Mon-Sat, 9am-8pm' },
  { icon: Mail, title: 'Email', value: 'support@grocerapp.in', desc: 'We reply within 24 hours' },
  { icon: MapPin, title: 'Address', value: '123 Market Road, Mumbai', desc: 'Maharashtra, India 400001' },
]

const footerCols = [
  { title: 'Company', links: ['About', 'Careers', 'Blog', 'Press'] },
  { title: 'Support', links: ['Help Center', 'Safety', 'Terms of Service', 'Privacy Policy'] },
  { title: 'For Business', links: ['Shop Owners', 'Delivery Partners', 'Advertise', 'Affiliates'] },
  { title: 'Connect', links: ['Twitter', 'Instagram', 'Facebook', 'LinkedIn'] },
]

const roles = [
  { id: 'customer', label: 'Customer', icon: ShoppingBag, note: 'Instant Access' },
  { id: 'delivery', label: 'Delivery Boy', icon: Truck, note: 'Admin Approval' },
  { id: 'shop', label: 'Shop Owner', icon: Store, note: 'Admin Approval' },
]

/* --------- ANIMATION HELPERS --------- */
const ease = [0.25, 0.1, 0.25, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 50, filter: 'blur(6px)' },
  visible: (i: number) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.7, delay: i * 0.1, ease }
  })
}

const fadeIn = {
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: (i: number) => ({
    opacity: 1, filter: 'blur(0px)',
    transition: { duration: 0.6, delay: i * 0.08, ease: 'easeOut' as const }
  })
}

const scaleUp = {
  hidden: { opacity: 0, scale: 0.8, filter: 'blur(8px)' },
  visible: (i: number) => ({
    opacity: 1, scale: 1, filter: 'blur(0px)',
    transition: { duration: 0.6, delay: i * 0.1, ease }
  })
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
}

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, filter: 'blur(6px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 40, filter: 'blur(6px)' }}
      transition={{ duration: 0.8, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* Animated counter component */
function AnimatedCounter({ value, suffix, decimal = false }: { value: number; suffix: string; decimal?: boolean }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    let start = 0
    const duration = 2000
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      start = eased * value
      setCount(start)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, value])

  const display = decimal ? count.toFixed(1) : Math.floor(count).toLocaleString()
  return <span ref={ref}>{display}{suffix}</span>
}

/* --------- MAIN COMPONENT --------- */
export function AuthPage() {
  const { login, signup } = useAuthStore()
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupRole, setSignupRole] = useState('customer')
  const [showSignupPw, setShowSignupPw] = useState(false)

  // Scroll progress bar
  const { scrollYProgress: pageProgress } = useScroll()
  const scaleX = useTransform(pageProgress, [0, 1], [0, 1])
  const [showTop, setShowTop] = useState(false)
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  // Testimonial carousel
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const testimonialInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)
      setShowTop(window.scrollY > 500)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    testimonialInterval.current = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length)
    }, 5000)
    return () => { if (testimonialInterval.current) clearInterval(testimonialInterval.current) }
  }, [])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setLoginError(''); setLoginLoading(true)
    const fd = new FormData(e.currentTarget)
    const r = await login(fd.get('email') as string, fd.get('password') as string, remember)
    if (!r.success) setLoginError(r.error || 'Login failed')
    setLoginLoading(false)
  }

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSignupError(''); setSignupSuccess('')
    const fd = new FormData(e.currentTarget)
    const pw = fd.get('password') as string
    if (pw.length < 6) { setSignupError('Password must be at least 6 characters'); return }
    setSignupLoading(true)
    const r = await signup({
      name: fd.get('name') as string, email: fd.get('email') as string,
      mobile: fd.get('mobile') as string, password: pw, role: signupRole,
      address: fd.get('address') as string || '', remember
    })
    if (!r.success) setSignupError(r.error || 'Signup failed')
    else if (r.message) setSignupSuccess(r.message)
    setSignupLoading(false)
  }

  const scrollTo = (href: string) => {
    setMobileMenuOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden relative">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 z-[60] origin-left"
        style={{ scaleX }}
      />
      {/* Subtle grain texture */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />
      {/* ------- HEADER ------- */}
      <motion.header
        initial={{ y: -80 }} animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-gray-100' : 'bg-transparent'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <motion.div className="flex items-center gap-2.5" whileHover={{ scale: 1.03 }}>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-white" />
              </div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">FreshKart</span>
            </motion.div>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.href} custom={i} variants={fadeIn} initial="hidden" animate="visible"
                  onClick={() => scrollTo(link.href)}
                  className="relative px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50/80 group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-emerald-500 rounded-full group-hover:w-6 transition-all duration-300" />
                </motion.button>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <motion.div custom={0} variants={fadeIn} initial="hidden" animate="visible">
                <Button variant="ghost" size="sm" onClick={() => setShowLogin(true)} className="hover:bg-emerald-50 hover:text-emerald-600">Sign In</Button>
              </motion.div>
              <motion.div custom={1} variants={fadeIn} initial="hidden" animate="visible">
                <Button size="sm" onClick={() => setShowSignup(true)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all">
                  Get Started <Sparkles className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </motion.div>
            </div>

            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* ------- HERO ------- */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-emerald-100/60 to-teal-100/60 blur-3xl"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-100/50 to-orange-100/50 blur-3xl"
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-emerald-100/80 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm border border-emerald-200/50"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                Trusted by 10,000+ happy customers
              </motion.div>

              <div className="space-y-4">
                <motion.h1
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] tracking-tight"
                >
                  Fresh Groceries
                  <span className="relative inline-block mt-1">
                    <span className="relative z-10 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">Delivered Fast</span>
                    <motion.span
                      initial={{ width: 0 }} animate={{ width: '100%' }}
                      transition={{ duration: 0.8, delay: 1 }}
                      className="absolute bottom-1 left-0 h-3 bg-emerald-200/60 rounded-full -z-0"
                    />
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed"
                >
                  Shop from the best local stores near you. Get farm-fresh vegetables, fruits, daily essentials, and more delivered in under 30 minutes.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex flex-wrap gap-4"
              >
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button size="lg" onClick={() => setShowSignup(true)}
                    className="relative bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-base px-8 h-13 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center">Get Started <ChevronRight className="ml-1 h-5 w-5 group-hover:translate-x-0.5 transition-transform" /></span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-teal-600 to-emerald-600"
                      initial={{ x: '100%' }} whileHover={{ x: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button size="lg" variant="outline" className="text-base px-8 h-13 border-2 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
                    onClick={() => scrollTo('#how-it-works')}>
                    How It Works <ArrowUpRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="flex items-center gap-6 pt-2 flex-wrap"
              >
                {[
                  { icon: Clock, text: '30min delivery' },
                  { icon: ShieldCheck, text: 'Quality assured' },
                  { icon: Award, text: 'Best prices' }
                ].map((item, i) => (
                  <motion.div key={item.text} custom={i} variants={fadeIn} initial="hidden" animate="visible"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-emerald-600" />
                    </div>
                    {item.text}
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Hero Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="relative w-full max-w-md aspect-square">
                {/* Main circle with pulsing glow */}
                <motion.div
                  className="absolute inset-8 rounded-full bg-gradient-to-br from-emerald-100 via-teal-50 to-emerald-200 shadow-2xl shadow-emerald-200/50 flex items-center justify-center"
                  animate={{ boxShadow: ['0 25px 50px -12px rgba(16,185,129,0.25)', '0 25px 60px -12px rgba(16,185,129,0.4)', '0 25px 50px -12px rgba(16,185,129,0.25)'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ShoppingCart className="h-28 w-28 text-emerald-500/30" />
                </motion.div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-200/50"
                />
                {/* Floating badges */}
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-6 right-4 bg-white rounded-2xl px-4 py-2.5 shadow-xl shadow-black/5 border border-gray-100/50 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Truck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Free Delivery</p>
                      <p className="text-[10px] text-muted-foreground">On first order</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute bottom-12 left-0 bg-white rounded-2xl px-4 py-2.5 shadow-xl shadow-black/5 border border-gray-100/50 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <Leaf className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Fresh Quality</p>
                      <p className="text-[10px] text-muted-foreground">Farm to door</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute top-24 left-2 bg-white rounded-2xl px-4 py-2.5 shadow-xl shadow-black/5 border border-gray-100/50 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">30 Min</p>
                      <p className="text-[10px] text-muted-foreground">Express delivery</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-12 border-t border-gray-200/50"
          >
            {stats.map((s, i) => (
              <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="visible" className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  <AnimatedCounter value={s.value} suffix={s.suffix} decimal={s.decimal} />
                </p>
                <p className="text-sm text-muted-foreground mt-1 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ------- ABOUT ------- */}
      <section id="about" className="py-20 md:py-32 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-emerald-100/80 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <CheckCircle2 className="w-4 h-4" /> About Us
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl lg:text-5xl font-extrabold">About <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">FreshKart</span></motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
              We&apos;re on a mission to make fresh groceries accessible to everyone, while supporting local businesses.
            </motion.p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-8">
            {aboutCards.map((item, i) => (
              <AnimatedSection key={item.title}>
                <motion.div custom={i} variants={scaleUp} whileHover={{ y: -8, transition: { duration: 0.3 } }}>
                  <Card className="text-center p-8 border-0 shadow-sm hover:shadow-xl rounded-2xl transition-shadow duration-300 bg-white">
                    <CardContent className="pt-6">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                        className={`w-18 h-18 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-5 shadow-lg`}
                      >
                        <item.icon className="w-9 h-9 text-white" />
                      </motion.div>
                      <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ------- FEATURES ------- */}
      <section id="features" className="py-20 md:py-32 bg-gradient-to-b from-gray-50/80 to-white relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-emerald-100/80 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" /> Features
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl lg:text-5xl font-extrabold">Why Choose <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">FreshKart</span>?</motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
              Everything you need for a seamless grocery shopping experience.
            </motion.p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item, i) => (
              <AnimatedSection key={item.title}>
                <motion.div custom={i} variants={fadeUp} whileHover={{ y: -6, transition: { duration: 0.3 } }}>
                  <Card className="p-7 border border-gray-100 hover:border-emerald-200 shadow-sm hover:shadow-xl rounded-2xl transition-all duration-300 bg-white group">
                    <CardContent className="pt-0">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <item.icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ------- HOW IT WORKS ------- */}
      <section id="how-it-works" className="py-20 md:py-32 bg-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-50/50 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-emerald-100/80 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <Zap className="w-4 h-4" /> Simple Steps
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl lg:text-5xl font-extrabold">How It <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Works</span></motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
              Getting your groceries delivered is as easy as 1-2-3.
            </motion.p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Animated connecting line - desktop only */}
            <div className="hidden md:block absolute top-[4.5rem] left-[20%] right-[20%]">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.4, ease }}
                className="h-0.5 bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-300 origin-left"
              />
              <motion.div
                animate={{ x: ['0%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 1.5 }}
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-gradient-to-r from-transparent to-teal-400 blur-sm"
              />
            </div>
            {steps.map((step, i) => (
              <AnimatedSection key={step.num}>
                <motion.div custom={i} variants={scaleUp} className="relative text-center">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 0.4 }}
                    className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/25 relative z-10"
                  >
                    <step.icon className="w-10 h-10 text-white" />
                  </motion.div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 text-7xl font-black text-emerald-100/60 -z-0 select-none">{step.num}</div>
                  <h3 className="text-xl font-bold mb-2 mt-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ------- TESTIMONIALS ------- */}
      <section id="testimonials" className="py-20 md:py-32 bg-gradient-to-b from-gray-50/80 to-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-emerald-100/80 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <Star className="w-4 h-4" /> Testimonials
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl lg:text-5xl font-extrabold">What Our Customers <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Say</span></motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
              Join thousands of happy customers who trust FreshKart.
            </motion.p>
          </AnimatedSection>
          <div className="relative max-w-3xl mx-auto">
            <div className="overflow-hidden">
              <motion.div
                animate={{ x: `-${activeTestimonial * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="flex"
              >
                {testimonials.map((t, i) => (
                  <div key={t.name} className="w-full flex-shrink-0 px-2">
                    <Card className="p-8 md:p-10 border border-gray-100 shadow-sm hover:shadow-xl rounded-2xl transition-all duration-500 bg-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100/50 to-transparent rounded-bl-full" />
                      <CardContent className="pt-0 relative">
                        <div className="flex gap-1 mb-6">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <motion.div key={j} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3 + j * 0.1 }}>
                              <Star className={`h-5 w-5 ${j < t.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                            </motion.div>
                          ))}
                        </div>
                        <p className="text-muted-foreground mb-8 leading-relaxed text-lg italic relative">
                          <span className="text-5xl text-emerald-200 font-serif absolute -top-4 -left-2 select-none">&ldquo;</span>
                          <span className="pl-6">{t.text}</span>
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-bold">{t.name}</p>
                            <p className="text-sm text-muted-foreground">{t.role}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </motion.div>
            </div>
            {/* Dots & progress bar */}
            <div className="flex items-center justify-center gap-3 mt-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveTestimonial(i); if (testimonialInterval.current) { clearInterval(testimonialInterval.current); testimonialInterval.current = setInterval(() => setActiveTestimonial(prev => (prev + 1) % testimonials.length), 5000) } }}
                  className="relative"
                >
                  <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${i === activeTestimonial ? 'bg-emerald-500 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`} />
                  {i === activeTestimonial && (
                    <motion.div
                      layoutId="testimonial-progress"
                      className="absolute inset-0 rounded-full bg-emerald-400"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 5, ease: 'linear' }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------- FAQ ------- */}
      <section id="faq" className="py-20 md:py-32 bg-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-50 rounded-full blur-3xl" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-emerald-100/80 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <HeadphonesIcon className="w-4 h-4" /> FAQ
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl lg:text-5xl font-extrabold">Frequently Asked <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Questions</span></motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground text-lg">
              Find answers to common questions about FreshKart.
            </motion.p>
          </AnimatedSection>
          <AnimatedSection>
            <motion.div variants={fadeUp} custom={0}>
              <Accordion type="single" collapsible className="w-full space-y-3">
                {faqs.map((item, i) => (
                  <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
                    <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      <AccordionItem value={`faq-${i}`} className="border-0">
                        <AccordionTrigger className="text-left px-6 py-4 text-base font-semibold hover:no-underline hover:bg-emerald-50/50 transition-colors [&>svg]:text-emerald-500">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-5 text-muted-foreground leading-relaxed">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    </Card>
                  </motion.div>
                ))}
              </Accordion>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ------- CONTACT ------- */}
      <section id="contact" className="py-20 md:py-32 bg-gradient-to-b from-gray-50/80 to-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 bg-emerald-100/80 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              <Mail className="w-4 h-4" /> Contact
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-4xl lg:text-5xl font-extrabold">Get In <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Touch</span></motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-muted-foreground text-lg">
              Have questions? We&apos;d love to hear from you.
            </motion.p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {contactInfo.map((item, i) => (
              <AnimatedSection key={item.title}>
                <motion.div custom={i} variants={scaleUp} whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.3 } }}>
                  <Card className="text-center p-8 border border-gray-100 shadow-sm hover:shadow-xl rounded-2xl transition-all duration-300 bg-white group">
                    <CardContent className="pt-0">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                        className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300"
                      >
                        <item.icon className="w-7 h-7 text-white" />
                      </motion.div>
                      <h3 className="font-bold mb-1">{item.title}</h3>
                      <p className="text-sm font-semibold text-foreground">{item.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ------- CTA ------- */}
      <section className="py-24 md:py-36 relative overflow-hidden">
        <motion.div
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 bg-[length:200%_200%] bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-2xl"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-2xl"
        />
        {/* Floating grocery icons */}
        {['🥬', '🍎', '🥕', '🥛', '🍞'].map((emoji, i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4 + i * 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}
            className="absolute text-3xl select-none pointer-events-none hidden md:block"
            style={{ left: `${15 + i * 18}%`, bottom: `${10 + (i % 2) * 20}%` }}
          >
            {emoji}
          </motion.div>
        ))}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white">
              Ready to Order Fresh Groceries?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-5 text-emerald-100 max-w-2xl mx-auto text-lg md:text-xl">
              Join thousands of happy customers. Sign up today and get free delivery on your first order!
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-10">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
                <Button size="lg" onClick={() => setShowSignup(true)}
                  className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-lg px-10 h-14 shadow-2xl shadow-black/10 hover:shadow-black/20 transition-all relative overflow-hidden group"
                >
                  <span className="relative z-10">Get Started Free <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-0.5 transition-transform" /></span>
                  <motion.div className="absolute inset-0 bg-emerald-50" initial={{ x: '-100%' }} whileHover={{ x: 0 }} transition={{ duration: 0.3 }} />
                </Button>
              </motion.div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ------- FOOTER ------- */}
      <footer className="bg-zinc-950 text-zinc-300 pt-16 pb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {footerCols.map(col => (
              <div key={col.title}>
                <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-wider">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(link => (
                    <li key={link}>
                      <motion.button whileHover={{ x: 4 }} className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1 relative group">
                        <ChevronRight className="w-3 h-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />{link}
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                      </motion.button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Separator className="my-8 bg-zinc-800" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">FreshKart</span>
            </div>
            <p className="text-sm text-zinc-500">\u00a9 2024 FreshKart. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              Made with <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" /> in India
            </div>
          </div>
        </div>
      </footer>

      {/* ------- LOGIN DIALOG ------- */}
      <AnimatePresence>
        {showLogin && (
          <Dialog open={showLogin} onOpenChange={setShowLogin}>
            <DialogContent className="sm:max-w-md">
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3 }}>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    Welcome Back
                  </DialogTitle>
                  <DialogDescription>Sign in to your FreshKart account</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" name="email" type="email" placeholder="you@example.com" required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-pw">Password</Label>
                    <div className="relative">
                      <Input id="login-pw" name="password" type={showPw ? 'text' : 'password'} placeholder="Enter password" required className="h-11 pr-10" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">Keep me logged in</span>
                  </label>
                  {loginError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-destructive bg-red-50 p-2.5 rounded-lg border border-red-100">{loginError}</motion.p>}
                  <Button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-11 shadow-lg shadow-emerald-500/20" disabled={loginLoading}>
                    {loginLoading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                    ) : 'Sign In'}
                  </Button>

                </form>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Don&apos;t have an account?{' '}
                  <button onClick={() => { setShowLogin(false); setTimeout(() => setShowSignup(true), 200) }} className="text-emerald-600 font-semibold hover:underline">
                    Sign Up
                  </button>
                </p>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* ------- SIGNUP DIALOG ------- */}
      <AnimatePresence>
        {showSignup && (
          <Dialog open={showSignup} onOpenChange={setShowSignup}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3 }}>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    Create Account
                  </DialogTitle>
                  <DialogDescription>Join FreshKart today</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSignup} className="space-y-4 mt-4">
                  <div>
                    <Label>Role</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      {roles.map(r => (
                        <motion.button key={r.id} type="button" onClick={() => setSignupRole(r.id)} whileTap={{ scale: 0.95 }}
                          className={`p-3 rounded-xl border-2 text-center transition-all text-xs font-medium ${signupRole === r.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                          <r.icon className="w-5 h-5 mx-auto mb-1" />
                          {r.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-name">Full Name</Label>
                    <Input id="s-name" name="name" placeholder="Enter your name" required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-email">Email</Label>
                    <Input id="s-email" name="email" type="email" placeholder="Enter email" required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-mobile">Mobile Number</Label>
                    <Input id="s-mobile" name="mobile" placeholder="Enter mobile number" required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-pw">Password</Label>
                    <div className="relative">
                      <Input id="s-pw" name="password" type={showSignupPw ? 'text' : 'password'} placeholder="Min 6 characters" required className="h-11 pr-10" />
                      <button type="button" onClick={() => setShowSignupPw(!showSignupPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showSignupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {signupRole !== 'customer' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <div className="space-y-2">
                        <Label htmlFor="s-addr">Address</Label>
                        <Input id="s-addr" name="address" placeholder="Your address" className="h-11" />
                      </div>
                    </motion.div>
                  )}
                  {signupError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-destructive bg-red-50 p-2.5 rounded-lg border border-red-100">{signupError}</motion.p>}
                  {signupSuccess && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">{signupSuccess}</motion.p>}
                  <Button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-11 shadow-lg shadow-emerald-500/20" disabled={signupLoading}>
                    {signupLoading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                    ) : 'Create Account'}
                  </Button>
                  {signupRole !== 'customer' && (
                    <p className="text-xs text-amber-600 text-center">Admin approval required before you can log in.</p>
                  )}
                </form>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Already have an account?{' '}
                  <button onClick={() => { setShowSignup(false); setTimeout(() => setShowLogin(true), 200) }} className="text-emerald-600 font-semibold hover:underline">
                    Sign In
                  </button>
                </p>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* ------- MOBILE MENU ------- */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              FreshKart
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-6">
            {navLinks.map((link, i) => (
              <motion.button
                key={link.href} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => scrollTo(link.href)}
                className="text-left text-base font-medium text-foreground/80 hover:text-emerald-600 transition-colors py-3 px-4 rounded-xl hover:bg-emerald-50"
              >
                {link.label}
              </motion.button>
            ))}
            <Separator className="my-3" />
            <Button variant="outline" className="w-full" onClick={() => { setMobileMenuOpen(false); setShowLogin(true) }}>Sign In</Button>
            <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700" onClick={() => { setMobileMenuOpen(false); setShowSignup(true) }}>Get Started</Button>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Back to Top */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full shadow-xl shadow-emerald-500/30 flex items-center justify-center hover:shadow-emerald-500/50 transition-shadow"
          >
            <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <ChevronRight className="w-5 h-5 -rotate-90" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes animate-gradient {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        .animate-gradient { animation: animate-gradient 3s ease infinite; }
      ` }} />
      {/* Watermark */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <span className="text-[10px] text-gray-400 font-medium tracking-wide select-none">Made by Sudais Alam</span>
      </div>
    </div>
  )
}
