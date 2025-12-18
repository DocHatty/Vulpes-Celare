
import { OCRService } from '../src/core/images/OCRService';
import * as fs from 'fs';
import * as path from 'path';

async function testIntegration() {
    console.log('🧪 Starting End-to-End Integration Test...');

    // 1. Initialize Service
    const service = new OCRService({
        confidenceThreshold: 0.5
    });

    try {
        await service.initialize();
        console.log('✅ Service Initialized');

        // 2. Load Test Image
        // Create a simple test image if one doesn't exist
        const testImagePath = path.join(__dirname, '../test_image.png');

        // Ensure we have an imagebuffer. If real file exists use it, else warn
        let buffer: Buffer;
        if (fs.existsSync(testImagePath)) {
            buffer = fs.readFileSync(testImagePath);
            console.log(`📸 Loaded test image from ${testImagePath} (${buffer.length} bytes)`);
        } else {
            console.log('⚠️ No test image found at ' + testImagePath);
            console.log('   Creating dummy buffer to test API stability (results will be empty)');
            buffer = Buffer.alloc(1000); // Empty buffer
        }

        // 3. Run Extraction
        console.log('🚀 Running Extraction...');
        const start = Date.now();
        const results = await service.extractText(buffer);
        const duration = Date.now() - start;

        console.log(`⏱️  Inference took ${duration}ms`);
        console.log(`📊 Found ${results.length} text regions`);

        if (results.length > 0) {
            console.log('📝 Results:');
            results.slice(0, 3).forEach((r, i) => {
                console.log(`   [${i}] "${r.text}" (conf: ${r.confidence.toFixed(2)}) @ [${r.box.x}, ${r.box.y}]`);
            });
        }

        await service.dispose();
        console.log('✅ Integration Test Succeeded');

    } catch (error) {
        console.error('❌ Integration Test Failed:', error);
        process.exit(1);
    }
}

testIntegration();
