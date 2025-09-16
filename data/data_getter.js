const fs = require('fs');
const path = require('path')

function getData(variable, year, month, day, hour, height, folderPath= path.join(__dirname, 'downloads')) {
    // Construct the filename
    const fileName = `${variable}_${year}_${month}_${day}_${hour}_${height}.csv`;
    
    // Build the full file path
    const filePath = path.join(folderPath, fileName);
    
    try {
        // Read and return the file contents
        const data = fs.readFileSync(filePath, 'utf8');
        return data;
    } catch (err) {
        console.error(`Error reading file ${filePath}:`, err.message);
        return null;
    }
}

// Example usage:
const folder = path.join(__dirname, 'downloads'); // Assuming 'Downloads' is in the same directory
const fileData = getData('theta', 2011, 9, 13, 0, 0, folder);
console.log(fileData);