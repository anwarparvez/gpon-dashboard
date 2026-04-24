import { connectDB } from "@/lib/mongodb";
import Node from "@/models/Node";
import { RADIUS_METERS, getRadiusMeters } from "@/lib/config.server";

/* ================================
   📏 Distance Function (Haversine)
================================ */
export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // meters
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ================================
   🔍 Check if a node is too close to existing nodes
================================ */
export function isTooClose(
  lat: number,
  lng: number,
  nodes: any[],
  excludeNodeId?: string,
  radius: number = RADIUS_METERS
): boolean {
  return nodes.some((n) => {
    if (!n.location?.coordinates) return false;

    // Skip the node we're updating
    if (excludeNodeId && n._id?.toString() === excludeNodeId) {
      return false;
    }
    if (excludeNodeId && n.node_id === excludeNodeId) {
      return false;
    }

    const [lng2, lat2] = n.location.coordinates;
    return getDistance(lat, lng, lat2, lng2) < radius;
  });
}

/* ================================
   🔍 Check against both DB and batch
================================ */
export function checkLocationConflicts(
  lat: number,
  lng: number,
  existingNodes: any[],
  batchLocations: { lat: number; lng: number; node_id?: string }[],
  currentNodeId?: string,
  radius: number = RADIUS_METERS
): { isTooClose: boolean; conflictType?: 'db' | 'batch' } {
  // Check against DB (excluding current node)
  const tooCloseToDB = isTooClose(lat, lng, existingNodes, currentNodeId, radius);
  if (tooCloseToDB) {
    return { isTooClose: true, conflictType: 'db' };
  }

  // Check against current batch
  const tooCloseInBatch = batchLocations.some((loc) => {
    if (currentNodeId && loc.node_id === currentNodeId) return false;
    return getDistance(lat, lng, loc.lat, loc.lng) < radius;
  });

  if (tooCloseInBatch) {
    return { isTooClose: true, conflictType: 'batch' };
  }

  return { isTooClose: false };
}

/* ================================
   📦 Create location object for MongoDB
================================ */
export function createLocationObject(lat: number, lng: number) {
  return {
    type: "Point" as const,
    coordinates: [lng, lat],
  };
}

/* ================================
   🔄 Preserve existing location data
================================ */
export function preserveExistingLocation(existingNode: any, updateData: any) {
  if (existingNode.location && existingNode.location.coordinates) {
    // Preserve the original location object exactly as it was
    updateData.location = existingNode.location;
    updateData.latitude = existingNode.latitude;
    updateData.longitude = existingNode.longitude;
  } else if (existingNode.latitude && existingNode.longitude) {
    // If location object is missing but lat/lng exist, recreate location
    updateData.location = createLocationObject(existingNode.longitude, existingNode.latitude);
    updateData.latitude = existingNode.latitude;
    updateData.longitude = existingNode.longitude;
  }
  return updateData;
}

/* ================================
   🧹 Sanitize update data (remove undefined values)
================================ */
export function sanitizeUpdateData(data: any): any {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/* ================================
   🏗️ Build base update data from input
================================ */
export function buildBaseUpdateData(item: any): any {
  const updateData: any = {
    name: item.name,
    updatedAt: new Date(),
  };

  // Optional fields
  const optionalFields = ['node_category', 'status', 'dgm', 'region', 'node_code', 'address'];
  for (const field of optionalFields) {
    if (item[field] !== undefined) {
      updateData[field] = item[field];
    }
  }

  return updateData;
}

/* ================================
   📊 Process bulk operations with conflict detection
================================ */
export async function processBulkUpsert(
  items: any[],
  radius: number = RADIUS_METERS
): Promise<{
  operations: any[];
  stats: {
    skipped: number;
    locationSkipped: number;
    validItems: number;
  };
}> {
  await connectDB();

  // Load all existing nodes
  const existingNodes = await Node.find({}, {
    node_id: 1,
    location: 1,
    latitude: 1,
    longitude: 1,
    _id: 1
  });

  const operations: any[] = [];
  const stats = {
    skipped: 0,
    locationSkipped: 0,
    validItems: 0
  };
  const acceptedBatch: { lat: number; lng: number; node_id?: string }[] = [];

  for (const item of items) {
    // Basic validation
    if (
      !item.node_id ||
      !item.name ||
      isNaN(Number(item.latitude)) ||
      isNaN(Number(item.longitude))
    ) {
      stats.skipped++;
      continue;
    }

    stats.validItems++;
    const newLat = Number(item.latitude);
    const newLng = Number(item.longitude);
    const existingNode = existingNodes.find((n: any) => n.node_id === item.node_id);

    // Check location conflicts
    const { isTooClose: hasConflict } = checkLocationConflicts(
      newLat,
      newLng,
      existingNodes,
      acceptedBatch,
      existingNode?.node_id,
      radius
    );

    const shouldUpdateLocation = !hasConflict;
    const updateData = buildBaseUpdateData(item);

    // Handle location updates
    if (shouldUpdateLocation) {
      updateData.latitude = newLat;
      updateData.longitude = newLng;
      updateData.location = createLocationObject(newLat, newLng);

      acceptedBatch.push({
        lat: newLat,
        lng: newLng,
        node_id: item.node_id
      });

      console.log(`📍 Location updated for ${item.node_id}`);
    } else if (existingNode) {
      preserveExistingLocation(existingNode, updateData);
      stats.locationSkipped++;
      console.log(`📍 Location update skipped for ${item.node_id} - too close to existing node (within ${radius}m)`);
    } else {
      // New node that's too close - skip entirely
      console.log(`❌ Cannot insert new node ${item.node_id} - too close to existing node (within ${radius}m)`);
      stats.skipped++;
      continue;
    }

    operations.push({
      updateOne: {
        filter: { node_id: item.node_id },
        update: {
          $set: updateData,
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  return { operations, stats };
}

/* ================================
   📤 Get radius for API responses
================================ */
export function getRadiusResponse() {
  return {
    radiusMeters: RADIUS_METERS,
    radiusApplied: `${RADIUS_METERS} meters`
  };
}