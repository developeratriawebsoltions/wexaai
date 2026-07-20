import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }

    // Get all settings for the workspace
    const [workspace, settings, notifications, security, apiKeys, webhooks] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
      }),
      prisma.workspaceSettings.findUnique({
        where: { workspaceId },
      }),
      prisma.notificationSettings.findUnique({
        where: { workspaceId },
      }),
      prisma.securitySettings.findUnique({
        where: { workspaceId },
      }),
      prisma.apiKey.findMany({
        where: { workspaceId },
      }),
      prisma.webhookSettings.findUnique({
        where: { workspaceId },
      }),
    ]);

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan,
        status: workspace.status,
        createdAt: workspace.createdAt,
      },
      settings: settings || {},
      notifications: notifications || {},
      security: security || {},
      apiKeys: apiKeys || [],
      webhooks: webhooks || {},
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
