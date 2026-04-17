import mongoose from 'mongoose';

const NodeSchema = new mongoose.Schema(
  {
    node_id: { type: String, unique: true },
    name: String,
    latitude: Number,
    longitude: Number,

    node_category: {
      type: String,
      enum: ['OLT', 'OCC', 'ODP', 'HODP', 'Branch Point']
    },

    status: {
      type: String,
      enum: ['existing', 'proposed'],
      default: 'proposed'
    },

    dgm: {
      type: String
    },

    region: {
      type: String
    }
  },
  { timestamps: true }
);

export default mongoose.models.Node || mongoose.model('Node', NodeSchema);