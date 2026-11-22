import express from 'express';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));

const QUIZ_SYSTEM_INSTRUCTION = `## Identity

You are a practice quiz assistant for university students.

## Source Constraints
Base questions, correct answers, and explanations on the study material supplied by the user. If no material is supplied, ask for it before generating a quiz.

## Quiz Generation and Presentation 

### Writing the Questions 
Using only the study material the student has inputted, write three multiple-choice questions. Number the questions 1, 2, and 3, and give each one four answer options labelled A, B, C, and D. Make sure exactly one option per question is correct according to the inputted material, and that the other three options are plausible but clearly incorrect. 

### Presenting the Quiz 
Show all three questions together in a single response. Do not reveal the correct answers, an answer key, hints about which option is right, or any explanations at this stage. End the quiz by asking the student to submit their answers as the question number followed by the option letter, for example: 1B, 2D, 3A. 

### Waiting for the Student 
After presenting the quiz, stop and wait for the student to submit their answers. Do not score, assess, or give feedback on any question until those answers have been received.

## Assessment and Feedback 

### Checking the Answers 
When the student submits their answers, compare each answer with the allocated correct option for that question. Use the quiz questions and the supplied study material as the basis for deciding what is correct. 

### Reporting the Results
Start by giving the student's score out of three. Then go through the questions by number and state whether each answer was correct or incorrect. For every incorrect answer, give the correct option letter and a brief explanation of why it is correct, based on the supplied study material. 

### Missing or Unclear Answers 
If an answer is missing, or it is unclear which question an answer belongs to, do not guess. Ask the student to clarify that answer before giving a final score. 

### After Feedback 
Do not create another quiz unless the student asks for one.`;

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1200): Promise<T> {
  let delay = initialDelay;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const errStr = String(err);
      const isTransient =
        errStr.includes('503') ||
        errStr.includes('high demand') ||
        errStr.includes('UNAVAILABLE') ||
        errStr.includes('429') ||
        errStr.includes('RESOURCE_EXHAUSTED');

      if (isTransient && attempt < maxRetries) {
        console.warn(`[Gemini API] Transient error on attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Maximum retry attempts exceeded.');
}

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message);
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch {
      // not json
    }
    return err.message;
  }
  return String(err);
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Endpoint: Generate 3 multiple choice questions from study notes
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { notes } = req.body;

    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      res.status(400).json({
        error: 'No study material was supplied. Please paste your study notes before generating a quiz.',
      });
      return;
    }

    const ai = getAiClient();

    const prompt = `Study Material supplied by student:
"""
${notes.trim()}
"""

Please generate the quiz as described in the system instructions. Create exactly three multiple-choice questions (1, 2, 3), each with four options (A, B, C, D) based only on the study material. Do not reveal the correct answers or explanations at this stage. End by asking the student to submit their answers in the format: 1B, 2D, 3A.`;

    const response = await callWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: QUIZ_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasSufficientMaterial: {
                type: Type.BOOLEAN,
                description: 'Whether the provided material is sufficient to formulate 3 questions',
              },
              quizIntro: {
                type: Type.STRING,
                description: 'Introductory statement for the quiz',
              },
              questions: {
                type: Type.ARRAY,
                description: 'The 3 multiple-choice questions',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.INTEGER, description: 'Question number (1, 2, or 3)' },
                    question: { type: Type.STRING, description: 'Question prompt text' },
                    options: {
                      type: Type.ARRAY,
                      description: 'Four answer choices labelled A, B, C, and D',
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          letter: { type: Type.STRING, description: 'Option letter: A, B, C, or D' },
                          text: { type: Type.STRING, description: 'Text of the option' },
                        },
                        required: ['letter', 'text'],
                      },
                    },
                  },
                  required: ['number', 'question', 'options'],
                },
              },
              submissionPrompt: {
                type: Type.STRING,
                description:
                  'Text asking student to submit their answers as question number followed by option letter (e.g. 1B, 2D, 3A)',
              },
              formattedQuizText: {
                type: Type.STRING,
                description: 'The clean markdown or text representation of all questions together',
              },
            },
            required: ['hasSufficientMaterial', 'questions', 'submissionPrompt'],
          },
        },
      })
    );

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from AI model');
    }

    const parsed = JSON.parse(responseText);
    res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error generating quiz';
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: message });
  }
});

// Endpoint: Assess the student's submitted answers
app.post('/api/assess-quiz', async (req, res) => {
  try {
    const { notes, quizQuestions, answersFormat } = req.body;

    if (!notes || !quizQuestions || !answersFormat) {
      res.status(400).json({
        error: 'Missing required parameters (notes, quizQuestions, or answersFormat)',
      });
      return;
    }

    const ai = getAiClient();

    const formattedQuestionsSummary = quizQuestions
      .map(
        (q: { number: number; question: string; options: Array<{ letter: string; text: string }> }) =>
          `Question ${q.number}: ${q.question}\n` +
          q.options.map((opt) => `${opt.letter}) ${opt.text}`).join('\n')
      )
      .join('\n\n');

    const prompt = `Study Material:
"""
${notes.trim()}
"""

Quiz Questions:
${formattedQuestionsSummary}

Student Submitted Answers:
${answersFormat}

Please assess the student's submitted answers according to your Assessment and Feedback instructions.
Compare each answer with the allocated correct option for that question. Use the quiz questions and the supplied study material as the basis for deciding what is correct.
Start by giving the student's score out of three. Then go through the questions by number and state whether each answer was correct or incorrect. For every incorrect answer, give the correct option letter and a brief explanation of why it is correct based on the supplied study material.`;

    const response = await callWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: QUIZ_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.INTEGER,
                description: "The student's score out of 3 (0, 1, 2, or 3)",
              },
              total: {
                type: Type.INTEGER,
                description: 'Total number of questions, exactly 3',
              },
              scoreHeadline: {
                type: Type.STRING,
                description: "Score headline, e.g. 'Your Score: 2 out of 3'",
              },
              overallFeedback: {
                type: Type.STRING,
                description: 'A brief overall assessment summary based on performance',
              },
              evaluations: {
                type: Type.ARRAY,
                description: 'Detailed evaluation for each question 1, 2, and 3',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.INTEGER, description: 'Question number (1, 2, 3)' },
                    studentSelectedLetter: {
                      type: Type.STRING,
                      description: 'The letter selected by the student (A, B, C, D)',
                    },
                    isCorrect: {
                      type: Type.BOOLEAN,
                      description: 'True if answer matches the correct option, false otherwise',
                    },
                    correctOptionLetter: {
                      type: Type.STRING,
                      description: 'The correct option letter according to the material (A, B, C, D)',
                    },
                    explanation: {
                      type: Type.STRING,
                      description:
                        'For incorrect answers, why the correct option is right based on the study material. For correct answers, brief reinforcement from the study material.',
                    },
                  },
                  required: ['number', 'studentSelectedLetter', 'isCorrect', 'correctOptionLetter', 'explanation'],
                },
              },
              verbatimFeedback: {
                type: Type.STRING,
                description:
                  'The full verbatim assistant feedback adhering to the prompt Reporting the Results instructions',
              },
            },
            required: ['score', 'total', 'scoreHeadline', 'evaluations', 'verbatimFeedback'],
          },
        },
      })
    );

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from AI model during assessment');
    }

    const parsed = JSON.parse(responseText);
    res.json(parsed);
  } catch (err: unknown) {
    const message = formatErrorMessage(err);
    console.error('Quiz assessment error:', err);
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Quiz Generator server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
