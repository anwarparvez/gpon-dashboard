/* ================================
   📌 SERVER-SIDE CONFIGURATION
   (Only imported in server components/API routes)
================================ */

export const getRadiusMeters = (): number => {
  const radius = process.env.RADIUS_METER;
  const parsed = parseInt(radius || '5', 10);
  
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(`Invalid RADIUS_METER value: ${radius}, defaulting to 5`);
    return 5;
  }
  
  return parsed;
};

export const RADIUS_METERS = getRadiusMeters();