import { connectDB } from '@/lib/mongodb';
import Link from '@/models/Link';
import mongoose from 'mongoose';

// 🌍 Haversine (km)
function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// 🔧 Helper: get nodes + distance
async function calculateDistance(fromId, toId) {
    const Node = mongoose.model('Node');

    const from = await Node.findById(fromId);
    const to = await Node.findById(toId);

    if (!from || !to) throw new Error("Node not found");

    return distanceKm(
        from.latitude,
        from.longitude,
        to.latitude,
        to.longitude
    );
}

// ✅ GET
export async function GET() {
    try {
        await connectDB();

        const links = await Link.find()
            .populate('from_node')
            .populate('to_node')
            .sort({ createdAt: -1 });

        return Response.json(links);

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

// ✅ CREATE LINK
export async function POST(req) {
    try {
        await connectDB();
        const body = await req.json();

        const { from, to } = body;

        // ❌ same node check
        if (from === to) {
            return new Response(JSON.stringify({
                error: "Cannot link same node"
            }), { status: 400 });
        }

        // 🔄 normalized pair
        const pair = [from, to].sort().join('_');

        // ❌ duplicate check
        const exists = await Link.findOne({ node_pair: pair });
        if (exists) {
            return new Response(JSON.stringify({
                error: "Link already exists"
            }), { status: 400 });
        }

        // 📏 auto distance
        const length = await calculateDistance(from, to);

        const link = await Link.create({
            from_node: from,
            to_node: to,
            fiber_core: body.fiber_core || 12,
            used_core: body.used_core || 0,
            fiber_type: body.fiber_type || 'GPON',
            status: body.status || 'planned',
            length,
            node_pair: pair
        });

        const populated = await link.populate('from_node to_node');

        return Response.json(populated);

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

// ✅ UPDATE LINK
export async function PUT(req) {
    try {
        await connectDB();
        const body = await req.json();

        const link = await Link.findById(body._id);

        if (!link) {
            return new Response(JSON.stringify({ error: "Link not found" }), { status: 404 });
        }

        // 📏 recalc distance (always safe)
        const length = await calculateDistance(
            link.from_node,
            link.to_node
        );

        const updated = await Link.findByIdAndUpdate(
            body._id,
            {
                fiber_core: body.fiber_core,
                used_core: body.used_core,
                fiber_type: body.fiber_type,
                status: body.status,
                length // 🔥 always recalculated
            },
            { returnDocument: 'after' }
        ).populate('from_node to_node');

        return Response.json(updated);

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

// ✅ DELETE
export async function DELETE(req) {
    try {
        await connectDB();
        const body = await req.json();

        await Link.findByIdAndDelete(body.id);

        return Response.json({ success: true });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}