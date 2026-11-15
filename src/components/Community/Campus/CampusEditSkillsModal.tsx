import React, { useEffect, useState } from 'react';
import { updateMyCampusSkills } from '../../../lib/campusService';
import { CampusSkillsSelector } from './CampusSkillsSelector';
import { AlertCircle, Loader2, Sparkles, X } from 'lucide-react';

interface CampusEditSkillsModalProps {
  userId: string;
  currentSkills: string[];
  currentSkillIds?: string[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (skills: string[], skillIds: string[]) => void;
}

export const CampusEditSkillsModal: React.FC<CampusEditSkillsModalProps> = ({
  userId,
  currentSkills,
  currentSkillIds = [],
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [skillNames, setSkillNames] = useState<string[]>(currentSkills || []);
  const [skillIds, setSkillIds] = useState<string[]>(currentSkillIds || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSkillNames(currentSkills || []);
      setSkillIds(currentSkillIds || []);
      setError(null);
    }
  }, [isOpen, currentSkills, currentSkillIds]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const res = await updateMyCampusSkills({
        userId,
        skillIds,
        skills: skillNames,
      });
      if (res.success) {
        onUpdated(res.skills || skillNames, res.skillIds || skillIds);
        onClose();
      } else {
        setError(res.error || 'Failed to update skills.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error saving skills.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Manage Campus Skills
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select skills you possess so fellow scholars can discover and collaborate with you.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <CampusSkillsSelector
            selectedSkillNames={skillNames}
            selectedSkillIds={skillIds}
            onChange={(nextIds, nextNames) => {
              setSkillIds(nextIds);
              setSkillNames(nextNames);
            }}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="campus-save-skills-btn"
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Skills...</span>
                </>
              ) : (
                <span>Save Skills</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
