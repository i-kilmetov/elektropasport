export const MAX_APPLIANCE_PASSPORT_PHOTOS = 5;
/** Compressed JPEG after client resize — stay under Vercel body limits. */
export const MAX_APPLIANCE_PASSPORT_BYTES = Math.floor(3.5 * 1024 * 1024);

export type AppliancePassportPhotoMeta = {
  id: string;
  createdAt: string;
};

