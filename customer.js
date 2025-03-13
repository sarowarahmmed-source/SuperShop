// Add these at the top of customer.js if they don't exist
let currentCurrency = '৳';
let currentCurrencyCode = 'BDT';

async function loadCurrencySettings() {
    try {
        const storeSnapshot = await getDocs(collection(db, 'storeInfo'));
        if (!storeSnapshot.empty) {
            const storeData = storeSnapshot.docs[0].data();
            currentCurrency = storeData.currencySymbol || '৳';
            currentCurrencyCode = storeData.currency || 'BDT';
            console.log('Currency settings loaded:', currentCurrency, currentCurrencyCode);
        }
    } catch (error) {
        console.error('Error loading currency settings:', error);
    }
}

function formatCurrency(amount) {
    // Make sure amount is a number and handle null/undefined values
    const numAmount = parseFloat(amount || 0);
    return `${numAmount.toFixed(2)}${currentCurrency}`;
}
window.printTransactionHistory = async function() {
    // Make sure to await the currency settings load
    await loadCurrencySettings();
    const modal = document.getElementById('transactionHistoryModal');
    const customerId = modal.getAttribute('data-customer-id');
    
    try {
        // Get customer details
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        if (!customerDoc.exists()) {
            alert('Customer not found');
            return;
        }
        
        const customer = customerDoc.data();
        
        // Query due adjustments for this customer
        const q = query(
            collection(db, 'dueAdjustments'), 
            where('customerId', '==', customerId)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            alert('No transaction history to print');
            return;
        }
        
        // Sort transactions by timestamp (newest first)
        const transactions = [];
        querySnapshot.forEach(doc => {
            transactions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        transactions.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // Create print window
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        // Current date for the report
        const reportDate = new Date();
        const formattedReportDate = reportDate.toLocaleDateString();
        
        // Calculate totals
        let totalPayments = 0;
        let totalCharges = 0;
        
        transactions.forEach(transaction => {
            if (transaction.type === 'payment') {
                totalPayments += parseFloat(transaction.amount);
            } else {
                totalCharges += parseFloat(transaction.amount);
            }
        });
        
        // Set print content
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Transaction History - ${customer.name}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        color: #333;
                    }
                    .report {
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .report-header {
                        text-align: center;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    .report-title {
                        font-size: 24px;
                        font-weight: bold;
                        margin: 10px 0;
                    }
                    .report-subtitle {
                        font-size: 16px;
                        color: #666;
                    }
                    .customer-info {
                        margin-bottom: 20px;
                        padding: 10px;
                        background-color: #f5f5f5;
                        border-radius: 5px;
                    }
                    .transaction-item {
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        margin-bottom: 10px;
                        background-color: #f9f9f9;
                    }
                    .transaction-item.payment {
                        border-left: 4px solid #28a745;
                    }
                    .transaction-item.charge {
                        border-left: 4px solid #dc3545;
                    }
                    .transaction-header {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 5px;
                    }
                    .transaction-type {
                        font-weight: bold;
                    }
                    .transaction-type.payment {
                        color: #28a745;
                    }
                    .transaction-type.charge {
                        color: #dc3545;
                    }
                    .transaction-date {
                        color: #6c757d;
                    }
                    .transaction-details {
                        display: flex;
                        justify-content: space-between;
                        margin: 10px 0;
                    }
                    .transaction-amount {
                        font-weight: bold;
                        font-size: 1.1em;
                    }
                    .transaction-note {
                        font-style: italic;
                        color: #6c757d;
                        margin-top: 5px;
                    }
                    .summary {
                        margin-top: 20px;
                        padding: 10px;
                        background-color: #f5f5f5;
                        border-radius: 5px;
                        font-weight: bold;
                    }
                    .print-button {
                        display: block;
                        margin: 20px auto;
                        padding: 10px 20px;
                        background-color: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                    }
                    @media print {
                        .print-button {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="report" id="printArea">
                    <div class="report-header">
                        <div class="report-title">TRANSACTION HISTORY</div>
                        <div class="report-subtitle">SuperShop Management System</div>
                        <div>Report Generated: ${formattedReportDate}</div>
                    </div>
                    
                    <div class="customer-info">
                        <h3>Customer Information</h3>
                        <p>
                            <strong>Name:</strong> ${customer.name || 'N/A'}<br>
                            <strong>ID:</strong> ${customer.id || 'N/A'}<br>
                            <strong>Phone:</strong> ${customer.phone || 'N/A'}<br>
                            <strong>Email:</strong> ${customer.email || 'N/A'}<br>
                            <strong>Current Due:</strong> ${formatCurrency(customer.due || 0)}
                        </p>
                    </div>
                    
                    <h3>Transaction History</h3>
        `);
        
        // Add each transaction
        transactions.forEach(transaction => {
            const date = new Date(transaction.timestamp);
            const formattedDate = date.toLocaleDateString();
            const formattedTime = date.toLocaleTimeString();
            
            printWindow.document.write(`
                <div class="transaction-item ${transaction.type}">
                    <div class="transaction-header">
                        <span class="transaction-type ${transaction.type}">
                            ${transaction.type === 'payment' ? 'Payment Received' : 'Additional Charge'}
                        </span>
                        <span class="transaction-date">${formattedDate} ${formattedTime}</span>
                    </div>
                    <div class="transaction-details">
                        <div>
                            Previous Due: ${formatCurrency(transaction.previousDue)}<br>
                            New Due: ${formatCurrency(transaction.newDue)}
                        </div>
                        <div class="transaction-amount">
                            ${formatCurrency(transaction.amount)}
                        </div>
                    </div>
                    ${transaction.note ? `<div class="transaction-note"><strong>Note:</strong> ${transaction.note}</div>` : ''}
                </div>
            `);
        });
        
        // Add summary
        printWindow.document.write(`
                    <div class="summary">
                        <p>Total Payments Received: ${formatCurrency(totalPayments)}</p>
                        <p>Total Additional Charges: ${formatCurrency(totalCharges)}</p>
                        <p>Net Adjustment: ${formatCurrency(totalPayments - totalCharges)}</p>
                    </div>
                </div>
                
                <button class="print-button" onclick="window.print(); return false;">Print Report</button>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
    } catch (error) {
        console.error('Error printing transaction history:', error);
        alert('Error printing transaction history. Please try again.');
    }
};