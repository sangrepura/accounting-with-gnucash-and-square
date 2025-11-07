# Monthly Accounting Automation With GnuCash and Square

## Executive Summary

This project establishes a robust, automated system for reconciling daily and monthly financial activity from Square into the GnuCash double-entry ledger.

### What is GnuCash?  

GnuCash, is a free and open-source, double-entry accounting solution that provides a mature and highly reliable foundation for business finances. It installs and runs without connecting to the internet on all platforms (Windows, Mac, and Linux), so there is zero vendor lock-in.

It is known for its stability, benefiting from continuous, community-driven development since its first stable release in 1998, providing a mature and highly reliable foundation for business finances.

## Problem Statement

Accounting for Square sales is manually burdensome because the platform does not provide a single export report that correctly links the final Net Deposit amount (required for bank reconciliation) to all necessary split details (Gross Revenue, Processing Fees, and Sales Tax Liability).

This fundamental data gap forces businesses to dedicate substantial monthly effort to manually:

- Combine and link data from two separate, non-aligned reports.
- Perform tedious data cleaning (removing currency symbols and commas).
- Manually calculate and negate values (liabilities and income).
- Execute complex, four-part split transactions in the GnuCash ledger.

This manual process is highly susceptible to human error, creates drag on monthly closing procedures, and prevents the timely and accurate generation of Profit & Loss and Balance Sheet statements. The existing manual workflow is inefficient and does not scale.

## Solution Overview

The core solution utilizes a custom Node.js script and precise spreadsheet logic (`VLOOKUP`) to merge and transform two disparate Square reports (Transfers and Sales Summary) into a single, balanced QIF import file.

This eliminates the need for manual, error-prone data entry and the complex creation of split transactions
The result is a controlled, two-phase reconciliation process—importing splits into a temporary holding account, followed by matching against the bank's CSV statement—which guarantees accuracy, saves significant monthly labor hours, and delivers timely, accurate financial statements.

## Rationale and Competitive Advantage

While commercial solutions like QuickBooks, Xero, or Wave offer integrated bank feeds, they often fail to handle the detailed, multi-part split required for Square transactions correctly, forcing manual correction.
Additionally many business owners do not wish to link their financial records to these platforms due to security concerns.

This custom GnuCash/Node.js solution provides a distinct advantage:

1. Zero Subscription Cost:

   GnuCash is open-source and free.
   Commercial accounting software requires monthly fees, making the custom solution highly cost-effective for small businesses committed to a double-entry ledger.

2. Guaranteed Double-Entry Accuracy:

   Unlike opaque bank feed matching used by commercial solutions, this script guarantees the transaction is correctly split into the four necessary accounts (Income, Tax Liability, Fees, and Asset) before reconciliation. Commercial integrations frequently consolidate these splits or require paying for a costly third-party app to achieve the same accurate result.

3. Owner Control and Transparency:

   The custom solution provides the business owner with 100% visibility and control over the precise logic used for financial data transformation, eliminating reliance on closed-source "black box" integrations and ensuring complete trust in the final ledger accuracy, which is essential for audit preparedness.

4. Flexibility and Independence:

   By controlling the conversion script, the process remains adaptable to minor changes in Square's reporting structure, providing greater long-term independence than proprietary integrations that can break without notice.

5. Enhanced Data Privacy and Security:

   GnuCash stores all financial data locally on the owner's hardware, offering a significant privacy advantage over cloud-based platforms (QuickBooks, Xero, Wave).

   The user controls their backup strategy and can employ file encryption, mitigating the security risk associated with storing sensitive financial information on a third-party, centralized commercial platform.

## 📘 Monthly Accounting Automation Guide (GnuCash + Square)

This guide documents the full, repeatable process for converting complex Square data into a balanced GnuCash ledger, saving significant time on manual reconciliation every month.

---

### Phase 1: Setup and Configuration (One-Time)

#### **1. Download GnuCash:**

Download and install the latest version from the [official GnuCash website](https://gnucash.org/).

#### **2. Create Essential Chart of Accounts:**

Ensure the following **permanent** accounts exist in GnuCash (use these exact names, as they are hard-coded in the script):

- **Assets:Checking - [Your Bank Name]** (Your main operating account)
- **Expenses:Square Fees**
- **Liabilities:Sales Tax Payable**
- **Income:Sales:Card Revenue**

#### **3. Create Temporary Holding Account:**

Create a temporary account named **Assets:Square Holding**. This account is **crucial** and is used by the QIF script as a buffer during the import process.

#### **4. Install Node.js:**

Download and install Node.js from the [official NodeJs website](https://nodejs.org/).
**(Required to run the custom JavaScript conversion script)**

#### **5. Save `convert.js` Script:**

Save the final, optimized JavaScript code as a file named **`convert.js`** in a dedicated project folder.

---

### Phase 2: Obtain Square Reports (The Data Source)

The reason that this process is so complicated is that Square does **not** provide a single report that contains the data that we need. We must combine data from two separate reports using a common key.

#### 🧾 Required Data Points

| Data Point | Report Source | Purpose |
| :--- | :--- | :--- |
| **Deposit ID** | Transfers Report | Unique key to link both files. |
| **Sum of Deposited** (Net) | Transfers Report | Amount for final bank reconciliation. |
| **Gross Revenue** | Sales Summary Report | Splits to **Income:Sales:Card Revenue**. |
| **Processing Fees** | Sales Summary Report | Splits to **Expenses:Square Fees**. |
| **Tax Collected** | Sales Summary Report | Splits to **Liabilities:Sales Tax Payable**. |

---

##### 1. Report for Split Details: The **Sales Summary Report (or Item Sales)**

This report provides the granular financial activity necessary for the splits.

**How to Find and Download:**

1. Sign in to your **Square Dashboard** (online).
2. Navigate to the **Reports** section (usually under the **Sales** tab).
3. Select **Sales Summary** or **Item Sales**.
4. Set the desired **Date Range**.
5. Use **Advanced Options** or **Export Settings** to ensure you are exporting a **detailed view** that includes the **Deposit ID** or **Transaction ID**.
6. Click the **Export** icon and download the report as a **CSV** file.

##### 2. Report for Reconciliation: The **Transfers Report (or Deposits Report)**

This report provides the single **Net Deposit Amount** and the crucial **Deposit ID**.

**How to Find and Download:**

1. Sign in to your **Square Dashboard**.
2. Navigate to the **Balance** or **Banking** section.
3. Look for a section titled **Transfers** or **View All Transfers**.
4. Set the **same Date Range** used for the Sales Summary Report.
5. Click the **Export** button to download the transfer details as a **CSV** file.

---

### Phase 3: Detailed Data Extraction and Preparation (VLOOKUP)

The VLOOKUP process is required solely to merge these two files and ensure every transaction in the new file is perfectly balanced. This phase generates the master source file, **`QIF_Source_Data.csv`**.

#### Step 1: Prepare the Source Data

1. **Open two separate sheets/tabs** in your spreadsheet program: **`SALES_DATA`** and **`DEPOSITS_DATA`**.
2. **Clean Source Data:** For all monetary columns, you **MUST REMOVE**:
    - All currency symbols `$`
    - Parentheses `()`
    - Thousands separator commas `($\text{,}$)`
    - **Format these columns as standard Numbers or General.**

#### Step 2: Build the Master Sheet (`MASTER_QIF_DATA`)

1. **Create a third sheet** named **`MASTER_QIF_DATA`**.
2. **Copy Base Fields:** Copy the following columns from the **`DEPOSITS_DATA`** sheet:
    - **Column A:** Date
    - **Column B:** Deposit ID (Your unique VLOOKUP key)
    - **Column C:** Sum of Deposited (The Net Deposit Amount)

#### Step 3: Use VLOOKUP to Add Split Data

1. **Pre-requisite:** On your `SALES_DATA` sheet, ensure the **Deposit ID** column is the **first column** in the `VLOOKUP` search range.
2. **VLOOKUP Formulas (Columns D, E, F):** Use VLOOKUP to pull the Fees, Sales Tax, and Gross Revenue from `SALES_DATA` into the respective columns of `MASTER_QIF_DATA`, matching on the **Deposit ID** (Column B).
3. **Copy formulas down** for all rows.

#### Step 4: Convert Formulas to Values and Adjust Signs

1. **Convert All Formulas to Values:** Select columns D, E, and F. **Copy them, then immediately Paste Special → Values** over the same columns. *(This guarantees the spreadsheet contains static numbers, not active formulas)*
2. **Adjust Signs (Negation):** Select **Column E** (Tax) and **Column F** (Revenue). Use a formula (e.g., in a temporary column, `=E2 * -1`) to **multiply the entire column by -1**.
    - **Goal:** The numbers in columns E and F must now be **negative** (e.g., $\text{-31.15}$).

#### Step 5: Final Export to CSV

1. **Select Final Data:** Select the final six columns, **in this exact order**: Date, Deposit ID, Sum of Deposited, Fees Positive, Tax Negative, Revenue Negative.
2. **Save The CSV:** Save this new data as **`QIF_Source_Data.csv`**.
    - **CRITICAL:** The saved CSV file **MUST NOT CONTAIN ANY HEADER ROW.**

---

### Phase 4: Script Execution and QIF Import

#### **1. Run the Conversion Script:**

Open your terminal or command prompt, navigate to the project folder, and run the conversion script:

```bash
node convert.js
```

Output: A file named Square_Transactions_Import.qif will be generated.

#### **2. Import QIF into GnuCash (Targeting Holding Account):**

1. In GnuCash, go to `File -> Import -> Import QIF`
2. Select the Square_Transactions_Import.qif file.
3. CRITICAL STEP:
   When prompted for the Account Name, enter the EXACT name of your TEMPORARY HOLDING ACCOUNT (Assets:Square Holding).
4. On the Category Matching screen, click Next.
5. Confirm the import.

### Phase 5: Bank Statement Import and Reconciliation

This step matches the QIF-imported splits (Phase 4) against the bank's records to clear the transactions.

1. Download Bank Statement:
   Download your checking account statement from your bank as a CSV file (containing Date, Description, Credit, Debit columns).

2. Import CSV (Targeting Checking Account):
   Go to File -> Import -> Import CSV... and select your bank statement file.

3. Map Columns:
   Map the fields as follows:

   | GnuCash Field | CSV Column |
   |---------------|------------|
   | Date | Date (from CSV) |
   | Number | Check Number (or unique ID from CSV) |
   | Description | Description (from CSV) |
   | Amount Credit | (from CSV) |
   | Amount (Negated) | Debit (from CSV) |

4. Match and Clear:

   On the Import Matcher screen, GnuCash will automatically match the simple bank deposits against the detailed QIF-imported split transactions.

    Accept all matches.

    Result: The transactions will be marked as Cleared (C) and the balance is effectively transferred from the Holding Account to the Checking Account.

### Phase 6: Final Cleanup and Reporting

1. Delete Holding Account:

   Once reconciliation is complete, Right-click on the temporary Assets:Square Holding account in the Chart of Accounts and select Delete Account, choosing "Delete all transactions" in the dialogue box. (The transactions are now correctly recorded in the checking account).

2. Generate Reports:

   Go to: `Reports -> Income & Expense -> Profit & Loss and Balance Sheet`
   To generate the final, accurate financial statements.
