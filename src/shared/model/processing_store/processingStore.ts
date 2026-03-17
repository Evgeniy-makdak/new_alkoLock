import { create } from 'zustand';

type EntityType = 'users' | 'alkolocks' | 'vehicles';

interface ProcessingStore {
  processingIds: Record<EntityType, Set<string | number>>;
  addProcessingId: (entity: EntityType, id: string | number) => void;
  removeProcessingId: (entity: EntityType, id: string | number) => void;
  isProcessing: (entity: EntityType, id: string | number) => boolean;
}

const createEmptySet = () => new Set<string | number>();

export const useProcessingStore = create<ProcessingStore>()((set, get) => ({
  processingIds: {
    users: createEmptySet(),
    alkolocks: createEmptySet(),
    vehicles: createEmptySet(),
  },

  addProcessingId: (entity, id) => {
    set((state) => {
      const newSet = new Set(state.processingIds[entity]);
      newSet.add(id);
      return {
        processingIds: {
          ...state.processingIds,
          [entity]: newSet,
        },
      };
    });
  },

  removeProcessingId: (entity, id) => {
    set((state) => {
      const newSet = new Set(state.processingIds[entity]);
      newSet.delete(id);
      return {
        processingIds: {
          ...state.processingIds,
          [entity]: newSet,
        },
      };
    });
  },

  isProcessing: (entity, id) => {
    return get().processingIds[entity].has(id);
  },
}));
