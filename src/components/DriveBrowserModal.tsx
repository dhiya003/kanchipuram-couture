import React, { useState, useEffect } from 'react';
import { Folder, Image as ImageIcon, ChevronRight, ArrowLeft, X, Loader2, Check, LogOut, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listDriveFiles, downloadDriveFile, DriveFile } from '../lib/drive';
import { googleSignIn, getAccessToken, logout } from '../lib/firebase';
import { Photo } from '../types';

interface DriveBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPhotos: (photos: Photo[]) => void;
  maxSelectable?: number;
  currentPhotosCount: number;
}

interface Breadcrumb {
  id: string;
  name: string;
}

export default function DriveBrowserModal({
  isOpen,
  onClose,
  onImportPhotos,
  maxSelectable = 20,
  currentPhotosCount,
}: DriveBrowserModalProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: 'root', name: 'My Drive' }]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check auth state on mount
  useEffect(() => {
    if (isOpen) {
      const token = getAccessToken();
      if (token) {
        setIsAuthenticated(true);
        loadFolder('root');
      } else {
        setIsAuthenticated(false);
      }
    }
  }, [isOpen]);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setIsAuthenticated(true);
        loadFolder('root');
      }
    } catch (error: any) {
      console.error('Sign-in failed:', error);
      setErrorMessage(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await logout();
      setIsAuthenticated(false);
      setFiles([]);
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
      setCurrentFolder('root');
      setSelectedFileIds([]);
    } catch (error: any) {
      console.error('Sign-out failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolder = async (folderId: string) => {
    const token = getAccessToken();
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await listDriveFiles(token, folderId);
      setFiles(data.files || []);
      setCurrentFolder(folderId);
    } catch (error: any) {
      console.error('Error loading folder:', error);
      setErrorMessage(error.message || 'Failed to load files from Google Drive.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    const updatedBreadcrumbs = [...breadcrumbs];
    // Find if the folder is already in breadcrumbs to truncate the path
    const index = updatedBreadcrumbs.findIndex((b) => b.id === folderId);
    if (index !== -1) {
      setBreadcrumbs(updatedBreadcrumbs.slice(0, index + 1));
    } else {
      setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
    }
    loadFolder(folderId);
  };

  const navigateBack = () => {
    if (breadcrumbs.length <= 1) return;
    const parent = breadcrumbs[breadcrumbs.length - 2];
    setBreadcrumbs(breadcrumbs.slice(0, breadcrumbs.length - 1));
    loadFolder(parent.id);
  };

  const toggleSelectFile = (fileId: string) => {
    if (selectedFileIds.includes(fileId)) {
      setSelectedFileIds(selectedFileIds.filter((id) => id !== fileId));
    } else {
      const slotsLeft = maxSelectable - currentPhotosCount;
      if (selectedFileIds.length >= slotsLeft) {
        setErrorMessage(`You can only import up to ${slotsLeft} more photo(s).`);
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      setSelectedFileIds([...selectedFileIds, fileId]);
    }
  };

  const handleImport = async () => {
    const token = getAccessToken();
    if (!token || selectedFileIds.length === 0) return;

    setIsDownloading(true);
    setErrorMessage(null);
    setDownloadProgress({ current: 0, total: selectedFileIds.length });

    const importedPhotos: Photo[] = [];

    try {
      for (let i = 0; i < selectedFileIds.length; i++) {
        const fileId = selectedFileIds[i];
        setDownloadProgress({ current: i + 1, total: selectedFileIds.length });
        
        const fileMeta = files.find(f => f.id === fileId);
        const fileName = fileMeta?.name || 'Drive Image';

        const blob = await downloadDriveFile(token, fileId);
        const objectUrl = URL.createObjectURL(blob);

        importedPhotos.push({
          id: fileId,
          url: objectUrl,
          caption: fileName.replace(/\.[^/.]+$/, "") // Remove file extension for cleaner captions if needed
        });
      }

      onImportPhotos(importedPhotos);
      onClose();
      // Reset state
      setSelectedFileIds([]);
    } catch (error: any) {
      console.error('Failed to import files:', error);
      setErrorMessage(error.message || 'Failed to download files from Google Drive.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-saree-gold/20 flex flex-col h-[80vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-saree-ink text-white flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-saree-gold">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19.345 9.176l-5.69-9.176h-3.31l5.69 9.176h3.31zm-6.855-9.176h-1l-7.49 12.824h1l7.49-12.824zm-.5 13.824l-1.85-3.176h-5.14l1.85 3.176h5.14zm9.355.176l-1.85-3.176h-5.14l1.85 3.176h5.14z"/>
              </svg>
            </div>
            <div>
              <h4 className="font-semibold display-text text-lg text-saree-paper">Google Drive Archive</h4>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Select Masterpiece Captures</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-gray-300 hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50 flex flex-col">
          {!isAuthenticated ? (
            /* Sign In Screen */
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto py-12">
              <div className="w-20 h-20 rounded-3xl bg-saree-gold/10 flex items-center justify-center text-saree-gold animate-pulse">
                <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24">
                  <path d="M19.345 9.176l-5.69-9.176h-3.31l5.69 9.176h3.31zm-6.855-9.176h-1l-7.49 12.824h1l7.49-12.824zm-.5 13.824l-1.85-3.176h-5.14l1.85 3.176h5.14zm9.355.176l-1.85-3.176h-5.14l1.85 3.176h5.14z"/>
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl display-text font-medium text-saree-maroon">Connect Google Drive</h3>
                <p className="text-sm text-gray-500 serif-text leading-relaxed">
                  Import high-resolution saree photos directly from your personal or studio Google Drive archives into the presentation generator.
                </p>
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 font-medium">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="gsi-material-button w-full shadow-lg hover:shadow-xl active:scale-98 transition-all"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-medium">Sign in with Google</span>
                </div>
              </button>
            </div>
          ) : (
            /* File Browser Screen */
            <div className="flex-1 flex flex-col space-y-4">
              {/* Toolbar */}
              <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-saree-gold/10">
                {/* Path / Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 overflow-x-auto py-1 scrollbar-none pr-4">
                  {breadcrumbs.length > 1 && (
                    <button
                      onClick={navigateBack}
                      className="p-1 hover:bg-stone-100 rounded-lg text-saree-maroon"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id}>
                      {idx > 0 && <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />}
                      <button
                        onClick={() => navigateToFolder(crumb.id, crumb.name)}
                        className={`hover:text-saree-maroon hover:underline shrink-0 font-medium ${
                          idx === breadcrumbs.length - 1 ? 'text-gray-900 font-semibold' : ''
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => loadFolder(currentFolder)}
                    className="p-1.5 text-gray-400 hover:text-saree-gold hover:bg-stone-100 rounded-lg transition-colors"
                    title="Refresh folder"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                    title="Disconnect Google Account"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline uppercase tracking-widest text-[9px]">Disconnect</span>
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
                  {errorMessage}
                </div>
              )}

              {/* Grid Content */}
              <div className="flex-1 bg-white border border-saree-gold/10 rounded-3xl overflow-y-auto p-4 min-h-[300px]">
                {isLoading ? (
                  <div className="w-full h-full flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                    <Loader2 className="w-8 h-8 text-saree-gold animate-spin" />
                    <p className="serif-text italic text-sm text-gray-500">Retrieving saree archive...</p>
                  </div>
                ) : files.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center py-20 text-gray-400 text-center space-y-2">
                    <ImageIcon className="w-12 h-12 text-gray-200" />
                    <p className="font-medium text-gray-500">No folders or saree photos found</p>
                    <p className="text-xs text-gray-400 max-w-xs">Upload some high resolution photos of your sarees to this folder in Google Drive.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {files.map((file) => {
                      const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                      const isSelected = selectedFileIds.includes(file.id);

                      return (
                        <div
                          key={file.id}
                          onClick={() => {
                            if (isFolder) {
                              navigateToFolder(file.id, file.name);
                            } else {
                              toggleSelectFile(file.id);
                            }
                          }}
                          className={`group relative rounded-2xl border p-3 flex flex-col justify-between cursor-pointer transition-all ${
                            isFolder
                              ? 'border-gray-200 bg-stone-50/50 hover:bg-stone-50 hover:border-saree-gold/30'
                              : isSelected
                              ? 'border-saree-gold bg-saree-gold/5 ring-1 ring-saree-gold'
                              : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                          }`}
                        >
                          {/* Top Badge/Selection indicators */}
                          {!isFolder && (
                            <div className="absolute top-2.5 right-2.5 z-10">
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-saree-gold border-saree-gold text-white'
                                    : 'bg-white/80 border-gray-300 group-hover:border-saree-gold'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                              </div>
                            </div>
                          )}

                          {/* Thumbnail / Icon Container */}
                          <div className="aspect-[4/5] w-full rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden mb-3 relative">
                            {isFolder ? (
                              <Folder className="w-12 h-12 text-amber-500 fill-amber-100" />
                            ) : file.thumbnailLink ? (
                              <img
                                src={file.thumbnailLink.replace(/=s220$/, '=s400')} // Request larger size
                                alt={file.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <ImageIcon className="w-10 h-10 text-gray-300" />
                            )}
                          </div>

                          {/* File Label */}
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-gray-700 truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium">
                              {isFolder ? 'Folder' : file.size ? `${Math.round(parseInt(file.size) / 1024)} KB` : 'Image'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions for File Select */}
        {isAuthenticated && !isLoading && (
          <div className="px-6 py-4 bg-stone-100 border-t border-gray-200 flex justify-between items-center">
            <span className="text-xs text-gray-500 font-semibold">
              {selectedFileIds.length} {selectedFileIds.length === 1 ? 'photo' : 'photos'} selected (max {maxSelectable - currentPhotosCount} more)
            </span>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs uppercase tracking-wider font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedFileIds.length === 0 || isDownloading}
                className={`px-6 py-2 rounded-xl text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-all ${
                  selectedFileIds.length === 0 || isDownloading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-saree-gold text-white hover:bg-saree-maroon shadow-md'
                }`}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Downloading ({downloadProgress.current}/{downloadProgress.total})...
                  </>
                ) : (
                  <>Import Selected</>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
