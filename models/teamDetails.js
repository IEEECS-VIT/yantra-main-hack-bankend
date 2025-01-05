import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const TeamDetails = sequelize.define('TeamDetails', {
    srNo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    teamName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    teamCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    hackQualified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    internalQualification: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    documentLink: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true,
        },
    },
}, {
    tableName: 'test_team_details',
    timestamps: false,
});

export default TeamDetails;