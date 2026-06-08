const fs = require("fs");
const OpenAI = require("openai");
const config = require("../config");

function normalizeQuestion(raw, index) {
  const labels = ["A", "B", "C", "D"];
  const options = Array.isArray(raw.options)
    ? Object.fromEntries(raw.options.slice(0, 4).map((text, optionIndex) => [labels[optionIndex], String(text)]))
    : raw.options || {};

  return {
    id: raw.id || `generated-${Date.now()}-${index}`,
    question: raw.question || raw.question_text || "",
    question_text: raw.question_text || raw.question || "",
    options,
    correctOption: String(raw.correctOption || raw.correct_option || "A").toUpperCase(),
    correct_option: String(raw.correctOption || raw.correct_option || "A").toUpperCase(),
    explanation: raw.explanation || "",
    difficulty: String(raw.difficulty || "medium").toLowerCase(),
    questionType: raw.questionType || raw.question_type || "single",
    question_type: raw.questionType || raw.question_type || "single"
  };
}

function buildPrompt({ count, difficulty, typeCounts, difficultyCounts }) {
  return [
    "Generate exam-ready CBT questions from the uploaded course material.",
    "Use only information supported by the document when possible.",
    `Total questions: ${count}.`,
    `Default difficulty: ${difficulty || "medium"}.`,
    `Question type counts: ${JSON.stringify(typeCounts || {})}.`,
    `Difficulty counts: ${JSON.stringify(difficultyCounts || {})}.`,
    "For single choice and true/false, provide exactly one correct option label.",
    "For true/false, use options A=True and B=False, and set C and D to 'Not applicable'.",
    "Return clear, unambiguous questions suitable for undergraduate CBT exams."
  ].join("\n");
}

function extractResponseText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const textParts = [];
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string" && content.text.trim()) {
        textParts.push(content.text.trim());
      }
    }
  }

  return textParts.join("\n").trim();
}

async function generateQuestionsFromPdf({ pdf, count, difficulty, typeCounts, difficultyCounts }) {
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!pdf || !pdf.path || !fs.existsSync(pdf.path)) {
    throw new Error("PDF file is not available on this server");
  }

  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const uploadedFile = await client.files.create({
    file: fs.createReadStream(pdf.path),
    purpose: "user_data"
  });

  try {
    const total = Math.min(Math.max(Number(count || 5), 1), 50);
    const response = await client.responses.create({
      model: config.openaiModel,
      max_output_tokens: Math.min(Math.max(total * 160, 1000), 8000),
      input: [
        {
          role: "user",
          content: [
            { type: "input_file", file_id: uploadedFile.id },
            { type: "input_text", text: buildPrompt({ count: total, difficulty, typeCounts, difficultyCounts }) }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "generated_questions",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              questions: {
                type: "array",
                minItems: total,
                maxItems: total,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    question: { type: "string" },
                    options: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        A: { type: "string" },
                        B: { type: "string" },
                        C: { type: "string" },
                        D: { type: "string" }
                      },
                      required: ["A", "B", "C", "D"]
                    },
                    correctOption: { type: "string", enum: ["A", "B", "C", "D"] },
                    explanation: { type: "string" },
                    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                    questionType: { type: "string", enum: ["single", "multiple", "trueFalse"] }
                  },
                  required: ["question", "options", "correctOption", "explanation", "difficulty", "questionType"]
                }
              }
            },
            required: ["questions"]
          }
        }
      }
    });

    if (response.status && response.status !== "completed") {
      throw new Error(`AI generation did not complete successfully (status: ${response.status})`);
    }

    const rawText = extractResponseText(response);
    if (!rawText) {
      throw new Error("AI generation returned an empty response");
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      throw new Error(`AI generation returned invalid JSON: ${err.message}`);
    }

    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    if (questions.length === 0) {
      throw new Error("AI generation returned no questions");
    }

    return questions.map(normalizeQuestion);
  } finally {
    await client.files.delete(uploadedFile.id).catch(() => null);
  }
}

module.exports = { generateQuestionsFromPdf, normalizeQuestion };
