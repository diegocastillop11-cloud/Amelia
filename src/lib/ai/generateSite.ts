interface BusinessInput {
  name: string
  category: string
  description: string
  primary_color: string
  tone?: string
  services?: string
}

interface SiteContent {
  hero: { title: string; subtitle: string; cta: string }
  about: { text: string }
  services: { name: string; description: string; price: string }[]
  contact: { cta: string }
  footer: { tagline: string }
}

export async function generateSiteContent(
  business: BusinessInput
): Promise<SiteContent> {
  const prompt = `
Eres un diseñador web experto especializado en sitios para pequeños negocios latinoamericanos.
Genera el contenido completo de un sitio web profesional para el siguiente negocio:

Nombre: ${business.name}
Rubro: ${business.category}
Descripción: ${business.description}
Color principal: ${business.primary_color}
Tono de comunicación: ${business.tone || 'profesional y cercano'}
Servicios/Productos: ${business.services || 'No especificados'}

Reglas importantes:
- El contenido debe estar en español
- El tono debe ser auténtico, no genérico
- Los títulos deben ser llamativos y específicos para el rubro
- Los servicios deben tener precios opcionales (puedes dejarlos vacíos si no aplica)
- La tagline debe ser memorable y única

Responde SOLO en JSON válido con exactamente esta estructura, sin texto adicional:
{
  "hero": {
    "title": "Título principal llamativo (máximo 8 palabras)",
    "subtitle": "Subtítulo descriptivo (máximo 20 palabras)",
    "cta": "Texto del botón principal (3-5 palabras)"
  },
  "about": {
    "text": "Párrafo sobre el negocio (2-3 oraciones)"
  },
  "services": [
    {
      "name": "Nombre del servicio",
      "description": "Descripción breve",
      "price": "Precio o rango (opcional, puede ser vacío)"
    }
  ],
  "contact": {
    "cta": "Llamada a la acción para contacto"
  },
  "footer": {
    "tagline": "Frase corta memorable del negocio"
  }
}
`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Error de API: ${response.status}`)
  }

  const data = await response.json()
  const text = data.content[0].text

  // Limpiar posibles backticks de markdown
  const clean = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(clean) as SiteContent
}
