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


// 🚀 🔥 PRE-SAVE HOOK (VERY IMPORTANT)
LinkSchema.pre('save', function (next) {

  // 🔄 Normalize node pair (prevent A→B and B→A duplicate)
  const ids = [this.from_node.toString(), this.to_node.toString()].sort();
  this.node_pair = `${ids[0]}_${ids[1]}`;

  // 📊 Calculate available core
  this.available_core = this.fiber_core - this.used_core;

  next();
});


// 🚫 Prevent duplicate (bidirectional)
LinkSchema.index(
  { node_pair: 1 },
  { unique: true }
);

export default mongoose.models.Link || mongoose.model('Link', LinkSchema);