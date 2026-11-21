import { NIGERIAN_INSTITUTIONS, StaticInstitution } from '../../src/data/nigerianInstitutions';
import { supabaseAdmin } from '../../src/lib/supabase';

export interface CanonicalInstitution {
  institutionId: string;
  institutionName: string;
  shortName: string;
  category: string;
  state: string;
  logo: string;
  slug: string;
}

export function slugifyText(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function normalizeName(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function toCanonical(inst: StaticInstitution): CanonicalInstitution {
  return {
    institutionId: inst.id,
    institutionName: inst.name,
    shortName: inst.shortName || '',
    category: inst.category || 'University',
    state: inst.state || '',
    logo: inst.logo || '🏛️',
    slug: slugifyText(inst.name) || inst.id,
  };
}

const RESOLVED_INSTITUTION_CACHE_TTL_MS = 5 * 60 * 1000;
const BLOG_RECORD_CACHE_TTL_MS = 60 * 1000;
const resolvedInstitutionCache = new Map<
  string,
  { expiresAt: number; value: CanonicalInstitution }
>();
const schoolBlogRecordCache = new Map<string, { expiresAt: number; value: any }>();

export function invalidateSchoolBlogRecordCache(institutionId?: string) {
  if (!institutionId) {
    schoolBlogRecordCache.clear();
    return;
  }
  const target = institutionId.trim().toLowerCase();
  for (const [k, v] of schoolBlogRecordCache.entries()) {
    if (
      k.toLowerCase() === target ||
      String(v?.value?.institution_id || '').toLowerCase() === target
    ) {
      schoolBlogRecordCache.delete(k);
    }
  }
}

function getCachedResolvedInstitution(key: string): CanonicalInstitution | null {
  if (!key) return null;
  const hit = resolvedInstitutionCache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }
  if (hit) resolvedInstitutionCache.delete(key);
  return null;
}

function setCachedResolvedInstitution(
  keys: Array<string | null | undefined>,
  value: CanonicalInstitution
) {
  if (resolvedInstitutionCache.size > 500) {
    resolvedInstitutionCache.clear();
  }
  const expiresAt = Date.now() + RESOLVED_INSTITUTION_CACHE_TTL_MS;
  for (const raw of keys) {
    const k = String(raw || '').trim().toLowerCase();
    if (k) {
      resolvedInstitutionCache.set(k, { expiresAt, value });
    }
  }
}

/**
 * Resolves any institution identifier (id, slug, shortName, or full name)
 * to a canonical Grobaax institution record without inventing duplicates.
 */
export async function resolveCanonicalInstitution(params: {
  institutionId?: string | null;
  institutionName?: string | null;
  category?: string | null;
}): Promise<CanonicalInstitution | null> {
  const rawId = (params.institutionId || '').trim();
  const rawName = (params.institutionName || '').trim();

  if (!rawId && !rawName) return null;

  // 0. Fast in-memory cache check
  const cachedHit =
    getCachedResolvedInstitution(rawId.toLowerCase()) ||
    getCachedResolvedInstitution(rawName.toLowerCase()) ||
    getCachedResolvedInstitution(normalizeName(rawName));
  if (cachedHit) {
    return cachedHit;
  }

  // 1. Exact ID / slug / name / shortName match in static master Nigerian Institutions catalog
  if (rawId) {
    const byId = NIGERIAN_INSTITUTIONS.find(
      (i) => i.id.toLowerCase() === rawId.toLowerCase() || slugifyText(i.name) === rawId.toLowerCase()
    );
    if (byId) {
      const canonical = toCanonical(byId);
      setCachedResolvedInstitution([rawId, rawName, canonical.institutionId, canonical.slug], canonical);
      return canonical;
    }
  }

  if (rawName) {
    const normTarget = normalizeName(rawName);
    const exactName = NIGERIAN_INSTITUTIONS.find(
      (i) =>
        i.name.toLowerCase() === rawName.toLowerCase() ||
        normalizeName(i.name) === normTarget ||
        (i.shortName && i.shortName.toLowerCase() === rawName.toLowerCase()) ||
        slugifyText(i.name) === rawName.toLowerCase()
    );
    if (exactName) {
      const canonical = toCanonical(exactName);
      setCachedResolvedInstitution([rawId, rawName, normTarget, canonical.institutionId, canonical.slug], canonical);
      return canonical;
    }

    // Fuzzy substring match (only if unambiguous and high confidence)
    if (normTarget.length >= 6) {
      const partialMatches = NIGERIAN_INSTITUTIONS.filter((i) => {
        const n = normalizeName(i.name);
        return n.includes(normTarget) || normTarget.includes(n);
      });
      if (partialMatches.length === 1) {
        const canonical = toCanonical(partialMatches[0]);
        setCachedResolvedInstitution([rawId, rawName, normTarget, canonical.institutionId, canonical.slug], canonical);
        return canonical;
      }
    }
  }

  // 2. Check existing school_blogs table by ID, slug, or normalized name
  try {
    if (rawId) {
      const { data } = await supabaseAdmin
        .from('school_blogs')
        .select('*')
        .or(`institution_id.eq.${rawId},slug.eq.${rawId}`)
        .maybeSingle();
      if (data) {
        const canonical: CanonicalInstitution = {
          institutionId: data.institution_id,
          institutionName: data.institution_name,
          shortName: data.short_name || '',
          category: data.category || 'University',
          state: data.state || '',
          logo: data.logo || '🏛️',
          slug: data.slug,
        };
        setCachedResolvedInstitution(
          [rawId, rawName, normalizeName(rawName), canonical.institutionId, canonical.institutionName, canonical.slug],
          canonical
        );
        return canonical;
      }
    }
    if (rawName) {
      const { data: allBlogs } = await supabaseAdmin.from('school_blogs').select('*').limit(400);
      const norm = normalizeName(rawName);
      const found = (allBlogs || []).find(
        (b: any) =>
          String(b.institution_name || '').toLowerCase() === rawName.toLowerCase() ||
          normalizeName(b.institution_name || '') === norm ||
          String(b.slug || '') === rawName.toLowerCase()
      );
      if (found) {
        const canonical: CanonicalInstitution = {
          institutionId: found.institution_id,
          institutionName: found.institution_name,
          shortName: found.short_name || '',
          category: found.category || 'University',
          state: found.state || '',
          logo: found.logo || '🏛️',
          slug: found.slug,
        };
        setCachedResolvedInstitution(
          [rawId, rawName, norm, canonical.institutionId, canonical.institutionName, canonical.slug],
          canonical
        );
        return canonical;
      }
    }
  } catch {
    // Non-fatal fallback
  }

  // 3. Check existing institutions / masterInstitutions tables if populated (in parallel)
  try {
    const [instRes, masterRes] = await Promise.all([
      supabaseAdmin.from('institutions').select('id, data').limit(300),
      supabaseAdmin.from('masterInstitutions').select('id, data').limit(300),
    ]);
    for (const rows of [instRes.data, masterRes.data]) {
      for (const r of rows || []) {
        const d = r.data || {};
        const name = String(d.name || d.institutionName || '');
        if (
          (rawId && r.id === rawId) ||
          (rawName &&
            (name.toLowerCase() === rawName.toLowerCase() ||
              normalizeName(name) === normalizeName(rawName)))
        ) {
          const canonical: CanonicalInstitution = {
            institutionId: r.id,
            institutionName: name || rawName || r.id,
            shortName: d.shortName || '',
            category: d.category || d.type || params.category || 'University',
            state: d.state || '',
            logo: d.logo || '🏛️',
            slug: slugifyText(name || r.id),
          };
          setCachedResolvedInstitution(
            [rawId, rawName, normalizeName(rawName), canonical.institutionId, canonical.institutionName, canonical.slug],
            canonical
          );
          return canonical;
        }
      }
    }
  } catch {
    // Ignore if empty
  }

  // 4. Deterministic fallback for valid custom registered institution (like "Ondo State College of Health Technology")
  if (rawName) {
    const cleanSlug = slugifyText(rawName);
    const derivedId =
      rawId && rawId.trim().length > 0
        ? rawId.trim()
        : `custom_${cleanSlug.replace(/-/g, '_').slice(0, 42)}`;
    const canonical: CanonicalInstitution = {
      institutionId: derivedId,
      institutionName: rawName,
      shortName: rawName
        .split(/\s+/)
        .filter((w) => w.length > 2 && !['of', 'and', 'for', 'the'].includes(w.toLowerCase()))
        .map((w) => w[0].toUpperCase())
        .join('')
        .slice(0, 8),
      category: params.category || 'University',
      state: '',
      logo: '🏛️',
      slug: cleanSlug || derivedId,
    };
    setCachedResolvedInstitution(
      [rawId, rawName, normalizeName(rawName), canonical.institutionId, canonical.slug],
      canonical
    );
    return canonical;
  }

  return null;
}

/**
 * Ensures the independent school_blogs record exists for a canonical institution.
 */
export async function ensureSchoolBlogRecord(inst: CanonicalInstitution) {
  const cached = schoolBlogRecordCache.get(inst.institutionId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const { data: existing } = await supabaseAdmin
    .from('school_blogs')
    .select('*')
    .eq('institution_id', inst.institutionId)
    .maybeSingle();

  if (existing) {
    if (schoolBlogRecordCache.size > 400) schoolBlogRecordCache.clear();
    schoolBlogRecordCache.set(inst.institutionId, {
      expiresAt: Date.now() + BLOG_RECORD_CACHE_TTL_MS,
      value: existing,
    });
    return existing;
  }

  const slugCandidate = inst.slug || slugifyText(inst.institutionName) || inst.institutionId;
  const { data: bySlug } = await supabaseAdmin
    .from('school_blogs')
    .select('*')
    .eq('slug', slugCandidate)
    .maybeSingle();
  if (bySlug) {
    if (schoolBlogRecordCache.size > 400) schoolBlogRecordCache.clear();
    schoolBlogRecordCache.set(inst.institutionId, {
      expiresAt: Date.now() + BLOG_RECORD_CACHE_TTL_MS,
      value: bySlug,
    });
    return bySlug;
  }

  const defaultDesc = `Official student newsroom, campus announcements, academic updates, and verified events from ${inst.institutionName}.`;
  const { data: inserted, error } = await supabaseAdmin
    .from('school_blogs')
    .insert({
      institution_id: inst.institutionId,
      institution_name: inst.institutionName,
      short_name: inst.shortName || '',
      category: inst.category || 'University',
      state: inst.state || '',
      logo: inst.logo || '🏛️',
      slug: slugCandidate,
      description: defaultDesc,
      status: 'active',
    })
    .select('*')
    .single();

  if (error) {
    // Handle possible concurrent insert race cleanly
    const { data: retry } = await supabaseAdmin
      .from('school_blogs')
      .select('*')
      .eq('institution_id', inst.institutionId)
      .maybeSingle();
    if (retry) {
      schoolBlogRecordCache.set(inst.institutionId, {
        expiresAt: Date.now() + BLOG_RECORD_CACHE_TTL_MS,
        value: retry,
      });
      return retry;
    }
    throw error;
  }

  if (schoolBlogRecordCache.size > 400) schoolBlogRecordCache.clear();
  schoolBlogRecordCache.set(inst.institutionId, {
    expiresAt: Date.now() + BLOG_RECORD_CACHE_TTL_MS,
    value: inserted,
  });
  return inserted;
}
