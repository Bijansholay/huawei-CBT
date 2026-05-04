import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const provider = process.env.AI_PROVIDER || 'openai';

let aiClient;

if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
    }
    aiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
} else if (provider === 'gemini') {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
    throw new Error(`Unsupported AI provider: ${provider}`);
}

export { aiClient, provider };