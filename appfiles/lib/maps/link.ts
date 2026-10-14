/**
 * Navigation deep links.
 *
 * The app embeds no map and holds no Maps API key — these are plain links out.
 * Where the platform has a scheme of its own we use it, so the device hands off
 * to the user's own navigation app rather than forcing one vendor's website.
 */

export type NavPlatform = "android" | "ios" | "web";

/** Classify the device from a user agent string. */
export const detectNavPlatform = (userAgent: string): NavPlatform => {
  if (/android/i.test(userAgent)) return "android";
  if (/(iphone|ipad|ipod)/i.test(userAgent)) return "ios";
  return "web";
};

/**
 * Build a link that drops a pin on the coordinates and treats them as a
 * destination to navigate to.
 *
 * - Android: `geo:` is resolved by the user's default maps/navigation app (the
 *   system offers a chooser when several apps claim it).
 * - iOS: Apple Maps handles `maps.apple.com`, and iOS 18.4+ lets the user
 *   repoint default navigation links to another app such as Google Maps.
 * - Everything else: a Google Maps directions URL, which also opens the native
 *   app on mobile via universal links.
 */
export const navigationUrl = (
  platform: NavPlatform,
  latitude: number,
  longitude: number,
): string => {
  const coordinates = `${latitude},${longitude}`;

  switch (platform) {
    case "android":
      return `geo:${coordinates}?q=${coordinates}`;
    case "ios":
      return `https://maps.apple.com/?daddr=${coordinates}`;
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${coordinates}`;
  }
};
