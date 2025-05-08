import mongoose from 'mongoose';

const eventSubGroupMessageSchema = new mongoose.Schema({
  subGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventSubGroup', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model('EventSubGroupMessage', eventSubGroupMessageSchema); 