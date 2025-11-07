# Monthly Accounting Automation With GnuCash and Square

## 📘 Monthly Accounting Automation Guide (GnuCash + Square)

This guide documents the full, repeatable process for converting complex Square data into a balanced GnuCash ledger, saving significant time on manual reconciliation every month.

---

### Phase 1: Setup and Configuration (One-Time)

#### **Download GnuCash:**

Download and install the latest version from the [official GnuCash website](https://gnucash.org/).

#### **Create Chart of Accounts:**

Ensure the following accounts exist in GnuCash (use these exact names, as they are hard-coded in the script):

- **Assets:Checking - [Your Bank Name]** (Your main operating account)
- **Expenses:Square Fees**
- **Liabilities:Sales Tax Payable**
- **Income:Sales:Card Revenue**

#### **Create Temporary Holding Account:**

Create a temporary account named **Assets:Square Holding**. This account is used by the QIF script as a placeholder during the import process.

#### **Install Node.js:**

Download and install Node.js from the [official NodeJs website](https://nodejs.org/)
_(required to run the custom JavaScript conversion script)_

#### **Save `convert.js` Script:**

Save the final, optimized JavaScript code as a file here in this repository named [**convert.js**](./convert.js) in a dedicated project folder.

---

### Phase 2: Obtain Square Reports

The reason that this process is so complicated is that Square does **not** provide a single report that contains the data that we need, which is both:

- The final net **Deposit Amount** (for bank reconciliation)
- All the necessary **Split Details** (Fees, Tax, Revenue) linked by the same unique ID.

We have to use two different reports and link them using a common key.

#### 🧾 Square Reports Used for Multi-Split Conversion

We needed two distinct reports to gather all the necessary data points (Date, Net Deposit, Fees, Tax, Revenue) that the JavaScript script required for a balanced transaction.

##### 1. Report for Split Details: The **Sales Summary Report (or Item Sales)**

This report provides the granular financial activity necessary for the splits—specifically:

- The Fees
- The Tax Collected
- The Gross Revenue.
  
We need to find a version that includes the unique **Deposit ID** or **Transaction ID** linked to the sale.

| Data Pulled | Split Account |
|-------------|----------------|
| Gross Sales / Card Revenue | Income:Sales:Card Revenue |
| Processing Fees | Expenses:Square Fees |
| Tax Collected | Liabilities:Sales Tax Payable |

How to Find and Download:

1. Sign in to your **Square Dashboard** (online, not the app).
2. Navigate to the **Reports** section (often found under the **Sales** tab).
3. Select **Sales Summary** or **Item Sales**.
4. Set the desired **Date Range** (e.g., the entire month or year).
5. Look for **Advanced Options** or **Export Settings** to ensure you are exporting a detailed view.
6. Click the **Export** icon and download the report as a **CSV** file.

##### 2. Report for Reconciliation: The **Transfers Report (or Deposits Report)**

This report provides the single **Net Deposit Amount** and, crucially, the unique **Deposit ID** that is used to link all the associated sales (and their splits) together.

| Data Pulled | Split Account |
|-------------|----------------|
| Deposit ID | The unique key used for VLOOKUP |
| Sum of Deposited | Assets:Checking - [Your Bank Name] (The amount that hit the bank) |

How to Find and Download:

1. Sign in to your **Square Dashboard**.
2. Navigate to the **Balance** or **Banking** section.
3. Look for a section titled **Transfers** or **View All Transfers**.
4. Set the same **Date Range** used for the Sales Summary Report.
5. This view typically shows the net amount deposited into your bank account.
6. Click the **Export** button to download the transfer details as a **CSV** file. **Note:** This report sometimes lists the individual transactions that make up the transfer, but the key is the **Deposit ID** which is the link back to the net amount.

---

### Phase 3: Detailed Data Extraction and Preparation (Pivot Table/VLOOKUP)

The Pivot Table's Purpose: The Pivot Table/VLOOKUP process is required solely to merge these two files—linking the split data from Report 1 with the net deposit amount from Report 2—using the common Deposit ID to ensure every transaction in the new file was perfectly balanced.

This phase generates the master source file, **QIF_Source_Data.csv**, required by the script.

#### Step 1: Prepare the Source Data

1 **Open two separate sheets/tabs** in your spreadsheet program (Excel, Google Sheets, etc.):

- **Sheet 1: `SALES_DATA`** (Source of Fees, Tax, Revenue)
- **Sheet 2: `DEPOSITS_DATA`** (Source of Net Deposit Amount and Deposit ID).

2 **Clean Source Data:**

For both sheets, select all columns containing monetary values and you **MUST REMOVE**:

- All currency symbols `$`
- Parentheses `()`, and..
- Thousands separator commas `($\text{,}$)`

Format these columns as standard **Numbers** or **General**.

#### Step 2: Build the Master Sheet

1. **Create a third sheet** named **`MASTER_QIF_DATA`**.
2. **Copy Base Fields:**
   Copy the following columns from the **`DEPOSITS_DATA`** sheet to the `MASTER_QIF_DATA` sheet. These will be your base columns:

- **Column A:** Date
- **Column B:** Deposit ID (Your unique VLOOKUP key)
- **Column C:** Sum of Deposited (The Net Deposit Amount)

#### Step 3: Use VLOOKUP to Add Split Data

We will now use `VLOOKUP` (or equivalent like XLOOKUP) on the `MASTER_QIF_DATA` sheet to pull the fees, tax, and revenue from the `SALES_DATA` sheet, matching them on the **Deposit ID** (Column B).

##### **Pre-requisite:**

On your `SALES_DATA` sheet, ensure the **Deposit ID** column is the **first column** in the `VLOOKUP` search range.

##### **Get Square Fees (Expense):**

In **Column D** of `MASTER_QIF_DATA` (Header: Fees Positive), use VLOOKUP to pull the fee amount based on the Deposit ID in B2.

_Example Formula (Adjust Range and Index):_

```formula
=VLOOKUP(B2, SALES_DATA!$A$2:$Z$999, [Fees Column Index], FALSE)`
```

##### **Get Sales Tax (Liability):**

In **Column E** (Header: Tax Negative), use VLOOKUP to pull the Sales Tax liability amount.

##### **Get Card Revenue (Income):**

In **Column F** (Header: Revenue Negative), use VLOOKUP to pull the Gross Sales/Card Revenue amount.

##### **Copy formulas down** for all rows

#### Step 4: Convert Formulas to Values and Adjust Signs

##### **Convert All Formulas to Values:**

Select columns D, E, and F. **Copy them, then immediately Paste Special → Values** over the same columns.
_This ensures the spreadsheet contains static numbers, not active formulas_

##### **Adjust Signs:**

Select **Column E** (Tax) and **Column F** (Revenue).
Use a formula (e.g., in a temporary column, `=E2 * -1`)
or a Paste Special function to **multiply the entire column by -1**.

**Goal:** The numbers in columns E and F must now be negative (e.g., `-31.15`).

#### Step 5: Final Export to CSV

##### **Select Final Data:**

Select the final six columns, **in this exact order** (A through F): Date, Deposit ID, Sum of Deposited, Fees Positive, Tax Negative, Revenue Negative.

##### **Prepare The New File:**

Copy the data and Paste Special -> **Values** into a brand new, empty spreadsheet file.

##### **Save The CSV:**

Save this new file as `QIF_Source_Data.csv`.

**ENSURE THE SAVED CSV FILE DOES NOT CONTAIN ANY HEADER ROW.**

---

### Phase 4: Script Execution and QIF Import

#### **Run the Conversion Script:**

Open your terminal or command prompt, navigate to the project folder, and run the conversion script:

```bash
node convert.js
```

_Output:_

```bash
A file named **Square_Transactions_Import.qif** will be generated.
```

#### **Import QIF into GnuCash:**

- In GnuCash, go to **File** -> **Import** -> **Import QIF...**
- Select the **Square_Transactions_Import.qif** file.
- When prompted for the **Account Name**, enter the **EXACT** name of your checking account (e.g., **Assets:Checking - Wells Fargo**).
- On the Category Matching screen, click **Next**.
- Confirm the import.

---

### Phase 5: Bank Statement Import and Reconciliation

This step matches the QIF imports against the bank's records to clear the transactions.

#### **Download Bank Statement:**

Download your checking account statement from your bank as a **CSV** file (containing Date, Description, Credit, Debit columns).

#### **Import CSV:**

Go to **File** -> **Import** -> **Import CSV...** and select your bank statement file.

#### **Map Columns:**

Map the fields as follows:

| GnuCash | CSV |
|---------|-----|
| Date | Date (from CSV) |
| Number | Check Number (or other unique ID from CSV, if present) |
| Description | Description (from CSV) |
| Amount | Credit (from CSV) |
| Amount (Negated) | Debit (from CSV) |

#### **Match and Clear:**

On the **Import Matcher** screen, GnuCash will automatically match the simple bank deposits against the detailed QIF-imported split transactions.

#### **Accept all matches.**

_Result:_ The transactions will be marked as **Cleared (C)**.

---

### Phase 6: Final Cleanup and Reporting

#### **Delete Holding Account:**

Once reconciliation is complete, **Right-click** on the temporary **Assets:Square Holding** account in the Chart of Accounts and select **Delete Account**, choosing **"Delete all transactions"** in the dialogue box.

#### **Generate Reports:**

Go to **Reports** -> **Income & Expense** -> **Profit & Loss** and **Balance Sheet** to generate the final, accurate financial statements.
