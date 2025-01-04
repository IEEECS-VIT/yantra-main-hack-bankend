import express from 'express';
import verifyToken from '../middleware/verifyToken.js';
import User from '../models/userDetails.js';

const router = express.Router();

router.get('/login', verifyToken, async (req, res) => {
  const { uid } = req.user;
  
  try {
    const user = await User.findOne({ where: { uid } });
    
    if (!user) {
      return res.status(404).json({ 
        exists: false,
        message: 'User does not exist, please complete profile.'
      });
    }

    return res.status(200).json({ 
      exists: true,
      user
    });

  } catch (error) {
    console.error('Error checking profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/create-profile', verifyToken, async (req, res) => {
  const { uid, email } = req.user;

  try {
    const existingUser = await User.findOne({ where: { uid } });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Profile already exists' 
      });
    }

    const { 
      name, regNo, phoneNo, hostelType, 
      hostelBlock, roomNo, branch, 
      gender 
    } = req.body;

    if (!name || !regNo || !phoneNo || !hostelType || !gender || !branch) {
      return res.status(400).json({ 
        message: 'Please fill all the required fields' 
      });
    } 

    if (hostelType == 'H' && (!hostelBlock || !roomNo)) {
      return res.status(400).json({ 
        message: 'Please fill room no and block no' 
      });
    }

    const newUser = await User.create({
      uid,
      email,
      name,
      regNo,
      phoneNo,
      hostelType,
      hostelBlock : hostelBlock || null,
      roomNo : roomNo || null,
      branch,
      gender
    });

    return res.status(201).json({
      message: 'Profile created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ 
      message: 'Internal Server Error',
      error: error.message 
    });
  }
});

export default router;
