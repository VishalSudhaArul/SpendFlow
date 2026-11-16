/**
 * Verifies the Gemini configuration in server/.env.
 * Usage: npm run ai:check
 * Never prints the API key.
 */
import { GoogleGenAI } from '@google/genai';
import { env } from '../src/config/env.js';
import { pingGemini } from '../src/services/ai/geminiClient.js';

async function main() {
  if (!env.GEMINI_API_KEY) {
    console.error('✖ GEMINI_API_KEY is not set in server/.env');
    console.error('  Create a key at https://aistudio.google.com/app/apikey and paste it after GEMINI_API_KEY=');
    process.exit(1);
  }
  console.log(`Checking Gemini (model: ${env.GEMINI_MODEL})...`);
  try {
    const result = await pingGemini();
    console.log(`✔ Gemini responded in ${result.latencyMs} ms`);
    process.exit(0);
  } catch (error) {
    console.error(`✖ ${error.message} [${error.code ?? 'ERROR'}]`);
    if (error.code === 'AI_MODEL_NOT_FOUND' || error.code === 'AI_KEY_INVALID') {
      try {
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        const pager = await ai.models.list();
        const names = [];
        for await (const model of pager) {
          if (/flash/i.test(model.name) && model.supportedActions?.includes('generateContent')) names.push(model.name.replace('models/', ''));
          if (names.length >= 15) break;
        }
        if (names.length) console.error(`  Flash models your key can use: ${names.join(', ')}\n  Set one with GEMINI_MODEL= in server/.env`);
      } catch {
        // Listing failed too — most likely an invalid key.
      }
    }
    process.exit(1);
  }
}

main();
