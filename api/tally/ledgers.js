export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { client, type } = req.query;

  const ledgerData = {
    sharma: {
      sundryDebtors: [
        { name: 'Apollo Hospitals', balance: 428000, gstin: '36AABCA1234E1Z5' },
        { name: 'MedPlus Pharmacy Chain', balance: 312000, gstin: '36AABCM5678F1Z3' },
        { name: 'Cipla Distribution', balance: 184000, gstin: '27AABCC2345G1Z1' },
        { name: 'Max Healthcare', balance: 256000, gstin: '07AABCM8901H1Z9' },
        { name: 'Fortis Medical Store', balance: 142000, gstin: '27AABCF1234J1Z7' }
      ],
      sundryCreditors: [
        { name: 'Apex Chemical Suppliers', balance: -218400, gstin: '27AAECA3456K1Z5' },
        { name: 'Ranbaxy Raw Materials', balance: -164000, gstin: '06AABCR7890L1Z3' },
        { name: 'Piramal Glass Packaging', balance: -96000, gstin: '27AABCP2345M1Z1' },
        { name: 'FedEx Logistics India', balance: -48200, gstin: '27AAECF5678N1Z9' }
      ],
      bankAccounts: [
        { name: 'HDFC Bank - Current A/c', balance: 1842600, accountNo: 'XXXX-XXXX-4521' },
        { name: 'ICICI Bank - OD A/c', balance: -240000, accountNo: 'XXXX-XXXX-7832' },
        { name: 'SBI - Fixed Deposit', balance: 500000, accountNo: 'XXXX-XXXX-1245' }
      ],
      taxLedgers: [
        { name: 'CGST Input', balance: 142800 },
        { name: 'SGST Input', balance: 142800 },
        { name: 'IGST Input', balance: 86400 },
        { name: 'CGST Output', balance: -218600 },
        { name: 'SGST Output', balance: -218600 },
        { name: 'IGST Output', balance: -124800 },
        { name: 'TDS Payable - 194C', balance: -42000 },
        { name: 'TDS Payable - 194J', balance: -18600 }
      ]
    }
  };

  const data = ledgerData[client || 'sharma'] || ledgerData.sharma;

  if (type && data[type]) {
    return res.status(200).json({ success: true, client: client || 'sharma', type, data: data[type], count: data[type].length, timestamp: new Date().toISOString() });
  }

  return res.status(200).json({ success: true, client: client || 'sharma', data, timestamp: new Date().toISOString() });
}
