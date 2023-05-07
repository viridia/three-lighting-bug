export const PUBLIC_URL = '';
export const ASSETS_URL = `${PUBLIC_URL}/game/assets`;
export const SERVER_URL = import.meta.env.VITE_GAMEDATA_URL;
// export const SERVER_URL = 'http://localhost:3001';

/** Allow some features to be disabled when running in CLI. */
export const features = {
  loadScripts: true,
  editableColors: true,
  physics: true,
};
