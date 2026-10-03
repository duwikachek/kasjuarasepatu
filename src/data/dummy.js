// Dummy Data Awal untuk Kas Juara Sepatu (Toko Sepatu & Sandal)

export const INITIAL_DATA = {
  shop: {
    name: "Kas Juara Sepatu",
    subName: "Cengkareng Jakarta Barat",
    owner: "Pak Hendra",
    phone: "081234567890",
    address: "Jl. Veteran No. 45, Bandung",
    pin: "123456",
    autoLock: true,
    biometrics: true,
    initialBalanceLaci: 8450000,
    initialBalanceBank: 6400000,
  },
  
  // Transaksi Kas Masuk & Kas Keluar
  transactions: [
    {
      id: "TRX-101",
      type: "masuk",
      category: "Penjualan Toko / Kasir",
      amount: 438000,
      title: "Penjualan Sepatu Compass Gazelle Low Black (Size 42)",
      paymentMethod: "Tunai (Laci)",
      date: "2024-10-24",
      time: "14:20 WIB",
      nota: "#NOTA-8821"
    },
    {
      id: "TRX-102",
      type: "masuk",
      category: "Penjualan Toko / Kasir",
      amount: 269000,
      title: "Sepatu Ventela Public Low Black Natural (Size 41)",
      paymentMethod: "QRIS / Transfer",
      date: "2024-10-24",
      time: "13:45 WIB",
      nota: "#NOTA-8820"
    },
    {
      id: "TRX-103",
      type: "keluar",
      category: "Biaya Operasional",
      amount: 45000,
      title: "Makan Siang 2 Karyawan + Es Teh Toko",
      paymentMethod: "Tunai (Laci)",
      date: "2024-10-24",
      time: "12:15 WIB",
      nota: "#OPS-104"
    },
    {
      id: "TRX-104",
      type: "masuk",
      category: "Penjualan Eceran",
      amount: 75000,
      title: "1x Shoe Cleaner Juara + 1x Kaos Kaki Oldschool",
      paymentMethod: "Tunai (Laci)",
      date: "2024-10-24",
      time: "11:10 WIB",
      nota: "#NOTA-8819"
    },
    {
      id: "TRX-105",
      type: "keluar",
      category: "Biaya Perlengkapan",
      amount: 85000,
      title: "Beli Lakban, Dus Sepatu Polos & Bubble Wrap",
      paymentMethod: "Tunai (Laci)",
      date: "2024-10-24",
      time: "10:30 WIB",
      nota: "#OPS-103"
    },
    {
      id: "TRX-106",
      type: "masuk",
      category: "Pelunasan Piutang",
      amount: 300000,
      title: "Cicilan Bon Sepatu Sneaker (Mas Doni)",
      paymentMethod: "QRIS / Transfer",
      date: "2024-10-24",
      time: "09:15 WIB",
      nota: "#BON-044"
    },
    {
      id: "TRX-107",
      type: "keluar",
      category: "Listrik & Utilitas",
      amount: 350000,
      title: "Token Listrik Toko + Internet Indihome Oktober",
      paymentMethod: "Transfer Bank BCA",
      date: "2024-10-23",
      time: "16:40 WIB",
      nota: "#BIL-098"
    },
    {
      id: "TRX-108",
      type: "masuk",
      category: "Penjualan Toko / Kasir",
      amount: 540000,
      title: "2x Sepatu Sandal Slip-on Kulit Sentosa",
      paymentMethod: "Tunai (Laci)",
      date: "2024-10-23",
      time: "15:20 WIB",
      nota: "#NOTA-8818"
    },
    {
      id: "TRX-109",
      type: "masuk",
      category: "Penjualan Grosir",
      amount: 1250000,
      title: "Grosir 10 Pasang Sandal Slop Kulit ke Toko Berkah",
      paymentMethod: "Transfer Bank BCA",
      date: "2024-10-23",
      time: "11:00 WIB",
      nota: "#GROSIR-012"
    },
    {
      id: "TRX-110",
      type: "keluar",
      category: "Belanja Barang",
      amount: 1500000,
      title: "DP Pasok Belanja Sepatu Pabrik Cibaduyut",
      paymentMethod: "Transfer Bank BCA",
      date: "2024-10-22",
      time: "14:10 WIB",
      nota: "#PASOK-DP1"
    }
  ],

  // Faktur Barang Masuk (Belanja Sepatu)
  supplies: [
    {
      id: "PASOK-01",
      invoiceNo: "#FAK-PASOK-102",
      supplierName: "CV Juara Footwear Bandung",
      supplierPhone: "081398765432",
      date: "2024-10-24",
      status: "lunas",
      paymentMethod: "Transfer BCA",
      itemsCount: 15,
      totalAmount: 3450000,
      items: [
        { name: "Ventela Public Low Black (Size 39-43)", qty: 10, buyPrice: 185000, sellPrice: 269000 },
        { name: "Compass Gazelle Low Retro (Size 40-42)", qty: 5, buyPrice: 320000, sellPrice: 438000 }
      ]
    },
    {
      id: "PASOK-02",
      invoiceNo: "#FAK-PASOK-098",
      supplierName: "Sentosa Shoes Cibaduyut",
      supplierPhone: "087811223344",
      date: "2024-10-22",
      status: "tempo",
      dueDate: "2024-10-30",
      paymentMethod: "Tempo (Bon Suplier)",
      itemsCount: 23,
      totalAmount: 2800000,
      items: [
        { name: "Sandal Slop Kulit Pria Asli", qty: 15, buyPrice: 90000, sellPrice: 145000 },
        { name: "Sepatu Pantofel Pria Oxford", qty: 8, buyPrice: 180000, sellPrice: 275000 }
      ]
    },
    {
      id: "PASOK-03",
      invoiceNo: "#FAK-PASOK-095",
      supplierName: "Distributor Sneaker Nusantara",
      supplierPhone: "081299887766",
      date: "2024-10-18",
      status: "lunas",
      paymentMethod: "Tunai Laci",
      itemsCount: 12,
      totalAmount: 2160000,
      items: [
        { name: "Piero Jogger Premium Grey", qty: 12, buyPrice: 180000, sellPrice: 289000 }
      ]
    }
  ],

  // Data Stok Sepatu (untuk alert di dashboard & form)
  inventory: [
    { id: "INV-01", barcode: "COMPASS-42", name: "Compass Gazelle Low Black 42", stock: 2, minStock: 5, price: 438000, buyPrice: 320000, kondisi: "Bagus", isCritical: true },
    { id: "INV-02", barcode: "AERO-41", name: "Aerostreet Massive High White 41", stock: 1, minStock: 4, price: 149000, buyPrice: 105000, kondisi: "Minus", catatanMinus: "Box sedikit penyok", isCritical: true },
    { id: "INV-03", barcode: "VENTELA-40", name: "Ventela Public Low Black Natural 40", stock: 14, minStock: 5, price: 269000, buyPrice: 185000, kondisi: "Bagus", isCritical: false },
    { id: "INV-04", barcode: "SLOP-41", name: "Sandal Slop Pria Kulit Asli 41", stock: 18, minStock: 6, price: 145000, buyPrice: 90000, kondisi: "Bagus", isCritical: false },
    { id: "INV-05", barcode: "CLEANER-100", name: "Shoe Cleaner Juara Foam 100ml", stock: 22, minStock: 10, price: 45000, buyPrice: 22000, kondisi: "Bagus", isCritical: false }
  ],

  // Master Katalog Produk Barcode (Stiker Code 39 Excel)
  products: [
    {
      barcode: "SP-2024-0089",
      name: "Compass Gazelle Low Retro Size 40-43",
      kondisi: "Bagus",
      catatanMinus: "",
      photo: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80",
      buyPrice: 185000,
      sellPrice: 269000,
      stock: 10,
      supplier: "CV Juara Footwear Bandung"
    },
    {
      barcode: "VENTELA-41",
      name: "Ventela Public Low Black Natural Size 41",
      kondisi: "Bagus",
      catatanMinus: "",
      photo: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=400&q=80",
      buyPrice: 185000,
      sellPrice: 269000,
      stock: 12,
      supplier: "CV Juara Footwear Bandung"
    },
    {
      barcode: "PIERO-JGR",
      name: "Piero Jogger Premium Grey Size 42",
      kondisi: "Minus",
      catatanMinus: "Ada noda sol luar tipis dari pabrik",
      photo: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=400&q=80",
      buyPrice: 180000,
      sellPrice: 249000,
      stock: 5,
      supplier: "Distributor Sneaker Nusantara"
    },
    {
      barcode: "SLOP-KLT",
      name: "Sandal Slop Kulit Pria Asli Sentosa Size 41",
      kondisi: "Bagus",
      catatanMinus: "",
      photo: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=400&q=80",
      buyPrice: 90000,
      sellPrice: 145000,
      stock: 15,
      supplier: "Sentosa Shoes Cibaduyut"
    }
  ],
  investors: [
    {
      id: "INV-1711000001",
      investorName: "H. Bambang Soedirjo",
      date: "2026-03-01",
      dueDate: "2026-09-01",
      totalAmount: 15000000,
      tenor: 6,
      cicilan: 2500000,
      status: "aktif",
      notes: "Suntikan modal ekspansi stok lebaran dan display toko",
      paymentMethod: "Transfer Bank",
      createdAt: "2026-03-01T08:00:00.000Z"
    },
    {
      id: "INV-1711000002",
      investorName: "Ibu Ratna Kumalasari",
      date: "2026-02-15",
      dueDate: "2026-08-15",
      totalAmount: 10000000,
      tenor: 6,
      cicilan: 1666667,
      status: "aktif",
      notes: "Modal belanja sneaker lokal Ventela & Compass",
      paymentMethod: "Transfer Bank",
      createdAt: "2026-02-15T10:00:00.000Z"
    }
  ]
};
