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

export interface Reel {
  id: string;
  createdAt: string;
  photos: Photo[];
  song?: Song;
  transitionType?: number | 'auto';
}

export type AppState = 'landing' | 'upload' | 'music' | 'preview' | 'exporting' | 'complete' | 'history';
