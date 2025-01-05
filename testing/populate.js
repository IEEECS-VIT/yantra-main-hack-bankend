import { Op } from 'sequelize';
import TeamDetails from '../models/teamDetails.js';
import User from '../models/userDetails.js';
import sequelize from '../config/db.js';

async function generateTestData() {
    try {
        console.log('Starting test data generation...');
        
        // Generate 50 teams
        const teams = Array.from({ length: 50 }, (_, i) => ({
            teamName: `Team${i + 1}`,
            teamCode: `CODE${(i + 1).toString().padStart(4, '0')}`,
            hackQualified: Math.random() > 0.5,
            internalQualification: Math.floor(Math.random() * 100),
            documentLink: `https://example.com/doc${i + 1}`
        }));

        console.log('Creating teams...');
        const createdTeams = await TeamDetails.bulkCreate(teams);
        console.log(`Created ${createdTeams.length} teams`);

        // Generate 200 users (4 users per team on average)
        const users = [];
        const branches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'];
        const schools = ['SCOPE', 'SENSE', 'SITE', 'SMEC', 'SCE'];
        const hostelTypes = ['DS', 'MH', 'FH'];

        for (let i = 0; i < 200; i++) {
            const teamIndex = Math.floor(i / 4); // Distribute users across teams
            const user = {
                uid: `UID${(i + 1).toString().padStart(4, '0')}`,
                email: `user${i + 1}@example.com`,
                name: `User ${i + 1}`,
                regNo: `REG${(i + 1).toString().padStart(6, '0')}`,
                phoneNo: `9${Math.random().toString().slice(2, 11)}`,
                hostelType: hostelTypes[Math.floor(Math.random() * hostelTypes.length)],
                hostelBlock: `Block-${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
                roomNo: `${Math.floor(Math.random() * 500 + 100)}`,
                branch: branches[Math.floor(Math.random() * branches.length)],
                gender: Math.random() > 0.5 ? 'male' : 'female',
                school: schools[Math.floor(Math.random() * schools.length)],
                teamId: teamIndex < createdTeams.length ? createdTeams[teamIndex].srNo : null,
                isLeader: i % 4 === 0 // Make every 4th user a team leader
            };
            users.push(user);
        }

        console.log('Creating users...');
        const createdUsers = await User.bulkCreate(users);
        console.log(`Created ${createdUsers.length} users`);

        return { teamCount: createdTeams.length, userCount: createdUsers.length };
    } catch (error) {
        console.error('Error generating test data:', error);
        throw error;
    }
}

async function runPerformanceTests() {
    try {
        console.log('\nStarting performance tests...');

        // Test 1: Simple team query
        console.time('Simple team query');
        const team = await TeamDetails.findOne({
            where: { teamCode: 'CODE0001' }
        });
        console.timeEnd('Simple team query');

        // Test 2: Team members query with relation
        console.time('Team members query with relation');
        const teamWithMembers = await TeamDetails.findOne({
            where: { teamCode: 'CODE0001' },
            include: [{
                model: User,
                as: 'members'
            }]
        });
        console.timeEnd('Team members query with relation');
        console.log(`Found ${teamWithMembers?.members?.length || 0} members in team`);

        // Test 3: Complex search
        console.time('Complex search');
        const qualifiedTeams = await TeamDetails.findAll({
            where: {
                hackQualified: true,
                internalQualification: {
                    [Op.gt]: 50
                }
            },
            include: [{
                model: User,
                as: 'members',
                where: {
                    isLeader: true
                }
            }]
        });
        console.timeEnd('Complex search');
        console.log(`Found ${qualifiedTeams.length} qualified teams`);

        // Test 4: School-based search
        console.time('School-based search');
        const scopeUsers = await User.findAll({
            where: {
                school: 'SCOPE',
                teamId: {
                    [Op.not]: null
                }
            },
            include: [{
                model: TeamDetails,
                as: 'team'
            }]
        });
        console.timeEnd('School-based search');
        console.log(`Found ${scopeUsers.length} SCOPE users with teams`);

        // Test 5: Branch and hostel type based search
        console.time('Branch and hostel search');
        const branchUsers = await User.findAll({
            where: {
                branch: 'CSE',
                hostelType: 'DS',
                teamId: {
                    [Op.not]: null
                }
            }
        });
        console.timeEnd('Branch and hostel search');
        console.log(`Found ${branchUsers.length} CSE users in DS`);

    } catch (error) {
        console.error('Error during performance testing:', error);
    }
}

async function cleanupTestData() {
    try {
        console.log('\nCleaning up test data...');
        await User.destroy({ where: {} });
        await TeamDetails.destroy({ where: {} });
        console.log('Test data cleaned up');
    } catch (error) {
        console.error('Error cleaning up test data:', error);
    }
}

async function main() {
    try {
        // Generate test data
        const counts = await generateTestData();
        console.log(`\nGenerated ${counts.teamCount} teams and ${counts.userCount} users`);

        // Wait a bit for DB to settle
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Run performance tests
        await runPerformanceTests();

        // Ask if user wants to keep the test data
        console.log('\nDo you want to keep the test data? (y/n)');
        process.stdin.once('data', async (data) => {
            if (data.toString().trim().toLowerCase() !== 'y') {
                await cleanupTestData();
            }
            process.exit();
        });

    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    }
}

main();