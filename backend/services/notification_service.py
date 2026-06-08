from core.config import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)

def send_whatsapp_notification(lead_info: dict, conversation_summary: str):
    """Send WhatsApp alert to agent when escalation happens"""
    if not settings.twilio_account_sid:
        logger.info("WhatsApp not configured, skipping")
        return
    
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        
        message = f"""🔔 *New Lead - Paysys Chatbot*

👤 *Name:* {lead_info.get('name', 'Unknown')}
📧 *Email:* {lead_info.get('email', 'Not provided')}
📞 *Phone:* {lead_info.get('phone', 'Not provided')}
🏢 *Company:* {lead_info.get('company', 'Not provided')}
🎯 *Product Interest:* {lead_info.get('product_interest', 'General')}

💬 *Summary:*
{conversation_summary}

👉 Open Agent Panel: {settings.frontend_url}/agent"""

        client.messages.create(
            body=message,
            from_=settings.twilio_whatsapp_from,
            to=settings.agent_whatsapp_number
        )
        logger.info("WhatsApp notification sent")
    except Exception as e:
        logger.error(f"WhatsApp error: {e}")

def send_email_notification(lead_info: dict, conversation_summary: str):
    """Send email alert to agent"""
    if not settings.smtp_user or not settings.agent_email:
        logger.info("Email not configured, skipping")
        return
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"New Lead: {lead_info.get('name', 'Unknown')} - {lead_info.get('product_interest', 'General')}"
        msg["From"] = settings.smtp_user
        msg["To"] = settings.agent_email

        html = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16659c; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">🔔 New Lead from Chatbot</h2>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">{lead_info.get('name', 'Unknown')}</td></tr>
                <tr style="background: white;"><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">{lead_info.get('email', 'Not provided')}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td style="padding: 8px;">{lead_info.get('phone', 'Not provided')}</td></tr>
                <tr style="background: white;"><td style="padding: 8px; font-weight: bold;">Company:</td><td style="padding: 8px;">{lead_info.get('company', 'Not provided')}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Product Interest:</td><td style="padding: 8px; color: #16659c; font-weight: bold;">{lead_info.get('product_interest', 'General')}</td></tr>
            </table>
            <div style="margin-top: 20px; padding: 15px; background: white; border-left: 4px solid #16659c; border-radius: 4px;">
                <strong>Conversation Summary:</strong><br/><br/>
                {conversation_summary}
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <a href="{settings.frontend_url}/agent" style="background: #16659c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Open Agent Panel →</a>
            </div>
        </div>
        </body></html>
        """
        
        msg.attach(MIMEText(html, "html"))
        
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, settings.agent_email, msg.as_string())
        
        logger.info("Email notification sent")
    except Exception as e:
        logger.error(f"Email error: {e}")

def notify_escalation(lead_info: dict, conversation_summary: str):
    """Send all notifications"""
    send_whatsapp_notification(lead_info, conversation_summary)
    send_email_notification(lead_info, conversation_summary)
