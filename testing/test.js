import { Op } from 'sequelize';
import TeamDetails from '../models/teamDetails.js';
import User from '../models/userDetails.js';
import sequelize from '../config/db.js';

// Utility function to measure query execution time
const measureQueryTime = async (name, queryFn) => {
    const start = process.hrtime();
    const result = await queryFn();
    const [seconds, nanoseconds] = process.hrtime(start);
    const milliseconds = (seconds * 1000) + (nanoseconds / 1000000);
    console.log(`${name}: ${milliseconds.toFixed(3)}ms`);
    return { time: milliseconds, result };
};

async function generateTestData(numTeams = 10, usersPerTeam = 4) {
    console.log('\n=== Generating Test Data ===');
    
    const teams = [];
    const users = [];

    // Generate teams
    for (let i = 11; i < numTeams; i++) {
        teams.push({
            teamName: `Performance Test Team ${i}`,
            teamCode: `PERF${i.toString().padStart(4, '0')}`,
            hackQualified: Math.random() > 0.5,
            internalQualification: Math.floor(Math.random() * 100)
        });
    }

    // Create teams
    const createdTeams = await TeamDetails.bulkCreate(teams);
    
    // Generate users for each team
    for (const team of createdTeams) {
        for (let i = 0; i < usersPerTeam; i++) {
            users.push({
                uid: `PERF${team.srNo}_${i}`,
                email: `perf.user${team.srNo}_${i}@test.com`,
                name: `Performance User ${team.srNo}_${i}`,
                regNo: `REG${team.srNo}${i}`,
                phoneNo: `98765${team.srNo.toString().padStart(5, '0')}`,
                hostelType: ['DS', 'MH', 'FH'][Math.floor(Math.random() * 3)],
                hostelBlock: String.fromCharCode(65 + Math.floor(Math.random() * 5)),
                roomNo: Math.floor(Math.random() * 500 + 100).toString(),
                branch: ['CSE', 'ECE', 'MECH', 'CIVIL', 'IT'][Math.floor(Math.random() * 5)],
                gender: Math.random() > 0.5 ? 'male' : 'female',
                school: ['SCOPE', 'SENSE', 'SITE', 'SMEC'][Math.floor(Math.random() * 4)],
                teamId: team.srNo,
                isLeader: i === 0 // First user of each team is leader
            });
        }
    }

    await User.bulkCreate(users);
    console.log(`Created ${teams.length} teams and ${users.length} users`);
    return { teamCount: teams.length, userCount: users.length };
}

async function runPerformanceTests() {
    try {
        console.log('\n=== Starting Performance Tests ===\n');
        const metrics = [];

        // Test 1: Simple Queries
        console.log('1. Testing Simple Queries:');
        
        metrics.push(await measureQueryTime('Find single team by ID', async () => 
            await TeamDetails.findByPk(1)
        ));

        metrics.push(await measureQueryTime('Find single team by code', async () => 
            await TeamDetails.findOne({ where: { teamCode: 'PERF0001' } })
        ));

        metrics.push(await measureQueryTime('Find single user by uid', async () => 
            await User.findOne({ where: { uid: 'PERF1_0' } })
        ));

        // Test 2: Relationship Queries
        console.log('\n2. Testing Relationship Queries:');
        
        metrics.push(await measureQueryTime('Find team with all members', async () => 
            await TeamDetails.findOne({
                where: { srNo: 1 },
                include: [{
                    model: User,
                    as: 'members'
                }]
            })
        ));

        metrics.push(await measureQueryTime('Find user with team details', async () => 
            await User.findOne({
                where: { isLeader: true },
                include: [{
                    model: TeamDetails,
                    as: 'team'
                }]
            })
        ));

        // Test 3: Complex Queries
        console.log('\n3. Testing Complex Queries:');
        
        metrics.push(await measureQueryTime('Find qualified teams with members', async () => 
            await TeamDetails.findAll({
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
            })
        ));

        metrics.push(await measureQueryTime('Find users by school with team', async () => 
            await User.findAll({
                where: {
                    school: 'SCOPE',
                    teamId: {
                        [Op.not]: null
                    }
                },
                include: [{
                    model: TeamDetails,
                    as: 'team',
                    where: {
                        hackQualified: true
                    }
                }]
            })
        ));

        // Test 4: Aggregate Queries
        console.log('\n4. Testing Aggregate Queries:');
        
        metrics.push(await measureQueryTime('Count users per team', async () => 
            await User.findAll({
                attributes: [
                    'teamId',
                    [sequelize.fn('COUNT', sequelize.col('srNo')), 'userCount']
                ],
                group: ['teamId']
            })
        ));

        metrics.push(await measureQueryTime('Average qualification score', async () => 
            await TeamDetails.findAll({
                attributes: [
                    [sequelize.fn('AVG', sequelize.col('internalQualification')), 'avgScore']
                ]
            })
        ));

        // Test 5: Batch Operations
        console.log('\n5. Testing Batch Operations:');
        
        metrics.push(await measureQueryTime('Bulk update team qualification', async () => 
            await TeamDetails.update(
                { internalQualification: 75 },
                { where: { hackQualified: true } }
            )
        ));

        // Calculate and display statistics
        console.log('\n=== Performance Statistics ===');
        const times = metrics.map(m => m.time);
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);

        console.log(`Average query time: ${avgTime.toFixed(3)}ms`);
        console.log(`Slowest query time: ${maxTime.toFixed(3)}ms`);
        console.log(`Fastest query time: ${minTime.toFixed(3)}ms`);

        return metrics;

    } catch (error) {
        console.error('Error during performance testing:', error);
        throw error;
    }
}

async function cleanupTestData() {
    console.log('\n=== Cleaning Up Test Data ===');
    await User.destroy({
        where: {
            uid: {
                [Op.like]: 'PERF%'
            }
        }
    });
    await TeamDetails.destroy({
        where: {
            teamCode: {
                [Op.like]: 'PERF%'
            }
        }
    });
    console.log('Test data cleaned up');
}

async function main() {
    try {
        // Generate test data
        await generateTestData();

        // Run performance tests
        await runPerformanceTests();

        // Cleanup
        await cleanupTestData();

    } catch (error) {
        console.error('Test suite failed:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the test suite
console.log('Starting performance test suite...');
main()
    .then(() => console.log('\n=== Test Suite Completed ==='))
    .catch(err => console.error('Test suite failed:', err));