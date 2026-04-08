import smtplib

def test():
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login("insight360.cl@gmail.com", "Printsave1982$")
            print("Login SUCCESSFUL")
    except Exception as e:
        print("Login FAILED:", e)

test()
