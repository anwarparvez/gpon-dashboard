// lib/nodeUtils.ts

export type NodeCategory =
  | 'OLT'
  | 'OCC'
  | 'ODP'
  | 'HODP'
  | 'Branch Point'
  | 'Hand Hole'
  | 'Joint Closure';

const SHORT_MAP: Record<string, string> = {
  'Branch Point': 'BP',
  'Hand Hole': 'HH',
  'Joint Closure': 'JC'
};

export function getShortCategoryName(cat: string): string {
  return SHORT_MAP[cat] || cat;
}