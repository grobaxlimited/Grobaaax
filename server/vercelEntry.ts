import { apiApp } from './apiApp';

// Vercel Serverless Function Entry Point (Pre-bundled into /api/index.js)
export default async function handler(req: any, res: any) {
  try {
    return apiApp(req, res);
  } catch (err: any) {
    console.error('Vercel Serverless Handler Error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Internal server error in serverless handler',
      });
    }
  }
}

export { apiApp as app };
