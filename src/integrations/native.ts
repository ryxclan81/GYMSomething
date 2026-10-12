/** Explicit boundary for future native plugins. No PWA placeholder impersonates native functionality. */
export interface NativeCapabilities {
  healthKit: boolean;
  watch: boolean;
  liveActivities: boolean;
  foundationModels: boolean;
  localNotifications: boolean;
  appIntents: boolean;
}
export const nativeCapabilities: NativeCapabilities = {
  healthKit: false,
  watch: false,
  liveActivities: false,
  foundationModels: false,
  localNotifications: false,
  appIntents: false,
};
export function cameraAvailable(): boolean {
  return Boolean(
    globalThis.isSecureContext && navigator.mediaDevices?.getUserMedia,
  );
}
