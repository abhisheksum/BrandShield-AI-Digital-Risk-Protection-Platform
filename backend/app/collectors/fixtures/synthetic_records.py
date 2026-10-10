"""
Synthetic demo records representing realistic legitimate official assets,
brand impersonation accounts, combosquatting profiles, and rogue mobile apps.
All records are explicitly labeled with `is_demo=True`.
"""

DEMO_SOCIAL_CANDIDATES = [
    {
        "candidate_name": "ApexPay Official Support",
        "candidate_type": "social_account",
        "platform": "twitter",
        "candidate_identifier": "@apexpay_support_desk",
        "candidate_url": "https://twitter.com/apexpay_support_desk",
        "description": "Official 24/7 customer support for ApexPay wallet users. Send DM to unlock frozen balances or claim bonuses bit.ly/apex-verify",
        "publisher_name": "Apex Support Team",
        "is_unverified_new_account": True,
        "logo_hash": "a1b2c3d4e5f60718:a1b2c3d4e5f60718",  # Synthetic identical logo
        "is_demo": True
    },
    {
        "candidate_name": "ApexPay Rewards & Bonus",
        "candidate_type": "social_account",
        "platform": "instagram",
        "candidate_identifier": "@apexpay_bonus_2026",
        "candidate_url": "https://instagram.com/apexpay_bonus_2026",
        "description": "Exclusive giveaway for active ApexPay accounts! Connect your wallet at https://t.me/apexpay_giveaway to claim $250.",
        "publisher_name": "Community Promoters",
        "is_unverified_new_account": True,
        "logo_hash": "a1b2c3d4e5f60720:a1b2c3d4e5f60722",
        "is_demo": True
    },
    {
        "candidate_name": "ApеxPay",  # Cyrillic 'е' homoglyph
        "candidate_type": "social_account",
        "platform": "twitter",
        "candidate_identifier": "@apexpay_security",
        "candidate_url": "https://twitter.com/apexpay_security",
        "description": "Urgent security notice: Verify your identity immediately or your account will be disabled. Direct support helpdesk.",
        "publisher_name": "Global Security Desk",
        "is_unverified_new_account": True,
        "logo_hash": "a1b2c3d4e5f60718:a1b2c3d4e5f60718",
        "is_demo": True
    },
    {
        "candidate_name": "ApexPay",
        "candidate_type": "social_account",
        "platform": "twitter",
        "candidate_identifier": "@apexpay",
        "candidate_url": "https://twitter.com/apexpay",
        "description": "The official handle for ApexPay Inc. Modern financial infrastructure.",
        "publisher_name": "ApexPay Inc.",
        "is_unverified_new_account": False,
        "logo_hash": "a1b2c3d4e5f60718:a1b2c3d4e5f60718",
        "is_demo": True
    }
]

DEMO_APP_CANDIDATES = [
    {
        "candidate_name": "ApexPay - Quick Loan & Wallet",
        "candidate_type": "mobile_app",
        "platform": "google_play",
        "candidate_identifier": "com.quickloans.apexpay.wallet",
        "candidate_url": "https://play.google.com/store/apps/details?id=com.quickloans.apexpay.wallet",
        "description": "Instant personal loans and digital cash transfer via ApexPay network. High approval rate, download direct APK at bit.ly/apex-apk",
        "publisher_name": "Fast Fintech Labs LLC",
        "is_unverified_new_account": True,
        "logo_hash": "a1b2c3d4e5f60718:a1b2c3d4e5f60718",
        "is_demo": True
    },
    {
        "candidate_name": "ApexPay Secure Mobile Banking",
        "candidate_type": "mobile_app",
        "platform": "google_play",
        "candidate_identifier": "com.apexpay.mobile",
        "candidate_url": "https://play.google.com/store/apps/details?id=com.apexpay.mobile",
        "description": "The official mobile banking app by ApexPay Technologies. Manage your balance securely.",
        "publisher_name": "ApexPay Technologies Inc.",
        "is_unverified_new_account": False,
        "logo_hash": "a1b2c3d4e5f60718:a1b2c3d4e5f60718",
        "is_demo": True
    },
    {
        "candidate_name": "Apex Pay Pro - Cash Manager",
        "candidate_type": "mobile_app",
        "platform": "apple_app_store",
        "candidate_identifier": "id998877665",
        "candidate_url": "https://apps.apple.com/app/apex-pay-pro/id998877665",
        "description": "Unofficial utility and balance tracker for Apex users.",
        "publisher_name": "DevSolutions Ltd",
        "is_unverified_new_account": False,
        "logo_hash": "ffffffffffffffff:0000000000000000",
        "is_demo": True
    }
]
