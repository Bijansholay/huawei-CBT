import pdfParse from 'pdf-parse';

/**
 * Extract text from PDF buffer
 */
export const extractTextFromPDF = async (buffer) => {
    try {
        const pdfData = await pdfParse(buffer);

        // Clean and normalize text
        const text = pdfData.text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');

        return {
            text,
            numPages: pdfData.numpages,
            numWords: text.split(/\s+/).length
        };
    } catch (error) {
        throw new Error(`PDF parsing failed: ${error.message}`);
    }
};

/**
 * Chunk text into smaller segments for AI processing
 */
export const chunkText = (text, chunkSize = 2000) => {
    const chunks = [];
    let currentChunk = '';

    const paragraphs = text.split('\n\n');

    for (const paragraph of paragraphs) {
        if ((currentChunk + paragraph).length > chunkSize) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = paragraph;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
};