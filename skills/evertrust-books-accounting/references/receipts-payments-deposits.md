# Invoices, receipts, payments and deposits

Part of the Evertrust Books accounting skill. The core rules in SKILL.md always apply.

## Invoices, quotes and orders

Use sales/purchase invoices, sales/purchase quotes and sales/purchase orders as distinct resources. A deposit quotation is not a tax invoice. For quote conversion, read the quote, prepare explicitly mapped invoice fields and preserve the quoted items, quantities, prices, tax and customer/supplier. Do not blindly POST a quote form as an invoice or mark a quote converted without a verified invoice key.

## Receipts, payments and transfers

Use native `receipts`, `payments` and `inter_account_transfers`. Read the bank account, party and invoice before linking a receipt/payment. Match the invoice to the stated customer/supplier and company. Allocate lines to the explicit invoice, not merely to a party with a similar name.

Learn `ReceivedIn`, `PaidFrom`, `Date`, `PaidBy` (receipts), `Payee` (payments), `Lines`, receivable/payable party and invoice link fields from a native template. Use numeric enum values only when evidenced. For foreign currency, distinguish invoice amount, base currency amount, bank amount and exchange rate. Do not invent a conversion or use bank-net as invoice settlement; request missing amounts or use an evidenced native template. Check storage and remaining invoice balance after posting.

## Customer deposits

A deposit is not automatically revenue. Agree on the evidenced accounting treatment: unapplied customer credit versus a specified liability account. A bank account whose name contains deposit does not establish the accounting treatment.

Record the requested receipt using native fields; leave it unallocated only when the user's intended treatment and Manager template support that. If a deposit document is requested, distinguish a quotation from a posted sales invoice. Apply the deposit to the final invoice only through a supported native allocation or an explicit, balanced journal using evidenced accounts. Avoid issuing a second receipt for money already received or posting revenue twice. Re-read the receipt, invoice and customer balance to reconcile.
