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

  // 1. Exact ID / slug / name / shortName match in static master Nigerian Institutions catalog
  if (rawId) {
    const byId = NIGERIAN_INSTITUTIONS.find(
      (i) => i.id.toLowerCase() === rawId.toLowerCase() || slugifyText(i.name) === rawId.toLowerCase()
    );
    if (byId) return toCanonical(byId);
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
    if (exactName) return toCanonical(exactName);

    // Fuzzy substring match (only if unambiguous and high confidence)
    if (normTarget.length >= 6) {
      const partialMatches = NIGERIAN_INSTITUTIONS.filter((i) => {
        const n = normalizeName(i.name);
        return n.includes(normTarget) || normTarget.includes(n);
      });
      if (partialMatches.length === 1) {
        return toCanonical(partialMatches[0]);
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
        return {
          institutionId: data.institution_id,
          institutionName: data.institution_name,
          shortName: data.short_name || '',
          category: data.category || 'University',
          state: data.state || '',
          logo: data.logo || '🏛️',
          slug: data.slug,
        };
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
        return {
          institutionId: found.institution_id,
          institutionName: found.institution_name,
          shortName: found.short_name || '',
          category: found.category || 'University',
          state: found.state || '',
          logo: found.logo || '🏛️',
          slug: found.slug,
        };
      }
    }
  } catch {
    // Non-fatal fallback
  }

  // 3. Check existing institutions / masterInstitutions tables if populated
  for (const tbl of ['institutions', 'masterInstitutions']) {
    try {
      const { data: rows } = await supabaseAdmin.from(tbl).select('id, data').limit(300);
      for (const r of rows || []) {
        const d = r.data || {};
        const name = String(d.name || d.institutionName || '');
        if (
          (rawId && r.id === rawId) ||
          (rawName &&
            (name.toLowerCase() === rawName.toLowerCase() ||
              normalizeName(name) === normalizeName(rawName)))
        ) {
          return {
            institutionId: r.id,
            institutionName: name || rawName || r.id,
            shortName: d.shortName || '',
            category: d.category || d.type || params.category || 'University',
            state: d.state || '',
            logo: d.logo || '🏛️',
            slug: slugifyText(name || r.id),
          };
        }
      }
    } catch {
      // Ignore if empty
    }
  }

  // 4. Deterministic fallback for valid custom registered institution (like "Ondo State College of Health Technology")
  if (rawName) {
    const cleanSlug = slugifyText(rawName);
    const derivedId =
      rawId && rawId.trim().length > 0
        ? rawId.trim()
        : `custom_${cleanSlug.replace(/-/g, '_').slice(0, 42)}`;
    return {
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
  }

  return null;
}

/**
 * Ensures the independent school_blogs record exists for a canonical institution.
 */
export async function ensureSchoolBlogRecord(inst: CanonicalInstitution) {
  const { data: existing } = await supabaseAdmin
    .from('school_blogs')
    .select('*')
    .eq('institution_id', inst.institutionId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const slugCandidate = inst.slug || slugifyText(inst.institutionName) || inst.institutionId;
  const { data: bySlug } = await supabaseAdmin
    .from('school_blogs')
    .select('*')
    .eq('slug', slugCandidate)
    .maybeSingle();
  if (bySlug) {
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
    if (retry) return retry;
    throw error;
  }

  return inserted;
}
