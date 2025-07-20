import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Interface for the API response
interface ApiResponse {
  data: Array<{
    url: string;
    width: number;
    height: number;
  }>;
}

// Configuration
const API_KEY = process.env.RECRAFT_API_KEY;
const API_URL = 'https://external.api.recraft.ai/v1/images/generations';

async function testImageGeneration() {
  if (!API_KEY) {
    console.error('Error: RECRAFT_API_KEY is not set in .env file');
    process.exit(1);
  }

  const requestBody = {
    prompt: 'a serene landscape with mountains and a lake at sunset, digital art',
    style: 'digital_illustration',
    width: 1024,
    height: 1024,
    steps: 30,
    output_format: 'png',
    output_quality: 100,
  };

  try {
    console.log('Sending request to Recraft.ai API...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${error}`);
    }

    const data: ApiResponse = await response.json() as ApiResponse;
    
    if (data.data && data.data.length > 0) {
      console.log('\n✅ Success! Image generated:');
      console.log('🔗 URL:', data.data[0].url);
      console.log('📏 Dimensions:', `${data.data[0].width}x${data.data[0].height}`);
    } else {
      console.log('No image data received in response');
    }
  } catch (error) {
    console.error('\n❌ Error generating image:');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('An unknown error occurred');
    }
  }
}

// Run the test
testImageGeneration();
