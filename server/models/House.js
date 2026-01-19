import mongoose from 'mongoose';

const houseSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true,
        index: true
    },
    zone: {
        type: String,
        required: true
    },
    period: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'billed'],
        default: 'pending'
    },
    meterData: {
        elec: {
            prev: Number,
            curr: Number
        },
        water: {
            prev: Number,
            curr: Number
        }
    },
    billData: {
        elecBill: {
            units: Number,
            baseCost: Number,
            ftCost: Number,
            serviceFee: Number,
            vat: Number,
            total: Number
        },
        waterBill: {
            units: Number,
            baseCost: Number,
            serviceFee: Number,
            vat: Number,
            total: Number
        },
        total: Number,
        hasImages: Boolean
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
houseSchema.index({ label: 1, period: 1 }, { unique: true });

export default mongoose.model('House', houseSchema);
