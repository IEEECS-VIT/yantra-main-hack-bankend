import { Op } from 'sequelize';
import TeamDetails from '../models/teamDetails.js';
import User from '../models/userDetails.js';
import sequelize from '../config/db.js';

async function testTeamRelationships() {
    try {
        console.log('\n=== Starting Team Relationship Performance Tests ===\n');

        // First, let's verify the data we're working with
        console.log('Verifying existing data...');
        const allTeams = await TeamDetails.findAll();
        const allUsers = await User.findAll();
        console.log(`Total teams in database: ${allTeams.length}`);
        console.log(`Total users in database: ${allUsers.length}`);

        // Test 1: Direct team member query
        console.log('\nTest 1: Finding team members directly...');
        console.time('Direct query');
        const directMembers = await User.findAll({
            where: { teamId: 2 }
        });
        console.timeEnd('Direct query');
        console.log(`Found ${directMembers.length} members using direct query`);
        if (directMembers.length > 0) {
            console.log('Sample member:', {
                name: directMembers[0].name,
                email: directMembers[0].email,
                isLeader: directMembers[0].isLeader
            });
        }

        // Test 2: Team query with relationships
        console.log('\nTest 2: Finding team with members using relationship...');
        console.time('Relationship query');
        const teamWithMembers = await TeamDetails.findOne({
            where: { srNo: 2 },
            include: {
                model: User,
                as: 'members'
            }
        });
        console.timeEnd('Relationship query');
        
        if (teamWithMembers) {
            console.log('Team found:', {
                teamName: teamWithMembers.teamName,
                memberCount: teamWithMembers.members?.length || 0
            });
        } else {
            console.log('Team not found');
        }

        // Test 3: User to Team relationship
        console.log('\nTest 3: Finding user with team details...');
        console.time('User to Team query');
        const userWithTeam = await User.findOne({
            where: { teamId: 2 },
            include: {
                model: TeamDetails,
                as: 'team'
            }
        });
        console.timeEnd('User to Team query');

        if (userWithTeam) {
            console.log('User with team:', {
                userName: userWithTeam.name,
                teamName: userWithTeam.team?.teamName
            });
        } else {
            console.log('No user found with team ID 2');
        }

    } catch (error) {
        console.error('Error during testing:', error);
        if (error.original) {
            console.error('Database error details:', error.original);
        }
    } finally {
        // Close the database connection
        await sequelize.close();
    }
}

// Run the tests
console.log('Starting performance tests...');
testTeamRelationships()
    .then(() => console.log('\n=== Tests completed ==='))
    .catch(err => console.error('Test failed:', err));