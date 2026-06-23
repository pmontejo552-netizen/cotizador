import Anthropic from '@anthropic-ai/sdk';

// Cliente de Claude. SOLO se usa en el servidor. La key viene de variable de
// entorno (ANTHROPIC_API_KEY) y nunca se expone al navegador.
let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Falta ANTHROPIC_API_KEY. Configurala como variable de entorno (ver .env.example).',
    );
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

// Modelo vigente. Confirmar el string en https://docs.claude.com
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export function hasClaudeKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Pide a Claude una respuesta y extrae el primer bloque JSON del texto.
 * Lanza error si no se puede parsear.
 */
export async function askClaudeJSON<T>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const anthropic = getAnthropic();
  const msg = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return extractJSON<T>(text);
}

export function extractJSON<T>(text: string): T {
  // Quita cercas de código ```json ... ```
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();

  // Si todavía hay texto extra, intenta aislar el primer { ... } o [ ... ].
  try {
    return JSON.parse(t) as T;
  } catch {
    const firstObj = t.indexOf('{');
    const firstArr = t.indexOf('[');
    let start = -1;
    let open = '{';
    let close = '}';
    if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
      start = firstArr;
      open = '[';
      close = ']';
    } else {
      start = firstObj;
    }
    if (start === -1) throw new Error('La respuesta de Claude no contenía JSON.');
    const end = t.lastIndexOf(close);
    const candidate = t.slice(start, end + 1);
    return JSON.parse(candidate) as T;
  }
}
