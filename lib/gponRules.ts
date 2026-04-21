// 🔥 GPON RULE + LINK ENGINE (FINAL)

export type NodeType =
  | 'OLT'
  | 'OCC'
  | 'ODP'
  | 'HODP'
  | 'Branch Point';

type FiberType = 'UG' | 'OH';

type Rule = { fiber: FiberType };

type ValidateResult =
  | { valid: false; error: string }
  | {
      valid: true;
      fromNode: any;
      toNode: any;
      fiber_type: FiberType;
      reversed: boolean;
    };

type BuildResult =
  | { valid: false; error: string }
  | {
      valid: true;
      data: {
        from_node: any;
        to_node: any;
        node_pair: string;

        fiber_type: FiberType;
        fiber_core: number;
        used_core: number;
        available_core: number;

        length: number; // km
        status: 'active' | 'planned' | 'proposed';
        note: string;
      };
    };

/* =========================
   📡 RULES (GPON TOPOLOGY)
========================= */
export function getLinkRule(from: NodeType, to: NodeType): Rule | null {
  const rules: Record<string, Record<string, Rule>> = {
    OLT: {
      OCC: { fiber: 'UG' },
      'Branch Point': { fiber: 'UG' },
      ODP: { fiber: 'UG' },
    },
    OCC: {
      ODP: { fiber: 'UG' },
      'Branch Point': { fiber: 'UG' },
    },
    ODP: {
      HODP: { fiber: 'OH' },
      'Branch Point': { fiber: 'OH' },
    },
  };

  return rules[from]?.[to] || null;
}

/* =========================
   🔍 VALIDATE + AUTO FIX
========================= */
export function validateLink(fromNode: any, toNode: any): ValidateResult {
  if (!fromNode || !toNode) {
    return { valid: false, error: 'Node missing' };
  }

  // 🔒 Safe ObjectId compare
  if (String(fromNode._id) === String(toNode._id)) {
    return { valid: false, error: 'Same node not allowed' };
  }

  let rule = getLinkRule(
    fromNode.node_category as NodeType,
    toNode.node_category as NodeType
  );

  let reversed = false;

  // 🔄 Try reverse
  if (!rule) {
    const reverseRule = getLinkRule(
      toNode.node_category as NodeType,
      fromNode.node_category as NodeType
    );

    if (reverseRule) {
      reversed = true;
      rule = reverseRule;
      [fromNode, toNode] = [toNode, fromNode];
    }
  }

  if (!rule) {
    return {
      valid: false,
      error: `Invalid: ${fromNode.node_category} → ${toNode.node_category}`,
    };
  }

  return {
    valid: true,
    fromNode,
    toNode,
    fiber_type: rule.fiber,
    reversed,
  };
}

/* =========================
   🌍 DISTANCE (HAVERSINE)
========================= */
export function calculateDistanceKm(
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null
  ) return 0;

  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* =========================
   🔗 BUILD LINK (MAIN ENGINE)
========================= */
export function buildLink(
  fromNode: any,
  toNode: any,
  extra: any = {}
): BuildResult {

  const validation = validateLink(fromNode, toNode);

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error,
    };
  }

  const { fromNode: A, toNode: B, fiber_type } = validation;

  // 🌍 Distance
  const distance = calculateDistanceKm(
    A.latitude,
    A.longitude,
    B.latitude,
    B.longitude
  );

  // 🔄 Normalize pair (A-B = B-A)
  const ids = [String(A._id), String(B._id)].sort();
  const node_pair = `${ids[0]}_${ids[1]}`;

  // 🔢 Core
  const fiber_core = Number(extra.fiber_core) || 12;
  const used_core = Number(extra.used_core) || 0;

  if (used_core > fiber_core) {
    return {
      valid: false,
      error: 'Used core exceeds total core',
    };
  }

  const available_core = fiber_core - used_core;

  return {
    valid: true,
    data: {
      from_node: A._id,
      to_node: B._id,
      node_pair,

      fiber_type,
      fiber_core,
      used_core,
      available_core,

      length: Number(distance.toFixed(3)),

      status: (extra.status as 'active' | 'planned' | 'proposed') || 'planned',
      note: extra.note || '',
    },
  };
}