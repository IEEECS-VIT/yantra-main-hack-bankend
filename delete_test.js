import User from './models/userDetails.js';
import TeamDetails from './models/teamDetails.js';

async function cleanupTestData() {
    try {
        console.log('Cleaning up test data...');
        await User.destroy({ where: {} });
        await TeamDetails.destroy({ where: {} });
        console.log('Test data cleaned up successfully');
    } catch (error) {
        console.error('Error cleaning up test data:', error);
    }
}

cleanupTestData();