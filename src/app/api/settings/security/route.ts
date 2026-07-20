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

    const { twoFactorEnabled } = body;

    const security = await prisma.securitySettings.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        twoFactorEnabled: twoFactorEnabled ?? false,
      },
      update: {
        ...(twoFactorEnabled !== undefined && { twoFactorEnabled }),
      },
    });

    return NextResponse.json({
      success: true,
      data: security,
    });
  } catch (error) {
    console.error('Security settings PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update security settings' },
      { status: 500 }
    );
  }
}
