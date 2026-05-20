const GRAPH = 'https://graph.facebook.com/v21.0'

export interface MetaCampaign {
  id: string
  name: string
  status: string
  objective: string
  daily_budget: string
  created_time: string
  insights?: {
    data: { spend: string; impressions: string; clicks: string; reach: string }[]
  }
}

export interface AdAccount {
  id: string
  name: string
  account_id: string
  currency: string
  account_status: number
}

export function getOAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id:     process.env.META_APP_ID!,
    redirect_uri:  process.env.META_REDIRECT_URI!,
    scope:         'ads_management,ads_read,business_management,pages_show_list,pages_read_engagement',
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`
}

export async function exchangeCode(code: string) {
  const res = await fetch(`${GRAPH}/oauth/access_token?` + new URLSearchParams({
    client_id:     process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri:  process.env.META_REDIRECT_URI!,
    code,
  }))
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ access_token: string; token_type: string }>
}

export async function getLongLivedToken(shortToken: string) {
  const res = await fetch(`${GRAPH}/oauth/access_token?` + new URLSearchParams({
    grant_type:        'fb_exchange_token',
    client_id:         process.env.META_APP_ID!,
    client_secret:     process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  }))
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

export async function getMe(token: string) {
  const res = await fetch(`${GRAPH}/me?fields=id,name&access_token=${token}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ id: string; name: string }>
}

export async function getAdAccounts(token: string) {
  const res = await fetch(
    `${GRAPH}/me/adaccounts?fields=id,name,account_id,currency,account_status&access_token=${token}`
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ data: AdAccount[] }>
}

export async function getCampaigns(token: string, adAccountId: string) {
  const fields = [
    'id', 'name', 'status', 'objective', 'daily_budget', 'created_time',
    'insights.date_preset(last_30d){spend,impressions,clicks,reach}',
  ].join(',')
  const res = await fetch(
    `${GRAPH}/${adAccountId}/campaigns?fields=${fields}&limit=20&access_token=${token}`
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ data: MetaCampaign[] }>
}

export async function createCampaign(
  token: string,
  adAccountId: string,
  params: { name: string; objective: string }
) {
  const res = await fetch(`${GRAPH}/${adAccountId}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:                            params.name,
      objective:                       params.objective,
      status:                          'PAUSED',
      special_ad_categories:           [],
      is_adset_budget_sharing_enabled: true,
      bid_strategy:                    'LOWEST_COST_WITHOUT_CAP',
      access_token:                    token,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ id: string }>
}

export async function deleteCampaign(token: string, campaignId: string) {
  const res = await fetch(`${GRAPH}/${campaignId}?access_token=${token}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ success: boolean }>
}

export async function updateCampaignStatus(
  token: string,
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED'
) {
  const res = await fetch(`${GRAPH}/${campaignId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, access_token: token }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ success: boolean }>
}

// ── Páginas de Facebook ────────────────────────────────────────────────────────

export interface FacebookPage {
  id: string
  name: string
  category: string
}

export async function getPages(token: string) {
  const res = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,category&access_token=${token}`
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ data: FacebookPage[] }>
}

// ── Imagen de anuncio ──────────────────────────────────────────────────────────

export async function uploadAdImage(
  token: string,
  adAccountId: string,
  imageBuffer: ArrayBuffer
): Promise<string> {
  // Multipart manual — más confiable en entorno Node.js servidor
  const boundary = `----Boundary${Date.now()}`
  const imgBytes = Buffer.from(imageBuffer)

  const before = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="filename"; filename="ad-image.jpg"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`
  )
  const after = Buffer.from(
    `\r\n--${boundary}\r\n` +
    `Content-Disposition: form-data; name="access_token"\r\n\r\n` +
    `${token}\r\n` +
    `--${boundary}--\r\n`
  )
  const body = Buffer.concat([before, imgBytes, after])

  const res = await fetch(`${GRAPH}/${adAccountId}/adimages`, {
    method:  'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Meta adimages error: ${text}`)

  const data   = JSON.parse(text)
  const images = data.images as Record<string, { hash: string }>
  const key    = Object.keys(images ?? {})[0]
  if (!key) throw new Error(`Meta no retornó hash. Respuesta: ${text}`)
  return images[key].hash
}

// ── Ad Set ─────────────────────────────────────────────────────────────────────

const ADSET_CONFIG: Record<string, { optimization_goal: string; billing_event: string }> = {
  OUTCOME_TRAFFIC:    { optimization_goal: 'LINK_CLICKS', billing_event: 'LINK_CLICKS' },
  OUTCOME_AWARENESS:  { optimization_goal: 'REACH',       billing_event: 'IMPRESSIONS' },
  OUTCOME_ENGAGEMENT: { optimization_goal: 'LINK_CLICKS', billing_event: 'IMPRESSIONS' },
  OUTCOME_LEADS:      { optimization_goal: 'LINK_CLICKS', billing_event: 'IMPRESSIONS' },
  OUTCOME_SALES:      { optimization_goal: 'LINK_CLICKS', billing_event: 'LINK_CLICKS' },
}

export async function createAdSet(
  token: string,
  adAccountId: string,
  params: {
    name:        string
    campaignId:  string
    objective:   string
    ageMin:      number
    ageMax:      number
    dailyBudget: number
  }
) {
  const cfg = ADSET_CONFIG[params.objective] ?? ADSET_CONFIG['OUTCOME_TRAFFIC']
  const res = await fetch(`${GRAPH}/${adAccountId}/adsets`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:               params.name,
      campaign_id:        params.campaignId,
      optimization_goal:  cfg.optimization_goal,
      billing_event:      cfg.billing_event,
      daily_budget:       params.dailyBudget,
      targeting: {
        geo_locations:         { countries: ['CL'] },
        age_min:               params.ageMin,
        age_max:               params.ageMax,
        targeting_automation:  { advantage_audience: 0 },
      },
      status:       'PAUSED',
      access_token: token,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ id: string }>
}

// ── Ad Creative ────────────────────────────────────────────────────────────────

export async function createAdCreative(
  token: string,
  adAccountId: string,
  params: {
    name:        string
    pageId:      string
    imageHash:   string
    primaryText: string
    headline:    string
    description: string
    cta:         string
    linkUrl:     string
  }
) {
  const res = await fetch(`${GRAPH}/${adAccountId}/adcreatives`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      object_story_spec: {
        page_id: params.pageId,
        link_data: {
          image_hash:  params.imageHash,
          link:        params.linkUrl,
          message:     params.primaryText,
          name:        params.headline,
          description: params.description,
          call_to_action: {
            type:  params.cta,
            value: { link: params.linkUrl },
          },
        },
      },
      access_token: token,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ id: string }>
}

// ── Ad ─────────────────────────────────────────────────────────────────────────

export async function createAd(
  token: string,
  adAccountId: string,
  params: { name: string; adSetId: string; creativeId: string }
) {
  const res = await fetch(`${GRAPH}/${adAccountId}/ads`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:     params.name,
      adset_id: params.adSetId,
      creative: { creative_id: params.creativeId },
      status:   'PAUSED',
      access_token: token,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ id: string }>
}
