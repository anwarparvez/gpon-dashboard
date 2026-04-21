// 🔥 GPON RULE ENGINE (SHARED)

export type NodeType =
  | 'OLT'
  | 'OCC'
  | 'ODP'
  | 'HODP'
  | 'Branch Point';

export function getLinkRule(from: NodeType, to: NodeType) {
  const rules: Record<string, Record<string, { fiber: 'UG' | 'OH' }>> = {
    OLT: {
      OCC: { fiber: 'UG' },
      'Branch Point': { fiber: 'UG' },
      ODP: { fiber: 'UG' }
    },
    OCC: {
      ODP: { fiber: 'UG' },
      'Branch Point': { fiber: 'UG' }
    },
    ODP: {
      HODP: { fiber: 'OH' },
      'Branch Point': { fiber: 'OH' }
    }
  };

  return rules[from]?.[to] || null;
}

// 🔍 Validate + auto-fix
export function validateLink(fromNode: any, toNode: any) {
  if (!fromNode || !toNode) {
    return { valid: false, error: 'Node missing' };
  }

  if (fromNode._id === toNode._id) {
    return { valid: false, error: 'Same node not allowed' };
  }

  let rule = getLinkRule(fromNode.node_category, toNode.node_category);
  let reversed = false;

  // 🔄 try reverse
  if (!rule) {
    rule = getLinkRule(toNode.node_category, fromNode.node_category);
    if (rule) {
      reversed = true;
      [fromNode, toNode] = [toNode, fromNode];
    }
  }

  if (!rule) {
    return {
      valid: false,
      error: `Invalid: ${fromNode.node_category} → ${toNode.node_category}`
    };
  }

  return {
    valid: true,
    fromNode,
    toNode,
    fiber_type: rule.fiber,
    reversed
  };
}