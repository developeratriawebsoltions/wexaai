import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    const body = await req.json();

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    const { action, confirmation } = body;

    // Actions: delete_workspace, export_data, disconnect_whatsapp, delete_all_contacts
    if (confirmation !== true) {
      return NextResponse.json(
        { error: 'Confirmation required for danger zone actions' },
        { status: 400 }
      );
    }

    if (action === 'delete_workspace') {
      // Delete all related data
      await Promise.all([
        prisma.message.deleteMany({ where: { workspaceId } }),
        prisma.conversation.deleteMany({ where: { workspaceId } }),
        prisma.contact.deleteMany({ where: { workspaceId } }),
        prisma.broadcast.deleteMany({ where: { workspaceId } }),
        prisma.template.deleteMany({ where: { workspaceId } }),
        prisma.flow.deleteMany({ where: { workspaceId } }),
        prisma.apiKey.deleteMany({ where: { workspaceId } }),
        prisma.activityLog.deleteMany({ where: { workspaceId } }),
      ]);

      await prisma.workspace.delete({
        where: { id: workspaceId },
      });

      return NextResponse.json({
        success: true,
        message: 'Workspace deleted successfully',
      });
    } else if (action === 'export_data') {
      // Prepare data export (implementation depends on your storage)
      const exportData = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          contacts: true,
          conversations: true,
          templates: true,
          broadcasts: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Data export prepared',
        data: exportData,
      });
    } else if (action === 'disconnect_whatsapp') {
      await prisma.whatsAppAccount.delete({
        where: { workspaceId },
      });

      return NextResponse.json({
        success: true,
        message: 'WhatsApp account disconnected',
      });
    } else if (action === 'delete_all_contacts') {
      await prisma.contact.deleteMany({
        where: { workspaceId },
      });

      return NextResponse.json({
        success: true,
        message: 'All contacts deleted',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Danger zone error:', error);
    return NextResponse.json(
      { error: 'Failed to complete action' },
      { status: 500 }
    );
  }
}
