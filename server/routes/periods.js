import express from 'express';
import BillingPeriod from '../models/BillingPeriod.js';

const router = express.Router();

// Get all billing periods (excluding removed ones)
router.get('/', async (req, res) => {
    try {
        const periods = await BillingPeriod.find({ isRemoved: false }).sort({ value: -1 });
        res.json(periods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new billing period
router.post('/', async (req, res) => {
    try {
        const { value, label } = req.body;
        const period = new BillingPeriod({ value, label, isDefault: false });
        await period.save();
        res.json(period);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Remove a billing period (soft delete)
router.delete('/:value', async (req, res) => {
    try {
        const { value } = req.params;
        const period = await BillingPeriod.findOneAndUpdate(
            { value },
            { isRemoved: true },
            { new: true }
        );
        res.json(period);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Initialize default periods (call once on setup)
router.post('/init-defaults', async (req, res) => {
    try {
        const defaults = [
            { value: '2026-01', label: 'January 2026', isDefault: true },
            { value: '2025-12', label: 'December 2025', isDefault: true },
            { value: '2025-11', label: 'November 2025', isDefault: true },
            { value: '2025-10', label: 'October 2025', isDefault: true }
        ];

        for (const period of defaults) {
            await BillingPeriod.findOneAndUpdate(
                { value: period.value },
                period,
                { upsert: true }
            );
        }

        res.json({ success: true, message: 'Default periods initialized' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
