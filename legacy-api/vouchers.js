export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { client, type, month } = req.query;

  const vouchers = {
    sales: [
      { number: 'SI-2026-0847', date: '2026-04-28', party: 'Apollo Hospitals', amount: 184200, gst: 22104, hsn: '3004', type: 'Sales' },
      { number: 'SI-2026-0846', date: '2026-04-27', party: 'MedPlus Pharmacy Chain', amount: 96800, gst: 11616, hsn: '3004', type: 'Sales' },
      { number: 'SI-2026-0845', date: '2026-04-26', party: 'Max Healthcare', amount: 142000, gst: 17040, hsn: '3004', type: 'Sales' },
      { number: 'SI-2026-0844', date: '2026-04-25', party: 'Fortis Medical Store', amount: 68400, gst: 8208, hsn: '3004', type: 'Sales' },
      { number: 'SI-2026-0843', date: '2026-04-24', party: 'Cipla Distribution', amount: 248600, gst: 29832, hsn: '2933', type: 'Sales' }
    ],
    purchase: [
      { number: 'PI-2026-0412', date: '2026-04-22', party: 'Apex Chemical Suppliers', amount: 124600, gst: 14952, hsn: '2933', type: 'Purchase', itcEligible: true },
      { number: 'PI-2026-0411', date: '2026-04-20', party: 'Ranbaxy Raw Materials', amount: 86400, gst: 10368, hsn: '2941', type: 'Purchase', itcEligible: true },
      { number: 'PI-2026-0410', date: '2026-04-18', party: 'Piramal Glass Packaging', amount: 42000, gst: 7560, hsn: '7607', type: 'Purchase', itcEligible: true },
      { number: 'PI-2026-0409', date: '2026-04-15', party: 'Apex Chemical Suppliers', amount: 96200, gst: 11544, hsn: '2934', type: 'Purchase', itcEligible: true, mismatch: true, mismatchReason: 'Invoice not found in GSTR-2B' },
      { number: 'PI-2026-0408', date: '2026-04-12', party: 'Apex Chemical Suppliers', amount: 78400, gst: 9408, hsn: '2933', type: 'Purchase', itcEligible: true, mismatch: true, mismatchReason: 'Amount mismatch — Tally: ₹78,400, GSTR-2B: ₹76,200' },
      { number: 'PI-2026-0407', date: '2026-04-10', party: 'FedEx Logistics India', amount: 24800, gst: 4464, hsn: '9965', type: 'Purchase', itcEligible: true }
    ],
    payment: [
      { number: 'PMT-2026-0284', date: '2026-04-29', party: 'Ranbaxy Raw Materials', amount: 164000, bank: 'HDFC Bank', type: 'Payment' },
      { number: 'PMT-2026-0283', date: '2026-04-25', party: 'FedEx Logistics India', amount: 48200, bank: 'HDFC Bank', type: 'Payment' },
      { number: 'PMT-2026-0282', date: '2026-04-20', party: 'Employee Salaries - April', amount: 624000, bank: 'HDFC Bank', type: 'Payment' }
    ],
    receipt: [
      { number: 'RCT-2026-0196', date: '2026-04-28', party: 'Apollo Hospitals', amount: 428000, bank: 'HDFC Bank', type: 'Receipt' },
      { number: 'RCT-2026-0195', date: '2026-04-24', party: 'MedPlus Pharmacy Chain', amount: 312000, bank: 'HDFC Bank', type: 'Receipt' }
    ]
  };

  if (type && vouchers[type]) {
    return res.status(200).json({
      success: true,
      client: client || 'sharma',
      voucherType: type,
      data: vouchers[type],
      count: vouchers[type].length,
      total: vouchers[type].reduce((s, v) => s + v.amount, 0),
      timestamp: new Date().toISOString()
    });
  }

  const allCount = Object.values(vouchers).reduce((s, arr) => s + arr.length, 0);
  return res.status(200).json({
    success: true,
    client: client || 'sharma',
    data: vouchers,
    summary: {
      sales: { count: vouchers.sales.length, total: vouchers.sales.reduce((s, v) => s + v.amount, 0) },
      purchase: { count: vouchers.purchase.length, total: vouchers.purchase.reduce((s, v) => s + v.amount, 0) },
      payment: { count: vouchers.payment.length, total: vouchers.payment.reduce((s, v) => s + v.amount, 0) },
      receipt: { count: vouchers.receipt.length, total: vouchers.receipt.reduce((s, v) => s + v.amount, 0) }
    },
    totalVouchers: allCount,
    mismatches: vouchers.purchase.filter(v => v.mismatch).length,
    timestamp: new Date().toISOString()
  });
}
