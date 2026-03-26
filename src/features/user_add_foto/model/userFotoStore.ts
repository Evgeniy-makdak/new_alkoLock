import { create } from 'zustand';

import type { ImageState, ImageStateInStore, ImagesStateInStore } from '@entities/upload_img';
import type { AddPhotoResponse, ID, IUserPhotoDTO } from '@shared/types/BaseQueryTypes';

/** Нормализация ключа из GET api/v1/users/photos/reference/:userId (поле body) для сопоставления со стором */
function normalizeGalleryRefUrl(url: string): string {
  return (url ?? '').trim();
}

/**
 * true, если запись в сторе уже описывает этот ref (после повторного открытия вкладки не создаём дубль).
 * Загрузка с клиента часто даёт id/hash без url — сравниваем с body по id и hash.
 */
function galleryRefMatchesStoreItem(refUrl: string, item: ImageStateInStore): boolean {
  const u = normalizeGalleryRefUrl(refUrl);
  if (!u) return false;
  if ((item?.url == null || item.url === '') && item?.hash == null && item?.id == null) {
    return false;
  }

  const itemUrl = item.url != null ? normalizeGalleryRefUrl(String(item.url)) : '';
  if (itemUrl) {
    if (itemUrl === u || itemUrl.endsWith(u) || u.endsWith(itemUrl)) {
      return true;
    }
  }

  if (item.id != null) {
    const idStr = String(item.id);
    if (u === idStr || u.endsWith(`/${idStr}`) || u.endsWith(idStr)) {
      return true;
    }
  }

  if (item.hash) {
    if (u.includes(item.hash)) return true;
    const legacy = u.length > 12 ? u.slice(12) : '';
    if (legacy && item.hash === legacy) return true;
  }

  return false;
}

type UsersImages = {
  [K in ID]: ImagesStateInStore;
};

type UsersFotoStore = {
  usersImages: UsersImages;
  setImageToStoreAfterLoading: (image: ImageStateInStore, userId: ID) => void;
  resetImageStore: (userId: ID) => void;
  deleteImageByHash: (idImage: ID, userId: ID) => void;
  imageHasUpload: (imagesIds: AddPhotoResponse, userId: ID) => void;
  setNotSavedImageInDataBase: (imageList: ImageState[], userId: ID) => void;
  imageHasNoUpload: (userId: ID, message?: string) => void;
  getUserImages: (urls: string[], userId: ID) => void;
  deleteImage: (idImage: ID, userId: ID) => void;
  changeAvatar: (idImage: ID, isUser: ID, isAvatar?: boolean) => void;
  updateUserImages: (userId: ID, images: ImageStateInStore[]) => void;
  /** После PUT user: привести isAvatar в галерее в соответствие с userPhotoDTO.default с бэка */
  syncGalleryAvatarFromUserPhoto: (userId: ID, photo: IUserPhotoDTO | null | undefined) => void;
};

export const userFotoStore = create<UsersFotoStore>()((set, get) => ({
  usersImages: {},

  syncGalleryAvatarFromUserPhoto: (userId, photo) => {
    if (!userId) return;
    const state = get().usersImages;
    const prev = state[userId];
    if (!prev?.length) return;

    const isDefault = photo?.default === true;
    const avatarId = isDefault && photo?.id != null ? String(photo.id) : null;
    const avatarHash = isDefault && photo?.hash ? String(photo.hash) : null;

    const newImages = prev.map((img) => {
      const idMatch = avatarId != null && img.id != null && String(img.id) === avatarId;
      const hashMatch = avatarHash != null && img.hash != null && String(img.hash) === avatarHash;
      return {
        ...img,
        isAvatar: Boolean(idMatch || hashMatch),
      };
    });

    set({ usersImages: { ...state, [userId]: newImages } });
  },

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
      if (image?.isAvatar && storeImage.isAvatar) {
        return {
          ...storeImage,
          isAvatar: false,
        };
      }
      return storeImage;
    });

    set({ usersImages: { ...state, [userId]: newState } });
  },

  resetImageStore: (userId) => {
    if (!userId) return;
    const state = get().usersImages;
    set((prev) => ({ ...prev, usersImages: { ...state, [userId]: [] } }));
  },

  imageHasUpload: (imagesIds, userId) => {
    if (!userId) return;

    const state = get().usersImages;
    const userImages = state[userId] || [];

    const updatedImages = userImages.map((image) => {
      const uploadedImage = imagesIds.find((imgId) => imgId.hash === image.hash);

      if (uploadedImage) {
        return {
          ...image,
          isSavedInDataBase: true,
          id: uploadedImage.id,
          url: uploadedImage.photoUrl ?? image.url,
        };
      }
      return image;
    });

    set({ usersImages: { ...state, [userId]: updatedImages } });
  },

  setNotSavedImageInDataBase: (imageList, userId) => {
    if (!userId) return;

    const newState = imageList.map((image) => ({
      ...image,
      isSavedInDataBase: true,
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

  getUserImages: (urls, userId) => {
    const state = get().usersImages;
    const prevImage = state[userId] || [];
    const newImage: ImageStateInStore[] = [];

    for (const url of urls) {
      const hasImgInStore = prevImage.some((item) => galleryRefMatchesStoreItem(url, item));

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

    if (newImage.length === 0) {
      return;
    }

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
  deleteImageByHash: (hash, userId) => {
    const state = get().usersImages;
    const prevImage = state[userId] || [];
    const newState = prevImage.filter((item) => item?.hash !== hash);

    set((prev) => ({ ...prev, usersImages: { ...state, [userId]: newState } }));
  },

  changeAvatar: (idImage, idUser, isAvatar = true) => {
    if (!idUser || !idImage) return;
    const state = get().usersImages;
    const prevImage = state[idUser] || [];
    const newImages = prevImage.map((image) => {
      if (image?.id === idImage) {
        return {
          ...image,
          isAvatar,
        };
      }

      return {
        ...image,
        isAvatar: false,
      };
    });

    set((prev) => ({ ...prev, usersImages: { ...state, [idUser]: newImages } }));
  },

  updateUserImages: (userId, newImages) => {
    const state = get().usersImages;
    const currentImages = state[userId] || [];
    const nonDuplicateImages = newImages.filter(
      (newImage) =>
        !currentImages.some(
          (currentImage) => currentImage.hash === newImage.hash || currentImage.id === newImage.id,
        ),
    );

    if (nonDuplicateImages.length === 0) return;
    const updatedImages = [...currentImages, ...nonDuplicateImages];
    set({ usersImages: { ...state, [userId]: updatedImages } });
  },
}));
