import { create } from 'zustand';

import type { ImageState, ImageStateInStore, ImagesStateInStore } from '@entities/upload_img';
import type { AddPhotoResponse, ID } from '@shared/types/BaseQueryTypes';

type UsersImages = {
  [K in ID]: ImagesStateInStore;
};
type UsersFotoStore = {
  usersImages: UsersImages;
  setImageToStoreAfterLoading: (image: ImageStateInStore, userId: ID) => void;
  resetImageStore: (userId: ID) => void;
  imageHasUpload: (imagesIds: AddPhotoResponse, userId: ID) => void;
  setNotSavedImageInDataBase: (imageList: ImageState[], userId: ID) => void;
  imageHasNoUpload: (userId: ID, message?: string) => void;
  setUserImagesUrl: (urls: string[], userId: ID) => void;
  deleteImage: (idImage: ID, userId: ID) => void;
  changeAvatar: (idImage: ID, isUser: ID) => void;
};

export const userFotoStore = create<UsersFotoStore>()((set, get) => ({
  usersImages: {},
  setImageToStoreAfterLoading: (image, userId) => {
    if (!userId) return;
    const state = get().usersImages;
    const userImages = state[userId] ? state[userId] : [];
    const newState = userImages.map((storeImage) => {
      if (storeImage?.url === image?.url) {
        return {
          ...storeImage,
          hash: image?.hash,
          id: image?.id,
          src: image?.src,
          image: image?.image,
          isAvatar: image?.isAvatar,
        };
      }
      return storeImage;
    });

    set({ usersImages: { ...state, [userId]: newState } });
  },
  resetImageStore: (userId) => {
    if (!userId) return;
    const state = get().usersImages;
    state[userId] = [];
    set((prev) => ({ ...prev, usersImages: { ...state, [userId]: [] } }));
  },
  imageHasUpload: (imagesIds, userId) => {
    if (!userId) return;
    const state = get().usersImages;
    const userImages = state[userId] || [];
    const notSavedImage = userImages.filter((image) => !image.isSavedInDataBase);
    const savedImage = userImages.filter((image) => image.isSavedInDataBase);
    if (notSavedImage.length !== imagesIds.length) {
      set((prev) => ({ ...prev, usersImages: { ...state, [userId]: savedImage } }));
      return;
    }
    const newState: ImagesStateInStore = [];
    for (const image of notSavedImage) {
      const imageId = imagesIds.find((imageId) => {
        return imageId.hash === image.hash;
      });

      if (!imageId) {
        state[userId] = savedImage;
        set({ usersImages: { ...state, [userId]: savedImage } });
        return;
      }

      if (imageId) {
        newState.push({
          ...image,
          isSavedInDataBase: true,
          hash: imageId.hash,
          id: imageId.id,
        });
      }
    }

    set((prev) => ({ ...prev, usersImages: { ...state, [userId]: [...newState, ...savedImage] } }));
  },
  setNotSavedImageInDataBase: (imageList, userId) => {
    if (!userId) return;

    const newState = imageList.map((image) => ({
      ...image,
      isSavedInDataBase: false,
      isAvatar: false,
    }));
    const state = get().usersImages;
    const userImages = state[userId] || [];
    const newImageState = [...newState, ...userImages];

    set((prev) => ({ ...prev, usersImages: { ...state, [userId]: newImageState } }));
  },
  imageHasNoUpload: (userId) => {
    if (!userId) return;
    const state = get().usersImages;
    const newImages = (state[userId] || []).filter((imageState) => imageState.isSavedInDataBase);

    set((prev) => ({
      ...prev,
      usersImages: {
        ...state,
        [userId]: newImages,
      },
    }));
  },
  setUserImagesUrl: (urls, userId) => {
    const state = get().usersImages;
    const prevImage = state[userId] || [];

    const newImage: ImageStateInStore[] = [];

    for (const url of urls) {
      const hasImgInStore = prevImage.find((item) => {
        if (!item?.url) return true;
        return item.url === url;
      });

      if (hasImgInStore) continue;
      const img: ImageStateInStore = {
        url,
        hash: null,
        isSavedInDataBase: true,
        src: null,
        image: null,
        id: null,
        isAvatar: false,
      };
      newImage.push(img);
    }

    if (newImage.length < 1) return;
    set((prev) => ({
      ...prev,
      usersImages: { ...state, [userId]: [...newImage, ...prevImage] },
    }));
  },
  deleteImage: (idImage, userId) => {
    const state = get().usersImages;
    const prevImage = state[userId] || [];
    const newState = prevImage.filter((item) => item?.id !== idImage);

    set((prev) => ({ ...prev, usersImages: { ...state, [userId]: newState } }));
  },

  changeAvatar: (idImage, idUser) => {
    if (!idUser || !idImage) return;
    const state = get().usersImages;
    const prevImage = state[idUser] || [];
    const newImages = prevImage.map((image) => {
      if (image?.id === idImage) {
        return {
          ...image,
          isAvatar: true,
        };
      }

      return {
        ...image,
        isAvatar: false,
      };
    });

    set((prev) => ({ ...prev, usersImages: { ...state, [idUser]: newImages } }));
  },
}));
