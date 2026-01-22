// Gemini Vision API for reading meter values from images

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

/**
 * Read meter value from image using Gemini Vision API
 * @param {string} base64Image - Base64 encoded image
 * @param {string} meterType - 'electricity' or 'water'
 * @returns {Promise<number>} - Detected meter reading
 */
export async function readMeterValue(base64Image, meterType) {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
    }

    // Remove data URL prefix if present
    const imageData = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = meterType === 'electricity'
        ? `You are reading an electricity meter. Look at this image and extract ONLY the numeric reading from the meter display. 
           The reading should be a whole number representing kilowatt-hours (kWh).
           Return ONLY the number, nothing else. If you cannot read the meter clearly, return 0.`
        : `You are reading a water meter. Look at this image and extract ONLY the numeric reading from the meter display.
           The reading should be a whole number representing cubic meters (m³).
           Return ONLY the number, nothing else. If you cannot read the meter clearly, return 0.`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: imageData
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 50,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!text) {
            throw new Error('No response from Gemini');
        }

        // Extract number from response
        const number = parseInt(text.replace(/[^0-9]/g, ''), 10);

        if (isNaN(number)) {
            console.warn('Could not parse number from Gemini response:', text);
            return 0;
        }

        return number;
    } catch (error) {
        console.error('Error reading meter with Gemini:', error);
        throw error;
    }
}
