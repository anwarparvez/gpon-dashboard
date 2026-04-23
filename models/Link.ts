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

    // 🔄 Normalized pair (A-B = B-A)
    node_pair: {
      type: String,
      unique: true
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

    // 📏 Engineering Data (km)
    length: {
      type: Number,
      default: 0
    },

    // 📊 Capacity
    used_core: {
      type: Number,
      default: 0
    },

    // 📈 Auto computed (optional)
    available_core: {
      type: Number,
      default: 12
    },

    // 📡 Status
    status: {
      type: String,
      enum: ['active', 'planned'],
      default: 'planned'
    },

    // 📝 Notes
    note: String
  },
  { timestamps: true }
);


export default mongoose.models.Link || mongoose.model('Link', LinkSchema);