// List available Gemini models
const GEMINI_API_KEY = 'AIzaSyAf4OR9_wi7AnmhsxcB3YryAF19LhBDOK8';

async function listModels() {
    console.log('Fetching available Gemini models...\n');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Error:', errorData);
            return;
        }

        const data = await response.json();

        console.log('✅ Available models:\n');
        data.models.forEach(model => {
            console.log(`📦 ${model.name}`);
            console.log(`   Display Name: ${model.displayName}`);
            console.log(`   Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
            console.log('');
        });

        // Find models that support vision
        const visionModels = data.models.filter(m =>
            m.supportedGenerationMethods.includes('generateContent') &&
            (m.name.includes('vision') || m.name.includes('flash') || m.name.includes('pro'))
        );

        console.log('\n🎯 Recommended models for OCR:');
        visionModels.forEach(m => console.log(`   - ${m.name}`));

    } catch (error) {
        console.error('❌ Failed:', error);
    }
}

listModels();
