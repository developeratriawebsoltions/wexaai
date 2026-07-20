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

    const { model, systemPrompt, temperature, language, autoReply, fallbackType } = body;

    const aiAgent = await prisma.aiAgent.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        model: model || 'gpt-4o-mini',
        systemPrompt: systemPrompt || 'You are a helpful customer support assistant.',
        temperature: temperature || 0.5,
        language: language || 'English',
        autoReply: autoReply ?? false,
        fallbackType: fallbackType || 'assign_human',
      },
      update: {
        ...(model && { model }),
        ...(systemPrompt && { systemPrompt }),
        ...(temperature !== undefined && { temperature }),
        ...(language && { language }),
        ...(autoReply !== undefined && { autoReply }),
        ...(fallbackType && { fallbackType }),
      },
    });

    return NextResponse.json({
      success: true,
      data: aiAgent,
    });
  } catch (error) {
    console.error('AI settings PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update AI settings' },
      { status: 500 }
    );
  }
}
