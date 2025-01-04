import express from 'express';
import TeamDetails from '../models/teamDetails.js';
import User from '../models/userDetails.js';
import sequelize from '../config/db.js';
import verifyToken from '../middleware/verifyToken.js';

const router = express.Router();

const generateTeamCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

router.post('/create-team', verifyToken, async (req, res) => {
  const t = await sequelize.transaction(); 
  try {
    const { teamName } = req.body;
    const uid = req.user.uid; 

    // Check if user exists and isn't already in a team
    const user = await User.findOne({
      where: { uid, teamId: null },
      transaction: t
    });

    if (!user) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "User not found or already part of a team"
      });
    }

    // Generate unique team code
    let teamCode;
    let isUnique = false;
    while (!isUnique) {
      teamCode = generateTeamCode();
      const existingTeam = await TeamDetails.findOne({
        where: { teamCode },
        transaction: t
      });
      if (!existingTeam) isUnique = true;
    }

    // Create new team
    const team = await TeamDetails.create({
      teamName,
      teamCode,
      hackQualified: false,
      internalQualification: 0
    }, { transaction: t });

    // Update user as team leader
    await User.update({
      teamId: team.srNo,
      isLeader: true
    }, {
      where: { uid },
      transaction: t
    });

    // If everything succeeded, commit the transaction
    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: {
        teamId: team.srNo,
        teamName: team.teamName,
        teamCode: team.teamCode
      }
    });

  } catch (error) {
    await t.rollback(); // Rollback transaction on error

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(401).json({
        success: false,
        message: "Team name already exists"
      });
    }

    console.error('Error creating team:', error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

export default router;