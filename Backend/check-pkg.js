import { sequelize, Package } from './models/index.js';

const check = async () => {
    try {
        const [res] = await sequelize.query('SHOW COLUMNS FROM packages');
        console.log(res);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
};
check();
