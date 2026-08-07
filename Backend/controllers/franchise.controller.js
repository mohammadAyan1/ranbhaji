import { Franchise } from '../models/index.js';

// Apply for a franchise (Public)
export const applyForFranchise = async (req, res) => {
  try {
    const { full_name, mobile_number, email, city, investment_capacity, message } = req.body;
    
    if (!full_name || !mobile_number || !city) {
      return res.status(400).json({ success: false, message: 'Full name, mobile number, and city are required' });
    }

    const newFranchise = await Franchise.create({
      full_name,
      mobile_number,
      email,
      city,
      investment_capacity,
      message,
      status: 'inactive'
    });

    res.status(201).json({ success: true, message: 'Franchise application submitted successfully', data: newFranchise });
  } catch (error) {
    console.error('Error applying for franchise:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all franchises (Admin)
export const getAllFranchises = async (req, res) => {
  try {
    const franchises = await Franchise.findAll({ order: [['created_at', 'DESC']] });
    res.status(200).json({ success: true, franchises });
  } catch (error) {
    console.error('Error getting franchises:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update franchise status (Admin)
export const updateFranchiseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const franchise = await Franchise.findByPk(id);
    if (!franchise) return res.status(404).json({ success: false, message: 'Franchise not found' });

    franchise.status = status;
    await franchise.save();

    res.status(200).json({ success: true, message: 'Status updated successfully', data: franchise });
  } catch (error) {
    console.error('Error updating franchise status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update franchise details (Admin)
export const updateFranchise = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const franchise = await Franchise.findByPk(id);
    if (!franchise) return res.status(404).json({ success: false, message: 'Franchise not found' });

    await franchise.update(updateData);

    res.status(200).json({ success: true, message: 'Franchise updated successfully', data: franchise });
  } catch (error) {
    console.error('Error updating franchise:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
