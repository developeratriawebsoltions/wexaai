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

    const { url, events, active } = body;

    const webhooks = await prisma.webhookSettings.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        url: url || '',
        events: events || [],
        active: active ?? true,
      },
      update: {
        ...(url && { url }),
        ...(events && { events }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    console.error('Webhooks settings PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook settings' },
      { status: 500 }
    );
  }
}
