import express from 'express';
import Image from '../models/Image.js';

const router = express.Router();

// Get image for a specific house, period, and type
router.get('/:houseLabel/:period/:type', async (req, res) => {
    try {
        const { houseLabel, period, type } = req.params;
        const image = await Image.findOne({ houseLabel, period, type });

        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        res.json(image);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload or update image
router.post('/', async (req, res) => {
    try {
        const { houseLabel, period, type, imageData, mimeType } = req.body;

        const image = await Image.findOneAndUpdate(
            { houseLabel, period, type },
            { houseLabel, period, type, imageData, mimeType },
            { upsert: true, new: true }
        );

        res.json(image);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete image
router.delete('/:houseLabel/:period/:type', async (req, res) => {
    try {
        const { houseLabel, period, type } = req.params;
        await Image.deleteOne({ houseLabel, period, type });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
