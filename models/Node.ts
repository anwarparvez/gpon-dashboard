import mongoose, { Schema, HydratedDocument } from 'mongoose';

/* =========================
   📦 TYPES
========================= */
export type NodeType =
  | 'OLT'
  | 'OCC'
  | 'ODP'
  | 'HODP'
  | 'Branch Point'
  | 'Hand Hole'
  | 'Joint Closure';

export interface INode {
  node_id: string;
  name?: string;

  latitude?: number;
  longitude?: number;

  // 🌍 GeoJSON
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };

  node_category: NodeType;

  status: 'existing' | 'proposed';

  dgm?: string;
  region?: string;
  address?: string;
  node_code?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

/* =========================
   🧠 DOCUMENT TYPE
========================= */
type NodeDoc = HydratedDocument<INode>;

/* =========================
   🧱 SCHEMA
========================= */
const NodeSchema = new Schema<INode>(
  {
    node_id: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },

    name: {
      type: String,
      trim: true
    },

    latitude: Number,
    longitude: Number,

    // 🌍 GEO FIELD (GeoJSON)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: undefined
      }
    },

    node_category: {
      type: String,
      enum: [
        'OLT',
        'OCC',
        'ODP',
        'HODP',
        'Branch Point',
        'Hand Hole',
        'Joint Closure'
      ],
      required: true
    },

    status: {
      type: String,
      enum: ['existing', 'proposed'],
      default: 'proposed'
    },

    dgm: String,
    region: String,
    address: String,
    node_code: String
  },
  { timestamps: true }
);

/* =========================
   🔥 AUTO GEO SYNC
========================= */
NodeSchema.pre('save', function (this: NodeDoc) {
  if (this.latitude != null && this.longitude != null) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude]
    };
  }
});

/* =========================
   🚀 INDEX (VERY IMPORTANT)
========================= */
NodeSchema.index({ location: '2dsphere' });

/* =========================
   📤 EXPORT
========================= */
export default mongoose.models.Node ||
  mongoose.model<INode>('Node', NodeSchema);