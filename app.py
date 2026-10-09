from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    # UPDATED: Replaced broken Google Play URLs with stable Wikimedia/Vector CDN URLs
    url_shopee = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Shopee.svg/512px-Shopee.svg.png"
    url_atome = "https://cdn.worldvectorlogo.com/logos/atome-1.svg"
    url_grab = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Grab_%28application%29_logo.svg/512px-Grab_%28application%29_logo.svg.png"
    url_tng = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Touch_%27n_Go_eWallet_logo.svg/512px-Touch_%27n_Go_eWallet_logo.svg.png"
    url_others = "https://cdn-icons-png.flaticon.com/512/855/855279.png"

    accounts = [
        {"name": "SPayLater", "amount": 980.00, "color": "#f97316", "shariah_compliant": "false", "logo_url": url_shopee},
        {"name": "Atome", "amount": 700.00, "color": "#eab308", "shariah_compliant": "false", "logo_url": url_atome},
        {"name": "Grab PayLater", "amount": 400.00, "color": "#22c55e", "shariah_compliant": "true", "logo_url": url_grab},
        {"name": "PayLater by TnG", "amount": 250.00, "color": "#3b82f6", "shariah_compliant": "true", "logo_url": url_tng},
        {"name": "Others", "amount": 150.00, "color": "#94a3b8", "shariah_compliant": "true", "logo_url": url_others}
    ]
    
    total_outstanding = sum(acc['amount'] for acc in accounts)
    active_accounts = len(accounts)

    upcoming_payments = [
        {"name": "SPayLater", "amount": 120.00, "date": "12 Oct", "logo_url": url_shopee},
        {"name": "Atome", "amount": 150.00, "date": "18 Oct", "logo_url": url_atome}
    ]

    calendar_events = [
        {"date": "12 Oct", "name": "SPayLater", "amount": 120.00, "logo_url": url_shopee},
        {"date": "18 Oct", "name": "Atome", "amount": 150.00, "logo_url": url_atome},
        {"date": "25 Oct", "name": "Grab PayLater", "amount": 200.00, "logo_url": url_grab}
    ]

    budget_data = {
        "income": 5000.00,
        "expenses": 3200.00,
        "repayments": 470.00,
        "remaining": 1330.00
    }

    disputes = [
        {"id": "#R-9920", "merchant": "Shopee Fashion", "amount": 85.00, "status": "Processing Refund", "date": "08 Oct 2026"},
        {"id": "#D-1044", "merchant": "Zalora", "amount": 120.00, "status": "Investigating", "date": "05 Oct 2026"}
    ]

    return render_template(
        'index.html', 
        accounts=accounts, 
        total=total_outstanding, 
        active_count=active_accounts,
        upcoming=upcoming_payments,
        calendar=calendar_events,
        budget=budget_data,
        disputes=disputes
    )

if __name__ == '__main__':
    app.run(debug=True, port=5000)