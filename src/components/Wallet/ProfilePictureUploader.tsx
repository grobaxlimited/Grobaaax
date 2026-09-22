import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Trash2, Check, RefreshCw, Image as ImageIcon, Sparkles, Wand2, User } from 'lucide-react';
import { uploadUserProfilePicture } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import { compressAvatarImage } from '../../utils/imageCompressor';

interface ProfilePictureUploaderProps {
  currentAvatar: string;
  onSaveAvatar: (newAvatarUrl: string) => Promise<void> | void;
}

const PRESET_AVATAR_SEEDS = [
  'scholar-apollo',
  'scholar-athena',
  'scholar-quantum',
  'scholar-nova',
  'scholar-zenith',
  'scholar-matrix',
  'scholar-oracle',
  'scholar-phoenix'
];

export const ProfilePictureUploader: React.FC<ProfilePictureUploaderProps> = ({
  currentAvatar,
  onSaveAvatar,
}) => {
  const { firebaseUser, currentUser } = useApp();
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatar);
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Synchronize previewUrl if currentAvatar updates externally and user hasn't selected a new photo
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(currentAvatar);
    }
  }, [currentAvatar, selectedFile]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 2MB. Please choose an image 2MB or smaller.');
      return;
    }

    setErrorMsg(null);
    setIsCompressing(true);

    try {
      // Compress and center-crop to 400x400 square JPEG client-side
      const { blob, dataUrl } = await compressAvatarImage(file, 400, 0.85);
      setSelectedFile(blob);
      setPreviewUrl(dataUrl);
      setSaveSuccess(false);
    } catch (err: any) {
      console.error('Error processing image:', err);
      // Fallback to raw reader
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedFile(file);
          setPreviewUrl(event.target.result as string);
          setSaveSuccess(false);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveImage = () => {
    const seed = currentUser?.username || firebaseUser?.uid || 'scholar';
    const fallbackAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
    setSelectedFile(null);
    setPreviewUrl(fallbackAvatar);
    setSaveSuccess(false);
    setErrorMsg(null);
  };

  const handleSelectPreset = (seed: string) => {
    const presetUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
    setSelectedFile(null);
    setPreviewUrl(presetUrl);
    setSaveSuccess(false);
    setErrorMsg(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      let finalAvatarUrl = previewUrl;

      // If a local file/blob was selected, upload via storage or get resilient compressed data URL
      const uid = firebaseUser?.uid || currentUser.id || 'scholar_local';
      if (selectedFile) {
        try {
          const { downloadUrl } = await uploadUserProfilePicture(selectedFile, uid);
          if (downloadUrl) {
            finalAvatarUrl = downloadUrl;
          }
        } catch (storageErr) {
          console.warn('Storage upload fallback:', storageErr);
        }
      }

      await onSaveAvatar(finalAvatarUrl);
      setSaveSuccess(true);
      setSelectedFile(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save profile picture:', err);
      setErrorMsg(err.message || 'Failed to save profile picture. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedChanges = previewUrl !== currentAvatar;

  return (
    <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3.5 sm:gap-4">
        {/* Avatar Preview */}
        <div className="relative group shrink-0">
          <img
            src={previewUrl}
            alt="Profile Preview"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-500/50 shadow-md ring-2 ring-blue-500/20 bg-slate-800"
            referrerPolicy="no-referrer"
          />
          {isCompressing && (
            <div className="absolute inset-0 bg-slate-950/70 rounded-2xl flex flex-col items-center justify-center gap-1">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-[8px] text-blue-200 font-bold uppercase tracking-wider">Optimizing</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-blue-900 text-white hover:bg-blue-800 cursor-pointer shadow-md transition-all"
            title="Change Photo"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Change Profile Photo</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Upload photo (Max 2MB), capture with camera, or select an avatar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Gallery Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-900 dark:text-blue-400 font-bold text-[11px] border border-blue-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Choose</span>
            </button>

            {/* Camera Take Photo */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold text-[11px] border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Camera className="w-3 h-3" />
              <span>Camera</span>
            </button>

            {/* Avatar Presets Toggle */}
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-bold text-[11px] border border-indigo-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Wand2 className="w-3 h-3" />
              <span>Avatars</span>
            </button>

            {/* Reset / Remove */}
            <button
              type="button"
              onClick={handleRemoveImage}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px] border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Reset to default avatar"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Avatars Selector */}
      {showPresets && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Select a Scholar Avatar:</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {PRESET_AVATAR_SEEDS.map((seed) => {
              const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
              const isSelected = previewUrl === url;
              return (
                <button
                  key={seed}
                  type="button"
                  onClick={() => handleSelectPreset(seed)}
                  className={`p-1 rounded-xl border transition-all cursor-pointer bg-slate-800/80 hover:scale-105 ${
                    isSelected
                      ? 'border-blue-700 ring-2 ring-blue-500/50 bg-blue-950/40'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                  title={seed}
                >
                  <img
                    src={url}
                    alt={seed}
                    className="w-full h-10 object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Save Button & Notifications */}
      {hasUnsavedChanges && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-amber-500 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Unsaved photo changes
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isCompressing}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-blue-950/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving Photo...' : saveSuccess ? 'Saved ✓' : 'Save Picture'}</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={handleSave}
            className="px-2 py-1 bg-rose-500 text-white text-[10px] font-bold rounded-lg hover:bg-rose-600 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
