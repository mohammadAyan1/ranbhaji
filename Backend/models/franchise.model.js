import { DataTypes } from 'sequelize';
import { sequelize } from '../confiq/db.js';

const Franchise = sequelize.define('Franchise', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  full_name: { type: DataTypes.STRING(100), allowNull: false },
  mobile_number: { type: DataTypes.STRING(15), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: false },
  investment_capacity: { type: DataTypes.STRING(100), allowNull: true },
  message: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'inactive' }
}, { 
  tableName: 'franchises', 
  timestamps: true, 
  createdAt: 'created_at', 
  updatedAt: 'updated_at' 
});

export default Franchise;
