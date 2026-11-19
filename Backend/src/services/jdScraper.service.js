const { extractJobDescriptionFromPage } = require("./ai.service");

/**
 * @description Fetch a job-posting web page, strip it to plain text and use
 * Gemini to extract only the job description from the page noise.
 * Throws an Error with a user-friendly message (and optional .status) on failure.
 */

function badRequest(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
}

function isBlockedHost(hostname) {
    const host = hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local")) return true;
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
        const [ a, b ] = [ Number(ipv4[1]), Number(ipv4[2]) ];
        if (a === 10 || a === 127 || a === 0) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
        if (a === 169 && b === 254) return true;
    }
    if (host === "::1" || host.startsWith("fe80:")) return true;
    return false;
}

function htmlToText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
        .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
        .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
        .replace(/<header[\s\S]*?<\/header>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
}

async function scrapeJobDescription(urlString) {
    let url;
    try {
        url = new URL(urlString);
    } catch {
        throw badRequest("Please enter a valid job posting URL.");
    }

    if (![ "http:", "https:" ].includes(url.protocol)) {
        throw badRequest("Only http and https links are supported.");
    }

    if (isBlockedHost(url.hostname)) {
        throw badRequest("That URL is not allowed.");
    }

    let response;
    try {
        response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml"
            },
            redirect: "follow",
            signal: AbortSignal.timeout(20000)
        });
    } catch {
        throw badRequest("Could not reach that link. Please check the URL, or paste the job description text instead.");
    }

    if (!response.ok) {
        throw badRequest(`That site refused the fetch (HTTP ${response.status}). Many job sites block automated reading - please paste the job description text instead.`);
    }

    const html = await response.text();
    const pageText = htmlToText(html).slice(0, 15000);

    if (pageText.length < 300) {
        throw badRequest("That page did not contain readable job text - it may need login or JavaScript. Please paste the job description text instead.");
    }

    const jobDescription = await extractJobDescriptionFromPage(pageText);

    if (!jobDescription || jobDescription.trim().length < 80) {
        throw badRequest("No job description was found on that page. Please paste the job description text instead.");
    }

    return jobDescription.trim().slice(0, 5000);
}

module.exports = { scrapeJobDescription };
