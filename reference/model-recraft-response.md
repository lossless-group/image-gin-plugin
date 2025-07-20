# Recraft API Response Model

## Successful Response (200 OK)

### Headers
```json
{
  "date": "Sun, 20 Jul 2025 17:32:02 GMT",
  "content-type": "application/json",
  "content-length": "262",
  "connection": "keep-alive",
  "vary": "Origin",
  "x-recraft-requestid": "7d9c1a22-e28e-42d6-89b8-6bf6e9592851",
  "strict-transport-security": "max-age=31536000; includeSubDomains"
}
```

### Body
```typescript
{
  // Unix timestamp of when the image was generated
  "created": number;
  
  // Number of credits used for this generation
  "credits": number;
  
  // Array of generated images
  "data": Array<{
    // Unique identifier for the generated image
    "image_id": string;
    
    // URL to access the generated image
    "url": string;
    
    // Optional: Base64 encoded image data (if requested)
    "b64_json"?: string;
  }>;
}
```

### Example
```json
{
  "created": 1753032722,
  "credits": 40,
  "data": [
    {
      "image_id": "eb846eea-f993-4d52-9a01-0874eca231a1",
      "url": "https://img.recraft.ai/qd4W5wCM8prMcqeIGKaoPmM4iBrjo53m3PIr6-8z-h4/rs:fit:1024:1024:0/raw:1/plain/abs://external/images/eb846eea-f993-4d52-9a01-0874eca231a1"
    }
  ]
}
```

## Error Response (4xx/5xx)

### Headers
```json
{
  "content-type": "application/json",
  "x-recraft-requestid": "7d9c1a22-e28e-42d6-89b8-6bf6e9592851"
}
```

### Body
```typescript
{
  // Error type
  "error": {
    // HTTP status code
    "code": number;
    
    // Human-readable error message
    "message": string;
    
    // Optional: Additional error details
    "details"?: Record<string, unknown>;
  }
}
```

### Example
```json
{
  "error": {
    "code": 400,
    "message": "Invalid request parameters",
    "details": {
      "prompt": "This field is required"
    }
  }
}
```