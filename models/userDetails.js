import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import TeamDetails from './teamDetails.js';

const User = sequelize.define('User', {
    srNo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    uid: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    regNo: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    phoneNo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    hostelType: {
        type: DataTypes.ENUM('DS', 'MH', 'FH'),
        allowNull: false
    },
    hostelBlock: {
        type: DataTypes.STRING,
        allowNull: true
    },
    roomNo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    branch: {
        type: DataTypes.STRING,
        allowNull: false
    },
    gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: false
    },
    school: {
        type: DataTypes.STRING,
        allowNull: false
    },
    teamId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: TeamDetails,
            key: 'srNo'
        }
    },
    isLeader: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'test_user_details',
    timestamps: false,
});

// Define associations
TeamDetails.hasMany(User, {
    foreignKey: 'teamId',
    as: 'members',
    onDelete: 'SET NULL'
});

User.belongsTo(TeamDetails, {
    foreignKey: 'teamId',
    as: 'team'
});

export default User;