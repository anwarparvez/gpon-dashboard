import mongoose from "mongoose";
import Link from "@/models/Link";

/* =========================
   🔥 HODP VALIDATION (FINAL)
========================= */
export async function validateHODP(
  fromNode: any,
  toNode: any,
  excludeId?: any
) {
  // 🔍 Pick only HODP nodes
  const hodpNodes = [fromNode, toNode].filter(
    (n) => n?.node_category === "HODP"
  );

  if (hodpNodes.length === 0) return;

  // 🔒 Normalize ObjectIds
  const ids = hodpNodes.map((n) =>
    typeof n._id === "string" ? new mongoose.Types.ObjectId(n._id) : n._id
  );

  const match: any = {
    $or: [
      { from_node: { $in: ids } },
      { to_node: { $in: ids } }
    ]
  };

  // 🚫 Exclude current link during update
  if (excludeId) {
    match._id = {
      $ne:
        typeof excludeId === "string"
          ? new mongoose.Types.ObjectId(excludeId)
          : excludeId
    };
  }

  // ⚡ Single aggregation query
  const counts = await Link.aggregate([
    { $match: match },
    {
      $project: {
        nodes: ["$from_node", "$to_node"]
      }
    },
    { $unwind: "$nodes" },
    {
      $group: {
        _id: "$nodes",
        count: { $sum: 1 }
      }
    }
  ]);

  // 🧠 Build fast lookup map
  const countMap = new Map(
    counts.map((c) => [c._id.toString(), c.count])
  );

  // 🚫 Enforce HODP max = 1
  for (const node of hodpNodes) {
    const count = countMap.get(node._id.toString()) || 0;

    if (count >= 1) {
      throw new Error(
        `HODP ${node.node_id} already connected (max 1 allowed)`
      );
    }
  }
}