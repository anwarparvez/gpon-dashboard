import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    // Core fields for Auth.js
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Date },
    image: { type: String },
    password: { type: String, required: true },

    // Custom fields for your app
    role: {
      type: String,
      enum: ['admin', 'engineer', 'viewer'],
      default: 'viewer',
    },
    nodePermissions: {
      view: { type: Boolean, default: true },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);