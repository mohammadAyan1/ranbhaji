import xlsx from 'xlsx';

const workbook = xlsx.readFile('d:/rambhaji/SUBSCRIBER LIST.xlsx');
const sheet_name_list = workbook.SheetNames;
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

console.log(JSON.stringify(data.slice(0, 5), null, 2));
