export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const companies = {
    sharma: {
      name: 'Sharma Pharmaceuticals Pvt. Ltd.',
      gstin: '27AAACS1234F1ZA',
      cin: 'U24200MH2015PTC123456',
      city: 'Mumbai',
      state: 'Maharashtra',
      tallyVersion: 'TallyPrime 4.1',
      lastSync: new Date().toISOString(),
      booksFrom: '2025-04-01',
      booksTo: '2026-03-31',
      ledgerCount: 347,
      stockItemCount: 218,
      voucherCount: 8412,
      openingBalance: 2847600,
      closingBalance: 3124800,
      turnover: 24180000,
      status: 'connected'
    },
    gupta: {
      name: 'Gupta Auto Parts Pvt. Ltd.',
      gstin: '29AABCG5678H1Z2',
      cin: 'U34300KA2012PTC098765',
      city: 'Bangalore',
      state: 'Karnataka',
      tallyVersion: 'TallyPrime 4.1',
      lastSync: new Date().toISOString(),
      booksFrom: '2025-04-01',
      booksTo: '2026-03-31',
      ledgerCount: 214,
      stockItemCount: 156,
      voucherCount: 5623,
      openingBalance: 1924000,
      closingBalance: 2156400,
      turnover: 18420000,
      status: 'connected'
    },
    royal: {
      name: 'Royal Spice Kitchen LLP',
      gstin: '07AADFR1234K1ZQ',
      llpin: 'AAE-5678',
      city: 'Delhi',
      state: 'Delhi',
      tallyVersion: 'TallyPrime 3.0',
      lastSync: new Date(Date.now() - 86400000 * 2).toISOString(),
      booksFrom: '2025-04-01',
      booksTo: '2026-03-31',
      ledgerCount: 128,
      stockItemCount: 84,
      voucherCount: 12840,
      openingBalance: 864200,
      closingBalance: 1028400,
      turnover: 14400000,
      status: 'connected'
    },
    lakshmi: {
      name: 'Lakshmi Financial Services Ltd.',
      gstin: '29AABCL9012M1ZB',
      cin: 'U65100KA2018PLC112233',
      city: 'Bangalore',
      state: 'Karnataka',
      tallyVersion: 'TallyPrime 4.1',
      lastSync: new Date().toISOString(),
      booksFrom: '2025-04-01',
      booksTo: '2026-03-31',
      ledgerCount: 189,
      stockItemCount: 0,
      voucherCount: 3214,
      openingBalance: 5680000,
      closingBalance: 6124000,
      turnover: 9600000,
      status: 'connected'
    },
    nexgen: {
      name: 'NexGen IT Solutions Pvt. Ltd.',
      gstin: '29AAECN3456P1Z8',
      cin: 'U72200KA2020PTC145678',
      city: 'Bangalore',
      state: 'Karnataka',
      tallyVersion: 'TallyPrime 4.0',
      lastSync: new Date(Date.now() - 86400000).toISOString(),
      booksFrom: '2025-04-01',
      booksTo: '2026-03-31',
      ledgerCount: 96,
      stockItemCount: 12,
      voucherCount: 1847,
      openingBalance: 1240000,
      closingBalance: 1568000,
      turnover: 7200000,
      status: 'connected'
    },
    priya: {
      name: 'Priya Constructions Pvt. Ltd.',
      gstin: '27AABCP7890Q1ZC',
      cin: 'U45200MH2014PTC167890',
      city: 'Pune',
      state: 'Maharashtra',
      tallyVersion: 'TallyPrime 4.1',
      lastSync: new Date().toISOString(),
      booksFrom: '2025-04-01',
      booksTo: '2026-03-31',
      ledgerCount: 264,
      stockItemCount: 92,
      voucherCount: 6218,
      openingBalance: 3420000,
      closingBalance: 3864000,
      turnover: 45600000,
      status: 'connected'
    }
  };

  const { client } = req.query;
  if (client && companies[client]) {
    return res.status(200).json({ success: true, data: companies[client], timestamp: new Date().toISOString() });
  }
  return res.status(200).json({ success: true, data: Object.values(companies), count: Object.keys(companies).length, timestamp: new Date().toISOString() });
}
