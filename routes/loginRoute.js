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
      return res.status(403).json({ 
        message: 'Profile already exists for this user',
        errorType: 'EXISTING_PROFILE'
      });
    }

    const { 
      name, regNo, phoneNo, hostelType, 
      hostelBlock, roomNo, branch, 
      gender, school 
    } = req.body;

    if (!name || !regNo || !phoneNo || !hostelType || !gender || !branch || !school) {
      return res.status(400).json({ 
        message: 'Please fill all the required fields',
        errorType: 'MISSING_FIELDS'
      });
    } 

    if ((hostelType == 'MH' || hostelType == 'MH') && (!hostelBlock || !roomNo)) {
      return res.status(422).json({ 
        message: 'Please fill room no and block no',
        errorType: 'INVALID_HOSTEL_DETAILS'
      });
    }

    const existingRegNo = await User.findOne({ where: { regNo } });
    if (existingRegNo) {
      return res.status(409).json({ 
        message: 'Registration number is already registered',
        errorType: 'DUPLICATE_REGNO',
        field: 'regNo'
      });
    }

    const existingPhone = await User.findOne({ where: { phoneNo } });
    if (existingPhone) {
      return res.status(411).json({ 
        message: 'Phone number is already in use',
        errorType: 'DUPLICATE_PHONE',
        field: 'phoneNo'
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
      gender, 
      school
    });

    return res.status(201).json({
      message: 'Profile created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ 
      message: 'Internal Server Error',
      errorType: 'SERVER_ERROR',
      error: error.message 
    });
  }
});

export default router;
