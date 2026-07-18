// Compatibility shim: expo-router still calls Font.resetServerContext(),
// but expo-font removed it in SDK 53. Re-export the real server module and
// provide a no-op for the removed API.
export {
  getServerResources,
  getServerResourceDescriptors,
  registerStaticFont,
  withServerContext,
} from '../../../node_modules/expo-font/build/server.js';

export function resetServerContext() {
  // No-op — server-side font state is now scoped per-render in expo-font.
}
