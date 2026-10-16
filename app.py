from flask import Flask, render_template

app = Flask(__name__)

# Centralized provider metadata to eliminate redundant UI logic
PROVIDERS = {
    "SPayLater": {"brand_classes": "bg-gradient-to-br from-orange-400 to-orange-600 text-white", "initial": "S", "hex": "#ea580c"},
    "Atome": {"brand_classes": "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900", "initial": "A", "hex": "#eab308"},
    "Grab PayLater": {"brand_classes": "bg-gradient-to-br from-green-400 to-green-600 text-white", "initial": "G", "hex": "#22c55e"},
    "PayLater by TnG": {"brand_classes": "bg-gradient-to-br from-blue-400 to-blue-600 text-white", "initial": "T", "hex": "#3b82f6"},
    "Others": {"brand_classes": "bg-gradient-to-br from-slate-300 to-slate-500 text-white", "initial": "O", "hex": "#64748b"}
}

@app.route('/')
def home():
    accounts = [
        {"name": "SPayLater", "amount": 980.00, "shariah_compliant": False, **PROVIDERS["SPayLater"]},
        {"name": "Atome", "amount": 700.00, "shariah_compliant": False, **PROVIDERS["Atome"]},
        {"name": "Grab PayLater", "amount": 400.00, "shariah_compliant": True, **PROVIDERS["Grab PayLater"]},
        {"name": "PayLater by TnG", "amount": 250.00, "shariah_compliant": True, **PROVIDERS["PayLater by TnG"]},
        {"name": "Others", "amount": 150.00, "shariah_compliant": True, **PROVIDERS["Others"]}
    ]
    
    upcoming_payments = [
        {"name": "SPayLater", "amount": 120.00, "date": "12 Oct", **PROVIDERS["SPayLater"]},
        {"name": "Atome", "amount": 150.00, "date": "18 Oct", **PROVIDERS["Atome"]}
    ]

    calendar_events = [
        {"date": "12 Oct", "name": "SPayLater", "amount": 120.00, **PROVIDERS["SPayLater"]},
        {"date": "18 Oct", "name": "Atome", "amount": 150.00, **PROVIDERS["Atome"]},
        {"date": "25 Oct", "name": "Grab PayLater", "amount": 200.00, **PROVIDERS["Grab PayLater"]}
    ]

    budget_data = {
        "income": 5000.00,
        "expenses": 3200.00,
        "repayments": sum(event['amount'] for event in calendar_events),
    }
    budget_data["remaining"] = budget_data["income"] - budget_data["expenses"] - budget_data["repayments"]

    disputes = [
        {"id": "#R-9920", "merchant": "Shopee Fashion", "amount": 85.00, "status": "Processing Refund", "date": "08 Oct 2026", "urgent": False},
        {"id": "#D-1044", "merchant": "Zalora", "amount": 120.00, "status": "Investigating", "date": "05 Oct 2026", "urgent": True}
    ]

    return render_template(
        'index.html', 
        accounts=accounts, 
        total=sum(acc['amount'] for acc in accounts), 
        active_count=len(accounts),
        upcoming=upcoming_payments,
        calendar=calendar_events,
        budget=budget_data,
        disputes=disputes
    )

if __name__ == '__main__':
    app.run(debug=True, port=5000)