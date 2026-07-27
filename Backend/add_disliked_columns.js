import { connectDB, sequelize } from './confiq/db.js';

const run = async () => {
    try {
        await connectDB();
        await sequelize.getQueryInterface().addColumn('users', 'disliked_products', {
            type: sequelize.Sequelize.DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        });
        console.log("Added disliked_products to users");
        process.exit(0);
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log("Column disliked_products already exists.");
            process.exit(0);
        }
        console.error(e);
        process.exit(1);
    }
};

run();
