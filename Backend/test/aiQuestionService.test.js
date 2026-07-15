const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");

process.env.NODE_ENV = "development";
process.env.AI_PROVIDER = "openai";
process.env.OPENAI_API_KEY = "test-key";
process.env.OPENAI_MODEL = "gpt-4o-mini";

const originalLoad = Module._load;
const originalCreateReadStream = fs.createReadStream;

class FakeOpenAI {
  constructor(options) {
    FakeOpenAI.instances.push(options);
    this.files = {
      create: async (args) => {
        FakeOpenAI.uploads.push(args);
        return { id: "file-test-123" };
      },
      del: async (id) => {
        FakeOpenAI.deletes.push(id);
        return true;
      },
      delete: async (id) => {
        FakeOpenAI.deletes.push(id);
        return true;
      }
    };
    this.responses = {
      create: async (args) => {
        FakeOpenAI.responses.push(args);
        return {
          output_text: JSON.stringify({
            questions: [
              {
                question: "What is 2 + 2?",
                options: { A: "3", B: "4", C: "5", D: "6" },
                correctOption: "B",
                explanation: "Basic arithmetic.",
                difficulty: "easy",
                questionType: "single"
              }
            ]
          })
        };
      }
    };
  }
}

FakeOpenAI.instances = [];
FakeOpenAI.uploads = [];
FakeOpenAI.responses = [];
FakeOpenAI.deletes = [];

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "openai") return FakeOpenAI;
  return originalLoad(request, parent, isMain);
};

const configPath = require.resolve("../src/config");
const servicePath = require.resolve("../src/services/aiQuestionService");
delete require.cache[configPath];
delete require.cache[servicePath];

const {
  generateQuestionsFromPdf,
  isNetworkRestrictionError,
  formatAIGenerationError
} = require("../src/services/aiQuestionService");

test("generateQuestionsFromPdf uploads a pdf and returns normalized questions", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "huawei-cbt-ai-"));
  const pdfPath = path.join(tempDir, "sample.pdf");
  fs.writeFileSync(pdfPath, "%PDF-1.4 test");
  fs.createReadStream = () => ({ stub: true, path: pdfPath });

  try {
    const questions = await generateQuestionsFromPdf({
      pdf: { path: pdfPath },
      count: 1,
      difficulty: "easy",
      typeCounts: { single: 1 },
      difficultyCounts: { easy: 1 }
    });

    assert.equal(FakeOpenAI.instances.length, 1);
    assert.equal(FakeOpenAI.instances[0].apiKey, "test-key");
    assert.equal(FakeOpenAI.uploads.length, 1);
    assert.equal(FakeOpenAI.uploads[0].purpose, "user_data");
    assert.equal(FakeOpenAI.responses.length, 1);
    assert.equal(FakeOpenAI.responses[0].model, "gpt-4o-mini");
    assert.equal(FakeOpenAI.responses[0].input[0].content[0].file_id, "file-test-123");
    assert.equal(questions.length, 1);
    assert.equal(questions[0].question, "What is 2 + 2?");
    assert.equal(questions[0].correctOption, "B");
    assert.equal(FakeOpenAI.deletes[0], "file-test-123");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
    Module._load = originalLoad;
    fs.createReadStream = originalCreateReadStream;
    delete require.cache[configPath];
    delete require.cache[servicePath];
  }
});

test("formatAIGenerationError reports network restrictions clearly", () => {
  assert.equal(isNetworkRestrictionError({ code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND api.openai.com" }), true);
  assert.equal(isNetworkRestrictionError({ message: "fetch failed" }), true);
  assert.equal(isNetworkRestrictionError({ code: "EACCES", message: "permission denied" }), false);

  const formatted = formatAIGenerationError({ code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND api.openai.com" });
  assert.equal(formatted.code, "AI_NETWORK_RESTRICTION");
  assert.match(formatted.message, /cannot reach the AI provider/i);
});

test("generateQuestionsFromPdf can use Gemini as a provider", async () => {
  const originalFetch = global.fetch;
  process.env.AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "gemini-test-key";
  process.env.GEMINI_MODEL = "gemini-2.5-flash";

  const configPathGemini = require.resolve("../src/config");
  const servicePathGemini = require.resolve("../src/services/aiQuestionService");
  delete require.cache[configPathGemini];
  delete require.cache[servicePathGemini];

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  questions: [
                    {
                      question: "What is 1 + 1?",
                      options: { A: "1", B: "2", C: "3", D: "4" },
                      correctOption: "B",
                      explanation: "Simple arithmetic.",
                      difficulty: "easy",
                      questionType: "single"
                    }
                  ]
                })
              }
            ]
          }
        }
      ]
    }),
    text: async () => ""
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "huawei-cbt-gemini-"));
  const pdfPath = path.join(tempDir, "sample.pdf");
  fs.writeFileSync(pdfPath, "%PDF-1.4 test");

  try {
    const { generateQuestionsFromPdf: generateWithGemini } = require("../src/services/aiQuestionService");
    const questions = await generateWithGemini({
      pdf: { path: pdfPath },
      count: 1,
      difficulty: "easy",
      typeCounts: { single: 1 },
      difficultyCounts: { easy: 1 }
    });

    assert.equal(questions.length, 1);
    assert.equal(questions[0].question, "What is 1 + 1?");
    assert.equal(questions[0].correctOption, "B");
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete require.cache[configPathGemini];
    delete require.cache[servicePathGemini];
    process.env.AI_PROVIDER = "openai";
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  }
});
