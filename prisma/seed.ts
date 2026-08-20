import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'

const db = new PrismaClient()
const PW = hashSync('password123', 10)

async function seed() {
  // ── CLEAN UP (respect FK order) ──
  // NOTE: Table names must match Prisma model names in camelCase.
  // If the schema changes, update this list accordingly.
  const tables = [
    'orderItem', 'orderStatusLog', 'deliveryAssignment', 'deliveryHistory',
    'chatMessage',
    'payment', 'order', 'cartItem', 'cart', 'offer', 'needComment', 'need',
    'notification', 'walletTransaction', 'withdrawal',
    'ratingsReview', 'adminActivityLog', 'shopOwnerApplication',
    'settings', 'userAddress', 'product', 'shopOwner', 'deliveryBoy', 'user'
  ]
  for (const t of tables) {
    // @ts-ignore
    await db[t].deleteMany()
  }

  // ── HELPER ──
  const d = (daysAgo: number, h = 0) => {
    const dt = new Date()
    dt.setDate(dt.getDate() - daysAgo)
    dt.setHours(h, 0, 0, 0)
    return dt
   }

  // ══════════════════════════════════════════
  // 1. USERS — 1 admin, 5 customers, 2 delivery, 2 shop
  // ══════════════════════════════════════════
  const admin = await db.user.create({ data: { name: 'Admin Panel', email: 'admin@freshkart.com', mobile: '9000000001', password: PW, role: 'admin', status: 'active', address: 'FreshKart HQ, Connaught Place, New Delhi' } })

  const customers = await Promise.all([
    db.user.create({ data: { name: 'Rahul Sharma', email: 'rahul@mail.com', mobile: '9876543210', password: PW, role: 'customer', status: 'active', address: 'Flat 101, Lotus Apartments, Andheri West, Mumbai' } }),
    db.user.create({ data: { name: 'Priya Patel', email: 'priya@mail.com', mobile: '9876543211', password: PW, role: 'customer', status: 'active', address: '23/B, Park Street, Salt Lake, Kolkata' } }),
    db.user.create({ data: { name: 'Amit Verma', email: 'amit.v@mail.com', mobile: '9876543212', password: PW, role: 'customer', status: 'active', address: 'Plot 44, Jubilee Hills, Hyderabad' } }),
    db.user.create({ data: { name: 'Sneha Reddy', email: 'sneha@mail.com', mobile: '9876543213', password: PW, role: 'customer', status: 'active', address: '12/3, HSR Layout, Bangalore' } }),
    db.user.create({ data: { name: 'Vikram Singh', email: 'vikram@mail.com', mobile: '9876543214', password: PW, role: 'customer', status: 'active', address: '78, Civil Lines, Lucknow' } }),
  ])

  const shopUsers = await Promise.all([
    db.user.create({ data: { name: 'Ramesh Gupta', email: 'ramesh@shop.com', mobile: '9111111111', password: PW, role: 'shop', status: 'active', address: 'Shop 5, Lajpat Nagar Market, New Delhi' } }),
    db.user.create({ data: { name: 'Meena Iyer', email: 'meena@shop.com', mobile: '9222222222', password: PW, role: 'shop', status: 'active', address: '14, T. Nagar Main Road, Chennai' } }),
  ])

  const deliveryUsers = await Promise.all([
    db.user.create({ data: { name: 'Suresh Kumar', email: 'suresh@delivery.com', mobile: '9333333333', password: PW, role: 'delivery', status: 'active', address: 'Room 3, Kurla West, Mumbai' } }),
    db.user.create({ data: { name: 'Arjun Nair', email: 'arjun@delivery.com', mobile: '9444444444', password: PW, role: 'delivery', status: 'active', address: 'Flat 7, Kaloor, Kochi' } }),
  ])

  // ══════════════════════════════════════════
  // 2. SHOP OWNERS
  // ══════════════════════════════════════════
  const shops = await Promise.all([
    db.shopOwner.create({ data: { userId: shopUsers[0].id, shopName: 'Ramesh Grocery & Provisions', shopAddress: 'Shop 5, Lajpat Nagar Market, New Delhi - 110024', status: 'approved', approvedBy: admin.id, approvedAt: d(30) } }),
    db.shopOwner.create({ data: { userId: shopUsers[1].id, shopName: 'Meena Organic Store', shopAddress: '14, T. Nagar Main Road, Chennai - 600017', status: 'approved', approvedBy: admin.id, approvedAt: d(28) } }),
  ])

  // ══════════════════════════════════════════
  // 3. DELIVERY BOYS
  // ══════════════════════════════════════════
  const boys = await Promise.all([
    db.deliveryBoy.create({ data: { userId: deliveryUsers[0].id, address: 'Kurla West, Mumbai', vehicleType: 'Scooter', vehicleNumber: 'MH-01-AB-4567', status: 'approved', approvedBy: admin.id, approvedAt: d(25), totalDeliveries: 47, rating: 4.6, walletBalance: 1250 } }),
    db.deliveryBoy.create({ data: { userId: deliveryUsers[1].id, address: 'Kaloor, Kochi', vehicleType: 'Motorcycle', vehicleNumber: 'KL-07-CD-8901', status: 'approved', approvedBy: admin.id, approvedAt: d(20), totalDeliveries: 32, rating: 4.3, walletBalance: 870 } }),
  ])

  // ══════════════════════════════════════════
  // 4. USER ADDRESSES (for customers)
  // ══════════════════════════════════════════
  await Promise.all([
    db.userAddress.create({ data: { userId: customers[0].id, fullAddress: 'Flat 101, Lotus Apartments, Andheri West', landmark: 'Near Metro Station', pincode: '400058', city: 'Mumbai', state: 'Maharashtra', isDefault: true } }),
    db.userAddress.create({ data: { userId: customers[0].id, fullAddress: 'Office - Tower A, BKC', landmark: 'Near Trident Hotel', pincode: '400051', city: 'Mumbai', state: 'Maharashtra', isDefault: false } }),
    db.userAddress.create({ data: { userId: customers[1].id, fullAddress: '23/B, Park Street, Salt Lake', landmark: 'City Center Mall', pincode: '700091', city: 'Kolkata', state: 'West Bengal', isDefault: true } }),
    db.userAddress.create({ data: { userId: customers[2].id, fullAddress: 'Plot 44, Jubilee Hills', landmark: 'Near Checkpost', pincode: '500033', city: 'Hyderabad', state: 'Telangana', isDefault: true } }),
    db.userAddress.create({ data: { userId: customers[3].id, fullAddress: '12/3, HSR Layout, Sector 2', landmark: 'BDA Complex', pincode: '560102', city: 'Bangalore', state: 'Karnataka', isDefault: true } }),
    db.userAddress.create({ data: { userId: customers[4].id, fullAddress: '78, Civil Lines', landmark: 'Near Lucknow University', pincode: '226001', city: 'Lucknow', state: 'Uttar Pradesh', isDefault: true } }),
  ])

  // ══════════════════════════════════════════
  // 5. PRODUCTS — 30+ total
  //    Shop 1 (Ramesh): 16 products
  //      12 approved, 2 pending, 2 rejected
  //      3 sold out (stock=0)
  //    Shop 2 (Meena): 16 products
  //      12 approved, 3 pending, 1 rejected
  //      2 sold out (stock=0)
  // ══════════════════════════════════════════
  const approvedProducts = await Promise.all([
    // ── Shop 1: Ramesh Grocery (12 approved) ──
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Organic Basmati Rice 5kg', description: 'Premium aged basmati rice from Haryana farms', price: 450, stock: 50, category: 'Grains & Rice', status: 'approved', approvedBy: admin.id, approvedAt: d(25) } }),
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Fresh Alphonso Mangoes 1kg', description: 'Seasonal Alphonso mangoes directly from Ratnagiri orchards', price: 350, stock: 0, category: 'Fruits', status: 'approved', approvedBy: admin.id, approvedAt: d(20) } }), // SOLD OUT
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'A2 Cow Ghee 500ml', description: 'Pure desi cow ghee made from A2 milk, traditional bilona method', price: 550, stock: 18, category: 'Dairy', status: 'approved', approvedBy: admin.id, approvedAt: d(22) } }),
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Turmeric Powder 200g', description: 'Organic Lakadong turmeric with high curcumin content', price: 80, stock: 100, category: 'Spices', status: 'approved', approvedBy: admin.id, approvedAt: d(20) } }),
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Organic Forest Honey 500g', description: 'Wild forest honey harvested from Western Ghats', price: 450, stock: 0, category: 'Organic', status: 'approved', approvedBy: admin.id, approvedAt: d(18) } }), // SOLD OUT
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Green Tea 50 Bags', description: 'Organic Darjeeling green tea, premium quality', price: 250, stock: 45, category: 'Beverages', status: 'approved', approvedBy: admin.id, approvedAt: d(15) } }),
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Cashew Nuts 250g', description: 'Whole W240 grade roasted cashew nuts from Goa', price: 400, stock: 30, category: 'Dry Fruits', status: 'approved', approvedBy: admin.id, approvedAt: d(15) } }),
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Red Chilli Powder 100g', description: 'Hot Guntur red chilli powder', price: 45, stock: 120, category: 'Spices', status: 'approved', approvedBy: admin.id, approvedAt: d(14) } }),
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Jaggery Block 1kg', description: 'Organic sugarcane jaggery, no chemicals', price: 90, stock: 60, category: 'Sweeteners', status: 'approved', approvedBy: admin.id, approvedAt: d(12) } }),
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Peanut Butter 500g', description: 'Creamy unsweetened peanut butter', price: 280, stock: 25, category: 'Spreads', status: 'approved', approvedBy: admin.id, approvedAt: d(10) } }),
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Sesame Oil 1L', description: 'Cold pressed sesame oil for cooking', price: 220, stock: 0, category: 'Cooking Oil', status: 'approved', approvedBy: admin.id, approvedAt: d(8) } }), // SOLD OUT
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Roasted Chana 500g', description: 'Crunchy roasted Bengal gram, spiced', price: 120, stock: 40, category: 'Snacks', status: 'approved', approvedBy: admin.id, approvedAt: d(7) } }),

    // ── Shop 2: Meena Organic (12 approved) ──
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Whole Wheat Atta 10kg', description: 'Chakki fresh whole wheat flour, stone ground', price: 380, stock: 40, category: 'Grains & Rice', status: 'approved', approvedBy: admin.id, approvedAt: d(22) } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Farm Fresh Eggs (12 pcs)', description: 'Free range country eggs from Namakkal', price: 120, stock: 80, category: 'Dairy & Eggs', status: 'approved', approvedBy: admin.id, approvedAt: d(20) } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Cold Pressed Coconut Oil 1L', description: 'Virgin coconut oil, wood pressed', price: 320, stock: 25, category: 'Cooking Oil', status: 'approved', approvedBy: admin.id, approvedAt: d(18) } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Red Lentils (Masoor Dal) 2kg', description: 'Premium unpolished masoor dal', price: 180, stock: 60, category: 'Pulses', status: 'approved', approvedBy: admin.id, approvedAt: d(16) } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Organic Jaggery Powder 1kg', description: 'Palm jaggery powder, chemical free', price: 150, stock: 70, category: 'Sweeteners', status: 'approved', approvedBy: admin.id, approvedAt: d(14) } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Almond Butter 500g', description: 'Smooth almond butter, no added sugar', price: 520, stock: 15, category: 'Spreads', status: 'approved', approvedBy: admin.id, approvedAt: d(12) } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Millet Rice (Ragi) 1kg', description: 'Organic finger millet rice', price: 110, stock: 0, category: 'Grains & Rice', status: 'approved', approvedBy: admin.id, approvedAt: d(10) } }), // SOLD OUT
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Herbal Hair Oil 200ml', description: 'Coconut-based herbal hair oil with amla & bhringraj', price: 180, stock: 35, category: 'Personal Care', status: 'approved', approvedBy: admin.id, approvedAt: d(9) } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Organic Chia Seeds 250g', description: 'Premium chia seeds imported from Mexico', price: 350, stock: 0, category: 'Organic', status: 'approved', approvedBy: admin.id, approvedAt: d(8) } }), // SOLD OUT
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Ground Coffee 250g', description: 'Organic South Indian filter coffee powder', price: 280, stock: 50, category: 'Beverages', status: 'approved', approvedBy: admin.id, approvedAt: d(6) } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Moong Dal 2kg', description: 'Organic green gram, unpolished', price: 220, stock: 55, category: 'Pulses', status: 'approved', approvedBy: admin.id, approvedAt: d(5) } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Aloe Vera Juice 1L', description: 'Pure aloe vera juice, no preservatives', price: 190, stock: 30, category: 'Beverages', status: 'approved', approvedBy: admin.id, approvedAt: d(3) } }),
  ])

  // ── Pending products ──
  await Promise.all([
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Saffron 1g', description: 'Kashmiri saffron strands, Grade A', price: 300, stock: 10, category: 'Spices', status: 'pending' } }),
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Walnuts 500g', description: 'Kashmiri walnuts, premium quality', price: 480, stock: 20, category: 'Dry Fruits', status: 'pending' } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Quinoa 500g', description: 'Organic white quinoa imported from Peru', price: 420, stock: 15, category: 'Grains & Rice', status: 'pending' } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Matcha Powder 100g', description: 'Ceremonial grade Japanese matcha', price: 650, stock: 8, category: 'Beverages', status: 'pending' } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Pumpkin Seeds 250g', description: 'Roasted pumpkin seeds with salt', price: 200, stock: 25, category: 'Snacks', status: 'pending' } }),
  ])

  // ── Rejected products ──
  await Promise.all([
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Used Mobile Phone', description: 'Second hand phone - not a grocery item', price: 5000, stock: 1, category: 'Electronics', status: 'rejected', rejectionReason: 'This is not a grocery item. Please list only food and grocery products.', approvedBy: admin.id, approvedAt: d(5) } }),
    db.product.create({ data: { shopOwnerId: shops[0].id, title: 'Plastic Container Set', description: 'Kitchen storage containers', price: 350, stock: 10, category: 'Kitchenware', status: 'rejected', rejectionReason: 'Non-perishable kitchenware items are not allowed. Please focus on edible grocery items.', approvedBy: admin.id, approvedAt: d(3) } }),
    db.product.create({ data: { shopOwnerId: shops[1].id, title: 'Expired Canned Beans', description: 'Canned baked beans, best before Dec 2023', price: 80, stock: 20, category: 'Canned Food', status: 'rejected', rejectionReason: 'Product has expired. Please ensure all listed products have valid shelf life.', approvedBy: admin.id, approvedAt: d(2) } }),
  ])

  // P = approvedProducts (indexed 0-23)
  const P = approvedProducts

  // ══════════════════════════════════════════
  // 6. CARTS
  // ══════════════════════════════════════════
  const cart1 = await db.cart.create({ data: { userId: customers[0].id } })
  await Promise.all([
    db.cartItem.create({ data: { cartId: cart1.id, productId: P[0].id, quantity: 1 } }),
    db.cartItem.create({ data: { cartId: cart1.id, productId: P[3].id, quantity: 3 } }),
  ])

  const cart3 = await db.cart.create({ data: { userId: customers[2].id } })
  await db.cartItem.create({ data: { cartId: cart3.id, productId: P[12].id, quantity: 2 } })

  const cart4 = await db.cart.create({ data: { userId: customers[3].id } })
  await db.cartItem.create({ data: { cartId: cart4.id, productId: P[17].id, quantity: 1 } })
  await db.cartItem.create({ data: { cartId: cart4.id, productId: P[19].id, quantity: 1 } })

  // ══════════════════════════════════════════
  // 7. ORDERS — 13 orders with varied statuses
  // ══════════════════════════════════════════

  // Helper to create full order with items, logs, payment
  async function createOrder(opts: {
    userId: number; orderNum: string; items: { prodId: number; name: string; qty: number; price: number }[];
    total: number; delivery?: number; commission?: number; shopEarning?: number;
    payStatus: string; orderStatus: string; payMethod: string; orderType?: string;
    shippingAddr: string; createdAt?: Date;
    statusLogs: { status: string; notes: string; by: number }[];
    payment?: { method: string; txnId?: string; status: string; screenshot?: string };
    deliveryBoyId?: number; deliveryStatus?: string; deliveryNotes?: string; deliveredAt?: Date;
  }) {
    const order = await db.order.create({
      data: {
        userId: opts.userId, orderNumber: opts.orderNum, totalAmount: opts.total,
        deliveryFee: opts.delivery ?? 0, commissionAmount: opts.commission ?? 0,
        shopEarning: opts.shopEarning ?? 0, paymentStatus: opts.payStatus,
        orderStatus: opts.orderStatus, paymentMethod: opts.payMethod,
        orderType: opts.orderType ?? 'product', shippingAddress: opts.shippingAddr,
        createdAt: opts.createdAt ?? new Date(),
      }
    })

    for (const item of opts.items) {
      await db.orderItem.create({ data: { orderId: order.id, productId: item.prodId, productName: item.name, quantity: item.qty, unitPrice: item.price, totalPrice: item.qty * item.price } })
    }

    for (const log of opts.statusLogs) {
      await db.orderStatusLog.create({ data: { orderId: order.id, status: log.status, notes: log.notes, changedBy: log.by, createdAt: opts.createdAt ?? new Date() } })
    }

    if (opts.payment) {
      await db.payment.create({ data: { orderId: order.id, userId: opts.userId, amount: opts.total, paymentMethod: opts.payment.method, transactionId: opts.payment.txnId ?? '', paymentStatus: opts.payment.status, screenshot: opts.payment.screenshot ?? '', createdAt: opts.createdAt ?? new Date() } })
    }

    if (opts.deliveryBoyId) {
      await db.deliveryAssignment.create({
        data: {
          orderId: order.id, deliveryBoyId: opts.deliveryBoyId, assignedBy: admin.id,
          status: opts.deliveryStatus ?? 'assigned', assignedAt: opts.createdAt ?? new Date(),
          deliveredAt: opts.deliveredAt ?? null, deliveryNotes: opts.deliveryNotes ?? '',
        }
      })
      if (opts.orderStatus === 'delivered') {
        await db.deliveryHistory.create({ data: { deliveryBoyId: opts.deliveryBoyId, orderId: order.id, deliveryStatus: 'delivered', notes: 'Delivered successfully' } })
      }
    }

    return order
  }

  // ORDER 1 — Delivered, COD, Suresh
  const o1 = await createOrder({
    userId: customers[0].id, orderNum: 'ORD-20250601-001',
    items: [{ prodId: P[0].id, name: 'Organic Basmati Rice 5kg', qty: 1, price: 450 }, { prodId: P[1].id, name: 'Fresh Alphonso Mangoes 1kg', qty: 2, price: 350 }],
    total: 1150, delivery: 30, commission: 10, shopEarning: 1110,
    payStatus: 'paid', orderStatus: 'delivered', payMethod: 'cod',
    shippingAddr: 'Flat 101, Lotus Apartments, Andheri West, Mumbai - 400058', createdAt: d(15),
    statusLogs: [
      { status: 'pending', notes: 'Order placed successfully', by: customers[0].id },
      { status: 'confirmed', notes: 'Order confirmed by admin', by: admin.id },
      { status: 'out_for_delivery', notes: 'Picked up by delivery boy', by: admin.id },
      { status: 'delivered', notes: 'Delivered to customer', by: boys[0].id  },
    ],
    payment: { method: 'cod', status: 'completed' },
    deliveryBoyId: boys[0].id, deliveryStatus: 'delivered', deliveredAt: d(14),
  })

  // ORDER 2 — Delivered, Online, Arjun
  await createOrder({
    userId: customers[1].id, orderNum: 'ORD-20250602-002',
    items: [{ prodId: P[12].id, name: 'Whole Wheat Atta 10kg', qty: 1, price: 380 }, { prodId: P[13].id, name: 'Farm Fresh Eggs (12 pcs)', qty: 2, price: 120 }],
    total: 620, delivery: 25, commission: 10, shopEarning: 585,
    payStatus: 'paid', orderStatus: 'delivered', payMethod: 'online',
    shippingAddr: '23/B, Park Street, Salt Lake, Kolkata - 700091', createdAt: d(12),
    statusLogs: [
      { status: 'pending', notes: 'Order placed', by: customers[1].id },
      { status: 'confirmed', notes: 'Payment verified', by: admin.id },
      { status: 'out_for_delivery', notes: 'Assigned to delivery boy', by: admin.id },
      { status: 'delivered', notes: 'Delivered successfully', by: boys[1].id  },
    ],
    payment: { method: 'online', txnId: 'TXN20250602001', status: 'completed' },
    deliveryBoyId: boys[1].id, deliveryStatus: 'delivered', deliveredAt: d(11),
  })

  // ORDER 3 — Confirmed, Online, Suresh
  await createOrder({
    userId: customers[2].id, orderNum: 'ORD-20250605-003',
    items: [{ prodId: P[2].id, name: 'A2 Cow Ghee 500ml', qty: 1, price: 550 }, { prodId: P[6].id, name: 'Cashew Nuts 250g', qty: 2, price: 400 }],
    total: 1350, delivery: 40, commission: 10, shopEarning: 1300,
    payStatus: 'paid', orderStatus: 'confirmed', payMethod: 'online',
    shippingAddr: 'Plot 44, Jubilee Hills, Hyderabad - 500033', createdAt: d(8),
    statusLogs: [
      { status: 'pending', notes: 'Order placed', by: customers[2].id },
      { status: 'confirmed', notes: 'Payment approved by admin', by: admin.id },
    ],
    payment: { method: 'online', txnId: 'TXN20250605002', status: 'completed' },
    deliveryBoyId: boys[0].id, deliveryStatus: 'assigned',
  })

  // ORDER 4 — Pending, COD (no payment yet)
  await createOrder({
    userId: customers[0].id, orderNum: 'ORD-20250608-004',
    items: [{ prodId: P[14].id, name: 'Cold Pressed Coconut Oil 1L', qty: 1, price: 320 }],
    total: 350, delivery: 30, payStatus: 'pending', orderStatus: 'pending', payMethod: 'cod',
    shippingAddr: 'Flat 101, Lotus Apartments, Andheri West, Mumbai - 400058', createdAt: d(5),
    statusLogs: [{ status: 'pending', notes: 'Order placed, awaiting payment', by: customers[0].id }],
  })

  // ORDER 5 — Rejected by admin
  await createOrder({
    userId: customers[3].id, orderNum: 'ORD-20250609-005',
    items: [{ prodId: P[16].id, name: 'Organic Chia Seeds 250g', qty: 3, price: 350 }],
    total: 1050, delivery: 0, payStatus: 'failed', orderStatus: 'rejected', payMethod: 'online',
    shippingAddr: '12/3, HSR Layout, Bangalore - 560102', createdAt: d(4),
    statusLogs: [
      { status: 'pending', notes: 'Order placed', by: customers[3].id },
      { status: 'rejected', notes: 'Payment verification failed. Screenshot unclear, please resubmit.', by: admin.id },
    ],
    payment: { method: 'online', txnId: 'TXN20250609003', status: 'failed' },
  })

  // ORDER 6 — Delivered, COD, Suresh
  await createOrder({
    userId: customers[4].id, orderNum: 'ORD-20250603-006',
    items: [{ prodId: P[7].id, name: 'Red Chilli Powder 100g', qty: 4, price: 45 }, { prodId: P[8].id, name: 'Jaggery Block 1kg', qty: 2, price: 90 }],
    total: 360, delivery: 20, commission: 10, shopEarning: 330,
    payStatus: 'paid', orderStatus: 'delivered', payMethod: 'cod',
    shippingAddr: '78, Civil Lines, Lucknow - 226001', createdAt: d(10),
    statusLogs: [
      { status: 'pending', notes: 'Order placed', by: customers[4].id },
      { status: 'confirmed', notes: 'Order confirmed', by: admin.id },
      { status: 'delivered', notes: 'Delivered to customer', by: boys[0].id  },
    ],
    payment: { method: 'cod', status: 'completed' },
    deliveryBoyId: boys[0].id, deliveryStatus: 'delivered', deliveredAt: d(9),
  })

  // ORDER 7 — Out for delivery, Online, Arjun
  await createOrder({
    userId: customers[3].id, orderNum: 'ORD-20250610-007',
    items: [{ prodId: P[18].id, name: 'Herbal Hair Oil 200ml', qty: 2, price: 180 }, { prodId: P[5].id, name: 'Green Tea 50 Bags', qty: 1, price: 250 }],
    total: 610, delivery: 25, commission: 10, shopEarning: 575,
    payStatus: 'paid', orderStatus: 'out_for_delivery', payMethod: 'online',
    shippingAddr: '12/3, HSR Layout, Bangalore - 560102', createdAt: d(2),
    statusLogs: [
      { status: 'pending', notes: 'Order placed', by: customers[3].id },
      { status: 'confirmed', notes: 'Payment verified', by: admin.id },
      { status: 'out_for_delivery', notes: 'Picked up by delivery partner', by: admin.id },
    ],
    payment: { method: 'online', txnId: 'TXN20250610004', status: 'completed' },
    deliveryBoyId: boys[1].id, deliveryStatus: 'picked_up',
  })

  // ORDER 8 — Delivered, Online, Suresh (customer 2 second order)
  await createOrder({
    userId: customers[1].id, orderNum: 'ORD-20250604-008',
    items: [{ prodId: P[15].id, name: 'Almond Butter 500g', qty: 1, price: 520 }, { prodId: P[4].id, name: 'Organic Forest Honey 500g', qty: 1, price: 450 }],
    total: 970, delivery: 30, commission: 10, shopEarning: 930,
    payStatus: 'paid', orderStatus: 'delivered', payMethod: 'online',
    shippingAddr: '23/B, Park Street, Salt Lake, Kolkata - 700091', createdAt: d(9),
    statusLogs: [
      { status: 'pending', notes: 'Order placed', by: customers[1].id },
      { status: 'confirmed', notes: 'Confirmed', by: admin.id },
      { status: 'out_for_delivery', notes: 'Out for delivery', by: admin.id },
      { status: 'delivered', notes: 'Delivered', by: boys[0].id  },
    ],
    payment: { method: 'online', txnId: 'TXN20250604005', status: 'completed' },
    deliveryBoyId: boys[0].id, deliveryStatus: 'delivered', deliveredAt: d(8),
  })

  // ORDER 9 — Cancelled by customer
  await createOrder({
    userId: customers[4].id, orderNum: 'ORD-20250607-009',
    items: [{ prodId: P[2].id, name: 'A2 Cow Ghee 500ml', qty: 1, price: 550 }],
    total: 580, delivery: 30, payStatus: 'refunded', orderStatus: 'cancelled', payMethod: 'online',
    shippingAddr: '78, Civil Lines, Lucknow - 226001', createdAt: d(6),
    statusLogs: [
      { status: 'pending', notes: 'Order placed', by: customers[4].id },
      { status: 'confirmed', notes: 'Confirmed', by: admin.id },
      { status: 'cancelled', notes: 'Customer requested cancellation. Refund initiated.', by: admin.id },
    ],
    payment: { method: 'online', txnId: 'TXN20250607006', status: 'refunded' },
  })

  // ORDER 10 — Delivered, COD, Arjun (customer 3)
  await createOrder({
    userId: customers[2].id, orderNum: 'ORD-20250606-010',
    items: [{ prodId: P[20].id, name: 'Ground Coffee 250g', qty: 2, price: 280 }, { prodId: P[9].id, name: 'Peanut Butter 500g', qty: 1, price: 280 }],
    total: 840, delivery: 25, commission: 10, shopEarning: 805,
    payStatus: 'paid', orderStatus: 'delivered', payMethod: 'cod',
    shippingAddr: 'Plot 44, Jubilee Hills, Hyderabad - 500033', createdAt: d(7),
    statusLogs: [
      { status: 'pending', notes: 'Order placed', by: customers[2].id },
      { status: 'confirmed', notes: 'Confirmed', by: admin.id },
      { status: 'delivered', notes: 'Delivered', by: boys[1].id  },
    ],
    payment: { method: 'cod', status: 'completed' },
    deliveryBoyId: boys[1].id, deliveryStatus: 'delivered', deliveredAt: d(6),
  })

  // ORDER 11 — Pending, Online payment awaiting verification
  await createOrder({
    userId: customers[4].id, orderNum: 'ORD-20250611-011',
    items: [{ prodId: P[11].id, name: 'Roasted Chana 500g', qty: 3, price: 120 }],
    total: 360, delivery: 20, payStatus: 'pending', orderStatus: 'pending', payMethod: 'online',
    shippingAddr: '78, Civil Lines, Lucknow - 226001', createdAt: d(1),
    statusLogs: [{ status: 'pending', notes: 'Order placed, payment screenshot uploaded - awaiting admin review', by: customers[4].id }],
    payment: { method: 'online', txnId: 'TXN20250611007', status: 'pending' },
  })

  // ORDER 12 — Delivered, COD, Suresh (customer 3 again)
  await createOrder({
    userId: customers[2].id, orderNum: 'ORD-20250601-012',
    items: [{ prodId: P[3].id, name: 'Turmeric Powder 200g', qty: 2, price: 80 }, { prodId: P[12].id, name: 'Whole Wheat Atta 10kg', qty: 1, price: 380 }],
    total: 460, delivery: 25, commission: 10, shopEarning: 425,
    payStatus: 'paid', orderStatus: 'delivered', payMethod: 'cod',
    shippingAddr: 'Plot 44, Jubilee Hills, Hyderabad - 500033', createdAt: d(14),
    statusLogs: [
      { status: 'pending', notes: 'Order placed', by: customers[2].id },
      { status: 'confirmed', notes: 'Confirmed', by: admin.id },
      { status: 'delivered', notes: 'Delivered', by: boys[0].id  },
    ],
    payment: { method: 'cod', status: 'completed' },
    deliveryBoyId: boys[0].id, deliveryStatus: 'delivered', deliveredAt: d(13),
  })

  // ORDER 13 — Need-based order (orderType: 'need'), delivered
  await createOrder({
    userId: customers[0].id, orderNum: 'ORD-20250605-013',
    items: [{ prodId: P[0].id, name: 'Organic Basmati Rice 5kg', qty: 2, price: 450 }, { prodId: P[14].id, name: 'Cold Pressed Coconut Oil 1L', qty: 1, price: 320 }],
    total: 1250, delivery: 30, commission: 10, shopEarning: 1210,
    payStatus: 'paid', orderStatus: 'delivered', payMethod: 'online', orderType: 'need',
    shippingAddr: 'Flat 101, Lotus Apartments, Andheri West, Mumbai - 400058', createdAt: d(8),
    statusLogs: [
      { status: 'pending', notes: 'Need-based order placed', by: customers[0].id },
      { status: 'confirmed', notes: 'Offer accepted, order confirmed', by: admin.id },
      { status: 'delivered', notes: 'Delivered by delivery boy', by: boys[0].id  },
    ],
    payment: { method: 'online', txnId: 'TXN20250605008', status: 'completed' },
    deliveryBoyId: boys[0].id, deliveryStatus: 'delivered', deliveredAt: d(7),
  })

  // ══════════════════════════════════════════
  // 8. WALLET TRANSACTIONS & WITHDRAWALS
  // ══════════════════════════════════════════
  await Promise.all([
    // Suresh's wallet
    db.walletTransaction.create({ data: { deliveryBoyId: boys[0].id, type: 'credit', amount: 60, description: 'Delivery earning - Order ORD-20250601-001', orderId: o1.id, createdAt: d(14) } }),
    db.walletTransaction.create({ data: { deliveryBoyId: boys[0].id, type: 'credit', amount: 50, description: 'Delivery earning - Order ORD-20250603-006', createdAt: d(9) } }),
    db.walletTransaction.create({ data: { deliveryBoyId: boys[0].id, type: 'credit', amount: 55, description: 'Delivery earning - Order ORD-20250604-008', createdAt: d(8) } }),
    db.walletTransaction.create({ data: { deliveryBoyId: boys[0].id, type: 'credit', amount: 50, description: 'Delivery earning - Order ORD-20250601-012', createdAt: d(13) } }),
    db.walletTransaction.create({ data: { deliveryBoyId: boys[0].id, type: 'credit', amount: 60, description: 'Delivery earning - Order ORD-20250605-013', createdAt: d(7) } }),
    db.walletTransaction.create({ data: { deliveryBoyId: boys[0].id, type: 'debit', amount: 500, description: 'Withdrawal to UPI', createdAt: d(3) } }),
    // Arjun's wallet
    db.walletTransaction.create({ data: { deliveryBoyId: boys[1].id, type: 'credit', amount: 50, description: 'Delivery earning - Order ORD-20250602-002', createdAt: d(11) } }),
    db.walletTransaction.create({ data: { deliveryBoyId: boys[1].id, type: 'credit', amount: 45, description: 'Delivery earning - Order ORD-20250606-010', createdAt: d(6) } }),
    db.walletTransaction.create({ data: { deliveryBoyId: boys[1].id, type: 'debit', amount: 300, description: 'Withdrawal to UPI', createdAt: d(4) } }),
  ])

  // Withdrawals
  await Promise.all([
    db.withdrawal.create({ data: { deliveryBoyId: boys[0].id, amount: 500, status: 'completed', upiId: 'suresh@upi', adminNotes: 'Approved and transferred', processedBy: admin.id, processedAt: d(3), createdAt: d(3) } }),
    db.withdrawal.create({ data: { deliveryBoyId: boys[0].id, amount: 800, status: 'pending', upiId: 'suresh@upi', createdAt: d(1) } }),
    db.withdrawal.create({ data: { deliveryBoyId: boys[1].id, amount: 300, status: 'completed', upiId: 'arjun@upi', adminNotes: 'Processed', processedBy: admin.id, processedAt: d(4), createdAt: d(4) } }),
  ])

  // ══════════════════════════════════════════
  // 9. NEEDS — 7 needs with various statuses
  // ══════════════════════════════════════════
  const needs = await Promise.all([
    db.need.create({ data: { userId: customers[1].id, title: 'Need organic vegetables for weekly meal prep', description: 'Looking for fresh organic vegetables including tomatoes, onions, capsicum, beans, and carrots. About 2kg each.', priceType: 'minmax', minPrice: 500, maxPrice: 800, urgency: '1 day', status: 'active' } }),
    db.need.create({ data: { userId: customers[0].id, title: 'Gluten-free flour and bread', description: 'Need gluten-free atta and bread for dietary requirements. 5kg atta and 2 loaves of bread.', priceType: 'exact', exactPrice: 600, urgency: '2 hours', status: 'confirmed' } }),
    db.need.create({ data: { userId: customers[2].id, title: 'Festival sweets pack for Diwali', description: 'Need a box of assorted Indian sweets for a small family gathering. About 1kg total - kaju katli, gulab jamun, rasgulla.', priceType: 'unknown', urgency: '1-2 days', status: 'completed' } }),
    db.need.create({ data: { userId: customers[3].id, title: 'Baby food supplies', description: 'Need organic baby cereal, pureed fruits, and formula milk for a 6-month old. Monthly stock needed.', priceType: 'minmax', minPrice: 2000, maxPrice: 3500, urgency: '3-5 days', status: 'active' } }),
    db.need.create({ data: { userId: customers[4].id, title: 'Party snacks and drinks', description: 'Hosting a house party for 15 people. Need chips, namkeen, cold drinks, and ice cream.', priceType: 'minmax', minPrice: 1500, maxPrice: 2500, urgency: '5 hours', status: 'expired' } }),
    db.need.create({ data: { userId: customers[1].id, title: 'South Indian breakfast items', description: 'Need idli batter, dosa batter, coconut chutney, sambar powder, and filter coffee. Weekly requirement.', priceType: 'exact', exactPrice: 400, urgency: '1 day', status: 'active' } }),
    db.need.create({ data: { userId: customers[3].id, title: 'Protein supplements and health drinks', description: 'Need whey protein 1kg, BCAA, and multivitamins. Prefer Optimum Nutrition or MuscleBlaze.', priceType: 'minmax', minPrice: 3000, maxPrice: 5000, urgency: '3-5 days', status: 'confirmed' } }),
  ])

  // Need Comments
  await Promise.all([
    db.needComment.create({ data: { needId: needs[0].id, userId: deliveryUsers[0].id, comment: 'I can source these from the local organic farm. Will take about 3 hours.' } }),
    db.needComment.create({ data: { needId: needs[0].id, userId: customers[1].id, comment: 'That works! Please proceed and send the offer.' } }),
    db.needComment.create({ data: { needId: needs[1].id, userId: deliveryUsers[0].id, comment: 'I have gluten-free bread available. Let me check for the atta at my regular shop.' } }),
    db.needComment.create({ data: { needId: needs[1].id, userId: customers[0].id, comment: 'Sure, let me know the total price.' } }),
    db.needComment.create({ data: { needId: needs[3].id, userId: deliveryUsers[1].id, comment: 'I know a shop that specializes in organic baby food. Let me check availability.' } }),
    db.needComment.create({ data: { needId: needs[5].id, userId: deliveryUsers[1].id, comment: 'I can get fresh idli/dosa batter from a local Chennai vendor. Coffee too!' } }),
  ])

  // Offers on needs
  await Promise.all([
    db.offer.create({ data: { needId: needs[0].id, customerId: customers[1].id, deliveryBoyId: boys[0].id, offerAmount: 650, message: 'I can get these fresh from the organic farm. Tomatoes, onions, capsicum, beans, carrots all available.', status: 'sent' } }),
    db.offer.create({ data: { needId: needs[1].id, customerId: customers[0].id, deliveryBoyId: boys[0].id, offerAmount: 550, message: 'Found gluten-free atta (5kg) and bread (2 loaves) at a health store nearby.', status: 'accepted' } }),
    db.offer.create({ data: { needId: needs[2].id, customerId: customers[2].id, deliveryBoyId: boys[1].id, offerAmount: 850, message: 'Assorted sweet box from a popular mithai shop - 1kg kaju katli, gulab jamun, rasgulla mix.', status: 'accepted' } }),
    db.offer.create({ data: { needId: needs[3].id, customerId: customers[3].id, deliveryBoyId: boys[1].id, offerAmount: 2800, message: 'Found a good deal on organic baby food supplies. All items available.', status: 'sent' } }),
    db.offer.create({ data: { needId: needs[5].id, customerId: customers[1].id, deliveryBoyId: boys[1].id, offerAmount: 380, message: 'Fresh idli batter, dosa batter, coconut chutney, sambar powder and filter coffee powder.', status: 'sent' } }),
    db.offer.create({ data: { needId: needs[6].id, customerId: customers[3].id, deliveryBoyId: boys[0].id, offerAmount: 3200, message: 'MuscleBlaze whey 1kg + BCAA + multivitamins available at a supplement store.', status: 'accepted' } }),
  ])

  // ══════════════════════════════════════════
  // 10. RATINGS & REVIEWS
  // ══════════════════════════════════════════
  await Promise.all([
    db.ratingsReview.create({ data: { userId: customers[0].id, targetType: 'delivery', targetId: boys[0].id, rating: 5, review: 'Very fast delivery! Suresh was polite and on time.' } }),
    db.ratingsReview.create({ data: { userId: customers[1].id, targetType: 'delivery', targetId: boys[1].id, rating: 4, review: 'Good service. Arjun delivered on time.' } }),
    db.ratingsReview.create({ data: { userId: customers[2].id, targetType: 'delivery', targetId: boys[0].id, rating: 5, review: 'Excellent! Suresh is always reliable.' } }),
    db.ratingsReview.create({ data: { userId: customers[4].id, targetType: 'delivery', targetId: boys[0].id, rating: 4, review: 'Nice delivery, minor delay but communicated well.' } }),
    db.ratingsReview.create({ data: { userId: customers[2].id, targetType: 'delivery', targetId: boys[1].id, rating: 4, review: 'Arjun was friendly and careful with the package.' } }),
    db.ratingsReview.create({ data: { userId: customers[0].id, targetType: 'product', targetId: P[0].id, rating: 5, review: 'Best basmati rice! Aged perfectly, great aroma.' } }),
    db.ratingsReview.create({ data: { userId: customers[1].id, targetType: 'product', targetId: P[12].id, rating: 4, review: 'Good quality atta, soft rotis every time.' } }),
  ])

  // ══════════════════════════════════════════
  // 11. NOTIFICATIONS
  // ══════════════════════════════════════════
  await Promise.all([
    db.notification.create({ data: { userId: admin.id, title: 'New Payment Received', message: '₹1,250.00 payment for order ORD-20250611-011. Please review the screenshot.', isRead: false, type: 'new_payment' } }),
    db.notification.create({ data: { userId: admin.id, title: 'Withdrawal Request', message: 'Suresh Kumar requested ₹800.00 withdrawal to UPI.', isRead: false, type: 'withdrawal_request' } }),
    db.notification.create({ data: { userId: admin.id, title: 'New Shop Owner Application', message: 'A new shop owner has applied for registration.', isRead: true, type: 'new_shop_application' } }),
    db.notification.create({ data: { userId: customers[0].id, title: 'Payment Approved!', message: 'Your payment for Order ORD-20250601-001 has been approved.', isRead: true, type: 'payment_approved' } }),
    db.notification.create({ data: { userId: customers[1].id, title: 'Order Delivered!', message: 'Your order ORD-20250602-002 has been delivered successfully.', isRead: true, type: 'order_delivered' } }),
    db.notification.create({ data: { userId: customers[2].id, title: 'Order Confirmed', message: 'Your order ORD-20250605-003 has been confirmed!', isRead: false, type: 'order_confirmed' } }),
    db.notification.create({ data: { userId: customers[3].id, title: 'Payment Rejected', message: 'Payment for order ORD-20250609-005 was rejected. Please resubmit.', isRead: false, type: 'payment_rejected' } }),
    db.notification.create({ data: { userId: deliveryUsers[0].id, title: 'New Delivery Assigned', message: 'You have been assigned order ORD-20250605-003.', isRead: false, type: 'new_delivery' } }),
    db.notification.create({ data: { userId: deliveryUsers[1].id, title: 'New Delivery Assigned', message: 'You have been assigned order ORD-20250610-007.', isRead: false, type: 'new_delivery' } }),
    db.notification.create({ data: { userId: shopUsers[0].id, title: 'Product Approved', message: 'Your product Organic Basmati Rice 5kg has been approved!', isRead: true, type: 'product_approved' } }),
    db.notification.create({ data: { userId: shopUsers[0].id, title: 'Product Rejected', message: 'Your product Used Mobile Phone was rejected. Reason: Not a grocery item.', isRead: true, type: 'product_rejected' } }),
    db.notification.create({ data: { userId: customers[4].id, title: 'Refund Processed', message: 'Refund for cancelled order ORD-20250607-009 has been initiated.', isRead: true, type: 'refund' } }),
  ])

  // ══════════════════════════════════════════
  // 12. ADMIN ACTIVITY LOGS
  // ══════════════════════════════════════════
  await Promise.all([
    db.adminActivityLog.create({ data: { adminId: admin.id, action: 'approve', tableName: 'shop_owners', recordId: shops[0].id, message: 'Approved shop: Ramesh Grocery & Provisions' } }),
    db.adminActivityLog.create({ data: { adminId: admin.id, action: 'approve', tableName: 'shop_owners', recordId: shops[1].id, message: 'Approved shop: Meena Organic Store' } }),
    db.adminActivityLog.create({ data: { adminId: admin.id, action: 'approve', tableName: 'delivery_boys', recordId: boys[0].id, message: 'Approved delivery boy: Suresh Kumar' } }),
    db.adminActivityLog.create({ data: { adminId: admin.id, action: 'approve', tableName: 'delivery_boys', recordId: boys[1].id, message: 'Approved delivery boy: Arjun Nair' } }),
    db.adminActivityLog.create({ data: { adminId: admin.id, action: 'approve', tableName: 'products', recordId: P[0].id, message: 'Approved product: Organic Basmati Rice 5kg' } }),
    db.adminActivityLog.create({ data: { adminId: admin.id, action: 'reject', tableName: 'products', recordId: P[0].id, message: 'Rejected product: Used Mobile Phone - Not a grocery item' } }),
    db.adminActivityLog.create({ data: { adminId: admin.id, action: 'reject', tableName: 'products', recordId: P[0].id, message: 'Rejected product: Expired Canned Beans - Product expired' } }),
    db.adminActivityLog.create({ data: { adminId: admin.id, action: 'assign_delivery', tableName: 'orders', recordId: o1.id, message: 'Assigned Suresh Kumar to order ORD-20250601-001' } }),
    db.adminActivityLog.create({ data: { adminId: admin.id, action: 'process_withdrawal', tableName: 'withdrawals', recordId: 1, message: 'Processed withdrawal of ₹500 for Suresh Kumar' } }),
  ])

  // ══════════════════════════════════════════
  // 13. SETTINGS
  // ══════════════════════════════════════════
  await Promise.all([
    db.settings.create({ data: { settingKey: 'payment_qr_data', settingValue: 'upi://pay?pa=freshkart@ybl&pn=FreshKart&am=0&cu=INR' } }),
    db.settings.create({ data: { settingKey: 'platform_fee_per_order', settingValue: '10' } }),
    db.settings.create({ data: { settingKey: 'delivery_fee', settingValue: '30' } }),
    db.settings.create({ data: { settingKey: 'delivery_earning_per_order', settingValue: '30' } }),
    db.settings.create({ data: { settingKey: 'free_delivery_threshold', settingValue: '500' } }),
  ])

  // ══════════════════════════════════════════
  // DONE — PRINT SUMMARY
  // ══════════════════════════════════════════
  const allProducts = await db.product.findMany()
  const allOrders = await db.order.findMany()
  const allNeeds = await db.need.findMany()
  const allUsers = await db.user.findMany()

  console.log('\n✅ Seed completed successfully!\n')
  console.log('📊 DATA SUMMARY:')
  console.log(`  Users: ${allUsers.length} (admin: ${allUsers.filter(u => u.role === 'admin').length}, customers: ${allUsers.filter(u => u.role === 'customer').length}, shops: ${allUsers.filter(u => u.role === 'shop').length}, delivery: ${allUsers.filter(u => u.role === 'delivery').length})`)
  console.log(`  Products: ${allProducts.length} (approved: ${allProducts.filter(p => p.status === 'approved').length}, pending: ${allProducts.filter(p => p.status === 'pending').length}, rejected: ${allProducts.filter(p => p.status === 'rejected').length}, sold-out: ${allProducts.filter(p => p.status === 'approved' && p.stock === 0).length})`)
  console.log(`  Orders: ${allOrders.length} (delivered: ${allOrders.filter(o => o.orderStatus === 'delivered').length}, confirmed: ${allOrders.filter(o => o.orderStatus === 'confirmed').length}, pending: ${allOrders.filter(o => o.orderStatus === 'pending').length}, out_for_delivery: ${allOrders.filter(o => o.orderStatus === 'out_for_delivery').length}, rejected: ${allOrders.filter(o => o.orderStatus === 'rejected').length}, cancelled: ${allOrders.filter(o => o.orderStatus === 'cancelled').length})`)
  console.log(`  Needs: ${allNeeds.length} (active: ${allNeeds.filter(n => n.status === 'active').length}, confirmed: ${allNeeds.filter(n => n.status === 'confirmed').length}, completed: ${allNeeds.filter(n => n.status === 'completed').length}, expired: ${allNeeds.filter(n => n.status === 'expired').length})`)
  console.log('\n🔑 LOGIN CREDENTIALS (all passwords: password123)')
  console.log('  Admin:       admin@freshkart.com')
  console.log('  Customers:   rahul@mail.com, priya@mail.com, amit.v@mail.com, sneha@mail.com, vikram@mail.com')
  console.log('  Shop Owners: ramesh@shop.com, meena@shop.com')
  console.log('  Delivery:    suresh@delivery.com, arjun@delivery.com')
}

seed()
  .catch(e => { console.error('Seed failed:', e); process.exit(1) })
  .finally(() => db.$disconnect())
