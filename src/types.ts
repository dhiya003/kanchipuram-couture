/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Photo {
  id: string;
  url: string;
  caption?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  genre: string;
  album?: string;
  duration?: number;
  startOffset?: number;
}

export interface TextConfig {
  font: 'serif' | 'sans' | 'script' | 'display';
  color: string;
  container: string; // Tailwind placement classes
  align: 'left' | 'center' | 'right';
}

export interface Reel {
  id: string;
  createdAt: string;
  photos: Photo[];
  song?: Song;
  texts?: string[];
  textConfigs?: TextConfig[];
  aesthetic?: string;
  filter?: string;
  transitionType?: number | 'auto';
  instagramCaption?: string;
}

export type AppState = 'landing' | 'upload' | 'music' | 'preview' | 'exporting' | 'complete' | 'history' | 'pose_studio';
