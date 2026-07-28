export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { client, hsn } = req.query;

  const stockItems = {
    sharma: [
      { name: 'Paracetamol IP 500mg', hsn: '3004', gstRate: 12, unit: 'Nos', closingQty: 24000, closingValue: 168000, group: 'Finished Goods' },
      { name: 'Amoxicillin Trihydrate', hsn: '2941', gstRate: 12, unit: 'Kg', closingQty: 480, closingValue: 384000, group: 'Raw Materials' },
      { name: 'Pyrimidine Compounds (API)', hsn: '2933', gstRate: 12, unit: 'Kg', closingQty: 120, closingValue: 216000, group: 'Raw Materials', rateChanged: true, oldRate: 18 },
      { name: 'Diazinon Technical', hsn: '2933', gstRate: 12, unit: 'Kg', closingQty: 84, closingValue: 126000, group: 'Raw Materials', rateChanged: true, oldRate: 18 },
      { name: 'Piperazine Derivatives', hsn: '2933', gstRate: 12, unit: 'Kg', closingQty: 96, closingValue: 172800, group: 'Raw Materials', rateChanged: true, oldRate: 18 },
      { name: 'Barbituric Acid Compound', hsn: '2933', gstRate: 12, unit: 'Kg', closingQty: 42, closingValue: 63000, group: 'Raw Materials', rateChanged: true, oldRate: 18 },
      { name: 'Nucleic Acid Derivatives', hsn: '2934', gstRate: 12, unit: 'Kg', closingQty: 68, closingValue: 204000, group: 'Raw Materials', rateChanged: true, oldRate: 18 },
      { name: 'Sulfonamide Compounds', hsn: '2934', gstRate: 12, unit: 'Kg', closingQty: 52, closingValue: 93600, group: 'Raw Materials', rateChanged: true, oldRate: 18 },
      { name: 'Lactam Ring Intermediates', hsn: '2934', gstRate: 12, unit: 'Kg', closingQty: 38, closingValue: 114000, group: 'Raw Materials', rateChanged: true, oldRate: 18 },
      { name: 'Thiophene Derivatives', hsn: '2934', gstRate: 12, unit: 'Kg', closingQty: 24, closingValue: 48000, group: 'Raw Materials', rateChanged: true, oldRate: 18 },
      { name: 'Gelatin Capsules Size 0', hsn: '3913', gstRate: 18, unit: 'Nos', closingQty: 500000, closingValue: 125000, group: 'Packing Materials' },
      { name: 'Aluminium Blister Foil', hsn: '7607', gstRate: 18, unit: 'Kg', closingQty: 240, closingValue: 86400, group: 'Packing Materials' },
      { name: 'HDPE Containers 100ml', hsn: '3923', gstRate: 18, unit: 'Nos', closingQty: 12000, closingValue: 36000, group: 'Packing Materials' },
      { name: 'Ibuprofen BP 400mg', hsn: '3004', gstRate: 12, unit: 'Nos', closingQty: 18000, closingValue: 144000, group: 'Finished Goods' },
      { name: 'Omeprazole Capsules', hsn: '3004', gstRate: 12, unit: 'Nos', closingQty: 32000, closingValue: 288000, group: 'Finished Goods' }
    ],
    gupta: [
      { name: 'Brake Pad Assembly', hsn: '8708', gstRate: 28, unit: 'Set', closingQty: 840, closingValue: 504000, group: 'Auto Parts' },
      { name: 'Clutch Plate Kit', hsn: '8708', gstRate: 28, unit: 'Set', closingQty: 420, closingValue: 378000, group: 'Auto Parts' },
      { name: 'Shock Absorber Unit', hsn: '8708', gstRate: 28, unit: 'Nos', closingQty: 680, closingValue: 612000, group: 'Auto Parts' },
      { name: 'Heterocyclic Lubricant Additive', hsn: '2933', gstRate: 12, unit: 'Ltr', closingQty: 200, closingValue: 160000, group: 'Chemicals', rateChanged: true, oldRate: 18 },
      { name: 'Corrosion Inhibitor Compound', hsn: '2934', gstRate: 12, unit: 'Kg', closingQty: 150, closingValue: 112500, group: 'Chemicals', rateChanged: true, oldRate: 18 },
      { name: 'Engine Oil 15W-40', hsn: '2710', gstRate: 18, unit: 'Ltr', closingQty: 2400, closingValue: 360000, group: 'Lubricants' },
      { name: 'Steering Column Assembly', hsn: '8708', gstRate: 28, unit: 'Nos', closingQty: 120, closingValue: 216000, group: 'Auto Parts' },
      { name: 'Radiator Unit', hsn: '8708', gstRate: 28, unit: 'Nos', closingQty: 96, closingValue: 172800, group: 'Auto Parts' }
    ]
  };

  let items = stockItems[client || 'sharma'] || stockItems.sharma;

  if (hsn) {
    items = items.filter(i => i.hsn === hsn);
  }

  return res.status(200).json({
    success: true,
    client: client || 'sharma',
    data: items,
    count: items.length,
    totalValue: items.reduce((sum, i) => sum + i.closingValue, 0),
    rateChangedItems: items.filter(i => i.rateChanged).length,
    timestamp: new Date().toISOString()
  });
}
