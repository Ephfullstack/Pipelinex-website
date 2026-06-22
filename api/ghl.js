module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const GHL_KEY = process.env.GHL_KEY;
  if (!GHL_KEY) {
    console.error('GHL_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  const GHL_LOC = 'noybjYU81Q2wCuwLiizF';
  const PIPELINE_ID = 'wJbjFivMGHFklHnK1Xkk';       // Setting Pipeline UK
  const STAGE_ID    = '55b52b33-697d-428a-809b-ef6fa246f774'; // New Lead

  // GHL inbound webhook trigger — fires a GHL Workflow for each lead
  const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/noybjYU81Q2wCuwLiizF/webhook-trigger/efb2090c-a176-4f9b-8ed8-be77b17764d5';

  const GHL_H = {
    'Authorization': 'Bearer ' + GHL_KEY,
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
  };

  const { firstName, lastName, email, phone, companyName, tags, note, industry, challenge, budget, timeline } = req.body;

  try {
    /* 1. Create / update contact */
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

    if (!contactId) {
      return res.status(500).json({ error: 'Contact creation failed', detail: contactData });
    }

    /* 2. Add note with full quiz summary */
    if (note) {
      await fetch('https://services.leadconnectorhq.com/contacts/' + contactId + '/notes', {
        method: 'POST',
        headers: GHL_H,
        body: JSON.stringify({ body: note })
      });
    }

    /* 3. Create opportunity in Setting Pipeline UK → New Lead */
    const oppName = [firstName, lastName].filter(Boolean).join(' ')
      + (companyName ? ' — ' + companyName : '')
      + ' (Website Quiz)';

    await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers: GHL_H,
      body: JSON.stringify({
        locationId: GHL_LOC,
        pipelineId: PIPELINE_ID,
        pipelineStageId: STAGE_ID,
        contactId: contactId,
        name: oppName,
        status: 'open',
        source: 'Website Quiz',
        customFields: [
          { key: 'industry',  field_value: industry  || '' },
          { key: 'challenge', field_value: challenge || '' },
          { key: 'budget',    field_value: budget    || '' },
          { key: 'timeline',  field_value: timeline  || '' }
        ]
      })
    });

    /* 4. Fire the GHL Workflow webhook trigger (best-effort, non-blocking) */
    try {
      await fetch(GHL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          firstName, lastName, email, phone, companyName,
          industry, challenge, budget, timeline,
          tags: tags || [],
          note,
          source: 'Website Quiz'
        })
      });
    } catch (whErr) {
      console.error('GHL webhook trigger failed:', whErr.message);
    }

    res.status(200).json({ success: true, contactId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
