import mongoose from 'mongoose';

const LinkSchema = new mongoose.Schema(
  {
    // 🔗 Connection
    from_node: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      required: true
    },
    to_node: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Node',
      required: true
    },

    // 🧵 Fiber Properties
    fiber_type: {
      type: String,
      default: 'GPON'
    },

    fiber_core: {
      type: Number,
      default: 12
    },

    // 📏 Engineering Data
    length: {
      type: Number, // km
      default: 0
    },

    // 📊 Capacity Tracking
    used_core: {
      type: Number,
      default: 0
    },

    // 🧠 Future use (optional)
    status: {
      type: String,
      enum: ['active', 'planned'],
      default: 'planned'
    },

    // ⚡ Optional metadata
    note: String
  },
  { timestamps: true }
);

// 🚫 Prevent duplicate links (A ↔ B)
LinkSchema.index(
  { from_node: 1, to_node: 1 },
  { unique: true }
);

export default mongoose.models.Link || mongoose.model('Link', LinkSchema);