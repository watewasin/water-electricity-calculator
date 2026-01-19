import express from 'express';
import House from '../models/House.js';

const router = express.Router();

// Get all houses for a specific period
router.get('/:period', async (req, res) => {
    try {
        const { period } = req.params;
        const houses = await House.find({ period });
        res.json(houses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a specific house by label and period
router.get('/:period/:label', async (req, res) => {
    try {
        const { period, label } = req.params;
        const house = await House.findOne({ period, label });
        if (!house) {
            return res.status(404).json({ error: 'House not found' });
        }
        res.json(house);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create or update house data
router.post('/', async (req, res) => {
    try {
        const { label, period, zone, status, meterData, billData } = req.body;

        const house = await House.findOneAndUpdate(
            { label, period },
            { label, period, zone, status, meterData, billData },
            { upsert: true, new: true, runValidators: true }
        );

        res.json(house);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Bulk update houses
router.post('/bulk', async (req, res) => {
    try {
        const { houses } = req.body;

        const operations = houses.map(house => ({
            updateOne: {
                filter: { label: house.label, period: house.period },
                update: house,
                upsert: true
            }
        }));

        const result = await House.bulkWrite(operations);
        res.json({ success: true, result });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a house record
router.delete('/:period/:label', async (req, res) => {
    try {
        const { period, label } = req.params;
        await House.deleteOne({ period, label });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
