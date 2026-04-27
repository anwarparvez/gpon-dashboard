import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Node from '@/models/Node';
import CablePath from '@/models/CablePath';

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const olts = await Node.find({ node_category: 'OLT' }).lean();
    const occs = await Node.find({ node_category: 'OCC' }).lean();
    
    const generatedPaths = [];
    
    for (const occ of occs) {
      // Find nearest OLT
      let nearestOlt = null;
      let minDistance = Infinity;
      
      for (const olt of olts) {
        const distance = calculateDistance(
          olt.latitude, olt.longitude,
          occ.latitude, occ.longitude
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestOlt = olt;
        }
      }
      
      if (nearestOlt) {
        // Create straight line path
        const path_points = [
          [nearestOlt.longitude, nearestOlt.latitude],
          [occ.longitude, occ.latitude],
        ];
        
        const polyline = [
          [nearestOlt.latitude, nearestOlt.longitude],
          [occ.latitude, occ.longitude],
        ];
        
        // Check if path already exists
        const existing = await CablePath.findOne({
          from_node_id: nearestOlt.node_id,
          to_node_id: occ.node_id,
        });
        
        if (!existing) {
          const cablePath = await CablePath.create({
            from_node_id: nearestOlt.node_id,
            to_node_id: occ.node_id,
            from_node_category: 'OLT',
            to_node_category: 'OCC',
            path_points,
            polyline,
            length_km: minDistance,
            cable_type: 'underground',
            fiber_type: 'SMF',
            status: 'proposed',
          });
          generatedPaths.push(cablePath);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      generated: generatedPaths.length,
      paths: generatedPaths,
    });
  } catch (error: any) {
    console.error('Error generating paths:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}