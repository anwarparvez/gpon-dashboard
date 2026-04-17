import { connectDB } from '@/lib/mongodb';
import Link from '@/models/Link';

// ✅ GET ALL LINKS
export async function GET() {
    try {
        console.log("📡 GET /api/links");

        await connectDB();

        const links = await Link.find()
            .populate('from_node')
            .populate('to_node')
            .sort({ createdAt: -1 });

        console.log(`✅ Links fetched: ${links.length}`);

        return Response.json(links);

    } catch (error) {
        console.error("❌ GET Links Error:", error.message);

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500
        });
    }
}

// ✅ CREATE LINK
export async function POST(req) {
    try {
        console.log("📡 POST /api/links");

        await connectDB();
        const body = await req.json();

        const link = await Link.create({
            from_node: body.from,
            to_node: body.to,
            fiber_core: body.fiber_core || 12,
            length: body.length || 0
        });

        // 🔥 populate before returning
        const populated = await link.populate('from_node to_node');

        console.log("✅ Link created");

        return Response.json(populated);

    } catch (error) {
        console.error("❌ POST Links Error:", error.message);

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500
        });
    }
}

// ✅ UPDATE LINK
export async function PUT(req) {
    try {
        console.log("📡 PUT /api/links");

        await connectDB();
        const body = await req.json();

        const updated = await Link.findByIdAndUpdate(
            body._id,
            {
                fiber_core: body.fiber_core,
                length: body.length,
                fiber_type: body.fiber_type
            },
            { returnDocument: 'after' }
        ).populate('from_node to_node');

        console.log("✏ Link updated");

        return Response.json(updated);

    } catch (error) {
        console.error("❌ PUT Links Error:", error.message);

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500
        });
    }
}

// ✅ DELETE LINK
export async function DELETE(req) {
    try {
        console.log("📡 DELETE /api/links");

        await connectDB();
        const body = await req.json();

        await Link.findByIdAndDelete(body.id);

        console.log(`🗑 Link deleted: ${body.id}`);

        return Response.json({ success: true });

    } catch (error) {
        console.error("❌ DELETE Links Error:", error.message);

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500
        });
    }
}