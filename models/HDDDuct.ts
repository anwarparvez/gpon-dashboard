import mongoose from 'mongoose';

const HDDDuctSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: () => `HDD-${Date.now()}` },
    path_points: { type: [[Number]], required: true },
    polyline: { type: [[Number]], required: true },
    length_km: { type: Number, required: true, min: 0 },
    way_count: { type: Number, enum: [1, 2, 3, 4, 6, 8, 12], default: 1 },
    duct_size_mm: { type: Number, enum: [32, 40, 50, 63, 75, 90, 110], default: 40 },
    duct_type: { type: String, enum: ['HDPE', 'PVC', 'Steel', 'Fiberglass'], default: 'HDPE' },
    fiber_core: { type: Number, enum: [2, 4, 6, 8, 12, 24, 48, 96, 144, 168, 192], default: 24 },
    entry_pit_depth_m: { type: Number, default: 1.5 },
    exit_pit_depth_m: { type: Number, default: 1.5 },
    color: { type: String, default: '#ff9800' },
    line_width: { type: Number, default: 4 },
    opacity: { type: Number, default: 0.9 },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'blocked', 'cancelled'],
      default: 'planned',
    },
    area: { type: String, default: '' },
    road_name: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Regular indexes only
HDDDuctSchema.index({ status: 1 });
HDDDuctSchema.index({ createdAt: -1 });
HDDDuctSchema.index({ name: 1 });
HDDDuctSchema.index({ fiber_core: 1 });

export default mongoose.models.HDDDuct || mongoose.model('HDDDuct', HDDDuctSchema);