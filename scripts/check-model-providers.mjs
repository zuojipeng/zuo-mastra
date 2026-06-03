const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com';
const DEFAULT_OPENAI_MODEL_NAME = 'gpt-4.1-mini';
const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL_NAME = 'deepseek-chat';

function readArg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function env(name) {
  return process.env[name]?.trim();
}

async function checkProvider({ provider, apiKey, baseUrl, model }) {
  if (!apiKey) {
    return {
      provider,
      configured: false,
      ok: false,
      status: null,
      error: 'missing api key',
    };
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: 'Return only this JSON object: {"ok":true}',
          },
        ],
        temperature: 0,
        max_tokens: 32,
        response_format: { type: 'json_object' },
      }),
    });

    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Keep response parsing best-effort. Never print the raw body because it can contain request context.
    }

    return {
      provider,
      configured: true,
      ok: response.ok && Boolean(json?.choices?.[0]?.message?.content),
      status: response.status,
      error: json?.error?.message ?? null,
    };
  } catch (error) {
    return {
      provider,
      configured: true,
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const providers = [
    {
      provider: 'deepseek',
      apiKey: env('DEEPSEEK_API_KEY'),
      baseUrl: env('DEEPSEEK_BASE_URL') ?? DEFAULT_DEEPSEEK_BASE_URL,
      model: env('DEEPSEEK_MODEL_NAME') ?? DEFAULT_DEEPSEEK_MODEL_NAME,
    },
    {
      provider: 'openai',
      apiKey: env('OPENAI_API_KEY'),
      baseUrl: env('OPENAI_BASE_URL') ?? DEFAULT_OPENAI_BASE_URL,
      model: env('OPENAI_MODEL_NAME') ?? DEFAULT_OPENAI_MODEL_NAME,
    },
  ];

  const only = readArg('provider');
  const selected = only ? providers.filter((provider) => provider.provider === only) : providers;

  if (only && selected.length === 0) {
    console.error(`Unknown provider: ${only}`);
    process.exit(2);
  }

  const results = [];
  for (const provider of selected) {
    results.push(await checkProvider(provider));
  }

  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));

  const configuredResults = results.filter((result) => result.configured);
  const hasConfiguredProvider = configuredResults.length > 0;
  const hasWorkingProvider = configuredResults.some((result) => result.ok);

  if (!hasConfiguredProvider || !hasWorkingProvider) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
