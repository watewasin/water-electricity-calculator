import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
    houseLabel: {
        type: String,
        required: true,
        index: true
    },
    period: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['electricity', 'water'],
        required: true
    },
    imageData: {
        type: String, // Base64 encoded image
        required: true
    },
    mimeType: {
        type: String,
        default: 'image/jpeg'
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
imageSchema.index({ houseLabel: 1, period: 1, type: 1 }, { unique: true });

export default mongoose.model('Image', imageSchema);
