import { Zone } from '../models/index.js';

// Create a new zone
export const createZone = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    if (!name) return res.status(400).json({ message: 'Zone name is required' });

    const zone = await Zone.create({ name, description, status });
    res.status(201).json({ message: 'Zone created successfully', zone });
  } catch (error) {
    console.error('Error creating zone:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get all zones
export const getZones = async (req, res) => {
  try {
    const zones = await Zone.findAll({ order: [['created_at', 'DESC']] });
    res.status(200).json(zones);
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get zone by ID
export const getZoneById = async (req, res) => {
  try {
    const zone = await Zone.findByPk(req.params.id);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });
    res.status(200).json(zone);
  } catch (error) {
    console.error('Error fetching zone:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Update zone
export const updateZone = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const zone = await Zone.findByPk(req.params.id);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });

    await zone.update({ name, description, status });
    res.status(200).json({ message: 'Zone updated successfully', zone });
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Delete zone
export const deleteZone = async (req, res) => {
  try {
    const zone = await Zone.findByPk(req.params.id);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });

    await zone.destroy();
    res.status(200).json({ message: 'Zone deleted successfully' });
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
