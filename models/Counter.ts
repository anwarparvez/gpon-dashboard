import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  category: { type: String, unique: true },
  seq: { type: Number, default: 0 }
});

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema);