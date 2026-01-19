import express from 'express';
import Rate from '../models/Rate.js';

const router = express.Router();

// Get active rates
router.get('/', async (req, res) => {
    try {
        let rates = await Rate.findOne({ isActive: true });

        // If no custom rates exist, return defaults
        if (!rates) {
            rates = new Rate();
            await rates.save();
        }

        res.json(rates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update rates
router.post('/', async (req, res) => {
    try {
        const { electricity, water } = req.body;

        // Deactivate all existing rates
        await Rate.updateMany({}, { isActive: false });

        // Create new active rate
        const newRate = new Rate({
            electricity,
            water,
            isActive: true
        });

        await newRate.save();
        res.json(newRate);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Reset to default rates
router.post('/reset', async (req, res) => {
    try {
        // Deactivate all existing rates
        await Rate.updateMany({}, { isActive: false });

        // Create new default rate
        const defaultRate = new Rate({ isActive: true });
        await defaultRate.save();

        res.json(defaultRate);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
