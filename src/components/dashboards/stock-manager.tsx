'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Search, PackageSearch, Minus, Plus, Package, TrendingUp, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const headers = { 'Content-Type': 'application/json' }
function authH(token: string | null) { return { ...headers, 'Authorization': 'Bearer ' + token } }

export function StockManager() {
  const { token } = useAuthStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set())
  const [bulkQty, setBulkQty] = useState('10')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products?status=all', { headers: authH(token) })
      const d = await res.json()
      setProducts((d.products || []).filter((p: any) => p.status === 'approved'))
    } catch { toast.error('Failed to load products') }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const updateStock = async (id: number, stock: number) => {
    if (stock < 0 || stock > 99999) return
    setUpdating(String(id))
    try {
      const res = await fetch('/api/products', { method: 'PUT', headers: authH(token), body: JSON.stringify({ id, stock }) })
      if (res.ok) {
        toast.success(`Stock updated to ${stock}`)
        load()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Failed to update')
      }
    } catch { toast.error('Network error') }
    setUpdating(null)
  }

  const addStock = (id: number, qty: number) => {
    const p = products.find((x: any) => x.id === id)
    if (p) updateStock(id, Math.max(0, p.stock + qty))
  }

  const restockSingle = (id: number) => {
    const qty = parseInt(bulkQty) || 10
    addStock(id, qty)
  }

  const bulkRestock = async () => {
    if (bulkSelected.size === 0) { toast.error('Select products first'); return }
    const qty = parseInt(bulkQty) || 10
    let success = 0
    for (const id of bulkSelected) {
      const p = products.find((x: any) => x.id === id)
      if (p) {
        try {
          const res = await fetch('/api/products', { method: 'PUT', headers: authH(token), body: JSON.stringify({ id, stock: p.stock + qty }) })
          if (res.ok) success++
        } catch {}
      }
    }
    toast.success(`${success}/${bulkSelected.size} products restocked (+${qty} each)`)
    setBulkSelected(new Set())
    setBulkMode(false)
    load()
  }

  const toggleSelect = (id: number) => {
    const next = new Set(bulkSelected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setBulkSelected(next)
  }

  const filtered = products.filter((p: any) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !(p.category || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'in_stock' && p.stock <= 0) return false
    if (filter === 'out_of_stock' && p.stock > 0) return false
    if (filter === 'low_stock' && (p.stock <= 0 || p.stock > 10)) return false
    return true
  })

  const totalStock = products.reduce((s: number, p: any) => s + p.stock, 0)
  const inStockCount = products.filter((p: any) => p.stock > 0).length
  const outOfStockCount = products.filter((p: any) => p.stock <= 0).length
  const lowStockCount = products.filter((p: any) => p.stock > 0 && p.stock <= 10).length

  if (loading) {
    return (
      <div className='text-center py-16 text-gray-400'>
        <RefreshCw className='w-8 h-8 mx-auto animate-spin' />
        <p className='mt-3'>Loading stock...</p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Stats Cards */}
      <div className='grid grid-cols-4 gap-2'>
        <Card className='p-3 text-center'>
          <Package className='w-4 h-4 mx-auto text-gray-400 mb-1' />
          <p className='text-xl font-bold'>{products.length}</p>
          <p className='text-[10px] text-gray-500'>Products</p>
        </Card>
        <Card className='p-3 text-center'>
          <TrendingUp className='w-4 h-4 mx-auto text-emerald-500 mb-1' />
          <p className='text-xl font-bold text-emerald-600'>{inStockCount}</p>
          <p className='text-[10px] text-gray-500'>In Stock</p>
        </Card>
        <Card className='p-3 text-center'>
          <AlertTriangle className='w-4 h-4 mx-auto text-amber-500 mb-1' />
          <p className='text-xl font-bold text-amber-600'>{lowStockCount}</p>
          <p className='text-[10px] text-gray-500'>Low Stock</p>
        </Card>
        <Card className='p-3 text-center'>
          <PackageSearch className='w-4 h-4 mx-auto text-red-500 mb-1' />
          <p className='text-xl font-bold text-red-600'>{outOfStockCount}</p>
          <p className='text-[10px] text-gray-500'>Out of Stock</p>
        </Card>
      </div>

      {/* Search + Filter + Actions */}
      <div className='flex items-center gap-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
          <Input
            placeholder='Search products...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='pl-9 h-10'
          />
        </div>
        <Button size='sm' variant='outline' className='h-10' onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          size='sm'
          variant={bulkMode ? 'default' : 'outline'}
          className={`h-10 ${bulkMode ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
          onClick={() => { setBulkMode(!bulkMode); setBulkSelected(new Set()) }}
        >
          {bulkMode ? 'Cancel' : 'Bulk'}
        </Button>
      </div>

      {/* Bulk Restock Bar */}
      {bulkMode && (
        <Card className='bg-amber-50 border-amber-200 p-3'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='text-xs font-medium text-amber-700'>{bulkSelected.size} selected</span>
            <div className='flex items-center gap-1 bg-white rounded-lg border px-2 h-8'>
              <span className='text-xs text-gray-500'>Add</span>
              <input
                type='number'
                min='1'
                value={bulkQty}
                onChange={e => setBulkQty(e.target.value)}
                className='w-14 text-center text-sm bg-transparent border-0 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
              />
              <span className='text-xs text-gray-500'>each</span>
            </div>
            <Button size='sm' className='h-8 bg-amber-500 hover:bg-amber-600 text-xs px-3' onClick={bulkRestock} disabled={bulkSelected.size === 0}>
              Restock All
            </Button>
            <button className='text-xs text-amber-600 underline ml-auto' onClick={() => setBulkSelected(new Set(filtered.map((p: any) => p.id)))}>Select All</button>
          </div>
        </Card>
      )}

      {/* Filter Chips */}
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {([['all', 'All'], ['in_stock', 'In Stock'], ['low_stock', 'Low Stock (≤10)'], ['out_of_stock', 'Out of Stock']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === key ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary Bar */}
      <div className='bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between text-xs text-gray-500'>
        <span>{filtered.length} product{filtered.length !== 1 ? 's' : ''} {filter !== 'all' ? `(${filter.replace('_', ' ')})` : ''}</span>
        <span>Total units: <strong className='text-gray-700'>{totalStock}</strong></span>
      </div>

      {/* Product List */}
      {!filtered.length ? (
        <div className='text-center py-16 text-gray-400'>
          <PackageSearch className='w-16 h-16 mx-auto mb-4 opacity-50' />
          <p className='font-medium'>{search || filter !== 'all' ? 'No products match your filter' : 'No approved products'}</p>
          <p className='text-sm mt-1'>{search || filter !== 'all' ? 'Try a different search or filter' : 'Products need admin approval before stock can be managed'}</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {filtered.map((p: any) => (
            <Card key={p.id} className='overflow-hidden'>
              <div className='flex'>
                {/* Checkbox for bulk mode */}
                {bulkMode && (
                  <div className='flex items-center px-3 border-r'>
                    <input
                      type='checkbox'
                      checked={bulkSelected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className='w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500'
                    />
                  </div>
                )}
                {/* Product Image */}
                <div className='w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center flex-shrink-0'>
                  {p.image
                    ? <img src={p.image} alt={p.title} className='w-full h-full object-cover' />
                    : <span className='text-2xl'>{p.category || 'Uncategorized'}</span>}
                </div>
                {/* Product Info + Stock Controls */}
                <div className='flex-1 p-3 min-w-0'>
                  <div className='flex items-start justify-between gap-2 mb-1'>
                    <div className='min-w-0'>
                      <h3 className='font-semibold text-sm truncate'>{p.title}</h3>
                      <p className='text-xs text-gray-500'>{p.category || 'Uncategorized'} &middot; ₹{p.price}</p>
                    </div>
                    <Badge className={`flex-shrink-0 text-[10px] ${p.stock > 10 ? 'bg-emerald-100 text-emerald-700' : p.stock > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                    </Badge>
                  </div>
                  <div className='flex items-center gap-2 mt-2 flex-wrap'>
                    {/* Stock Counter */}
                    <div className='flex items-center gap-0 bg-gray-100 rounded-lg'>
                      <button
                        className='w-8 h-8 flex items-center justify-center rounded-l-lg hover:bg-gray-200 transition-colors disabled:opacity-40'
                        onClick={() => addStock(p.id, -5)}
                        disabled={p.stock < 5 || !!updating}
                      >
                        <Minus className='w-3.5 h-3.5' />
                      </button>
                      <input
                        type='number'
                        min='0'
                        value={p.stock}
                        onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 0) updateStock(p.id, v) }}
                        className='w-12 h-8 text-center text-sm font-semibold bg-transparent border-0 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                        disabled={!!updating}
                      />
                      <button
                        className='w-8 h-8 flex items-center justify-center rounded-r-lg hover:bg-gray-200 transition-colors disabled:opacity-40'
                        onClick={() => addStock(p.id, 5)}
                        disabled={!!updating}
                      >
                        <Plus className='w-3.5 h-3.5' />
                      </button>
                    </div>
                    {/* Quick Restock Buttons */}
                    <div className='flex gap-1'>
                      {[10, 25, 50, 100].map((q: number) => (
                        <button
                          key={q}
                          className='px-2 py-1 text-[10px] font-medium bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors disabled:opacity-40'
                          onClick={() => addStock(p.id, q)}
                          disabled={!!updating}
                        >+{q}
                        </button>
                      ))}
                    </div>
                    {/* Restock from 0 button */}
                    {p.stock <= 0 && (
                      <button
                        className='px-2.5 py-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors disabled:opacity-40'
                        onClick={() => restockSingle(p.id)}
                        disabled={!!updating}
                      >
                        Restock
                      </button>
                    )}
                    {updating === String(p.id) && <RefreshCw className='w-4 h-4 text-amber-500 animate-spin' />}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
