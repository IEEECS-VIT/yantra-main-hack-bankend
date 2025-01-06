import express from 'express';
import busboy from 'busboy';
import path from 'path';
import admin from '../config/firebase.js';
import User from '../models/userDetails.js';
import TeamDetails from '../models/teamDetails.js';
import verifyToken from '../middleware/verifyToken.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize'
const router = express.Router();
const bucket = admin.storage().bucket();

// const storage = multer.memoryStorage();
// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024, 
//   },
//   fileFilter: (req, file, cb) => {
//     const filetypes = /pdf/;
//     const mimetype = filetypes.test(file.mimetype);
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

//     if (mimetype && extname) {
//       return cb(null, true);
//     }
//     cb(new Error('Only PDF files are allowed'));
//   },
// });

const generateTeamCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

router.post('/create-team', verifyToken, async (req, res) => {
  const t = await sequelize.transaction(); 
  try {
    const { teamName } = req.body;
    const uid = req.user.uid; 

    if (!teamName) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Team name is required",
        errorType: "MISSING_TEAM_NAME"
      });
    }

    // First check if user exists
    const userExists = await User.findOne({
      where: { uid },
      transaction: t
    });

    if (!userExists) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
        errorType: "USER_NOT_FOUND"
      });
    }

    // Then check if user is already in a team
    if (userExists.teamId !== null) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "User is already part of a team",
        errorType: "USER_IN_TEAM"
      });
    }

    // Check if team name already exists
    const existingTeamName = await TeamDetails.findOne({
      where: { teamName: teamName.trim() },
      transaction: t
    });

    if (existingTeamName) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: "Team name already exists",
        errorType: "DUPLICATE_TEAM_NAME"
      });
    }

    // Generate unique team code
    let teamCode;
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (!isUnique && attempts < MAX_ATTEMPTS) {
      teamCode = generateTeamCode();
      const existingTeam = await TeamDetails.findOne({
        where: { teamCode },
        transaction: t
      });
      if (!existingTeam) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      await t.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to generate unique team code",
        errorType: "TEAM_CODE_GENERATION_FAILED"
      });
    }

    // Create new team
    const team = await TeamDetails.create({
      teamName: teamName.trim(),
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
    await t.rollback();

    console.error('Error creating team:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: "Team name already exists",
        errorType: "DUPLICATE_TEAM_NAME"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errorType: "SERVER_ERROR"
    });
  }
});

router.post('/join-team', verifyToken, async (req, res) => {
    const t = await sequelize.transaction();
  
    try {
      const { teamCode } = req.body;
      const uid = req.user.uid;

      if (!teamCode) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Team code is required",
          errorType: "MISSING_TEAM_CODE"
        });
      }

      const userExists = await User.findOne({
        where: { uid },
        transaction: t
      });

      if (!userExists) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: "User not found",
          errorType: "USER_NOT_FOUND"
        });
      }

      if (userExists.teamId !== null) {
        await t.rollback();
        return res.status(403).json({
          success: false,
          message: "User is already part of a team",
          errorType: "USER_IN_TEAM"
        });
      }
  
      // Find team with the provided code
      const team = await TeamDetails.findOne({
        where: { teamCode },
        transaction: t
      });
  
      if (!team) {
        await t.rollback();
        return res.status(422).json({
          success: false,
          message: "Invalid team code",
          errorType: "INVALID_TEAM_CODE"
        });
      }
  
      const teamMemberCount = await User.count({
        where: { teamId: team.srNo },
        transaction: t
      });
  
      // Maximum team size is now 5
      if (teamMemberCount >= 5) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: "Team is already full (maximum 5 members)",
          errorType: "TEAM_FULL"
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
  
      await t.commit();
  
      return res.status(200).json({
        success: true,
        message: "Successfully joined team",
        data: {
          teamId: team.srNo,
          teamName: team.teamName,
          memberCount: teamMemberCount + 1 // Include the newly joined member
        }
      });
  
    } catch (error) {
      await t.rollback();
      
      console.error('Error joining team:', error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        errorType: "SERVER_ERROR"
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
      if (!user) {
        return res.status(200).json({
          success: false,
          message: "User not found"
        });
      }
      if (!user.teamId) {
        return res.status(200).json({
          success: false,
          message: "User not part of any team"
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
  
  router.delete('/leave-team', verifyToken, async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const uid = req.user.uid;
        const user = await User.findOne({
            where: { uid },
            include: [{
                model: TeamDetails,
                as: 'team'
            }],
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

        // Get count of other team members in a single query
        const otherMembersCount = await User.count({
            where: { 
                teamId: user.teamId,
                uid: { [Op.ne]: uid }
            },
            transaction: t
        });

        // If leader is the only member, delete the team
        if (otherMembersCount === 0) {
            await TeamDetails.destroy({
                where: { srNo: user.teamId },
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

        // Efficiently select a random member using SQL
        const [newLeader] = await User.findAll({
            where: { 
                teamId: user.teamId,
                uid: { [Op.ne]: uid }
            },
            order: sequelize.literal('RANDOM()'), // For PostgreSQL
            // Use RAND() for MySQL: order: sequelize.literal('RAND()')
            limit: 1,
            transaction: t
        });

        // Update leadership in a single query for all affected users
        await User.update(
            { isLeader: false },
            { 
                where: { teamId: user.teamId },
                transaction: t
            }
        );

        // Set the new leader
        await User.update(
            { isLeader: true },
            { 
                where: { uid: newLeader.uid },
                transaction: t
            }
        );

        // Remove current leader from team
        await user.update({
            teamId: null,
            isLeader: false
        }, { transaction: t });

        await t.commit();
        return res.status(200).json({
            success: true,
            message: `Left team successfully. Leadership transferred to ${newLeader.name}`,
            data: {
                newLeader: {
                    name: newLeader.name,
                    email: newLeader.email
                }
            }
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

router.get('/task-submission', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    // Check if user exists and is in a team
    const user = await User.findOne({
      where: { uid }
    });

    if (!user || !user.teamId) {
      return res.status(404).json({
        success: false,
        message: "User not found or not part of any team"
      });
    }

    // Get team's document link
    const teamDetails = await TeamDetails.findOne({
      where: { srNo: user.teamId },
      attributes: ['documentLink', 'teamName']
    });

    if (!teamDetails || !teamDetails.documentLink) {
      return res.status(404).json({
        success: false,
        message: "No submission found for your team"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        teamName: teamDetails.teamName,
        documentLink: teamDetails.documentLink
      }
    });

  } catch (error) {
    console.error('Error fetching submission:', error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// PUT route for task submission
router.put('/task-submit', verifyToken, async (req, res) => {
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return res.status(400).json({
      success: false,
      message: 'Content-Type must be multipart/form-data'
    });
  }

  try {
    const formData = {
      file: null,
      fields: {}
    };

    // Parse multipart form data
    await new Promise((resolve, reject) => {
      const bb = busboy({
        headers: req.headers,
        limits: {
          files: 1,
          fileSize: 5 * 1024 * 1024 // 5MB limit
        }
      });

      // Handle file upload
      bb.on('file', (fieldname, file, info) => {
        const { filename, encoding, mimeType } = info;

        if (!mimeType.includes('application/pdf')) {
          reject(new Error('Only PDF files are allowed'));
          return;
        }

        const chunks = [];

        file.on('data', (data) => {
          chunks.push(data);
        });

        file.on('end', () => {
          if (chunks.length > 0) {
            formData.file = Buffer.concat(chunks);
          }
        });
      });

      // Handle form fields
      bb.on('field', (fieldname, value) => {
        formData.fields[fieldname] = value;
      });

      bb.on('finish', () => {
        if (!formData.file) {
          reject(new Error('No file was uploaded'));
        } else {
          resolve();
        }
      });

      bb.on('error', (error) => {
        reject(error);
      });

      if (req.rawBody) {
        bb.end(req.rawBody);
      } else {
        req.pipe(bb);
      }
    });

    const uid = req.user.uid;

    // Validate user and team membership
    const user = await User.findOne({
      where: { uid },
      include: [{
        model: TeamDetails,
        as: 'team',
        attributes: ['srNo', 'teamName', 'documentLink']
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.teamId) {
      return res.status(400).json({
        success: false,
        message: "You are not part of any team"
      });
    }

    if (!user.isLeader) {
      return res.status(403).json({
        success: false,
        message: "Only team leaders can submit documents"
      });
    }

    // Delete old file if it exists
    if (user.team.documentLink) {
      try {
        const urlObj = new URL(user.team.documentLink);
        const pathSegments = urlObj.pathname.split('/');
        const fileName = pathSegments[pathSegments.length - 1];
        
        if (fileName) {
          const filePath = `submissions/${decodeURIComponent(fileName)}`;
          try {
            await bucket.file(filePath).delete();
          } catch (deleteError) {
            console.error('Error deleting old file:', deleteError);
          }
        }
      } catch (parseError) {
        console.error('Error parsing old file URL:', parseError);
      }
    }

    // Generate filename and upload new file
    const timestamp = Date.now();
    const sanitizedTeamName = user.team.teamName.replace(/[^a-zA-Z0-9-]/g, '-');
    const fileName = `submissions/${sanitizedTeamName}-${timestamp}.pdf`;
    const file = bucket.file(fileName);

    // Upload new file
    await file.save(formData.file, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          teamName: user.team.teamName,
          teamId: user.teamId,
          uploadedBy: user.name,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Get signed URL
    let url;
    try {
      [url] = await file.getSignedUrl({
        action: 'read',
        expires: '2100-01-01'
      });
    } catch (urlError) {
      console.error('Error generating signed URL:', urlError);
      throw new Error('Failed to generate document access URL');
    }

    // Update team's document link
    await TeamDetails.update({
      documentLink: url
    }, {
      where: { srNo: user.teamId }
    });

    return res.status(200).json({
      success: true,
      message: user.team.documentLink ? 
        "Document updated successfully" : 
        "Document submitted successfully",
      data: {
        documentLink: url,
        fileName: fileName,
        teamName: user.team.teamName
      }
    });

  } catch (error) {
    console.error('Error submitting task:', error);

    if (error.message === 'Only PDF files are allowed') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === 'No file was uploaded') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


export default router;
