import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get the BACKEND_BASE_URL from environment variables
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000';
  
  // Construct the full URL to the backend
  // Remove the /api/v1 prefix from the URL since it's already included in backendUrl
  const path = req.url?.replace('/api/v1', '') || '';
  const apiUrl = `${backendUrl}${path}`;
  
  try {
    // Forward the request to the backend
    const response = await axios({
      method: req.method,
      url: apiUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        // Forward any headers from the client
        ...req.headers,
      },
      // Don't throw on non-2xx responses, we want to forward them to the client
      validateStatus: () => true,
    });
    
    // Forward the response back to the client
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}