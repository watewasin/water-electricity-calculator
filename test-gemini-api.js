// Test Gemini API Key
const GEMINI_API_KEY = 'AIzaSyAf4OR9_wi7AnmhsxcB3YryAF19LhBDOK8';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function testGeminiAPI() {
    console.log('Testing Gemini API...');
    console.log('API Key:', GEMINI_API_KEY.substring(0, 10) + '...');

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: 'Say "Hello, API is working!"' }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 50,
                }
            })
        });

        console.log('Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API Error:', errorData);
            return;
        }

        const data = await response.json();
        console.log('✅ API Response:', data);

        const text = data.candidates[0]?.content?.parts?.[0]?.text;
        console.log('✅ Generated text:', text);

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testGeminiAPI();
