import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function PUT(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, email, phone, organization, role, bio } = body;

    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'Full name and email are required.' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || '',
        organization: organization?.trim() || '',
        role: role?.trim() || '',
        bio: bio?.trim() || '',
      })
      .eq('id', userData.user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
    }

    const user = {
      id: userData.user.id,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '',
      organization: organization?.trim() || '',
      role: role?.trim() || '',
      bio: bio?.trim() || '',
    };

    return NextResponse.json({ user });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .maybeSingle();

    const user = {
      id: userData.user.id,
      fullName: profile?.full_name || '',
      email: userData.user.email,
      phone: profile?.phone || '',
      organization: profile?.organization || '',
      role: profile?.role || '',
      bio: profile?.bio || '',
    };

    return NextResponse.json({ user });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
