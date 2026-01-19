import mongoose from 'mongoose';

const rateSchema = new mongoose.Schema({
    electricity: {
        tiers: {
            type: [Number],
            required: true,
            default: [3.2484, 4.2218, 4.4217]
        },
        ftRate: {
            type: Number,
            required: true,
            default: 0.3972
        },
        serviceFee: {
            type: Number,
            required: true,
            default: 38.22
        },
        vat: {
            type: Number,
            required: true,
            default: 1.07
        }
    },
    water: {
        tiers: {
            type: [Number],
            required: true,
            default: [10.20, 16.00, 19.00, 21.20, 21.60, 21.65, 21.70, 21.75]
        },
        serviceFee: {
            type: Number,
            required: true,
            default: 30.00
        },
        vat: {
            type: Number,
            required: true,
            default: 1.07
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Rate', rateSchema);
