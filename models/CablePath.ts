import mongoose from 'mongoose';

const CablePathSchema = new mongoose.Schema(
  {
    // Connection identifiers
    from_node_id: { type: String, required: true },
    to_node_id: { type: String, required: true },
    from_node_category: { type: String, enum: ['OLT', 'OCC', 'ODP', 'HODP'], required: true },
    to_node_category: { type: String, enum: ['OLT', 'OCC', 'ODP', 'HODP'], required: true },
    
    // Path geometry - Store as LineString GeoJSON
    path: {
      type: { type: String, enum: ['LineString'], default: 'LineString' },
      coordinates: { type: [[Number]], required: true },
    },
    
    // Original path points (for reference)
    path_points: { type: [[Number]], required: true },
    
    // Cable specifications
    fiber_type: {
      type: String,
      enum: ['GPON', 'SMF', 'UG', 'OH'],
      default: 'SMF',
    },
    fiber_core: {
      type: Number,
      default: 24,
    },
    cable_type: {
      type: String,
      enum: ['underground', 'overhead', 'aerial', 'submarine'],
      default: 'underground',
    },
    length_km: {
      type: Number,
      required: true,
    },
    
    // Status
    status: {
      type: String,
      enum: ['proposed', 'planned', 'active', 'maintenance', 'decommissioned'],
      default: 'proposed',
    },
    
    // Visual settings
    color: { type: String, default: '#2196f3' },
    line_width: { type: Number, default: 3 },
    opacity: { type: Number, default: 0.8 },
    
    // Additional info
    installation_date: Date,
    contractor: String,
    notes: String,
    created_by: String,
    updated_by: String,
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for polyline (frontend compatibility)
CablePathSchema.virtual('polyline').get(function() {
  return this.path?.coordinates || this.path_points;
});

// Create 2dsphere index on the GeoJSON path
CablePathSchema.index({ path: '2dsphere' });
CablePathSchema.index({ from_node_id: 1, to_node_id: 1 });

export default mongoose.models.CablePath || mongoose.model('CablePath', CablePathSchema);