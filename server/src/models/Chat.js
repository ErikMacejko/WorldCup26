import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nickname: { type: String, required: true },
  text: { type: String, maxlength: 500 },
  imageData: { type: String, maxlength: 250000 }, // base64 data URL for uploaded images
  createdAt: { type: Date, default: Date.now },
});

export const Chat = mongoose.model('Chat', schema);
