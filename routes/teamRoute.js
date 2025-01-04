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

router.post('/join-team', verifyToken, async (req, res) => {
    const t = await sequelize.transaction();
  
    try {
      const { teamCode } = req.body;
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
  
      // Find team with the provided code
      const team = await TeamDetails.findOne({
        where: { teamCode },
        transaction: t
      });
  
      if (!team) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: "Invalid team code"
        });
      }
  
      // Count existing team members
      const teamMemberCount = await User.count({
        where: { teamId: team.srNo },
        transaction: t
      });
  
      // Maximum team size is now 5
      if (teamMemberCount >= 5) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Team is already full (maximum 5 members)"
        });
      }
  
      // Update user's team membership
      await User.update({
        teamId: team.srNo,
        isLeader: false
      }, {
        where: { uid },
        transaction: t
      });
  
      // If everything succeeded, commit the transaction
      await t.commit();
  
      return res.status(200).json({
        success: true,
        message: "Successfully joined team",
        data: {
          teamId: team.srNo,
          teamName: team.teamName
        }
      });
  
    } catch (error) {
      await t.rollback();
      
      console.error('Error joining team:', error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  
  router.get('/team-details', verifyToken, async (req, res) => {
    try {
      const uid = req.user.uid;
  
      // Get user and their team details
      const user = await User.findOne({
        where: { uid }
      });
  
      if (!user || !user.teamId) {
        return res.status(404).json({
          success: false,
          message: "User not found or not part of any team"
        });
      }
  
      // Get team details
      const teamDetails = await TeamDetails.findOne({
        where: { srNo: user.teamId }
      });
  
      // Get all team members
      const teamMembers = await User.findAll({
        where: { teamId: user.teamId },
        attributes: ['name', 'email', 'regNo', 'isLeader', 'branch']
      });
  
      return res.status(200).json({
        success: true,
        data: {
          team: teamDetails,
          members: teamMembers,
          memberCount: teamMembers.length,
          spotsRemaining: 5 - teamMembers.length,
          isLeader: user.isLeader
        }
      });
  
    } catch (error) {
      console.error('Error fetching team details:', error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  
  router.post('/leave-team', verifyToken, async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const uid = req.user.uid;
        const user = await User.findOne({
            where: { uid },
            transaction: t
        });

        if (!user || !user.teamId) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: "User not found or not part of any team"
            });
        }

        // If user is not a leader, they can simply leave
        if (!user.isLeader) {
            await user.update({
                teamId: null,
                isLeader: false
            }, { transaction: t });

            await t.commit();
            return res.status(200).json({
                success: true,
                message: "Left team successfully"
            });
        }

        // If user is a leader, proceed with team member checks
        const teamId = user.teamId;
        const teamMembers = await User.findAll({
            where: { teamId },
            transaction: t
        });

        // If leader is the only member, delete the team
        if (teamMembers.length === 1) {
            await TeamDetails.destroy({
                where: { srNo: teamId },
                transaction: t
            });

            await user.update({
                teamId: null,
                isLeader: false
            }, { transaction: t });

            await t.commit();
            return res.status(200).json({
                success: true,
                message: "Team deleted as you were the only member"
            });
        }

        // If there are other members, transfer leadership
        const newLeader = teamMembers.find(member => member.uid !== uid);
        await User.update(
            { isLeader: true },
            { 
                where: { uid: newLeader.uid },
                transaction: t
            }
        );

        await user.update({
            teamId: null,
            isLeader: false
        }, { transaction: t });

        await t.commit();
        return res.status(200).json({
            success: true,
            message: "Left team successfully. Leadership transferred to another member"
        });

    } catch (error) {
        await t.rollback();
        console.error('Error leaving team:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

export default router;
