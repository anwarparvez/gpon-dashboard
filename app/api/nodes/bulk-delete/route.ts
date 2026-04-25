import { connectDB } from "@/lib/mongodb";
import Node from "@/models/Node";
import Link from "@/models/Link";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { nodeIds, linkIds } = await req.json();
    
    const results = {
      deletedNodes: 0,
      deletedLinks: 0,
      errors: [] as string[]
    };
    
    // Delete links first
    if (linkIds && linkIds.length > 0) {
      const linkResult = await Link.deleteMany({ _id: { $in: linkIds } });
      results.deletedLinks = linkResult.deletedCount || 0;
    }
    
    // Delete nodes
    if (nodeIds && nodeIds.length > 0) {
      const nodeResult = await Node.deleteMany({ _id: { $in: nodeIds } });
      results.deletedNodes = nodeResult.deletedCount || 0;
    }
    
    return Response.json({
      success: true,
      results,
      message: `Deleted ${results.deletedNodes} nodes and ${results.deletedLinks} links`
    });
  } catch (error: any) {
    console.error("Bulk delete error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}