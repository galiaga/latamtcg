import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    // Basic email validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email address' }, 
        { status: 400 }
      );
    }

    // Additional email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid email address' }, 
        { status: 400 }
      );
    }

    const provider = process.env.NEWSLETTER_PROVIDER ?? '';
    
    // Log the subscription attempt
    console.log('[newsletter] subscribe attempt', { 
      email, 
      provider: provider || 'none',
      timestamp: new Date().toISOString()
    });

    // TODO: Integrate with newsletter provider
    // Examples of future integrations:
    // - Resend: Use Resend API to add to mailing list
    // - Mailchimp: Use Mailchimp API to subscribe user
    // - ConvertKit: Use ConvertKit API for email marketing
    // - Custom: Store in database and sync with external service
    
    if (provider) {
      // Placeholder for future provider integration
      console.log(`[newsletter] TODO: integrate with ${provider} provider`);
      
      // Example structure for future implementation:
      // switch (provider.toLowerCase()) {
      //   case 'resend':
      //     // await resend.contacts.create({ email, listId: 'newsletter' });
      //     break;
      //   case 'mailchimp':
      //     // await mailchimp.lists.addListMember('list-id', { email_address: email });
      //     break;
      //   default:
      //     console.log(`[newsletter] unknown provider: ${provider}`);
      // }
    }

    // For now, just return success
    // In a real implementation, you might want to:
    // - Store the email in a database
    // - Send a confirmation email
    // - Add to a mailing list via API
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Successfully subscribed to newsletter' 
    });

  } catch (error) {
    console.error('[newsletter] subscription error:', error);
    
    return NextResponse.json(
      { ok: false, error: 'Failed to process subscription request' }, 
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'Method not allowed' }, 
    { status: 405 }
  );
}
