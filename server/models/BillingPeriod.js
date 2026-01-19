import mongoose from 'mongoose';

const billingPeriodSchema = new mongoose.Schema({
    value: {
        type: String,
        required: true,
        unique: true
    },
    label: {
        type: String,
        required: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isRemoved: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

export default mongoose.model('BillingPeriod', billingPeriodSchema);
