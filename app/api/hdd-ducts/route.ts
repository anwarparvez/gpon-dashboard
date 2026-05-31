import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import HDDDuct from '@/models/HDDDuct';

// GET all HDD ducts
export async function GET() {
  try {
    await connectDB();
    const ducts = await HDDDuct.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(ducts || []);
  } catch (error: any) {
    console.error('Error fetching HDD ducts:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST create new HDD duct
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    
    console.log('Received HDD duct data:', body);
    
    // Validate required fields
    if (!body.path_points || body.path_points.length < 2) {
      return NextResponse.json(
        { error: 'Path must have at least 2 points' },
        { status: 400 }
      );
    }
    
    // Generate name if not provided
    if (!body.name) {
      body.name = `HDD-${Date.now()}`;
    }
    
    // Calculate length from path points
    if (body.path_points && body.path_points.length >= 2) {
      body.length_km = calculateLengthFromPoints(body.path_points);
    }
    
    // Generate polyline if not provided
    if (!body.polyline && body.path_points) {
      body.polyline = body.path_points.map((p: number[]) => [p[1], p[0]]);
    }
    
    // Set default color based on way count if not provided
    if (!body.color) {
      const colors: Record<number, string> = {
        1: '#4caf50',
        2: '#2196f3',
        3: '#ff9800',
        4: '#f44336',
      };
      body.color = colors[body.way_count] || '#ff9800';
    }
    
    const duct = await HDDDuct.create(body);
    return NextResponse.json(duct, { status: 201 });
  } catch (error: any) {
    console.error('Error creating HDD duct:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create HDD duct' },
      { status: 500 }
    );
  }
}

// DELETE a duct
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID required' },
        { status: 400 }
      );
    }
    
    const deleted = await HDDDuct.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Duct not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting HDD duct:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function calculateLengthFromPoints(points: number[][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [lng1, lat1] = points[i - 1];
    const [lng2, lat2] = points[i];
    total += haversineDistance(lat1, lng1, lat2, lng2);
  }
  return total;
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