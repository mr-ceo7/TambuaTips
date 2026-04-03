"""One-off script to promote a user to admin on the production TiDB database."""
import pymysql
import ssl

# Create an SSL context that doesn't require a specific CA file
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

conn = pymysql.connect(
    host="gateway01.eu-central-1.prod.aws.tidbcloud.com",
    port=4000,
    user="4B4X2sssnr2H3GZ.root",
    password="1TA80QExBBnppdqc",
    database="test",
    ssl=ssl_ctx,
    connect_timeout=15,
)

try:
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET is_admin = 1 WHERE email = %s", ("kassimmusa322@gmail.com",))
        conn.commit()
        print(f"Rows updated: {cur.rowcount}")
        if cur.rowcount > 0:
            print("✅ Admin promotion successful!")
        else:
            print("⚠️  No user found with that email. Have you logged in on the production site first?")
finally:
    conn.close()
