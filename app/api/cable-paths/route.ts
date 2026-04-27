import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CablePath from '@/models/CablePath';
import Node from '@/models/Node';

export async function GET(req: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const fromCategory = searchParams.get('from_category');
    const toCategory = searchParams.get('to_category');
    const status = searchParams.get('status');

    let query: any = {};
    if (fromCategory) query.from_node_category = fromCategory;
    if (toCategory) query.to_node_category = toCategory;
    if (status) query.status = status;

    const cablePaths = await CablePath.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Transform to include polyline for frontend
    const transformedPaths = cablePaths.map(path => ({
      ...path,
      polyline: path.path?.coordinates || path.path_points || [],
    }));

    return NextResponse.json(transformedPaths);
  } catch (error: any) {
    console.error('Error fetching cable paths:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      from_node_id,
      to_node_id,
      path_points,
      cable_type = 'underground',
      fiber_type = 'SMF',
      fiber_core = 24,
      status = 'proposed',
      color,
      line_width,
      opacity,
      notes,
    } = body;

    if (!from_node_id || !to_node_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!path_points || path_points.length < 2) {
      return NextResponse.json(
        { error: 'Path must have at least 2 points' },
        { status: 400 }
      );
    }

    const [fromNode, toNode] = await Promise.all([
      Node.findOne({ node_id: from_node_id }).lean(),
      Node.findOne({ node_id: to_node_id }).lean(),
    ]);

    if (!fromNode || !toNode) {
      return NextResponse.json(
        { error: 'Source or destination node not found' },
        { status: 404 }
      );
    }

    const length_km = calculatePathLength(path_points);

    const geoJsonPath = {
      type: 'LineString',
      coordinates: path_points,
    };

    const defaultColors = {
      underground: '#2196f3',
      overhead: '#ff9800',
      aerial: '#4caf50',
      submarine: '#9c27b0',
    };

    const cablePath = await CablePath.create({
      from_node_id,
      to_node_id,
      from_node_category: fromNode.node_category,
      to_node_category: toNode.node_category,
      path_points,
      path: geoJsonPath,
      length_km,
      cable_type,
      fiber_type,
      fiber_core,
      status,
      color: color || defaultColors[cable_type as keyof typeof defaultColors] || '#2196f3',
      line_width: line_width || 3,
      opacity: opacity || 0.8,
      notes,
    });

    return NextResponse.json(cablePath, { status: 201 });
  } catch (error: any) {
    console.error('Error creating cable path:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculatePathLength(points: number[][]): number {
  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    const [lng1, lat1] = points[i - 1];
    const [lng2, lat2] = points[i];
    totalDistance += haversineDistance(lat1, lng1, lat2, lng2);
  }
  return totalDistance;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}