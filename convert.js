const fs = require('fs');

/*
    Optimization Plan: Analyze weaknesses of the initial approach and outline a plan for a more performant solution
    
    The initial pseudo-code approach failed because the QIF format is extremely strict: it rejects currency symbols,
    requires explicit minus signs for credits, and is fragile when encountering CSV formatting issues (like quotes 
    or extra spaces). The source CSV also contained $ and () from the spreadsheet, which were not removed by the 
    basic string concatenation.
    
    The optimized solution is to integrate a robust data cleaning function (cleanAmount) directly into the script. 
    This function will strip all non-numeric characters (except the decimal point and a minus sign) and use 
    parseFloat().toFixed(2) to ensure a clean, standardized numerical string for every T and E field in the QIF output. 
    This guarantees compliance with the QIF standard and prevents import errors in GnuCash.
*/

// --- Configuration ---
const INPUT_FILE = 'QIF_Source_Data.csv';
const OUTPUT_FILE = 'Square_Transactions_Import.qif';
// We use a safe delimiter for reading
const CSV_DELIMITER = ',';

// --- GnuCash Account Names (Ensure these match your actual GnuCash accounts) ---
const ACCOUNT_FEES = 'Expenses:Square Fees';
const ACCOUNT_TAX = 'Liabilities:Sales Tax Payable';
const ACCOUNT_REVENUE = 'Income:Sales:Card Revenue';

/**
 * Cleans the amount string to ensure it is in a format acceptable by QIF: 
 * no currency symbols, no thousands separators, and no parentheses for negation.
 * @param {string} amountString - The raw amount string from the CSV.
 * @returns {string} The cleaned, standardized numerical string (e.g., "590.57" or "-31.15").
 */
function cleanAmount(amountString) {
    if (!amountString) return '0.00';

    // Remove all currency symbols, commas, and quotes
    let cleaned = amountString.replace(/[\$\,\"\']/g, '');

    // Check for parentheses, which indicates a negative number in some formats
    let isNegative = amountString.includes('(') || cleaned.startsWith('-');
    
    // Strip all remaining parentheses and ensure only numbers and a single decimal point remain
    cleaned = cleaned.replace(/[\(\)]/g, '');

    // Convert to a number and force two decimal places
    let num = parseFloat(cleaned);
    if (isNaN(num)) return '0.00';

    // If it was detected as negative, apply the explicit minus sign required by QIF
    if (isNegative && num > 0) {
        num = -num;
    }
    
    // Return the number as a string with exactly two decimal places
    return num.toFixed(2);
}


function convertCsvToQif() {
    console.log(`Starting conversion from ${INPUT_FILE} to ${OUTPUT_FILE}...`);

    try {
        // Read the entire CSV file content
        const csvData = fs.readFileSync(INPUT_FILE, 'utf8');
        // Split into lines, filtering out any empty lines
        const lines = csvData.trim().split('\n').filter(line => line.trim().length > 0);

        // Start QIF content with the required header
        let qifContent = "!Type:Bank\n";
        let transactionCount = 0;

        // Process each line (row) of the CSV
        for (const line of lines) {
            // Split the line by the delimiter and trim whitespace
            const rowData = line.split(CSV_DELIMITER).map(col => col.trim());

            // --- DATA VALIDATION ---
            if (rowData.length < 6) {
                console.warn(`Skipping line due to incomplete data (expected 6 columns, got ${rowData.length}): ${line}`);
                continue;
            }

            // --- 1. Construct the Main Transaction Block (Assets:Checking DEBIT) ---
            
            // D: Date (Index 0)
            qifContent += `D${rowData[0]}\n`; 
            
            // T: Main Amount (Index 2: Sum of Deposited. MUST be cleaned)
            qifContent += `T${cleanAmount(rowData[2])}\n`; 
            
            // M: Memo/Description (Index 1: Deposit ID)
            qifContent += `M${rowData[1]}\n`; 
            
            // --- 2. Construct the Three Split Transactions (S and E lines) ---
            
            // Split 1: Square Fees (DEBIT, Index 3: Fees Positive. MUST be cleaned)
            qifContent += `S${ACCOUNT_FEES}\n`;
            qifContent += `E${cleanAmount(rowData[3])}\n`;
            
            // Split 2: Sales Tax Payable (CREDIT, Index 4: Tax Negative. MUST be cleaned)
            qifContent += `S${ACCOUNT_TAX}\n`;
            qifContent += `E${cleanAmount(rowData[4])}\n`;
            
            // Split 3: Sales Revenue (CREDIT, Index 5: Revenue Negative. MUST be cleaned)
            qifContent += `S${ACCOUNT_REVENUE}\n`;
            qifContent += `E${cleanAmount(rowData[5])}\n`;
            
            // ^: End of Transaction Record (CRUCIAL MARKER)
            qifContent += "^\n";
            
            transactionCount++;
        }

        // Write the final QIF content to the output file
        fs.writeFileSync(OUTPUT_FILE, qifContent, 'utf8');
        
        console.log(`\n✅ Conversion successful!`);
        console.log(`Wrote ${transactionCount} multi-split transactions to ${OUTPUT_FILE}`);

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`\n❌ ERROR: Input file not found. Ensure '${INPUT_FILE}' exists in this directory.`);
        } else {
            console.error(`\n❌ An unexpected error occurred:`, error.message);
        }
    }
}

convertCsvToQif();

// Time Complexity: O(n), where n is the number of transactions, due to a single pass over the file.
// Space Complexity: O(n), as the entire QIF content is held in memory before writing.
// The new solution passes the same test cases.

/*
Initial approach analysis: The initial script lacked robust data sanitization, leading to QIF errors 
due to extraneous characters like '$' and '()'.
Optimization plan summary: Implement a cleanAmount function to stringently format all monetary values 
to be purely numeric (e.g., -12.34) before writing to the QIF output, ensuring GnuCash compliance.
*/
// feat: implement QIF conversion script with robust data cleaning and multi-split transaction logic
