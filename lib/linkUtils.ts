import { calculateDistanceKm } from './geoUtils';
import { validateLink  } from './gponRules';

export function buildLink(fromNode: any, toNode: any, extra: any = {}) {

  const topo = validateLink (fromNode, toNode);

  if (!topo.valid) {
    return {
      valid: false,
      error: topo.error
    };
  }

  const { fromNode: A, toNode: B } = topo;

  // 🌍 Distance
  let distance = 0;

  if (
    A.latitude != null &&
    A.longitude != null &&
    B.latitude != null &&
    B.longitude != null
  ) {
    distance = calculateDistanceKm(
      A.latitude,
      A.longitude,
      B.latitude,
      B.longitude
    );
  }

  return {
    valid: true,

    data: {
      from_node: A._id,
      to_node: B._id,

      fiber_type: topo.fiber_type,
      fiber_core: Number(extra.fiber_core) || 12,
      used_core: Number(extra.used_core) || 0,

      length: Number(distance.toFixed(3)),
      status: extra.status || 'planned',
      note: extra.note || ''
    }
  };
}