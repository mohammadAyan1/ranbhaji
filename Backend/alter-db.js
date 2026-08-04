import { DeliveryItem } from './models/index.js';
import { DataTypes } from 'sequelize';

const alterDb = async () => {
    try {
        await DeliveryItem.sequelize.getQueryInterface().addColumn('delivery_items', 'will_purchase', { type: DataTypes.BOOLEAN, defaultValue: false });
        console.log('Column added successfully');
    } catch (e) {
        if (e.name === 'SequelizeDatabaseError' && e.message.includes('Duplicate column name')) {
            console.log('Column already exists');
        } else {
            console.error(e);
        }
    }
    process.exit(0);
};

alterDb();
