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

    const { emailNotifications, whatsappAlerts, newConversation, broadcastCompleted, paymentFailed } = body;

    const notifications = await prisma.notificationSettings.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        emailNotifications: emailNotifications ?? true,
        whatsappAlerts: whatsappAlerts ?? false,
        newConversation: newConversation ?? true,
        broadcastCompleted: broadcastCompleted ?? true,
        paymentFailed: paymentFailed ?? true,
      },
      update: {
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(whatsappAlerts !== undefined && { whatsappAlerts }),
        ...(newConversation !== undefined && { newConversation }),
        ...(broadcastCompleted !== undefined && { broadcastCompleted }),
        ...(paymentFailed !== undefined && { paymentFailed }),
      },
    });

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Notifications settings PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
}
