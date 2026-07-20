import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    const body = await req.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    const { email, phone, timezone, language, logo } = body;

    // Update or create workspace settings
    const settings = await prisma.workspaceSettings.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        email: email || '',
        phone,
        timezone,
        language,
        logo,
      },
      update: {
        ...(email && { email }),
        ...(phone && { phone }),
        ...(timezone && { timezone }),
        ...(language && { language }),
        ...(logo && { logo }),
      },
    });

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('General settings PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update general settings' },
      { status: 500 }
    );
  }
}
