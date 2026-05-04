import { aiClient, provider } from '../config/ai.js';
import { chunkText } from './pdfService.js';

const QUESTION_PROMPT = `
You are an expert question generator for computer-based tests. Generate exactly {num_questions} multiple-choice questions based on the provided text.

Requirements:
- Each question should have 4 options (A, B, C, D)
- One option must be correct
- Questions should be {difficulty} level
- Return ONLY valid JSON, no markdown or explanations
- Format: {
    "questions": [
      {
        "question": "Question text here?",
        "options": {
          "A": "Option A",
          "B": "Option B", 
          "C": "Option C",
          "D": "Option D"
        },
        "correctAnswer": "A"
      }
    ]
  }

Text to generate questions from:
{text}
`;

/**
 * Generate questions using OpenAI
 */
const generateQuestionsOpenAI = async (text, numQuestions, difficulty) => {
    const prompt = QUESTION_PROMPT
        .replace('{num_questions}', numQuestions)
        .replace('{difficulty}', difficulty)
        .replace('{text}', text);

    try {
        const response = await aiClient.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert question generator. Always respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`OpenAI question generation failed: ${error.message}`);
    }
};

/**
 * Generate questions using Gemini
 */
const generateQuestionsGemini = async (text, numQuestions, difficulty) => {
    const prompt = QUESTION_PROMPT
        .replace('{num_questions}', numQuestions)
        .replace('{difficulty}', difficulty)
        .replace('{text}', text);

    try {
        const model = aiClient.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        const content = await result.response.text();

        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Gemini question generation failed: ${error.message}`);
    }
};

/**
 * Generate questions from PDF text
 */
export const generateQuestions = async (pdfText, numQuestions = 10, difficulty = 'medium') => {
    const chunks = chunkText(pdfText);

    if (chunks.length === 0) {
        throw new Error('No text to generate questions from');
    }

    try {
        let allQuestions = [];
        const questionsPerChunk = Math.ceil(numQuestions / chunks.length);

        for (const chunk of chunks) {
            const generatorFn = provider === 'gemini'
                ? generateQuestionsGemini
                : generateQuestionsOpenAI;

            const result = await generatorFn(chunk, questionsPerChunk, difficulty);

            if (result.questions && Array.isArray(result.questions)) {
                allQuestions = allQuestions.concat(result.questions);
            }

            // Rate limiting: small delay between API calls
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Return only requested number of questions
        return allQuestions.slice(0, numQuestions);
    } catch (error) {
        throw new Error(`Question generation failed: ${error.message}`);
    }
};

/**
 * Validate AI-generated question format
 */
export const validateQuestion = (question) => {
    return (
        question.question &&
        question.options &&
        Object.keys(question.options).length === 4 &&
        ['A', 'B', 'C', 'D'].every(key => question.options[key]) &&
        ['A', 'B', 'C', 'D'].includes(question.correctAnswer)
    );
};