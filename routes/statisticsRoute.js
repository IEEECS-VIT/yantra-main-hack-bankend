import express from 'express';
import sequelize from '../config/db.js';

const router = express.Router();

router.get('/statistics', async (req, res) => {
    try {
        // Query 1: Overall Registration Summary
        const registrationSummary = await sequelize.query(`
            WITH user_stats AS (
                SELECT
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN gender = 'male' THEN 1 END) as total_males,
                    COUNT(CASE WHEN gender = 'female' THEN 1 END) as total_females,
                    COUNT(CASE WHEN "teamId" IS NOT NULL THEN 1 END) as users_in_teams,
                    COUNT(CASE WHEN "teamId" IS NULL THEN 1 END) as users_without_teams
                FROM test_user_details
            )
            SELECT
                total_users as "Total Users",
                total_males as "Males",
                total_females as "Females",
                users_in_teams as "In Teams",
                users_without_teams as "Without Teams",
                ROUND((users_in_teams::float/NULLIF(total_users, 0) * 100)::numeric, 2) as "Team Participation Rate"
            FROM user_stats;
        `, { type: sequelize.QueryTypes.SELECT });

        // Query 2: Hostel-wise Distribution
        const hostelDistribution = await sequelize.query(`
            SELECT
                "hostelType" as "Hostel Type",
                COUNT(*) as "Total Students",
                COUNT(CASE WHEN "teamId" IS NOT NULL THEN 1 END) as "In Teams",
                COUNT(CASE WHEN "teamId" IS NULL THEN 1 END) as "Not In Teams",
                ROUND((COUNT(CASE WHEN "teamId" IS NOT NULL THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100)::numeric, 2) as "Participation Rate"
            FROM test_user_details
            WHERE "hostelType" IS NOT NULL
            GROUP BY "hostelType"
            ORDER BY "Total Students" DESC;
        `, { type: sequelize.QueryTypes.SELECT });

        // Query 3: School-wise Statistics
        const schoolStats = await sequelize.query(`
            SELECT
                school as "School",
                COUNT(*) as "Total Students",
                COUNT(CASE WHEN "teamId" IS NOT NULL THEN 1 END) as "In Teams",
                COUNT(DISTINCT "teamId") as "Number of Teams",
                ROUND((COUNT(CASE WHEN "teamId" IS NOT NULL THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100)::numeric, 2) as "Participation Rate"
            FROM test_user_details
            GROUP BY school
            ORDER BY "Total Students" DESC;
        `, { type: sequelize.QueryTypes.SELECT });

        // Query 4: Team Composition Analysis
        const teamComposition = await sequelize.query(`
            SELECT
                COUNT(*) as "Total Teams",
                COUNT(CASE WHEN team_type = 'All Female' THEN 1 END) as "Female Only Teams",
                COUNT(CASE WHEN team_type = 'All Male' THEN 1 END) as "Male Only Teams",
                COUNT(CASE WHEN team_type = 'Mixed' THEN 1 END) as "Mixed Teams",
                ROUND(AVG(team_size), 2) as "Avg Team Size"
            FROM (
                SELECT
                    td."teamName",
                    COUNT(*) as team_size,
                    CASE
                        WHEN COUNT(*) = SUM(CASE WHEN ud.gender = 'female' THEN 1 ELSE 0 END) THEN 'All Female'
                        WHEN COUNT(*) = SUM(CASE WHEN ud.gender = 'male' THEN 1 END) THEN 'All Male'
                        ELSE 'Mixed'
                    END as team_type
                FROM test_team_details td
                JOIN test_user_details ud ON ud."teamId" = td."srNo"
                GROUP BY td."teamName"
            ) subquery;
        `, { type: sequelize.QueryTypes.SELECT });

        // Query 5: Branch-wise Participation
        const branchParticipation = await sequelize.query(`
            SELECT
                branch as "Branch",
                COUNT(*) as "Total Students",
                COUNT(CASE WHEN gender = 'male' THEN 1 END) as "Males",
                COUNT(CASE WHEN gender = 'female' THEN 1 END) as "Females",
                COUNT(CASE WHEN "teamId" IS NOT NULL THEN 1 END) as "In Teams",
                ROUND((COUNT(CASE WHEN "teamId" IS NOT NULL THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100)::numeric, 2) as "Participation Rate"
            FROM test_user_details
            GROUP BY branch
            ORDER BY "Total Students" DESC;
        `, { type: sequelize.QueryTypes.SELECT });

        // Send the HTML response
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Hackathon Statistics</title>
                <link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
            </head>
            <body class="bg-gray-100 p-8">
                <div class="max-w-7xl mx-auto">
                    <h1 class="text-3xl font-bold text-gray-800 mb-8">Hackathon Statistics Dashboard</h1>
                    
                    <!-- Registration Summary -->
                    <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
                        <h2 class="text-xl font-semibold text-gray-700 mb-4">Overall Registration Summary</h2>
                        <div class="overflow-x-auto">
                            <table class="min-w-full table-auto">
                                <thead class="bg-gray-50">
                                    <tr>
                                        ${Object.keys(registrationSummary[0]).map(key => 
                                            `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${key}</th>`
                                        ).join('')}
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${registrationSummary.map(row => `
                                        <tr>
                                            ${Object.values(row).map(value => 
                                                `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${value}</td>`
                                            ).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Hostel Distribution -->
                    <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
                        <h2 class="text-xl font-semibold text-gray-700 mb-4">Hostel-wise Distribution</h2>
                        <div class="overflow-x-auto">
                            <table class="min-w-full table-auto">
                                <thead class="bg-gray-50">
                                    <tr>
                                        ${Object.keys(hostelDistribution[0]).map(key => 
                                            `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${key}</th>`
                                        ).join('')}
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${hostelDistribution.map(row => `
                                        <tr>
                                            ${Object.values(row).map(value => 
                                                `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${value}</td>`
                                            ).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- School Statistics -->
                    <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
                        <h2 class="text-xl font-semibold text-gray-700 mb-4">School-wise Statistics</h2>
                        <div class="overflow-x-auto">
                            <table class="min-w-full table-auto">
                                <thead class="bg-gray-50">
                                    <tr>
                                        ${Object.keys(schoolStats[0]).map(key => 
                                            `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${key}</th>`
                                        ).join('')}
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${schoolStats.map(row => `
                                        <tr>
                                            ${Object.values(row).map(value => 
                                                `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${value}</td>`
                                            ).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Team Composition -->
                    <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
                        <h2 class="text-xl font-semibold text-gray-700 mb-4">Team Composition Analysis</h2>
                        <div class="overflow-x-auto">
                            <table class="min-w-full table-auto">
                                <thead class="bg-gray-50">
                                    <tr>
                                        ${Object.keys(teamComposition[0]).map(key => 
                                            `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${key}</th>`
                                        ).join('')}
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${teamComposition.map(row => `
                                        <tr>
                                            ${Object.values(row).map(value => 
                                                `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${value}</td>`
                                            ).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Branch Participation -->
                    <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
                        <h2 class="text-xl font-semibold text-gray-700 mb-4">Branch-wise Participation</h2>
                        <div class="overflow-x-auto">
                            <table class="min-w-full table-auto">
                                <thead class="bg-gray-50">
                                    <tr>
                                        ${Object.keys(branchParticipation[0]).map(key => 
                                            `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${key}</th>`
                                        ).join('')}
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${branchParticipation.map(row => `
                                        <tr>
                                            ${Object.values(row).map(value => 
                                                `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${value}</td>`
                                            ).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <footer class="text-center text-gray-500 text-sm mt-8">
                    <p>Last updated: ${new Date().toLocaleString()}</p>
                </footer>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('Error generating statistics:', error);
        res.status(500).json({
            success: false,
            message: "Error generating statistics"
        });
    }
});

export default router;