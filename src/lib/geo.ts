export const STATE_CENTROIDS: Record<string, { lat: number; lon: number; abbr: string }> = {
  Alabama: { lat: 32.8, lon: -86.79, abbr: "AL" },
  Alaska: { lat: 61.37, lon: -152.4, abbr: "AK" },
  Arizona: { lat: 33.73, lon: -111.43, abbr: "AZ" },
  Arkansas: { lat: 34.97, lon: -92.37, abbr: "AR" },
  California: { lat: 36.12, lon: -119.68, abbr: "CA" },
  Colorado: { lat: 39.06, lon: -105.31, abbr: "CO" },
  Connecticut: { lat: 41.6, lon: -72.76, abbr: "CT" },
  Delaware: { lat: 39.32, lon: -75.51, abbr: "DE" },
  "District of Columbia": { lat: 38.9, lon: -77.03, abbr: "DC" },
  Florida: { lat: 27.77, lon: -81.69, abbr: "FL" },
  Georgia: { lat: 33.04, lon: -83.64, abbr: "GA" },
  Hawaii: { lat: 21.09, lon: -157.5, abbr: "HI" },
  Idaho: { lat: 44.24, lon: -114.48, abbr: "ID" },
  Illinois: { lat: 40.35, lon: -88.99, abbr: "IL" },
  Indiana: { lat: 39.85, lon: -86.26, abbr: "IN" },
  Iowa: { lat: 42.01, lon: -93.21, abbr: "IA" },
  Kansas: { lat: 38.53, lon: -96.73, abbr: "KS" },
  Kentucky: { lat: 37.67, lon: -84.67, abbr: "KY" },
  Louisiana: { lat: 31.17, lon: -91.87, abbr: "LA" },
  Maine: { lat: 44.69, lon: -69.38, abbr: "ME" },
  Maryland: { lat: 39.06, lon: -76.8, abbr: "MD" },
  Massachusetts: { lat: 42.23, lon: -71.53, abbr: "MA" },
  Michigan: { lat: 43.33, lon: -84.54, abbr: "MI" },
  Minnesota: { lat: 45.69, lon: -93.9, abbr: "MN" },
  Mississippi: { lat: 32.74, lon: -89.68, abbr: "MS" },
  Missouri: { lat: 38.46, lon: -92.29, abbr: "MO" },
  Montana: { lat: 46.92, lon: -110.45, abbr: "MT" },
  Nebraska: { lat: 41.13, lon: -98.27, abbr: "NE" },
  Nevada: { lat: 38.31, lon: -117.06, abbr: "NV" },
  "New Hampshire": { lat: 43.45, lon: -71.56, abbr: "NH" },
  "New Jersey": { lat: 40.3, lon: -74.52, abbr: "NJ" },
  "New Mexico": { lat: 34.84, lon: -106.25, abbr: "NM" },
  "New York": { lat: 42.17, lon: -74.95, abbr: "NY" },
  "North Carolina": { lat: 35.63, lon: -79.81, abbr: "NC" },
  "North Dakota": { lat: 47.53, lon: -99.78, abbr: "ND" },
  Ohio: { lat: 40.39, lon: -82.76, abbr: "OH" },
  Oklahoma: { lat: 35.57, lon: -96.93, abbr: "OK" },
  Oregon: { lat: 44.57, lon: -122.07, abbr: "OR" },
  Pennsylvania: { lat: 40.59, lon: -77.21, abbr: "PA" },
  "Rhode Island": { lat: 41.68, lon: -71.51, abbr: "RI" },
  "South Carolina": { lat: 33.86, lon: -80.95, abbr: "SC" },
  "South Dakota": { lat: 44.3, lon: -99.44, abbr: "SD" },
  Tennessee: { lat: 35.75, lon: -86.69, abbr: "TN" },
  Texas: { lat: 31.05, lon: -97.56, abbr: "TX" },
  Utah: { lat: 40.15, lon: -111.86, abbr: "UT" },
  Vermont: { lat: 44.05, lon: -72.71, abbr: "VT" },
  Virginia: { lat: 37.77, lon: -78.17, abbr: "VA" },
  Washington: { lat: 47.4, lon: -121.49, abbr: "WA" },
  "West Virginia": { lat: 38.49, lon: -80.95, abbr: "WV" },
  Wisconsin: { lat: 44.27, lon: -89.62, abbr: "WI" },
  Wyoming: { lat: 42.76, lon: -107.3, abbr: "WY" },
};

export const MAP_W = 900;
export const MAP_H = 520;

/** Simple equirectangular-ish projection tuned to the contiguous US. */
export function project(lat: number, lon: number): { x: number; y: number } {
  const lon0 = -125,
    lon1 = -66,
    lat0 = 50,
    lat1 = 24;
  const x = ((lon - lon0) / (lon1 - lon0)) * MAP_W;
  const y = ((lat0 - lat) / (lat0 - lat1)) * MAP_H;
  return { x, y };
}
