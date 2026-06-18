import { ScheduleSeasonalSelection } from '../models/index.js';

const runSync = async () => {
  try {
    console.log('Starting DB sync for ScheduleSeasonalSelection...');
    await ScheduleSeasonalSelection.sync({ alter: true });
    console.log('ScheduleSeasonalSelection table synced successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exit(1);
  }
};

runSync();
