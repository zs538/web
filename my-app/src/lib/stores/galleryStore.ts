import { writable } from 'svelte/store';

export interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
  position: number;
}

export interface GalleryState {
  isOpen: boolean;
  images: GalleryImage[];
  currentIndex: number;
}

const initialState: GalleryState = {
  isOpen: false,
  images: [],
  currentIndex: 0
};

export const galleryStore = writable<GalleryState>(initialState);

export const galleryActions = {
  openGallery: (images: GalleryImage[], startIndex: number = 0) => {
    galleryStore.set({
      isOpen: true,
      images,
      currentIndex: startIndex
    });
  },

  closeGallery: () => {
    galleryStore.set(initialState);
  },

  nextImage: () => {
    galleryStore.update(state => {
      if (state.images.length === 0) return state;
      return {
        ...state,
        currentIndex: (state.currentIndex + 1) % state.images.length
      };
    });
  },

  previousImage: () => {
    galleryStore.update(state => {
      if (state.images.length === 0) return state;
      return {
        ...state,
        currentIndex: state.currentIndex === 0
          ? state.images.length - 1
          : state.currentIndex - 1
      };
    });
  }
};
