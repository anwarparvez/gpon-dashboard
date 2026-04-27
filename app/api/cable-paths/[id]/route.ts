import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CablePath from '@/models/CablePath';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params; // ✅ Await params
    const cablePath = await CablePath.findById(id).lean();
    
    if (!cablePath) {
      return NextResponse.json({ error: 'Cable path not found' }, { status: 404 });
    }
    
    const response = {
      ...cablePath,
      polyline: cablePath.path?.coordinates || cablePath.path_points,
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params; // ✅ Await params
    const body = await req.json();
    
    const updateData: any = { ...body, updatedAt: new Date() };
    
    if (body.path_points && body.path_points.length >= 2) {
      updateData.length_km = calculatePathLength(body.path_points);
      updateData.path = {
        type: 'LineString',
        coordinates: body.path_points,
      };
    }
    
    const cablePath = await CablePath.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!cablePath) {
      return NextResponse.json({ error: 'Cable path not found' }, { status: 404 });
    }
    
    const response = {
      ...cablePath.toObject(),
      polyline: cablePath.path?.coordinates || cablePath.path_points,
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('PUT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params; // ✅ Await params
    const cablePath = await CablePath.findByIdAndDelete(id);
    
    if (!cablePath) {
      return NextResponse.json({ error: 'Cable path not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE Error:', error);
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