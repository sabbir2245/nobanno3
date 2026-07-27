# Step 1 . From Customer to Admin 

in this step , multilple customers pay come in our admin account using SSlCommerz , (2.5 percent charge )
If customer pays 1000 , we get 1000 - 25 = 975 taka in our admin account.

---

# Step 2 . From Admin to Farmer
In this step , admin will pay to farmer using bKash or Bank transfer. 

## What this system does

Farmer receives payment in bKash or in their bank account.( inputed at sign up time )

---

## The two payout options farmers can choose

Every farmer picks one of these when they set up their profile:

- **bKash** — money sent straight to their bKash mobile number , Uses B2c API for automatic payouts
- **Bank account** — money sent to their bank, using their account number and bank details , Uses  BEFTN batch file upload system 

-**search_in_google** - 1. BEFTN csv file 
2. bkash b2c api

Farmers can change this choice later in the app if they want to switch.

---

## How money gets to farmers

### If a farmer chose bKash — fully automatic

When delivery is confirmed, the system automatically sends the farmer's payouts 50 percent  to their bKash number. After confirmation from Customer the rest of the 50 percent . 

### If a farmer chose bank transfer — mostly automatic, with one manual step

The system automatically calculates everyone's bank payout the same way it does for bKash. But sending money directly into a bank not \
possible . 
Here's how it works:

1. The system automatically gathers everyone due a bank payment and prepares one single file listing all of them — names, account numbers, and amounts.
sample csv file for bank upload
``` 
username,full name , account_number,amount , address , order_id
fjamal,Jamal hasan , 8261234567890, 100000 , naraynaganjDhaka , 89244
fkarim ,Karim hasan , 8261234567891, 200000 , naraynaganjDhaka , 89245
rahim24 , Rahim ali , 8261234567892, 300000 , naraynaganjDhaka , 89246
abul34  , Abuil mia , 8261234567893, 400000 , naraynaganjDhaka , 89247
``` 


2. Someone on your team logs into your business's online banking, uploads that one file , and submits it.
3. The bank then pays every farmer in that file, usually the same day or the next business day.
4. Once confirmed, the system marks those farmers as paid.


---

## What's automatic vs. what needs a person

| Step | Who does it |
|---|---|

| Sending money to bKash farmers | Automatic —  |
| Preparing the list of bank farmers to be paid | Automatic —  |
| Uploading that list to the bank and confirming it | A staff member — one action per day , once per payout round |
| Fixing a farmer's incorrect bKash number or bank details | A staff member — only when it happens |

In short: almost everything happens by itself. The only regular task for your team is one bank file upload each time a payout round runs (for example, once a day, or however often you choose to run payouts).

---

## What decides how often payouts happen

You choose the schedule — for example, once a day, or once every few days. More frequent payouts mean farmers get paid faster but mean more (small) bank uploads for your team to do. Less frequent payouts mean fewer uploads but farmers wait a bit longer. This is a business decision, not a technical limitation, and can be changed at any time.
