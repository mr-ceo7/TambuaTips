import asyncio
import argparse
import csv
import random
import string
import uuid
import httpx
from datetime import datetime, UTC
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models.user import User
from app.security import hash_password

# Use the same exact URL logic used in alert_service and auth
SMS_URL = "https://trackomgroup.com/sms_old/sendSmsApi/sendsms_v15.php"
SMS_SRC = "ARVOCAP"  # Hardcoding for the script to be safe, could also pull from admin settings

# Full English draft with Tagline as agreed
SMS_TEMPLATE = "TambuaTips has upgraded! We no longer send tips via SMS. Your FREE account is ready on our new platform. Tap to access your tips: {link} Stop Guessing, Start Winning! tambuatips.com"

# The file containing the phone numbers
CSV_FILE = "../tambua_data.csv"
OUTPUT_FILE = "migration_results.csv"
BASE_LINK_URL = "https://tambuatips.com/welcome?t="

async def send_sms(phone: str, message: str):
    """Send SMS using Trackomgroup API"""
    # Strip any + or spaces (as trackomgroup expects raw numbers e.g. 2547XXXXXXXX)
    import re
    stripped_phone = re.sub(r'[\D]', '', phone)
    
    params = {
        "src": SMS_SRC,
        "phone_number": stripped_phone,
        "sms_message": message
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(SMS_URL, params=params, timeout=10.0)
            if resp.status_code == 200:
                print(f"[SMS] Success -> {stripped_phone}")
                return True
            else:
                print(f"[SMS] Failed -> {stripped_phone} (Status {resp.status_code})")
                return False
    except Exception as e:
        print(f"[SMS] Exception -> {stripped_phone}: {e}")
        return False

async def get_or_create_user(phone: str, session: AsyncSession):
    # Normalize phone (+254...)
    import re
    clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
    if not clean_phone.startswith('+'):
        clean_phone = '+' + clean_phone
        
    result = await session.execute(select(User).where(User.phone == clean_phone))
    user = result.scalar_one_or_none()
    
    if user:
        # If user exists but doesn't have a magic login token, create one
        if not user.magic_login_token:
            user.magic_login_token = uuid.uuid4().hex
            session.add(user)
            await session.commit()
            print(f"[-] Existing user {clean_phone} updated with magic token.")
            return user, False
        else:
            return user, False

    # Create new user
    friendly_digits = clean_phone[-4:] if len(clean_phone) > 4 else "0000"
    placeholder_email = f"phone_{clean_phone.replace('+', '')}@tambuatips.local"
    rand_pass = "".join(random.choices(string.ascii_letters + string.digits, k=32))
    magic_token = uuid.uuid4().hex
    
    user = User(
        name=f"User {friendly_digits}",
        email=placeholder_email,
        password=hash_password(rand_pass),
        phone=clean_phone,
        subscription_tier="free",
        is_active=True,
        email_verified_at=datetime.now(UTC).replace(tzinfo=None),
        magic_login_token=magic_token
    )
    
    # Generate referral code
    safe_name = "VIP"
    user.referral_code = f"{safe_name}{uuid.uuid4().hex[:5].upper()}"
    
    session.add(user)
    await session.commit()
    return user, True

async def main():
    parser = argparse.ArgumentParser(description="Migrate SMS users to DB & SMS Broadcast")
    parser.add_argument("--broadcast", action="store_true", help="Actually send SMS messages")
    parser.add_argument("--test", action="store_true", help="Send SMS ONLY to test numbers (254746957502, 254119465236)")
    parser.add_argument("--live", action="store_true", help="Send SMS to ALL users (Proceed with caution!)")
    
    args = parser.parse_args()

    if args.broadcast and not (args.test or args.live):
        print("ERROR: If --broadcast is set, must specify either --test or --live")
        return

    test_numbers = ["+254746957502", "+254119465236"]

    print("Initializing Database...")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

    total_added = 0
    total_skipped = 0
    total_sms = 0
    
    results = []

    print(f"Reading phones from {CSV_FILE}...")
    phones = []
    try:
        with open(CSV_FILE, "r") as f:
            # Handle potential quoted single column lines
            for line in f:
                p = line.strip().strip('"').strip("'")
                if p:
                    phones.append(p)
    except Exception as e:
        print(f"Failed to read CSV: {e}")
        return
        
    unique_phones = list(set(phones))
    print(f"Loaded {len(unique_phones)} unique phone numbers.")

    async with SessionLocal() as db:
        for idx, phone in enumerate(unique_phones):
            try:
                user, created = await get_or_create_user(phone, db)
                if created:
                    total_added += 1
                else:
                    total_skipped += 1
                    
                magic_link = f"{BASE_LINK_URL}{user.magic_login_token}"
                
                # Check mapping
                is_test_number = user.phone in test_numbers
                
                should_sms = False
                if args.broadcast:
                    if args.test and is_test_number:
                        should_sms = True
                    elif args.live:
                        should_sms = True
                        
                if should_sms:
                    message = SMS_TEMPLATE.format(link=magic_link)
                    success = await send_sms(user.phone, message)
                    if success:
                        total_sms += 1
                        
                results.append({
                    "phone": phone,
                    "magic_link": magic_link,
                    "created": created,
                    "sms_sent": should_sms
                })
                
                if idx % 100 == 0 and idx > 0:
                    print(f"Processed {idx}/{len(unique_phones)} records...")
                    
            except Exception as e:
                print(f"[!] Error processing phone {phone}: {e}")
                
    # Write summary CSV
    print(f"Writing outputs to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["phone", "magic_link", "created", "sms_sent"])
        writer.writeheader()
        writer.writerows(results)

    print("\n" + "="*40)
    print("MIGRATION COMPLETE")
    print(f"Total Phones Processed : {len(unique_phones)}")
    print(f"Total New Accounts     : {total_added}")
    print(f"Total Existing Accts   : {total_skipped}")
    print(f"Total SMS Sent         : {total_sms}")
    print("="*40)

if __name__ == "__main__":
    asyncio.run(main())
