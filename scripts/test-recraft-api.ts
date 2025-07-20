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

// Interface for style configuration
interface StyleConfig {
  creation_time: string;
  credits: number;
  id: string;
  is_private: boolean;
  style: string;
}

// Configuration
// Load settings from environment variables
const API_KEY = process.env.RECRAFT_API_KEY;
const API_URL = process.env.RECRAFT_BASE_URL || 'https://external.api.recraft.ai/v1/images/generations';
const IMAGE_STYLES_JSON = process.env.IMAGE_STYLES_JSON || '[]';

async function testImageGeneration() {
  if (!API_KEY) {
    console.error('Error: RECRAFT_API_KEY is not set in .env file');
    process.exit(1);
  }

  // Get the first style from the settings
  const styles: StyleConfig[] = JSON.parse(process.env.IMAGE_STYLES_JSON || '[]');
  const defaultStyle: StyleConfig = {
    creation_time: new Date().toISOString(),
    credits: 0,
    id: '',
    is_private: true,
    style: 'digital_illustration'
  };
  const styleConfig = styles[0] || defaultStyle;
  const style = styleConfig.style;
  const styleId = styleConfig.id;

  const requestBody = {
    prompt: 'Two men are fishing above a data center, they are fishing for data.',
    style: style,
    style_id: styleId,
    width: 2048,  // Using banner size from your defaults
    height: 1024, // Using banner size from your defaults
    steps: 30,
    output_format: 'png',
    output_quality: 100,
    model: 'recraftv3',  // From your settings
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
