module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const GHL_KEY = 'pit-6843a8cc-3727-4ec4-ba1d-4141a0db8d3f';
  const GHL_LOC = 'noybjYU81Q2wCuwLiizF';
  const GHL_H = {
    'Authorization': 'Bearer ' + GHL_KEY,
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
  };

  const { firstName, lastName, email, phone, companyName, tags, note } = req.body;

  try {
    /* 1. Create contact */
    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: GHL_H,
      body: JSON.stringify({
        locationId: GHL_LOC,
        firstName, lastName, email, phone, companyName,
        source: 'Website Quiz',
        tags: tags || []
      })
    });
    const contactData = await contactRes.json();
    const contactId = contactData.contact?.id;

    /* 2. Add note with full quiz summary */
    if (contactId && note) {
      await fetch('https://services.leadconnectorhq.com/contacts/' + contactId + '/notes', {
        method: 'POST',
        headers: GHL_H,
        body: JSON.stringify({ body: note })
      });
    }

    res.status(200).json({ success: true, contactId: contactId || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
