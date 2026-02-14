// supabase/functions/ai-valuate/index.ts
// Edge Function per la valutazione AI di asset non quotati (immobili, luxury)
// Deploy with: supabase functions deploy ai-valuate
// Richiede: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValuationRequest {
  asset_id: string
  asset_type: string
  name: string
  purchase_price: number
  purchase_date: string
  metadata: Record<string, unknown>
  currency?: string
}

interface ValuationResponse {
  suggested_value: number
  confidence: 'low' | 'medium' | 'high'
  reasoning: string
  factors: string[]
  data_sources: string[]
  date: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: ValuationRequest = await req.json()
    const { asset_id, asset_type, name, purchase_price, purchase_date, metadata, currency = 'EUR' } = request

    // Verifica autenticazione
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autenticato' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Solo asset non quotati
    if (!['real_estate', 'luxury'].includes(asset_type)) {
      return new Response(
        JSON.stringify({ error: 'La valutazione AI e\' disponibile solo per immobili e beni di lusso' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verifica API key Anthropic
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Servizio AI non configurato. Imposta ANTHROPIC_API_KEY nei secrets di Supabase.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Costruisci il prompt in base al tipo di asset
    const prompt = buildPrompt(asset_type, name, purchase_price, purchase_date, metadata, currency)

    // Chiama l'API Anthropic Claude
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('Anthropic API error:', errorText)
      throw new Error('Errore nella chiamata al servizio AI')
    }

    const aiData = await aiResponse.json()
    const aiText = aiData.content?.[0]?.text || ''

    // Parsa la risposta JSON dall'AI
    const jsonMatch = aiText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Formato risposta AI non valido')
    }

    const parsed = JSON.parse(jsonMatch[0])
    const valuation: ValuationResponse = {
      suggested_value: Number(parsed.suggested_value) || 0,
      confidence: parsed.confidence || 'low',
      reasoning: parsed.reasoning || '',
      factors: Array.isArray(parsed.factors) ? parsed.factors : [],
      data_sources: Array.isArray(parsed.data_sources) ? parsed.data_sources : [],
      date: new Date().toISOString(),
    }

    // Salva la valutazione nei metadata dell'asset
    if (asset_id) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
      )

      // Recupera metadata esistenti e aggiungi la valutazione AI
      const { data: currentAsset } = await supabaseAdmin
        .from('assets')
        .select('metadata')
        .eq('id', asset_id)
        .single()

      const updatedMetadata = {
        ...(currentAsset?.metadata || {}),
        ai_valuation: {
          suggested_value: valuation.suggested_value,
          confidence: valuation.confidence,
          reasoning: valuation.reasoning,
          factors: valuation.factors,
          data_sources: valuation.data_sources,
          date: valuation.date,
        },
      }

      await supabaseAdmin
        .from('assets')
        .update({ metadata: updatedMetadata })
        .eq('id', asset_id)
    }

    return new Response(JSON.stringify(valuation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('AI valuation error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Errore nella valutazione AI' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function buildPrompt(
  assetType: string,
  name: string,
  purchasePrice: number,
  purchaseDate: string,
  metadata: Record<string, unknown>,
  currency: string
): string {
  if (assetType === 'real_estate') {
    return `Sei un esperto valutatore immobiliare italiano. Stima il valore attuale di mercato per questo immobile basandoti sui dati forniti e sulle tue conoscenze del mercato immobiliare.

Dettagli immobile:
- Nome/Descrizione: ${name}
- Tipo: ${metadata.property_type || 'Non specificato'}
- Indirizzo/Zona: ${metadata.address || 'Non specificato'}
- Paese: ${metadata.country || 'Italia'}
- Superficie: ${metadata.size_sqm ? metadata.size_sqm + ' mq' : 'Non specificata'}
- Prezzo di acquisto: ${currency} ${purchasePrice.toLocaleString()}
- Data acquisto: ${purchaseDate}

Rispondi SOLO con un oggetto JSON valido (senza markdown, senza backtick) con questa struttura:
{
  "suggested_value": <numero intero in ${currency}>,
  "confidence": "<low|medium|high>",
  "reasoning": "<spiegazione dettagliata in italiano, 2-3 frasi>",
  "factors": ["<fattore 1>", "<fattore 2>", "<fattore 3>"],
  "data_sources": ["<fonte 1>", "<fonte 2>"]
}

Considera: andamento mercato immobiliare italiano, zona geografica, inflazione, tipologia immobile, superficie.
Se i dati sono insufficienti per una stima accurata, indica confidence "low" e spiega cosa manca.`
  }

  // luxury
  return `Sei un esperto valutatore di beni di lusso e collezionismo. Stima il valore attuale di mercato per questo bene basandoti sui dati forniti e sulle tue conoscenze del mercato secondario.

Dettagli bene:
- Nome/Descrizione: ${name}
- Brand: ${metadata.brand || 'Non specificato'}
- Modello: ${metadata.model || 'Non specificato'}
- Numero seriale: ${metadata.serial_number || 'Non disponibile'}
- Certificato: ${metadata.certificate || 'Non disponibile'}
- Data ultima perizia: ${metadata.appraisal_date || 'Nessuna'}
- Prezzo di acquisto: ${currency} ${purchasePrice.toLocaleString()}
- Data acquisto: ${purchaseDate}

Rispondi SOLO con un oggetto JSON valido (senza markdown, senza backtick) con questa struttura:
{
  "suggested_value": <numero in ${currency}>,
  "confidence": "<low|medium|high>",
  "reasoning": "<spiegazione dettagliata in italiano, 2-3 frasi>",
  "factors": ["<fattore 1>", "<fattore 2>", "<fattore 3>"],
  "data_sources": ["<fonte 1>", "<fonte 2>"]
}

Considera: mercato secondario del brand, stato di conservazione tipico, domanda/offerta, rarita', tendenze di mercato.
Se i dati sono insufficienti per una stima accurata, indica confidence "low" e spiega cosa manca.`
}
