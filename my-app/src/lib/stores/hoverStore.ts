import { writable } from 'svelte/store';

export interface MediaInfo {
  type: 'image' | 'video' | 'audio' | 'embed';
  format?: string; // JPG, GIF, WebM, etc.
  title?: string;
  resolution?: string; // "1280x640"
  duration?: string; // "mm:ss"
  size?: string; // "7.1MB"
  source?: string; // For embeds - website source
}

export interface HoverInfo {
  username: string;
  date: string; // DD/MM/YYYY
  time: string; // hh:mm
  positionX: number;
  positionY: number;
  types: string[]; // Array of content types in the post
  media?: MediaInfo; // Only when hovering over specific media
}

export const hoverInfo = writable<HoverInfo | null>(null);

export const hoverActions = {
  setHoverInfo: (info: HoverInfo) => {
    hoverInfo.set(info);
  },
  clearHoverInfo: () => {
    hoverInfo.set(null);
  },
  updatePosition: (x: number, y: number) => {
    hoverInfo.update(current => {
      if (current) {
        return { ...current, positionX: x, positionY: y };
      }
      return current;
    });
  }
};
