export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { client } = req.query;

  const reconciliation = {
    sharma: {
      client: 'Sharma Pharmaceuticals Pvt. Ltd.',
      gstin: '27AAACS1234F1ZA',
      period: 'April 2026',
      tallyEntries: 847,
      gstr2bEntries: 839,
      matched: 831,
      matchRate: 98.1,
      inTallyNotGstr2b: [
        { invoice: 'PI-2026-0409', vendor: 'Apex Chemical Suppliers', amount: 96200, gst: 11544, hsn: '2934', reason: 'Invoice not uploaded by vendor' },
        { invoice: 'PI-2026-0408', vendor: 'Apex Chemical Suppliers', amount: 78400, gst: 9408, hsn: '2933', reason: 'Amount mismatch — vendor filed ₹76,200' },
        { invoice: 'PI-2026-0392', vendor: 'Kumar Lab Equipment', amount: 42800, gst: 7704, hsn: '9027', reason: 'GSTIN mismatch — vendor used old GSTIN' },
        { invoice: 'PI-2026-0381', vendor: 'Sunrise Chemicals', amount: 28400, gst: 3408, hsn: '2933', reason: 'Invoice date mismatch — Tally: 8 Apr, GSTR-2B: 12 Apr' },
        { invoice: 'PI-2026-0376', vendor: 'Metro Packaging', amount: 18600, gst: 3348, hsn: '3923', reason: 'Not found in GSTR-2B — vendor may not have filed' },
        { invoice: 'PI-2026-0364', vendor: 'Reliable Transport Co.', amount: 12400, gst: 2232, hsn: '9965', reason: 'Reverse charge applicable — not in GSTR-2B' },
        { invoice: 'PI-2026-0358', vendor: 'Apex Chemical Suppliers', amount: 64200, gst: 7704, hsn: '2934', reason: 'Invoice number format mismatch' },
        { invoice: 'PI-2026-0342', vendor: 'Bharat Biotech Supplies', amount: 34600, gst: 4152, hsn: '3002', reason: 'Not found — vendor filing pending' }
      ],
      inGstr2bNotTally: [
        { invoice: 'INV-APX-4821', vendor: 'Apex Chemical Suppliers', amount: 42600, gst: 5112, hsn: '2933', reason: 'Purchase recorded in Tally under different invoice number' },
        { invoice: 'INV-MED-1204', vendor: 'Medline Diagnostics', amount: 28400, gst: 5112, hsn: '9018', reason: 'Not yet entered in Tally — goods received 28 Apr' },
        { invoice: 'INV-SUN-892', vendor: 'Sunrise Chemicals', amount: 18200, gst: 2184, hsn: '2933', reason: 'Credit note pending in Tally' },
        { invoice: 'INV-FDX-7721', vendor: 'FedEx Logistics India', amount: 8400, gst: 1512, hsn: '9965', reason: 'Freight invoice — pending entry' },
        { invoice: 'INV-PKG-3341', vendor: 'Piramal Glass Packaging', amount: 56800, gst: 10224, hsn: '7010', reason: 'Invoice received but not entered — in pending tray' },
        { invoice: 'INV-LAB-204', vendor: 'LabChem Industries', amount: 24000, gst: 2880, hsn: '2942', reason: 'New vendor — master not created in Tally' },
        { invoice: 'INV-TRN-4456', vendor: 'BlueDart Express', amount: 6200, gst: 1116, hsn: '9965', reason: 'Courier charges — pending approval' },
        { invoice: 'INV-RAW-8812', vendor: 'Ranbaxy Raw Materials', amount: 38400, gst: 4608, hsn: '2941', reason: 'Partial delivery — full invoice in GSTR-2B' }
      ],
      itcAtRisk: 21600,
      unclaimedItc: 18400,
      topVendorMismatch: 'Apex Chemical Suppliers',
      topVendorMismatchCount: 3,
      processingTime: 7.5,
      manualEquivalent: '3.5 hours'
    }
  };

  const data = reconciliation[client || 'sharma'] || reconciliation.sharma;

  return res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
}
