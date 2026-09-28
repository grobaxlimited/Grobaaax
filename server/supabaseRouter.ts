import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../src/lib/supabase';

export const supabaseRouter = Router();

// Resilient server-side upsert proxy (bypasses browser CORS, CSP, or iframe fetch blocks)
supabaseRouter.post('/upsert', async (req: Request, res: Response) => {
  try {
    const { table, docId, data, now } = req.body;
    if (!table || !docId || !data) {
      return res.status(400).json({ success: false, error: 'Missing table, docId, or data' });
    }

    const row = {
      id: docId,
      data,
      updated_at: now || new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from(table).upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn(`[Supabase Proxy] Server upsert notice in ${table}/${docId}:`, error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, id: docId });
  } catch (err: any) {
    console.error('[Supabase Proxy] Exception during server upsert:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Resilient server-side get document proxy
supabaseRouter.get('/get', async (req: Request, res: Response) => {
  try {
    const table = String(req.query.table || '');
    const docId = String(req.query.id || '');
    if (!table || !docId) {
      return res.status(400).json({ success: false, error: 'Missing table or id query param' });
    }

    const { data, error } = await supabaseAdmin
      .from(table)
      .select('id, data')
      .eq('id', docId)
      .maybeSingle();

    if (error) {
      console.warn(`[Supabase Proxy] Server get notice in ${table}/${docId}:`, error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data: data || null });
  } catch (err: any) {
    console.error('[Supabase Proxy] Exception during server get:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Resilient server-side query proxy
supabaseRouter.post('/query', async (req: Request, res: Response) => {
  try {
    const { table, limit = 100 } = req.body;
    if (!table) {
      return res.status(400).json({ success: false, error: 'Missing table in query' });
    }

    const { data, error } = await supabaseAdmin
      .from(table)
      .select('id, data, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit) || 100, 300));

    if (error) {
      console.warn(`[Supabase Proxy] Server query notice in ${table}:`, error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    console.error('[Supabase Proxy] Exception during server query:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Resilient server-side delete proxy
supabaseRouter.post('/delete', async (req: Request, res: Response) => {
  try {
    const { table, docId } = req.body;
    if (!table || !docId) {
      return res.status(400).json({ success: false, error: 'Missing table or docId' });
    }

    const { error } = await supabaseAdmin.from(table).delete().eq('id', docId);

    if (error) {
      console.warn(`[Supabase Proxy] Server delete notice in ${table}/${docId}:`, error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[Supabase Proxy] Exception during server delete:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});
