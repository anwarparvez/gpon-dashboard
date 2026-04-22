import mongoose from 'mongoose';

const ZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    geometry: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true
      },
      coordinates: {
        type: [[[Number]]], // [[ [lng, lat] ]]
        required: true
      }
    }
  },
  { timestamps: true }
);

ZoneSchema.index({ geometry: '2dsphere' });

export default mongoose.models.Zone || mongoose.model('Zone', ZoneSchema);