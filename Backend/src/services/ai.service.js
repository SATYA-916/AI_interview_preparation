const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of this skill gap")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan"),
        focus: z.string().describe("The main focus of this day"),
        tasks: z.array(z.string()).describe("List of tasks")
    })).describe("A day-wise preparation plan"),
    title: z.string().describe("The title of the job")
});

async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription,
    daysAvailable = 7
}) {
    const pacing = daysAvailable <= 3
        ? "This is a CRASH plan: focus only on the highest-probability questions, the most severe skill gaps and revision. No new-topic learning."
        : daysAvailable <= 14
            ? "Balance learning the missing skills with question practice and revision."
            : "Include learning new concepts in depth, hands-on practice, and keep the last 2 days for revision and mock practice."
    const prompt = `
Generate an interview report for a candidate with the following details:

Resume: ${resume}

Self Description: ${selfDescription}

Job Description: ${jobDescription}

The candidate has exactly ${daysAvailable} days until the interview.
Create the preparationPlan with exactly ${daysAvailable} entries, with day numbered sequentially from 1 to ${daysAvailable}.
Pacing guidance: ${pacing}
`;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema)
        }
    });

    return JSON.parse(response.text);
}

async function extractJobDescriptionFromPage(pageText) {
    const jdSchema = z.object({
        jobDescription: z.string().describe("The complete job description found on the page: job title, role summary, responsibilities, required skills, qualifications and experience. Plain text only, no markdown formatting, no commentary. Empty string if the page has no job description.")
    });

    const prompt = `
You are given the raw text scraped from a web page that contains a job posting.
Extract ONLY the job description from it - ignore navigation menus, headers, footers, cookie notices, company marketing sections, "similar jobs" lists and any other page noise.

Return the job title, role summary, responsibilities, required skills, qualifications and experience as clean plain text.

If the page contains no job description at all, return an empty string.

Web page text:
${pageText}
`;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(jdSchema)
        }
    });

    return JSON.parse(response.text).jobDescription;
}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: await chromium.executablePath(),
        args: [
            ...chromium.args,
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage"
        ]
    });

    const page = await browser.newPage();

    await page.setContent(htmlContent, {
        waitUntil: "networkidle0"
    });

    const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    });

    await browser.close();

    return pdfBuffer;
}

async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {
    const resumePdfSchema = z.object({
        html: z.string().describe(
            "The HTML content of the resume which can be converted to PDF"
        )
    });

    const prompt = `
Generate resume for a candidate with the following details:

Resume: ${resume}

Self Description: ${selfDescription}

Job Description: ${jobDescription}

The response should be a JSON object with a single field "html".
The resume should be tailored for the job description.
The content should be ATS friendly.
The design should be simple and professional.
The resume should ideally be 1-2 pages.
`;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema)
        }
    });

    const jsonContent = JSON.parse(response.text);

    try {
        const pdfBuffer = await generatePdfFromHtml(jsonContent.html);
        return pdfBuffer;
    } catch (err) {
        console.error("PDF GENERATION ERROR:", err);
        throw err;
    }
}

module.exports = {
    generateInterviewReport,
    generateResumePdf,
    extractJobDescriptionFromPage
};