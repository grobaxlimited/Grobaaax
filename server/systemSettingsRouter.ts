import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../src/lib/supabase';

export const systemSettingsRouter = Router();

const SETTINGS_FILE = path.resolve(process.cwd(), 'server', 'system_settings.json');

const DEFAULT_SETTINGS = {
  platformName: 'Grobaax Academic Competition Platform',
  maintenanceMode: false,
  allowNewRegistrations: true,
  publicLeagueVisibility: true,
  defaultFreeGpOnRegister: 500,
  minWithdrawalAmountGp: 1000,
  maxDailyWithdrawalGp: 100000,
  gpToFiatRate: 1,
  autoApproveInstitutions: true,
  requireStudentVerification: false,
  defaultQuestionTimeSeconds: 15,
  defaultPenaltyPerMistakeSeconds: 5,
  speedClockGraceSeconds: 3,
  enableLiveCommunityFeed: true,
  enableGusRegistration: true,
  announcementBannerText: '',
  announcementBannerActive: false,
  welcomeVideoUrl: 'https://youtu.be/o9W0Ypmr1AA?si=x4s0isjgxGheEGbK',
  welcomeVideoTitle: 'How Grobaax Works: Complete Platform Guide & Walkthrough',
  welcomeVideoDescription: 'Watch this comprehensive guide to understand all features of Grobaax: represent your institution in School Dome, generate academic handouts in Library, recharge VTU airtime & data, trade in Mini Mart, and connect with campus peers.',
  welcomeVideoActive: true,
};

function loadSettingsFromDisk(): Record<string, any> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch (err) {
    console.warn('[SystemSettings] Failed to read disk file:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettingsToDisk(data: Record<string, any>): void {
  try {
    const merged = { ...loadSettingsFromDisk(), ...data };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[SystemSettings] Failed to write disk file:', err);
  }
}

/**
 * GET /api/admin/system-settings
 * Returns the authoritative platform configuration
 */
systemSettingsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    let settings = loadSettingsFromDisk();

    try {
      const { data, error } = await supabaseAdmin
        .from('system_settings')
        .select('id, data')
        .eq('id', 'config')
        .maybeSingle();

      if (!error && data?.data) {
        settings = { ...settings, ...data.data };
        saveSettingsToDisk(settings);
      }
    } catch (dbErr) {
      console.warn('[SystemSettings] DB fetch fallback:', dbErr);
    }

    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

/**
 * POST /api/admin/system-settings
 * Updates platform configuration (including platform guide video, links, and text)
 */
systemSettingsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { settings: patch, updatedByUid, updatedByName } = req.body;
    if (!patch || typeof patch !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings payload' });
    }

    // Clean undefined fields
    const sanitizedPatch: Record<string, any> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) {
        sanitizedPatch[k] = v;
      }
    }

    const currentDisk = loadSettingsFromDisk();
    let currentDbData: Record<string, any> = {};

    try {
      const { data } = await supabaseAdmin
        .from('system_settings')
        .select('id, data')
        .eq('id', 'config')
        .maybeSingle();
      if (data?.data) {
        currentDbData = data.data;
      }
    } catch {}

    const now = new Date().toISOString();
    const merged = {
      ...DEFAULT_SETTINGS,
      ...currentDisk,
      ...currentDbData,
      ...sanitizedPatch,
      updatedAt: now,
      updatedByUid: updatedByUid || 'admin',
      updatedByName: updatedByName || 'Admin',
    };

    // Save to disk cache
    saveSettingsToDisk(merged);

    // Save to database
    try {
      const row = {
        id: 'config',
        data: merged,
        updated_at: now,
      };
      await supabaseAdmin.from('system_settings').upsert(row, { onConflict: 'id' });
    } catch (dbErr) {
      console.warn('[SystemSettings] Supabase upsert notice:', dbErr);
    }

    return res.json({
      success: true,
      message: 'System settings successfully saved and applied live.',
      settings: merged,
    });
  } catch (err: any) {
    console.error('[SystemSettings] Save error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});
