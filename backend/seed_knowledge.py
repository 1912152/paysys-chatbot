"""
Paysys Labs Knowledge Base Seeder
Run this once after deployment to load all product content.
Usage: python seed_knowledge.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal, create_tables
from db.models import KnowledgeSource, User
from services.rag_engine import add_to_knowledge_base, extract_text_from_url
import uuid

PAYSYS_PAGES = [
    # Products
    ("Open Connect — Middleware Switch",        "https://paysyslabs.com/products/open-connect/"),
    ("Open ACS — 3D Secure",                   "https://paysyslabs.com/products/open-acs/"),
    ("Open Acquiring — Merchant Payments",      "https://paysyslabs.com/products/risk-management/"),
    ("Open Wallet — Wallet Management",         "https://paysyslabs.com/products/open-wallet/"),
    ("Open CMS — Card Management",              "https://paysyslabs.com/products/open-cms/"),
    ("Open Digital — Digital Banking",          "https://paysyslabs.com/products/open-digital-banking/"),
    ("Open Remit — Cross-Border Remittance",    "https://paysyslabs.com/products/open-remit/"),
    ("Open Engage — Loyalty & Rewards",         "https://paysyslabs.com/products/open-engage/"),
    ("Open Credit — Digital Lending",           "https://paysyslabs.com/products/open-credit/"),
    ("Open FRMS — Fraud Detection",             "https://paysyslabs.com/products/open-frms/"),
    ("Open Pay — Digital Payments",             "https://paysyslabs.com/products/open-pay/"),
    # Services
    ("Advisory as a Service",                   "https://paysyslabs.com/products/advisory/"),
    ("Software as a Service — Managed",         "https://paysyslabs.com/products/managed-services/"),
    ("Gateway as a Service",                    "https://paysyslabs.com/products/managed-services-2/"),
    ("Tapsys — Digital Merchant Acquiring",     "https://paysyslabs.com/digital-merchant-acquiring-tapsys/"),
    # Company
    ("About Paysys Labs",                       "https://paysyslabs.com/about/"),
    ("Paysys Labs — Home",                      "https://paysyslabs.com/"),
    ("FAQs",                                    "https://paysyslabs.com/faq/"),
]

def seed():
    print("=" * 55)
    print("  Paysys Labs — Knowledge Base Seeder")
    print("=" * 55)

    create_tables()
    db = SessionLocal()

    # Get admin user id
    admin = db.query(User).filter(User.role == "admin").first()
    admin_id = admin.id if admin else None

    success, failed = 0, 0

    for name, url in PAYSYS_PAGES:
        # Skip if already exists
        existing = db.query(KnowledgeSource).filter(KnowledgeSource.source_path == url).first()
        if existing:
            print(f"  ⏭  Already exists: {name}")
            continue

        print(f"  ⬇  Fetching: {name}")
        try:
            title, text = extract_text_from_url(url)
            if len(text.strip()) < 100:
                print(f"  ⚠  Too short, skipping: {name}")
                failed += 1
                continue

            source_id = str(uuid.uuid4())
            chunk_count = add_to_knowledge_base(text, source_id, name, "url")

            source = KnowledgeSource(
                id=source_id,
                name=name,
                source_type="url",
                source_path=url,
                status="active",
                chunk_count=chunk_count,
                added_by=admin_id
            )
            db.add(source)
            db.commit()
            print(f"  ✅  {name} — {chunk_count} chunks")
            success += 1

        except Exception as e:
            print(f"  ❌  Failed: {name} — {e}")
            failed += 1

    db.close()
    print()
    print(f"  Done: {success} seeded, {failed} failed")
    print("=" * 55)

if __name__ == "__main__":
    seed()
